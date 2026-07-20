import {
  and,
  count,
  eq,
  ne,
  or,
  inArray,
  sql,
  desc,
  asc,
  isNotNull,
  gte,
  lte,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { database } from '../../../configurations/dbConnection';
import redisClient from '../../../configurations/redisConfig';
import { HttpError } from '../../../middlewear/errorHandler';
import { pagination } from '../../../utils/utils';
import { UserModel } from '../../users/models/user.model';
import { UserProfileModel } from '../../users/models/userProfile.model';
import { PatientFamilyLinksModel } from '../models/patientFamilyLinks.model';
import { LabOrderModel } from '../../test/models/labOrder.model';
import { TestCatalogModel } from '../../test/models/testCatalog.model';
import {
  LabOrderResultsModel,
  LabOrderResultValuesModel,
} from '../../lab/models/labResult.model';
import type {
  AddFamilyMemberDto,
  CompletePatientProfileDto,
  ListFamilyMembersQueryDto,
  UpdateFamilyMemberDto,
  PatientDirectorySearchDto,
  PatientBookingDto,
  PatientAppointmentsQueryDto,
  PatientLabReportsQueryDto,
  PatientPrescriptionsQueryDto,
  PatientAssociatedDocumentsQueryDto,
} from '../schemas/patient.schemas';
import {
  ReportCardModel,
  PrescriptionModel,
} from '../../reports/models/reports.model';
import { doctorManualPrescriptionModel } from '../../appointments/models/doctorManualPrescription.model';
import { patientGallery } from '../../appointments/models/patientGallery.model';
import { AppointmentClinicalModel } from '../../appointments/models/appointment-clinical.model';
import { ClinicCommissionModel } from '../../clinic/models/clinicCommission.model';
import { AppointmentPaymentModel } from '../../appointments/models/appointment-payment.model';
import {
  createRazorpaySplitOrder,
  verifyRazorpayPayment,
  createRazorpayAppointmentOrder,
} from '../../../utils/razorpay';
import { envConfig } from '../../../utils/envConfig';
import {
  VerifyAppointmentPaymentDto,
  ListFavoriteDoctorsQueryDto,
} from '../schemas/patient.schemas';
import {
  notifyPaymentReceived,
  getUserById,
  notifyAppointmentCreated,
} from '../../../utils/notificationHelpers';
import { AppointmentActivityHistoryService } from '../../appointments/services/appointment-activity-history.service';
import { deleteFromS3 } from '../../../configurations/s3';
import logger from '../../../utils/logger';
import { broadcastAppointmentChange } from '../../../utils/appointmentRealtime';
import {
  ClinicModel,
  ClinicAssignModel,
  ClinicServiceModel,
} from '../../clinic/models/clinic.model';
import { UserProfessionalModel } from '../../users/models/userProfessional.model';
import {
  DoctorQualificationModel,
  DoctorFavoriteModel,
} from '../../doctor/models/doctor.model';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import { AppointmentService } from '../../appointments/services/appointment.service';

// ─── Shared column selection ──────────────────────────────────────────────────

/** Full profile columns joined from users + user_profiles */
const PROFILE_COLUMNS = {
  id: UserModel.id,
  name: UserModel.name,
  email: UserModel.email,
  mobile: UserModel.mobile,
  userType: UserModel.userType,
  userStatus: UserModel.userStatus,
  gender: UserProfileModel.gender,
  alternateMobile: UserProfileModel.alternateMobile,
  city: UserProfileModel.city,
  state: UserProfileModel.state,
  address: UserProfileModel.address,
  zipCode: UserProfileModel.zipCode,
  profileImage: UserProfileModel.profileImage,
  age: UserProfileModel.age,
  dob: UserProfileModel.dob,
  bloodGroup: UserProfileModel.bloodGroup,
  height: UserProfileModel.height,
  weight: UserProfileModel.weight,
  allergies: UserProfileModel.allergies,
  chronicConditions: UserProfileModel.chronicConditions,
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

export class PatientService {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. GET MY PROFILE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/patient/my-profile
   * Returns the full profile (users + user_profiles) of the authenticated patient.
   */
  static async getMyProfile(userId: string) {
    const cacheKey = `patient_profile:${userId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.error(
        `[Cache] Error reading patient profile cache for user ${userId}:`,
        err
      );
    }

    const [profile] = await database
      .select(PROFILE_COLUMNS)
      .from(UserModel)
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .where(eq(UserModel.id, userId))
      .limit(1);

    if (!profile) {
      throw new HttpError(404, 'Patient profile not found.');
    }

    try {
      await redisClient.setex(cacheKey, 3600, JSON.stringify(profile));
    } catch (err) {
      logger.error(
        `[Cache] Error writing patient profile cache for user ${userId}:`,
        err
      );
    }

    return profile;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. COMPLETE / UPDATE MY PROFILE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/patient/complete-profile
   * Updates users.name / users.email and upserts all profile fields.
   */
  static async completeProfile(
    userId: string,
    payload: CompletePatientProfileDto
  ) {
    const userFields: Record<string, unknown> = {};
    if (payload.name !== undefined) userFields.name = payload.name;
    if (payload.email !== undefined) userFields.email = payload.email;

    const profileFields: Record<string, unknown> = {};
    const profileKeys = [
      'gender',
      'alternateMobile',
      'address',
      'city',
      'state',
      'zipCode',
      'dob',
      'age',
      'bloodGroup',
      'height',
      'weight',
      'allergies',
      'chronicConditions',
    ] as const;
    for (const key of profileKeys) {
      if (payload[key] !== undefined) profileFields[key] = payload[key];
    }

    return await database.transaction(async (tx) => {
      if (Object.keys(userFields).length > 0) {
        // Guard: email must not be claimed by another account
        if (userFields.email) {
          const [conflict] = await tx
            .select({ id: UserModel.id })
            .from(UserModel)
            .where(
              and(
                eq(UserModel.email, userFields.email as string),
                ne(UserModel.id, userId)
              )
            )
            .limit(1);

          if (conflict) {
            throw new HttpError(
              400,
              'This email is already in use by another account.'
            );
          }
        }

        await tx
          .update(UserModel)
          .set({ ...userFields, updatedAt: new Date() })
          .where(eq(UserModel.id, userId));
      }

      if (Object.keys(profileFields).length > 0) {
        const [existing] = await tx
          .select({ id: UserProfileModel.id })
          .from(UserProfileModel)
          .where(eq(UserProfileModel.userId, userId))
          .limit(1);

        if (existing) {
          await tx
            .update(UserProfileModel)
            .set({ ...profileFields, updatedAt: new Date() })
            .where(eq(UserProfileModel.userId, userId));
        } else {
          await tx
            .insert(UserProfileModel)
            .values({ userId, ...profileFields });
        }
      }

      // Invalidate Redis cache
      await redisClient.del(`user:${userId}`);
      await redisClient.del(`patient_profile:${userId}`);
      await redisClient.del(`patient_account:${userId}`);
      await redisClient.del(`patient:${userId}`);
      await redisClient.del(`patient:${userId}:withFamily`);

      const [updated] = await tx
        .select(PROFILE_COLUMNS)
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .where(eq(UserModel.id, userId))
        .limit(1);

      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. GET ACCOUNT (primary + all family members)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/patient/account
   *
   * Single post-login call that returns:
   *  - primary: the authenticated patient's own full profile
   *  - members: all linked family members with their relationship and profile
   *
   * Frontend uses this to render the member selection screen and to decide
   * whether to show the profile completion modal (isProfileComplete flag).
   */
  static async getAccount(userId: string) {
    const cacheKey = `patient_account:${userId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.error(
        `[Cache] Error reading patient account cache for user ${userId}:`,
        err
      );
    }

    // 1️⃣ Fetch own profile
    const [primary] = await database
      .select({
        ...PROFILE_COLUMNS,
        // expose isProfileComplete so frontend can act on it here too
        createdAt: UserModel.createdAt,
      })
      .from(UserModel)
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .where(eq(UserModel.id, userId))
      .limit(1);

    if (!primary) {
      throw new HttpError(404, 'Patient account not found.');
    }

    // 2️⃣ Compute isProfileComplete (same rule as verifyOtp)
    const isProfileComplete =
      Boolean(primary.name?.trim()) &&
      Boolean(primary.gender) &&
      Boolean(primary.dob?.trim());

    // 3️⃣ Fetch all linked family members
    const members = await database
      .select({
        linkId: PatientFamilyLinksModel.id,
        relationship: PatientFamilyLinksModel.relationship,
        linkedAt: PatientFamilyLinksModel.createdAt,
        ...PROFILE_COLUMNS,
      })
      .from(PatientFamilyLinksModel)
      .innerJoin(
        UserModel,
        eq(UserModel.id, PatientFamilyLinksModel.linkedPatientId)
      )
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .where(eq(PatientFamilyLinksModel.primaryPatientId, userId));

    const result = {
      primary: {
        ...primary,
        isProfileComplete,
      },
      members,
    };

    try {
      await redisClient.setex(cacheKey, 3600, JSON.stringify(result));
    } catch (err) {
      logger.error(
        `[Cache] Error writing patient account cache for user ${userId}:`,
        err
      );
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ADD FAMILY MEMBER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/patient/family
   *
   * Creates a new dependent family member with mobile=NULL.
   * The member is accessible only through the primary patient account.
   * Duplicate links are blocked by DB unique constraint.
   */
  static async addFamilyMember(
    primaryPatientId: string,
    payload: AddFamilyMemberDto
  ) {
    const { name, relationship, ...profilePayload } = payload;

    return await database.transaction(async (tx) => {
      // Create dependent member with mobile=NULL
      const [newUser] = await tx
        .insert(UserModel)
        .values({
          name,
          mobile: null,
          userType: 'Patient',
          userStatus: 'Active',
        })
        .returning({ id: UserModel.id });

      await tx.insert(UserProfileModel).values({
        userId: newUser.id,
        ...profilePayload,
      });

      const linkedPatientId = newUser.id;

      // Create the family link (DB unique constraint prevents duplicates)
      try {
        await tx.insert(PatientFamilyLinksModel).values({
          primaryPatientId,
          linkedPatientId,
          relationship,
        });
      } catch (err: unknown) {
        // Postgres unique violation code
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === '23505'
        ) {
          throw new HttpError(
            409,
            'This family member is already linked to your account.'
          );
        }
        throw err;
      }

      // Return the newly linked member's full profile
      const [member] = await tx
        .select({
          linkId: PatientFamilyLinksModel.id,
          relationship: PatientFamilyLinksModel.relationship,
          ...PROFILE_COLUMNS,
        })
        .from(PatientFamilyLinksModel)
        .innerJoin(
          UserModel,
          eq(UserModel.id, PatientFamilyLinksModel.linkedPatientId)
        )
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .where(
          and(
            eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId),
            eq(PatientFamilyLinksModel.linkedPatientId, linkedPatientId)
          )
        )
        .limit(1);

      try {
        await redisClient.del(`patient_account:${primaryPatientId}`);
        await redisClient.del(`patient:${primaryPatientId}:withFamily`);
      } catch (err) {
        logger.error(
          'Failed to invalidate patient caches on adding family member',
          err
        );
      }

      return member;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. LIST FAMILY MEMBERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/patient/family
   * Returns a paginated list of family members linked to the authenticated patient.
   */
  static async listFamilyMembers(
    primaryPatientId: string,
    query: ListFamilyMembersQueryDto
  ) {
    const { limit, offset } = pagination(query.pageNumber, query.pageSize);
    const pageNumber = Math.max(Number(query.pageNumber) || 1, 1);
    const pageSize = limit;

    const [members, [{ total }]] = await Promise.all([
      database
        .select({
          linkId: PatientFamilyLinksModel.id,
          relationship: PatientFamilyLinksModel.relationship,
          linkedAt: PatientFamilyLinksModel.createdAt,
          ...PROFILE_COLUMNS,
        })
        .from(PatientFamilyLinksModel)
        .innerJoin(
          UserModel,
          eq(UserModel.id, PatientFamilyLinksModel.linkedPatientId)
        )
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .where(eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId))
        .limit(limit)
        .offset(offset),

      database
        .select({ total: count() })
        .from(PatientFamilyLinksModel)
        .where(eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId)),
    ]);

    const totalRecords = Number(total);
    const totalPages =
      totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize);

    return {
      data: members,
      pagination: {
        totalRecords,
        totalPages,
        pageNumber,
        pageSize,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. GET ONE FAMILY MEMBER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/patient/family/:familyMemberId
   * Returns a single family member's profile.
   * Verifies the link belongs to the authenticated patient before returning.
   */
  static async getFamilyMember(
    primaryPatientId: string,
    familyMemberId: string
  ) {
    const [member] = await database
      .select({
        linkId: PatientFamilyLinksModel.id,
        relationship: PatientFamilyLinksModel.relationship,
        linkedAt: PatientFamilyLinksModel.createdAt,
        ...PROFILE_COLUMNS,
      })
      .from(PatientFamilyLinksModel)
      .innerJoin(
        UserModel,
        eq(UserModel.id, PatientFamilyLinksModel.linkedPatientId)
      )
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .where(
        and(
          eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId),
          eq(PatientFamilyLinksModel.linkedPatientId, familyMemberId)
        )
      )
      .limit(1);

    if (!member) {
      throw new HttpError(
        404,
        'Family member not found or does not belong to your account.'
      );
    }

    return member;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. UPDATE FAMILY MEMBER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/patient/family/:familyMemberId
   *
   * Ownership rules:
   *  - Only the primary account holder who owns the link can edit the member.
   *  - If the family member is themselves a primary account holder (they have
   *    their own family group), they own their identity → reject edits from
   *    any other account, regardless of status.
   *  - If the member is not a primary account holder, the primary patient
   *    can freely edit them (Active or New).
   */
  static async updateFamilyMember(
    primaryPatientId: string,
    familyMemberId: string,
    payload: UpdateFamilyMemberDto
  ) {
    // 1️⃣ Verify the link exists and belongs to this primary patient
    const [link] = await database
      .select({
        id: PatientFamilyLinksModel.id,
        relationship: PatientFamilyLinksModel.relationship,
        userStatus: UserModel.userStatus,
      })
      .from(PatientFamilyLinksModel)
      .innerJoin(
        UserModel,
        eq(UserModel.id, PatientFamilyLinksModel.linkedPatientId)
      )
      .where(
        and(
          eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId),
          eq(PatientFamilyLinksModel.linkedPatientId, familyMemberId)
        )
      )
      .limit(1);

    if (!link) {
      throw new HttpError(
        404,
        'Family member not found or does not belong to your account.'
      );
    }

    // 2️⃣ Block edit if the family member is themselves a primary account holder.
    //    A member who manages their own family group owns their identity —
    //    no other account can overwrite their details.
    const [memberAsPrimary] = await database
      .select({ id: PatientFamilyLinksModel.id })
      .from(PatientFamilyLinksModel)
      .where(eq(PatientFamilyLinksModel.primaryPatientId, familyMemberId))
      .limit(1);

    if (memberAsPrimary) {
      throw new HttpError(
        403,
        'This family member has their own primary account and manages their own profile. You can view but not edit their details.'
      );
    }

    const { relationship, name, ...profilePayload } = payload;

    return await database.transaction(async (tx) => {
      // 3️⃣ Update link relationship if changed
      if (relationship !== undefined && relationship !== link.relationship) {
        await tx
          .update(PatientFamilyLinksModel)
          .set({ relationship, updatedAt: new Date() })
          .where(eq(PatientFamilyLinksModel.id, link.id));
      }

      // 4️⃣ Update users.name if provided
      if (name !== undefined) {
        await tx
          .update(UserModel)
          .set({ name, updatedAt: new Date() })
          .where(eq(UserModel.id, familyMemberId));
      }

      // 5️⃣ Upsert user_profiles fields
      const profileKeys = Object.keys(profilePayload) as Array<
        keyof typeof profilePayload
      >;

      if (profileKeys.length > 0) {
        const profileFields: Record<string, unknown> = {};
        for (const key of profileKeys) {
          if (profilePayload[key] !== undefined)
            profileFields[key] = profilePayload[key];
        }

        const [existingProfile] = await tx
          .select({ id: UserProfileModel.id })
          .from(UserProfileModel)
          .where(eq(UserProfileModel.userId, familyMemberId))
          .limit(1);

        if (existingProfile) {
          await tx
            .update(UserProfileModel)
            .set({ ...profileFields, updatedAt: new Date() })
            .where(eq(UserProfileModel.userId, familyMemberId));
        } else {
          await tx
            .insert(UserProfileModel)
            .values({ userId: familyMemberId, ...profileFields });
        }
      }

      // 6️⃣ Return updated profile
      const [updated] = await tx
        .select({
          linkId: PatientFamilyLinksModel.id,
          relationship: PatientFamilyLinksModel.relationship,
          ...PROFILE_COLUMNS,
        })
        .from(PatientFamilyLinksModel)
        .innerJoin(
          UserModel,
          eq(UserModel.id, PatientFamilyLinksModel.linkedPatientId)
        )
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .where(
          and(
            eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId),
            eq(PatientFamilyLinksModel.linkedPatientId, familyMemberId)
          )
        )
        .limit(1);

      try {
        await redisClient.del(`patient_account:${primaryPatientId}`);
        await redisClient.del(`patient_profile:${familyMemberId}`);
        await redisClient.del(`patient:${familyMemberId}`);
        await redisClient.del(`patient:${familyMemberId}:withFamily`);
        await redisClient.del(`patient:${primaryPatientId}:withFamily`);
      } catch (err) {
        logger.error(
          'Failed to invalidate patient caches on updating family member',
          err
        );
      }

      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. REMOVE FAMILY MEMBER LINK
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * DELETE /api/v1/patient/family/:familyMemberId
   *
   * Removes only the patient_family_links row.
   * Does NOT delete the linked patient's user record — they may have their
   * own mobile login or be linked from another primary patient.
   */
  static async removeFamilyMember(
    primaryPatientId: string,
    familyMemberId: string
  ) {
    const [link] = await database
      .select({ id: PatientFamilyLinksModel.id })
      .from(PatientFamilyLinksModel)
      .where(
        and(
          eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId),
          eq(PatientFamilyLinksModel.linkedPatientId, familyMemberId)
        )
      )
      .limit(1);

    if (!link) {
      throw new HttpError(
        404,
        'Family member not found or does not belong to your account.'
      );
    }

    // Fetch the member's mobile before touching anything
    const [memberUser] = await database
      .select({ mobile: UserModel.mobile })
      .from(UserModel)
      .where(eq(UserModel.id, familyMemberId))
      .limit(1);

    await database.transaction(async (tx) => {
      // 1️⃣ Remove the family link
      await tx
        .delete(PatientFamilyLinksModel)
        .where(eq(PatientFamilyLinksModel.id, link.id));

      // 2️⃣ Mark Inactive only for pure dependents (no independent mobile login)
      if (memberUser && !memberUser.mobile) {
        await tx
          .update(UserModel)
          .set({ userStatus: 'Inactive', updatedAt: new Date() })
          .where(eq(UserModel.id, familyMemberId));
      }
    });

    try {
      await redisClient.del(`patient_account:${primaryPatientId}`);
      await redisClient.del(`patient_profile:${familyMemberId}`);
      await redisClient.del(`patient:${familyMemberId}`);
      await redisClient.del(`patient:${familyMemberId}:withFamily`);
      await redisClient.del(`patient:${primaryPatientId}:withFamily`);
    } catch (err) {
      logger.error(
        'Failed to invalidate patient caches on removing family member',
        err
      );
    }

    return { message: 'Family member removed from your account.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. UPDATE PROFILE IMAGE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Updates the authenticated patient's own profile image.
   * If there is an existing profile image, it is deleted from S3.
   */
  public static async updateProfileImage(userId: string, profileImage: string) {
    const [existingProfile] = await database
      .select({ profileImage: UserProfileModel.profileImage })
      .from(UserProfileModel)
      .where(eq(UserProfileModel.userId, userId))
      .limit(1);

    const oldProfileImage = existingProfile?.profileImage;

    await database
      .insert(UserProfileModel)
      .values({
        userId,
        profileImage,
      })
      .onConflictDoUpdate({
        target: [UserProfileModel.userId],
        set: {
          profileImage,
          updatedAt: new Date(),
        },
      });

    try {
      await redisClient.del(`user:${userId}`);
      await redisClient.del(`patient_profile:${userId}`);
      await redisClient.del(`patient_account:${userId}`);
      await redisClient.del(`patient:${userId}`);
      await redisClient.del(`patient:${userId}:withFamily`);
    } catch (err) {
      logger.error(
        'Failed to invalidate patient caches on profile image update',
        err
      );
    }

    if (oldProfileImage) {
      try {
        await deleteFromS3(oldProfileImage);
      } catch (err) {
        logger.error('Failed to delete old profile image from S3', err);
      }
    }

    return { profileImage };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. UPDATE FAMILY MEMBER PROFILE IMAGE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Updates a linked family member's profile image.
   * Performs the same ownership and primary account checks as updateFamilyMember.
   * If there is an existing profile image, it is deleted from S3.
   */
  public static async updateFamilyMemberProfileImage(
    primaryPatientId: string,
    familyMemberId: string,
    profileImage: string
  ) {
    // 1️⃣ Verify the link exists and belongs to this primary patient
    const [link] = await database
      .select({ id: PatientFamilyLinksModel.id })
      .from(PatientFamilyLinksModel)
      .where(
        and(
          eq(PatientFamilyLinksModel.primaryPatientId, primaryPatientId),
          eq(PatientFamilyLinksModel.linkedPatientId, familyMemberId)
        )
      )
      .limit(1);

    if (!link) {
      throw new HttpError(
        404,
        'Family member not found or does not belong to your account.'
      );
    }

    // 2️⃣ Block edit if the family member is themselves a primary account holder.
    const [memberAsPrimary] = await database
      .select({ id: PatientFamilyLinksModel.id })
      .from(PatientFamilyLinksModel)
      .where(eq(PatientFamilyLinksModel.primaryPatientId, familyMemberId))
      .limit(1);

    if (memberAsPrimary) {
      throw new HttpError(
        403,
        'This family member has their own primary account and manages their own profile. You can view but not edit their details.'
      );
    }

    // 3️⃣ Get the old profile image path to delete it from S3
    const [existingProfile] = await database
      .select({ profileImage: UserProfileModel.profileImage })
      .from(UserProfileModel)
      .where(eq(UserProfileModel.userId, familyMemberId))
      .limit(1);

    const oldProfileImage = existingProfile?.profileImage;

    // 4️⃣ Upsert the new profile image
    await database
      .insert(UserProfileModel)
      .values({
        userId: familyMemberId,
        profileImage,
      })
      .onConflictDoUpdate({
        target: [UserProfileModel.userId],
        set: {
          profileImage,
          updatedAt: new Date(),
        },
      });

    if (oldProfileImage) {
      try {
        await deleteFromS3(oldProfileImage);
      } catch (err) {
        logger.error(
          'Failed to delete old family member profile image from S3',
          err
        );
      }
    }

    return { profileImage };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 10. DIRECTORY SEARCH
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Helper function to fetch the next available slot for a doctor at a clinic.
   * Searches starting from startDateStr for up to lookaheadDays.
   */
  private static formatTime(isoOrTimeStr: string): string {
    const timePart = isoOrTimeStr.includes('T')
      ? isoOrTimeStr.split('T')[1]
      : isoOrTimeStr;
    if (!timePart) return '';
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return '';
  }

  public static async getDoctorNextAvailableSlot(
    doctorId: string,
    clinicId: string,
    startDateStr: string,
    lookaheadDays: number = 7
  ): Promise<{
    date: string;
    time: string;
    endTime: string;
    start: string;
    end: string;
    availableTokens?: number | null;
    totalTokens?: number | null;
  } | null> {
    try {
      const now = new Date();
      const istDateParts = now
        .toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .split('/'); // [dd, mm, yyyy]
      const istTodayYMD = `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}`;

      const start = new Date(`${startDateStr}T00:00:00Z`);
      for (let i = 0; i < lookaheadDays; i++) {
        const currentDay = new Date(start);
        currentDay.setUTCDate(currentDay.getUTCDate() + i);
        const dateStr = currentDay.toISOString().split('T')[0];

        if (dateStr < istTodayYMD) {
          continue;
        }

        let timeFilter: string | undefined;
        if (dateStr === istTodayYMD) {
          timeFilter = now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
          }); // "HH:MM"
        }

        const { slots } = await AppointmentService.getAvailableSlotsForDate(
          clinicId,
          {
            date: dateStr,
            time: timeFilter,
          },
          { doctorId }
        );

        const firstAvailable = slots.find((s) => {
          if (s.totalTokens !== undefined) {
            return (s.availableTokens ?? 0) > 0;
          }
          return s.status === 'available';
        });

        if (firstAvailable) {
          const formattedTime = PatientService.formatTime(firstAvailable.start);
          const formattedEndTime = PatientService.formatTime(
            firstAvailable.end
          );

          return {
            date: dateStr,
            time: formattedTime || 'Available',
            endTime: formattedEndTime || '',
            start: firstAvailable.start,
            end: firstAvailable.end,
            availableTokens:
              firstAvailable.totalTokens !== undefined
                ? firstAvailable.availableTokens
                : null,
            totalTokens:
              firstAvailable.totalTokens !== undefined
                ? firstAvailable.totalTokens
                : null,
          };
        }
      }
    } catch (err) {
      logger.error(
        `Error finding next available slot for doctor ${doctorId} at clinic ${clinicId} starting from ${startDateStr}`,
        err
      );
    }
    return null;
  }

  static async searchDirectory(query: PatientDirectorySearchDto) {
    const filters = [
      sql`${UserModel.userType} IN ('Admin', 'Doctor')`,
      eq(UserModel.userStatus, 'Active'),
      eq(ClinicModel.status, 'Active'),
    ];

    if (query.search) {
      const searchPattern = `%${query.search.toLowerCase()}%`;
      filters.push(
        or(
          sql`LOWER(${UserModel.name}) LIKE ${searchPattern}`,
          sql`LOWER(${ClinicModel.clinicName}) LIKE ${searchPattern}`
        ) as any
      );
    }

    if (query.speciality) {
      const specPattern = `%${query.speciality.toLowerCase()}%`;
      filters.push(
        sql`LOWER(${UserProfessionalModel.speciality}) LIKE ${specPattern}`
      );
    }

    if (query.city) {
      const cityPattern = `%${query.city.toLowerCase()}%`;
      filters.push(sql`LOWER(${ClinicModel.City}) LIKE ${cityPattern}`);
    }

    const likesCountField = sql<number>`(
      SELECT COALESCE(count(*)::int, 0)
      FROM ${DoctorFavoriteModel}
      WHERE ${DoctorFavoriteModel.doctorId} = ${UserModel.id}
    )`;

    const ratingScoreField = sql<number>`(
      coalesce(${UserProfessionalModel.averageRating}, '0.00')::numeric * 10 + 
      coalesce(${UserProfessionalModel.reviewCount}, 0) * 0.5
    )`;

    const selectFields: any = {
      doctor: {
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        mobile: UserModel.mobile,
        gender: UserProfileModel.gender,
        qualification: UserProfessionalModel.qualification,
        yearsOfExperience: UserProfessionalModel.yearsOfExperience,
        speciality: UserProfessionalModel.speciality,
        profileImage: UserProfileModel.profileImage,
        createdAt: UserModel.createdAt,
        totalLikes: likesCountField,
        averageRating: UserProfessionalModel.averageRating,
        reviewCount: UserProfessionalModel.reviewCount,
      },
      clinic: {
        id: ClinicModel.id,
        clinicName: ClinicModel.clinicName,
        clinicAddress: ClinicModel.clinicAddress,
        clinicPhone: ClinicModel.clinicPhone,
        state: ClinicModel.State,
        city: ClinicModel.City,
        zipCode: ClinicModel.ZipCode,
        clinicLogo: ClinicModel.clinicLogo,
        latitude: ClinicModel.latitude,
        longitude: ClinicModel.longitude,
      },
    };

    let distanceField;
    if (query.latitude !== undefined && query.longitude !== undefined) {
      // Haversine formula in Kilometers (factor 6371)
      // Clamped between -1.0 and 1.0 to avoid floating point precision issues causing acos() to fail.
      distanceField = sql<number>`6371 * acos(
        LEAST(GREATEST(
          cos(radians(${query.latitude})) * cos(radians(${ClinicModel.latitude})) * 
          cos(radians(${ClinicModel.longitude}) - radians(${query.longitude})) + 
          sin(radians(${query.latitude})) * sin(radians(${ClinicModel.latitude})),
          -1.0
        ), 1.0)
      )`;

      filters.push(
        and(
          sql`${ClinicModel.latitude} IS NOT NULL`,
          sql`${ClinicModel.longitude} IS NOT NULL`,
          sql`${distanceField} <= ${query.radius}`
        ) as any
      );
      selectFields.distance = distanceField;
    }

    const queryBuilder = database
      .select(selectFields)
      .from(UserModel)
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .leftJoin(
        UserProfessionalModel,
        eq(UserProfessionalModel.userId, UserModel.id)
      )
      .innerJoin(ClinicAssignModel, eq(ClinicAssignModel.userId, UserModel.id))
      .innerJoin(ClinicModel, eq(ClinicModel.id, ClinicAssignModel.clinicId))
      .where(and(...filters))
      .$dynamic();

    const page = Math.max(parseInt(query.pageNumber || '1', 10), 1);
    const limit = Math.max(parseInt(query.pageSize || '10', 10), 1);
    const offset = (page - 1) * limit;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDateStr = (query as any).date || todayStr;
    const isAvailableOnly = (query as any).available === true;

    let paginatedData: any[] = [];
    let totalRecords = 0;

    if (isAvailableOnly) {
      // Fetch all matching records without limit/offset to filter in memory
      const allData = await queryBuilder.orderBy(
        desc(ratingScoreField),
        desc(likesCountField),
        distanceField ? distanceField : desc(UserModel.createdAt)
      );

      // Verify availability for each in parallel
      const availabilityChecks = await Promise.all(
        allData.map(async (item: any) => {
          try {
            const { slots } = await AppointmentService.getAvailableSlotsForDate(
              item.clinic.id,
              { date: targetDateStr },
              { doctorId: item.doctor.id }
            );
            const isAvailable = slots.some((s) => {
              if (s.totalTokens !== undefined) {
                return (s.availableTokens ?? 0) > 0;
              }
              return s.status === 'available';
            });
            return { item, isAvailable };
          } catch (err) {
            logger.error(
              `Error checking availability for doctor ${item.doctor.id} at clinic ${item.clinic.id} on ${targetDateStr}`,
              err
            );
            return { item, isAvailable: false };
          }
        })
      );

      const filteredData = availabilityChecks
        .filter((res) => res.isAvailable)
        .map((res) => res.item);

      totalRecords = filteredData.length;
      paginatedData = filteredData.slice(offset, offset + limit);
    } else {
      // Traditional SQL-paginated fetch
      const data = await queryBuilder
        .orderBy(
          desc(ratingScoreField),
          desc(likesCountField),
          distanceField ? distanceField : desc(UserModel.createdAt)
        )
        .limit(limit)
        .offset(offset);

      paginatedData = data;

      const [totalCount] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, UserModel.id)
        )
        .innerJoin(
          ClinicAssignModel,
          eq(ClinicAssignModel.userId, UserModel.id)
        )
        .innerJoin(ClinicModel, eq(ClinicModel.id, ClinicAssignModel.clinicId))
        .where(and(...filters));

      totalRecords = Number(totalCount?.count || 0);
    }

    // Attach next available slot and clinic services to the paginated list
    const dataWithSlotsAndServices = await Promise.all(
      paginatedData.map(async (item: any) => {
        const [nextAvailableSlot, services] = await Promise.all([
          PatientService.getDoctorNextAvailableSlot(
            item.doctor.id,
            item.clinic.id,
            targetDateStr
          ),
          database
            .select({
              id: ClinicServiceModel.id,
              clinicId: ClinicServiceModel.clinicId,
              serviceName: ClinicServiceModel.serviceName,
              price: ClinicServiceModel.price,
              currency: ClinicServiceModel.currency,
              additionalServices: ClinicServiceModel.additionalServices,
              durationDays: ClinicServiceModel.durationDays,
            })
            .from(ClinicServiceModel)
            .where(
              and(
                eq(ClinicServiceModel.doctorId, item.doctor.id),
                eq(ClinicServiceModel.clinicId, item.clinic.id),
                eq(ClinicServiceModel.isDeleted, false)
              )
            )
            .orderBy(asc(ClinicServiceModel.serviceName)),
        ]);

        return {
          ...item,
          clinic: {
            ...item.clinic,
            services,
          },
          nextAvailableSlot,
        };
      })
    );

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: dataWithSlotsAndServices,
      pagination: {
        totalRecords,
        totalPages,
        pageNumber: page,
        pageSize: limit,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 11. GET DOCTOR PUBLIC PROFILE
  // ─────────────────────────────────────────────────────────────────────────
  static async getDoctorPublicProfile(doctorId: string, patientId?: string) {
    const cacheKey = `doctor_public_profile:${doctorId}`;
    let doctorData: any = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        doctorData = JSON.parse(cached);
      }
    } catch (err) {
      logger.error(
        `[Cache] Error reading doctor public profile cache for doctor ${doctorId}:`,
        err
      );
    }

    if (!doctorData) {
      const [profile] = await database
        .select({
          id: UserModel.id,
          name: UserModel.name,
          gender: UserProfileModel.gender,
          profileImage: UserProfileModel.profileImage,
          qualification: UserProfessionalModel.qualification,
          yearsOfExperience: UserProfessionalModel.yearsOfExperience,
          speciality: UserProfessionalModel.speciality,
          registrationNumber: UserProfessionalModel.registrationNumber,
          about: UserProfessionalModel.about,
          isVerified: sql<boolean>`(${UserModel.userStatus} = 'Active')`,
          averageRating: UserProfessionalModel.averageRating,
          reviewCount: UserProfessionalModel.reviewCount,
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, UserModel.id)
        )
        .where(
          and(
            eq(UserModel.id, doctorId),
            sql`${UserModel.userType} IN ('Admin', 'Doctor')`,
            eq(UserModel.userStatus, 'Active')
          )
        )
        .limit(1);

      if (!profile) {
        throw new HttpError(404, 'Doctor profile not found or inactive');
      }

      const qualifications = await database
        .select()
        .from(DoctorQualificationModel)
        .where(eq(DoctorQualificationModel.userId, doctorId));

      const clinics = await database
        .select({
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          tagline: ClinicModel.Tagline,
          clinicAddress: ClinicModel.clinicAddress,
          clinicPhone: ClinicModel.clinicPhone,
          state: ClinicModel.State,
          city: ClinicModel.City,
          zipCode: ClinicModel.ZipCode,
          clinicLogo: ClinicModel.clinicLogo,
          latitude: ClinicModel.latitude,
          longitude: ClinicModel.longitude,
        })
        .from(ClinicAssignModel)
        .innerJoin(ClinicModel, eq(ClinicModel.id, ClinicAssignModel.clinicId))
        .where(
          and(
            eq(ClinicAssignModel.userId, doctorId),
            eq(ClinicModel.status, 'Active')
          )
        );

      const services = await database
        .select({
          id: ClinicServiceModel.id,
          clinicId: ClinicServiceModel.clinicId,
          serviceName: ClinicServiceModel.serviceName,
          price: ClinicServiceModel.price,
          currency: ClinicServiceModel.currency,
          additionalServices: ClinicServiceModel.additionalServices,
          durationDays: ClinicServiceModel.durationDays,
        })
        .from(ClinicServiceModel)
        .where(
          and(
            eq(ClinicServiceModel.doctorId, doctorId),
            eq(ClinicServiceModel.isDeleted, false)
          )
        )
        .orderBy(asc(ClinicServiceModel.serviceName));

      const clinicsWithServices = clinics.map((clinic) => ({
        ...clinic,
        services: services.filter((s) => s.clinicId === clinic.id),
      }));

      // Fetch total patients (all unique patient IDs with appointments for this doctor)
      const [patientCountResult] = await database
        .select({
          count: sql<number>`count(distinct ${AppointmentModel.patientId})::int`,
        })
        .from(AppointmentModel)
        .where(eq(AppointmentModel.doctorId, doctorId));
      const totalPatients = patientCountResult?.count || 0;

      doctorData = {
        ...profile,
        qualifications,
        clinics: clinicsWithServices,
        totalPatients,
      };

      try {
        await redisClient.setex(cacheKey, 7200, JSON.stringify(doctorData));
      } catch (err) {
        logger.error(
          `[Cache] Error writing doctor public profile cache for doctor ${doctorId}:`,
          err
        );
      }
    }

    // Check if favorited by the patient
    let isFavorite = false;
    if (patientId) {
      const [fav] = await database
        .select({ id: DoctorFavoriteModel.id })
        .from(DoctorFavoriteModel)
        .where(
          and(
            eq(DoctorFavoriteModel.patientId, patientId),
            eq(DoctorFavoriteModel.doctorId, doctorId)
          )
        )
        .limit(1);
      isFavorite = !!fav;
    }

    return {
      ...doctorData,
      isFavorite,
    };
  }

  static async toggleDoctorFavorite(patientId: string, doctorId: string) {
    // 1. Verify doctor exists first
    const [doctor] = await database
      .select({ id: UserModel.id })
      .from(UserModel)
      .where(
        and(
          eq(UserModel.id, doctorId),
          sql`${UserModel.userType} IN ('Admin', 'Doctor')`,
          eq(UserModel.userStatus, 'Active')
        )
      )
      .limit(1);

    if (!doctor) {
      throw new HttpError(404, 'Doctor not found or inactive');
    }

    // 2. Check if favorite link already exists
    const [existing] = await database
      .select({ id: DoctorFavoriteModel.id })
      .from(DoctorFavoriteModel)
      .where(
        and(
          eq(DoctorFavoriteModel.patientId, patientId),
          eq(DoctorFavoriteModel.doctorId, doctorId)
        )
      )
      .limit(1);

    if (existing) {
      // Remove it (unlike)
      await database
        .delete(DoctorFavoriteModel)
        .where(eq(DoctorFavoriteModel.id, existing.id));
      return { isFavorite: false };
    } else {
      // Insert it (like)
      await database.insert(DoctorFavoriteModel).values({
        patientId,
        doctorId,
      });
      return { isFavorite: true };
    }
  }

  static async listFavoriteDoctors(
    patientId: string,
    query: ListFavoriteDoctorsQueryDto
  ) {
    const page = Math.max(parseInt(query.pageNumber || '1', 10), 1);
    const limit = Math.max(parseInt(query.pageSize || '10', 10), 1);
    const offset = (page - 1) * limit;

    const filters = [
      eq(DoctorFavoriteModel.patientId, patientId),
      sql`${UserModel.userType} IN ('Admin', 'Doctor')`,
      eq(UserModel.userStatus, 'Active'),
    ];

    const data = await database
      .select({ doctorId: DoctorFavoriteModel.doctorId })
      .from(DoctorFavoriteModel)
      .innerJoin(UserModel, eq(UserModel.id, DoctorFavoriteModel.doctorId))
      .where(and(...filters))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(DoctorFavoriteModel)
      .innerJoin(UserModel, eq(UserModel.id, DoctorFavoriteModel.doctorId))
      .where(and(...filters));

    const totalRecords = Number(totalCount?.count || 0);
    const totalPages = Math.ceil(totalRecords / limit);

    // Resolve the full public profile for each doctor
    const doctors = await Promise.all(
      data.map((item) =>
        PatientService.getDoctorPublicProfile(item.doctorId, patientId)
      )
    );

    return {
      data: doctors,
      pagination: {
        totalRecords,
        totalPages,
        pageNumber: page,
        pageSize: limit,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 12. GET DOCTOR PUBLIC SLOTS
  // ─────────────────────────────────────────────────────────────────────────
  static async getDoctorPublicSlots(
    doctorId: string,
    query: { date: string; clinicId: string }
  ) {
    const requestedDateStr = query.date;

    const now = new Date();
    const istDateParts = now
      .toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .split('/'); // [dd, mm, yyyy]

    const istTodayYMD = `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}`;

    // Block past dates by returning an empty slots list
    if (requestedDateStr < istTodayYMD) {
      return { slots: [] };
    }

    // Filter past slots for today's date
    let timeFilter: string | undefined;
    if (requestedDateStr === istTodayYMD) {
      timeFilter = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      }); // "HH:MM"
    }

    return await AppointmentService.getAvailableSlotsForDate(
      query.clinicId,
      {
        date: query.date,
        time: timeFilter,
      },
      { doctorId }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 13. BOOK PATIENT APPOINTMENT
  // ─────────────────────────────────────────────────────────────────────────
  static async bookPatientAppointment(
    userId: string,
    payload: PatientBookingDto
  ) {
    if (payload.patientId !== userId) {
      const [link] = await database
        .select({ id: PatientFamilyLinksModel.id })
        .from(PatientFamilyLinksModel)
        .where(
          and(
            eq(PatientFamilyLinksModel.primaryPatientId, userId),
            eq(PatientFamilyLinksModel.linkedPatientId, payload.patientId)
          )
        )
        .limit(1);

      if (!link) {
        throw new HttpError(
          403,
          'Access denied. You can only book appointments for yourself or linked family members.'
        );
      }
    }

    const isRazorpay = payload.paymentMode === 'razorpay';
    let routeAccountId: string | null = null;
    let clinicShareAmount = 0;

    if (isRazorpay) {
      // 1. Fetch clinic Route settings
      const [clinic] = await database
        .select({
          id: ClinicModel.id,
          razorpayAccountId: ClinicModel.razorpayAccountId,
          routeStatus: ClinicModel.routeStatus,
        })
        .from(ClinicModel)
        .where(eq(ClinicModel.id, payload.clinicId))
        .limit(1);

      if (!clinic) {
        throw new HttpError(404, 'Clinic not found');
      }

      if (envConfig.ENABLE_RAZORPAY_ROUTE && clinic.routeStatus !== 'ACTIVE') {
        throw new HttpError(
          400,
          'Online payment is not enabled for this clinic.'
        );
      }

      // Check if Route split is active and configured (Phase 2), otherwise we fall back to central (Phase 1)
      if (
        envConfig.ENABLE_RAZORPAY_ROUTE &&
        clinic.razorpayAccountId &&
        clinic.routeStatus === 'ACTIVE'
      ) {
        routeAccountId = clinic.razorpayAccountId;
      }

      const price = parseFloat(payload.price || '0');
      if (price <= 0) {
        throw new HttpError(400, 'Invalid price specified for online payment');
      }

      if (routeAccountId) {
        // 2. Look up commission details
        const [commission] = await database
          .select({
            commissionType: ClinicCommissionModel.commissionType,
            commissionValue: ClinicCommissionModel.commissionValue,
          })
          .from(ClinicCommissionModel)
          .where(eq(ClinicCommissionModel.clinicId, payload.clinicId))
          .limit(1);

        const commType = commission?.commissionType || 'percentage';
        const commValue = commission?.commissionValue
          ? parseFloat(commission.commissionValue)
          : 5.0; // 5% default

        let platformFee = 0;
        if (commType === 'percentage') {
          platformFee = price * (commValue / 100);
        } else {
          platformFee = commValue;
        }

        clinicShareAmount = Math.max(0, price - platformFee);
      }
    }

    // 3. Create the appointment as Pending status
    const appointment = await AppointmentService.createAppointment(
      userId,
      payload.clinicId,
      {
        patientId: payload.patientId,
        doctorId: payload.doctorId,
        clinicServiceId: payload.clinicServiceId,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        appointmentType: 'Consultation',
        appointmentNotes: payload.notes,
        paymentMode: payload.paymentMode,
        paymentStatus: isRazorpay
          ? 'Pending'
          : (payload.paymentStatus ??
            (payload.paymentMode ? 'Paid' : 'Pending')),
        price: payload.price,
        paymentNotes: payload.paymentNotes,
      },
      userId
    );

    // 4. If online payment, create the Razorpay order (split/route or regular)
    if (isRazorpay) {
      try {
        let order: any;
        if (routeAccountId) {
          order = await createRazorpaySplitOrder(
            parseFloat(payload.price!),
            routeAccountId,
            clinicShareAmount,
            appointment.id,
            payload.clinicId,
            payload.patientId
          );
        } else {
          order = await createRazorpayAppointmentOrder(
            parseFloat(payload.price!),
            appointment.id,
            payload.clinicId,
            payload.patientId
          );
        }

        await database
          .update(AppointmentPaymentModel)
          .set({ gatewayOrderId: order.id })
          .where(eq(AppointmentPaymentModel.appointmentId, appointment.id));

        return {
          appointment,
          requiresPayment: true,
          paymentDetails: {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: envConfig.RAZORPAY_KEY_ID,
          },
        };
      } catch (err: any) {
        // If order creation fails, delete the created appointment to free the slot
        await database
          .delete(AppointmentModel)
          .where(eq(AppointmentModel.id, appointment.id));
        throw new HttpError(
          500,
          `Failed to initialize online payment: ${err.message}`
        );
      }
    }

    return {
      appointment,
      requiresPayment: false,
    };
  }

  /**
   * Confirms payment and updates appointment status (keeps it Pending, only updates payment to Paid)
   */
  static async confirmPaymentAndAppoint(
    appointmentId: string,
    paymentId: string,
    performedByUserId: string
  ) {
    // 1. Fetch appointment details
    const [appointment] = await database
      .select({
        id: AppointmentModel.id,
        patientId: AppointmentModel.patientId,
        doctorId: AppointmentModel.doctorId,
        clinicId: AppointmentModel.clinicId,
        appointmentStatus: AppointmentModel.appointmentStatus,
        price: AppointmentPaymentModel.price,
        paymentStatus: AppointmentPaymentModel.paymentStatus,
      })
      .from(AppointmentModel)
      .leftJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .where(eq(AppointmentModel.id, appointmentId))
      .limit(1);

    if (!appointment) {
      throw new HttpError(404, 'Appointment not found');
    }

    // If already paid, skip to avoid double processing
    if (appointment.paymentStatus === 'Paid') {
      return { success: true, message: 'Already paid' };
    }

    // 2. Update Database records (both Appointment status and Payment status)
    await database.transaction(async (tx) => {
      await tx
        .update(AppointmentModel)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(AppointmentModel.id, appointmentId));

      await tx
        .update(AppointmentPaymentModel)
        .set({
          paymentStatus: 'Paid',
          transactionId: paymentId,
          paymentNotes: 'Paid via Razorpay.',
          updatedAt: new Date(),
        })
        .where(eq(AppointmentPaymentModel.appointmentId, appointmentId));

      // Log PAYMENT_STATUS activity
      await AppointmentActivityHistoryService.logActivity({
        appointmentId,
        action: 'PAYMENT_STATUS',
        performedBy: performedByUserId,
        newState: { id: appointmentId, paymentStatus: 'Paid' },
        remarks: `Payment received for this appointment via online transfer (Ref: ${paymentId})`,
        tx,
      });
    });

    // 3. Trigger real-time broadcast to clinic room (non-blocking)
    try {
      broadcastAppointmentChange({
        appointmentId: appointment.id,
        clinicId: appointment.clinicId,
        doctorId: appointment.doctorId || undefined,
        patientId: appointment.patientId,
        action: 'payment_updated',
        performerUserId: performedByUserId,
      });
    } catch (err) {
      logger.error('Error broadcasting payment update', err);
    }

    // 4. Trigger payment success notification to patient (non-blocking)
    try {
      notifyPaymentReceived(
        appointment.id,
        appointment.patientId,
        appointment.price || '0',
        appointment.clinicId
      ).catch((err: any) => {
        logger.error('Failed to send payment success notification', err);
      });
    } catch (err) {
      logger.error('Error sending payment success notification', err);
    }

    // 5. Notify clinic staff (Doctor, Receptionist, Admin) of the newly paid appointment (non-blocking)
    try {
      getUserById(performedByUserId)
        .then(async (performer) => {
          const patientInfo = await getUserById(appointment.patientId);
          if (performer && patientInfo) {
            await notifyAppointmentCreated(
              appointment.clinicId,
              appointment.id,
              performer.id,
              patientInfo.name,
              performer.name,
              performer.userType,
              appointment.doctorId || '',
              appointment.patientId
            );
          }
        })
        .catch((err) => {
          logger.error(
            'Failed to notify clinic staff about paid appointment',
            err
          );
        });
    } catch (err) {
      logger.error(
        'Error triggering clinic staff notification for paid appointment',
        err
      );
    }

    return { success: true };
  }

  /**
   * Cancels appointment and updates payment status on payment failure
   */
  static async handlePaymentFailure(
    appointmentId: string,
    paymentId: string | null,
    performedByUserId: string
  ) {
    // 1. Fetch appointment details
    const [appointment] = await database
      .select({
        id: AppointmentModel.id,
        patientId: AppointmentModel.patientId,
        appointmentStatus: AppointmentModel.appointmentStatus,
      })
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, appointmentId))
      .limit(1);

    if (!appointment) {
      throw new HttpError(404, 'Appointment not found');
    }

    if (appointment.appointmentStatus === 'Cancelled') {
      return { success: true, message: 'Already cancelled' };
    }

    // 2. Update Database records (both Appointment status to Cancelled and Payment status to Failed)
    await database.transaction(async (tx) => {
      await tx
        .update(AppointmentModel)
        .set({
          appointmentStatus: 'Cancelled',
          updatedAt: new Date(),
        })
        .where(eq(AppointmentModel.id, appointmentId));

      await tx
        .update(AppointmentPaymentModel)
        .set({
          paymentStatus: 'Failed',
          paymentNotes: paymentId
            ? `Payment failed via Razorpay. Payment ID: ${paymentId}`
            : 'Payment failed/cancelled via Razorpay',
          updatedAt: new Date(),
        })
        .where(eq(AppointmentPaymentModel.appointmentId, appointmentId));

      // Log CANCELLED activity
      await AppointmentActivityHistoryService.logActivity({
        appointmentId,
        action: 'CANCELLED',
        performedBy: performedByUserId,
        newState: { id: appointmentId, appointmentStatus: 'Cancelled' },
        remarks:
          'Payment failed/cancelled. Appointment automatically cancelled.',
        tx,
      });

      // Log PAYMENT_STATUS activity (Failed)
      await AppointmentActivityHistoryService.logActivity({
        appointmentId,
        action: 'PAYMENT_STATUS',
        performedBy: performedByUserId,
        newState: { id: appointmentId, paymentStatus: 'Failed' },
        remarks: `Payment failed for this appointment.`,
        tx,
      });
    });

    return { success: true };
  }

  /**
   * Verifies Razorpay payment signature and confirms patient appointment
   */
  static async verifyAppointmentPayment(
    userId: string,
    payload: VerifyAppointmentPaymentDto
  ) {
    const { appointmentId, orderId, paymentId, signature } = payload;

    // 1. Fetch appointment details
    const [appointment] = await database
      .select({
        id: AppointmentModel.id,
        patientId: AppointmentModel.patientId,
      })
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, appointmentId))
      .limit(1);

    if (!appointment) {
      throw new HttpError(404, 'Appointment not found');
    }

    // 2. Check ownership (belongs to userId or family member)
    if (appointment.patientId !== userId) {
      const [link] = await database
        .select({ id: PatientFamilyLinksModel.id })
        .from(PatientFamilyLinksModel)
        .where(
          and(
            eq(PatientFamilyLinksModel.primaryPatientId, userId),
            eq(PatientFamilyLinksModel.linkedPatientId, appointment.patientId)
          )
        )
        .limit(1);

      if (!link) {
        throw new HttpError(
          403,
          'Access denied. You can only verify payments for yourself or linked family members.'
        );
      }
    }

    // 3. Verify Razorpay Signature
    const isValid = verifyRazorpayPayment(orderId, paymentId, signature);
    if (!isValid) {
      throw new HttpError(400, 'Invalid payment signature');
    }

    // 4. Confirm Payment and Appointment
    await PatientService.confirmPaymentAndAppoint(
      appointmentId,
      paymentId,
      userId
    );

    return {
      success: true,
      message: 'Payment verified and appointment confirmed successfully',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 14. LIST PATIENT APPOINTMENTS
  // ─────────────────────────────────────────────────────────────────────────
  static async listPatientAppointments(
    userId: string,
    patientId: string | null,
    query: PatientAppointmentsQueryDto
  ) {
    const page = Math.max(parseInt(query.pageNumber || '1', 10), 1);
    const limit = Math.max(parseInt(query.pageSize || '10', 10), 1);
    const offset = (page - 1) * limit;

    const familyMembers = await database
      .select({ linkedPatientId: PatientFamilyLinksModel.linkedPatientId })
      .from(PatientFamilyLinksModel)
      .where(eq(PatientFamilyLinksModel.primaryPatientId, userId));

    const familyMemberIds = familyMembers.map((m) => m.linkedPatientId);
    const allAuthorizedPatientIds = [userId, ...familyMemberIds];

    let filterPatientIds = allAuthorizedPatientIds;

    if (patientId) {
      if (!allAuthorizedPatientIds.includes(patientId)) {
        throw new HttpError(
          403,
          'Access denied. You can only view appointments for yourself or linked family members.'
        );
      }
      filterPatientIds = [patientId];
    }

    const filters = [inArray(AppointmentModel.patientId, filterPatientIds)];
    if (query.appointmentStatus && query.appointmentStatus.length > 0) {
      filters.push(
        inArray(AppointmentModel.appointmentStatus, query.appointmentStatus)
      );
    }

    if (query.startDate) {
      const start = new Date(`${query.startDate}T00:00:00.000Z`);
      filters.push(gte(AppointmentModel.appointmentDate, start));
    }
    if (query.endDate) {
      const end = new Date(`${query.endDate}T23:59:59.999Z`);
      filters.push(lte(AppointmentModel.appointmentDate, end));
    }

    if (query.upcomingOnly) {
      const now = new Date();
      const istDateParts = now
        .toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .split('/'); // [dd, mm, yyyy]
      const istTodayYMD = `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}`;

      filters.push(
        sql`CAST(${AppointmentModel.appointmentDate} AS date) >= CAST(${istTodayYMD} AS date)`
      );
    }

    if (query.pastOnly) {
      const now = new Date();
      const istDateParts = now
        .toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .split('/'); // [dd, mm, yyyy]
      const istTodayYMD = `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}`;

      filters.push(
        sql`CAST(${AppointmentModel.appointmentDate} AS date) < CAST(${istTodayYMD} AS date)`
      );
    }

    const sortOrder = query.sortOrder || 'desc';
    const sortBy = query.sortBy || 'appointmentDate';
    const orderClauses = [];

    if (sortBy === 'createdAt') {
      orderClauses.push(
        sortOrder === 'asc'
          ? asc(AppointmentModel.createdAt)
          : desc(AppointmentModel.createdAt)
      );
    } else {
      orderClauses.push(
        sortOrder === 'asc'
          ? asc(AppointmentModel.appointmentDate)
          : desc(AppointmentModel.appointmentDate)
      );
      orderClauses.push(
        sortOrder === 'asc'
          ? asc(AppointmentModel.appointmentTime)
          : desc(AppointmentModel.appointmentTime)
      );
    }

    const appointmentsList = await database
      .select({
        id: AppointmentModel.id,
        appointmentType: AppointmentModel.appointmentType,
        appointmentDate: AppointmentModel.appointmentDate,
        appointmentTime: AppointmentModel.appointmentTime,
        tokenNo: AppointmentModel.tokenNo,
        appointmentStatus: AppointmentModel.appointmentStatus,
        createdAt: AppointmentModel.createdAt,
        patient: {
          id: UserModel.id,
          name: UserModel.name,
          mobile: UserModel.mobile,
          profileImage: UserProfileModel.profileImage,
          relationship: sql<string>`COALESCE(${PatientFamilyLinksModel.relationship}, 'self')`,
        },
        doctor: {
          id: sql<string>`doctor_user.id`,
          name: sql<string>`doctor_user.name`,
          speciality: sql<
            string | null
          >`(SELECT speciality FROM user_professionals WHERE user_id = doctor_user.id LIMIT 1)`,
          profileImage: sql<
            string | null
          >`(SELECT profile_image FROM user_profiles WHERE user_id = doctor_user.id LIMIT 1)`,
        },
        clinic: {
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          clinicAddress: ClinicModel.clinicAddress,
        },
      })
      .from(AppointmentModel)
      .innerJoin(UserModel, eq(UserModel.id, AppointmentModel.patientId))
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .leftJoin(
        PatientFamilyLinksModel,
        and(
          eq(
            PatientFamilyLinksModel.linkedPatientId,
            AppointmentModel.patientId
          ),
          eq(PatientFamilyLinksModel.primaryPatientId, userId)
        )
      )
      .innerJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
      .innerJoin(
        sql`${UserModel} as doctor_user`,
        eq(sql`doctor_user.id`, AppointmentModel.doctorId)
      )
      .where(and(...filters))
      .orderBy(...orderClauses)
      .limit(limit)
      .offset(offset);

    const [totalCount] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(AppointmentModel)
      .where(and(...filters));

    const totalRecords = Number(totalCount?.count || 0);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: appointmentsList,
      pagination: {
        totalRecords,
        totalPages,
        pageNumber: page,
        pageSize: limit,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 15. GET PATIENT APPOINTMENT DETAIL
  // ─────────────────────────────────────────────────────────────────────────
  static async getPatientAppointmentDetail(
    userId: string,
    appointmentId: string
  ) {
    // 1️⃣ Fetch core appointment details to check existence and owner
    const [appointment] = await database
      .select({
        id: AppointmentModel.id,
        patientId: AppointmentModel.patientId,
        clinicId: AppointmentModel.clinicId,
      })
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, appointmentId))
      .limit(1);

    if (!appointment) {
      throw new HttpError(404, 'Appointment not found.');
    }

    // 2️⃣ Check ownership (self or linked family member)
    if (appointment.patientId !== userId) {
      const [link] = await database
        .select({ id: PatientFamilyLinksModel.id })
        .from(PatientFamilyLinksModel)
        .where(
          and(
            eq(PatientFamilyLinksModel.primaryPatientId, userId),
            eq(PatientFamilyLinksModel.linkedPatientId, appointment.patientId)
          )
        )
        .limit(1);

      if (!link) {
        throw new HttpError(
          403,
          'Access denied. You can only view details of your own or linked family member appointments.'
        );
      }
    }

    // 3️⃣ Call AppointmentService.getAppointment by passing an authorized user block to bypass role check
    const requestingUser = {
      id: userId,
      userType: 'Admin', // Use Admin role to bypass doctor/receptionist ownership checks
      clinicId: appointment.clinicId,
    };

    const details = await AppointmentService.getAppointment(
      appointmentId,
      requestingUser
    );

    if (!details) {
      throw new HttpError(404, 'Appointment details not found.');
    }

    return details;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 16. GET ASSOCIATED DOCTORS (ANY STATUS) FOR PRIMARY OR FAMILY MEMBERS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * GET /api/v1/patient/associated-doctors
   * Returns a distinct list of doctors who have appointments with the patient or linked family members.
   */
  static async getAssociatedDoctors(userId: string) {
    // 1. Fetch linked family members
    const familyMembers = await database
      .select({ linkedPatientId: PatientFamilyLinksModel.linkedPatientId })
      .from(PatientFamilyLinksModel)
      .where(eq(PatientFamilyLinksModel.primaryPatientId, userId));

    const allAuthorizedPatientIds = [
      userId,
      ...familyMembers.map((m) => m.linkedPatientId),
    ];

    // 2. Query distinct doctors who have appointments with these patients
    const doctorsList = await database
      .selectDistinct({
        id: UserModel.id,
        name: UserModel.name,
        speciality: UserProfessionalModel.speciality,
        qualification: UserProfessionalModel.qualification,
        profileImage: UserProfileModel.profileImage,
        clinic: {
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          clinicAddress: ClinicModel.clinicAddress,
          clinicPhone: ClinicModel.clinicPhone,
          clinicLogo: ClinicModel.clinicLogo,
        },
      })
      .from(AppointmentModel)
      .innerJoin(UserModel, eq(UserModel.id, AppointmentModel.doctorId))
      .innerJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
      .leftJoin(
        UserProfessionalModel,
        eq(UserProfessionalModel.userId, UserModel.id)
      )
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .where(
        and(
          inArray(AppointmentModel.patientId, allAuthorizedPatientIds),
          isNotNull(AppointmentModel.doctorId)
        )
      );

    return doctorsList;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 17. GET PATIENT LAB REPORTS (WITH RESULT VALUES AND PDF/IMAGE)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * GET /api/v1/patient/lab-reports
   * Returns a paginated list of lab test reports for the primary patient & linked family members.
   */
  static async getPatientLabReports(
    userId: string,
    query: PatientLabReportsQueryDto
  ) {
    const page = Math.max(parseInt(query.pageNumber || '1', 10), 1);
    const limit = Math.max(parseInt(query.pageSize || '10', 10), 1);
    const offset = (page - 1) * limit;

    // 1. Fetch linked family members to check authorized patient IDs
    const familyMembers = await database
      .select({ linkedPatientId: PatientFamilyLinksModel.linkedPatientId })
      .from(PatientFamilyLinksModel)
      .where(eq(PatientFamilyLinksModel.primaryPatientId, userId));

    const familyMemberIds = familyMembers.map((m) => m.linkedPatientId);
    const allAuthorizedPatientIds = [userId, ...familyMemberIds];

    let filterPatientIds = allAuthorizedPatientIds;

    if (query.patientId) {
      if (!allAuthorizedPatientIds.includes(query.patientId)) {
        throw new HttpError(
          403,
          'Access denied. You can only view lab reports for yourself or linked family members.'
        );
      }
      filterPatientIds = [query.patientId];
    }

    // 2. Build filters
    const filters = [inArray(LabOrderModel.patientId, filterPatientIds)];
    if (query.status) {
      filters.push(eq(LabOrderModel.reportStatus, query.status));
    }

    const patientUser = alias(UserModel, 'report_patient_user');
    const doctorUser = alias(UserModel, 'report_doctor_user');

    // 3. Query paginated test orders
    const labReportsList = await database
      .select({
        id: LabOrderModel.id,
        uniqueTestId: LabOrderModel.uniqueTestId,
        reportStatus: LabOrderModel.reportStatus,
        paymentStatus: LabOrderModel.paymentStatus,
        price: LabOrderModel.price,
        reportPdf: LabOrderModel.reportPdf,
        workflowStatus: LabOrderModel.workflowStatus,
        sampleStatus: LabOrderModel.sampleStatus,
        createdAt: LabOrderModel.createdAt,
        updatedAt: LabOrderModel.updatedAt,
        test: {
          id: TestCatalogModel.id,
          name: TestCatalogModel.name,
          category: TestCatalogModel.category,
        },
        appointment: {
          id: AppointmentModel.id,
          appointmentDate: AppointmentModel.appointmentDate,
          appointmentTime: AppointmentModel.appointmentTime,
        },
        doctor: {
          id: doctorUser.id,
          name: doctorUser.name,
        },
        clinic: {
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          clinicAddress: ClinicModel.clinicAddress,
        },
        patient: {
          id: patientUser.id,
          name: patientUser.name,
        },
      })
      .from(LabOrderModel)
      .innerJoin(
        TestCatalogModel,
        eq(TestCatalogModel.id, LabOrderModel.testId)
      )
      .innerJoin(
        AppointmentModel,
        eq(AppointmentModel.id, LabOrderModel.appointmentId)
      )
      .innerJoin(ClinicModel, eq(ClinicModel.id, LabOrderModel.clinicId))
      .leftJoin(patientUser, eq(patientUser.id, LabOrderModel.patientId))
      .leftJoin(doctorUser, eq(doctorUser.id, LabOrderModel.doctorId))
      .where(and(...filters))
      .orderBy(desc(LabOrderModel.createdAt))
      .limit(limit)
      .offset(offset);

    // 4. Query total count
    const [totalCount] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(LabOrderModel)
      .where(and(...filters));

    const totalRecords = Number(totalCount?.count || 0);
    const totalPages = Math.ceil(totalRecords / limit);

    // 5. Query and map completed / verified lab report result values
    const appointmentTestIds = labReportsList.map((r) => r.id);
    let results: any[] = [];
    let resultValues: any[] = [];

    if (appointmentTestIds.length > 0) {
      results = await database
        .select({
          id: LabOrderResultsModel.id,
          appointmentTestId: LabOrderResultsModel.appointmentTestId,
          status: LabOrderResultsModel.status,
          remarks: LabOrderResultsModel.remarks,
          verifiedAt: LabOrderResultsModel.verifiedAt,
          createdAt: LabOrderResultsModel.createdAt,
        })
        .from(LabOrderResultsModel)
        .where(
          and(
            inArray(LabOrderResultsModel.appointmentTestId, appointmentTestIds),
            inArray(LabOrderResultsModel.status, ['Completed', 'Verified'])
          )
        );

      const resultIds = results.map((res) => res.id);
      if (resultIds.length > 0) {
        resultValues = await database
          .select({
            id: LabOrderResultValuesModel.id,
            resultId: LabOrderResultValuesModel.resultId,
            parameterId: LabOrderResultValuesModel.parameterId,
            parameterName: sql<string>`COALESCE(${LabOrderResultValuesModel.displayNameSnapshot}, ${LabOrderResultValuesModel.parameterNameSnapshot})`,
            value: LabOrderResultValuesModel.value,
            unit: LabOrderResultValuesModel.unitSnapshot,
            referenceRange: LabOrderResultValuesModel.referenceRangeSnapshot,
            flag: LabOrderResultValuesModel.flag,
            sortOrder: LabOrderResultValuesModel.sortOrderSnapshot,
          })
          .from(LabOrderResultValuesModel)
          .where(inArray(LabOrderResultValuesModel.resultId, resultIds))
          .orderBy(
            asc(LabOrderResultValuesModel.sortOrderSnapshot),
            asc(LabOrderResultValuesModel.parameterNameSnapshot)
          );
      }
    }

    // 6. Map results and values to correct test orders
    const mappedReports = labReportsList.map((report) => {
      const result = results.find((res) => res.appointmentTestId === report.id);
      let mappedResult = null;

      if (result) {
        const values = resultValues.filter((val) => val.resultId === result.id);
        mappedResult = {
          id: result.id,
          status: result.status,
          remarks: result.remarks,
          verifiedAt: result.verifiedAt,
          createdAt: result.createdAt,
          values: values.map((v) => ({
            id: v.id,
            parameterId: v.parameterId,
            parameterName: v.parameterName,
            value: v.value,
            unit: v.unit,
            referenceRange: v.referenceRange,
            flag: v.flag,
          })),
        };
      }

      return {
        ...report,
        result: mappedResult,
      };
    });

    return {
      data: mappedReports,
      pagination: {
        totalRecords,
        totalPages,
        pageNumber: page,
        pageSize: limit,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 18. GET PATIENT PRESCRIPTIONS (WITH DETAILED DATA AND PDF/IMAGE URL)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * GET /api/v1/patient/prescriptions
   * Returns a paginated list of prescriptions (digital & manual) for the primary patient & linked family members.
   */
  static async getPatientPrescriptions(
    userId: string,
    query: PatientPrescriptionsQueryDto
  ) {
    const page = Math.max(parseInt(query.pageNumber || '1', 10), 1);
    const limit = Math.max(parseInt(query.pageSize || '10', 10), 1);
    const offset = (page - 1) * limit;

    // 1. Fetch linked family members to check authorized patient IDs
    const familyMembers = await database
      .select({ linkedPatientId: PatientFamilyLinksModel.linkedPatientId })
      .from(PatientFamilyLinksModel)
      .where(eq(PatientFamilyLinksModel.primaryPatientId, userId));

    const familyMemberIds = familyMembers.map((m) => m.linkedPatientId);
    const allAuthorizedPatientIds = [userId, ...familyMemberIds];

    let filterPatientIds = allAuthorizedPatientIds;

    if (query.patientId) {
      if (!allAuthorizedPatientIds.includes(query.patientId)) {
        throw new HttpError(
          403,
          'Access denied. You can only view prescriptions for yourself or linked family members.'
        );
      }
      filterPatientIds = [query.patientId];
    }

    // 2. Build filters
    const filters = [
      inArray(AppointmentModel.patientId, filterPatientIds),
      or(
        isNotNull(ReportCardModel.prescriptionPdf),
        isNotNull(doctorManualPrescriptionModel.doctorManualPrescription)
      ),
    ];

    const doctorUser = alias(UserModel, 'prescription_doctor_user');
    const patientUser = alias(UserModel, 'prescription_patient_user');

    if (query.search) {
      const searchPattern = `%${query.search.toLowerCase()}%`;
      filters.push(
        or(
          sql`LOWER(${doctorUser.name}) LIKE ${searchPattern}`,
          sql`LOWER(${ClinicModel.clinicName}) LIKE ${searchPattern}`
        )
      );
    }

    // 3. Query paginated appointments with prescriptions
    const prescriptionsList = await database
      .select({
        appointmentId: AppointmentModel.id,
        appointmentDate: AppointmentModel.appointmentDate,
        appointmentTime: AppointmentModel.appointmentTime,
        appointmentType: AppointmentModel.appointmentType,
        appointmentStatus: AppointmentModel.appointmentStatus,
        reportCard: {
          id: ReportCardModel.id,
          prescriptionPdf: ReportCardModel.prescriptionPdf,
          advice: ReportCardModel.advice,
          finalDiagnosis: ReportCardModel.finalDiagnosis,
          provisionalDiagnosis: ReportCardModel.provisionalDiagnosis,
          followUpDate: ReportCardModel.followUpDate,
          createdAt: ReportCardModel.createdAt,
        },
        manualPrescription: {
          id: doctorManualPrescriptionModel.id,
          prescriptionPdf:
            doctorManualPrescriptionModel.doctorManualPrescription,
          createdAt: doctorManualPrescriptionModel.createdAt,
        },
        doctor: {
          id: doctorUser.id,
          name: doctorUser.name,
          speciality: UserProfessionalModel.speciality,
          qualification: UserProfessionalModel.qualification,
          profileImage: UserProfileModel.profileImage,
        },
        patient: {
          id: patientUser.id,
          name: patientUser.name,
        },
        clinic: {
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          clinicAddress: ClinicModel.clinicAddress,
        },
      })
      .from(AppointmentModel)
      .leftJoin(
        ReportCardModel,
        eq(ReportCardModel.appointmentId, AppointmentModel.id)
      )
      .leftJoin(
        doctorManualPrescriptionModel,
        eq(doctorManualPrescriptionModel.appointmentId, AppointmentModel.id)
      )
      .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
      .leftJoin(
        UserProfessionalModel,
        eq(UserProfessionalModel.userId, doctorUser.id)
      )
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, doctorUser.id))
      .leftJoin(patientUser, eq(patientUser.id, AppointmentModel.patientId))
      .leftJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
      .where(and(...filters))
      .orderBy(desc(AppointmentModel.appointmentDate))
      .limit(limit)
      .offset(offset);

    // 4. Query total count
    const [totalCount] = await database
      .select({
        count: sql<number>`count(distinct ${AppointmentModel.id})::int`,
      })
      .from(AppointmentModel)
      .leftJoin(
        ReportCardModel,
        eq(ReportCardModel.appointmentId, AppointmentModel.id)
      )
      .leftJoin(
        doctorManualPrescriptionModel,
        eq(doctorManualPrescriptionModel.appointmentId, AppointmentModel.id)
      )
      .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
      .leftJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
      .where(and(...filters));

    const totalRecords = Number(totalCount?.count || 0);
    const totalPages = Math.ceil(totalRecords / limit);

    // 5. Query detailed medicine rows if report cards exist
    const reportCardIds = prescriptionsList
      .map((p) => p.reportCard?.id)
      .filter((id): id is string => !!id);

    let medicinesList: any[] = [];
    if (reportCardIds.length > 0) {
      medicinesList = await database
        .select({
          id: PrescriptionModel.id,
          reportCardId: PrescriptionModel.reportCardId,
          medicineName: PrescriptionModel.medicineName,
          composition: PrescriptionModel.composition,
          strength: PrescriptionModel.strength,
          dosage: PrescriptionModel.dosage,
          frequency: PrescriptionModel.frequency,
          duration: PrescriptionModel.duration,
          notes: PrescriptionModel.notes,
          imageUrl: PrescriptionModel.imageUrl,
          uses: PrescriptionModel.uses,
        })
        .from(PrescriptionModel)
        .where(inArray(PrescriptionModel.reportCardId, reportCardIds));
    }

    // 6. Map and combine digital / manual prescriptions
    const mappedPrescriptions = prescriptionsList.map((item) => {
      const reportCardId = item.reportCard?.id;
      const medicines = reportCardId
        ? medicinesList.filter((m) => m.reportCardId === reportCardId)
        : [];

      let prescriptionPdf = null;
      let prescriptionType: 'digital' | 'manual' | null = null;
      let prescriptionCreatedAt = null;

      if (item.reportCard?.prescriptionPdf) {
        prescriptionPdf = item.reportCard.prescriptionPdf;
        prescriptionType = 'digital';
        prescriptionCreatedAt = item.reportCard.createdAt;
      } else if (item.manualPrescription?.prescriptionPdf) {
        prescriptionPdf = item.manualPrescription.prescriptionPdf;
        prescriptionType = 'manual';
        prescriptionCreatedAt = item.manualPrescription.createdAt;
      }

      return {
        appointmentId: item.appointmentId,
        appointmentDate: item.appointmentDate,
        appointmentTime: item.appointmentTime,
        appointmentType: item.appointmentType,
        appointmentStatus: item.appointmentStatus,
        prescriptionPdf,
        prescriptionType,
        createdAt: prescriptionCreatedAt || item.appointmentDate,
        doctor: item.doctor,
        patient: item.patient,
        clinic: item.clinic,
        reportCard: item.reportCard?.id
          ? {
            id: item.reportCard.id,
            advice: item.reportCard.advice,
            finalDiagnosis: item.reportCard.finalDiagnosis,
            provisionalDiagnosis: item.reportCard.provisionalDiagnosis,
            followUpDate: item.reportCard.followUpDate,
          }
          : null,
        medicines,
      };
    });

    return {
      data: mappedPrescriptions,
      pagination: {
        totalRecords,
        totalPages,
        pageNumber: page,
        pageSize: limit,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 19. GET PATIENT ASSOCIATED DOCUMENTS (GALLERY, MANUAL PRESCRIPTIONS, CONSENT FILES, ETC.)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * GET /api/v1/patient/associated-documents
   * Returns a paginated list of consolidated documents for the primary patient & linked family members.
   */
  static async getPatientAssociatedDocuments(
    userId: string,
    query: PatientAssociatedDocumentsQueryDto
  ) {
    const page = Math.max(parseInt(query.pageNumber || '1', 10), 1);
    const limit = Math.max(parseInt(query.pageSize || '10', 10), 1);
    const offset = (page - 1) * limit;

    // 1. Fetch linked family members to check authorized patient IDs
    const familyMembers = await database
      .select({ linkedPatientId: PatientFamilyLinksModel.linkedPatientId })
      .from(PatientFamilyLinksModel)
      .where(eq(PatientFamilyLinksModel.primaryPatientId, userId));

    const familyMemberIds = familyMembers.map((m) => m.linkedPatientId);
    const allAuthorizedPatientIds = [userId, ...familyMemberIds];

    let filterPatientIds = allAuthorizedPatientIds;

    if (query.patientId) {
      if (!allAuthorizedPatientIds.includes(query.patientId)) {
        throw new HttpError(
          403,
          'Access denied. You can only view documents for yourself or linked family members.'
        );
      }
      filterPatientIds = [query.patientId];
    }

    const documentType = query.documentType;
    const patientUser = alias(UserModel, 'doc_patient_user');
    const doctorUser = alias(UserModel, 'doc_doctor_user');

    const allDocuments: any[] = [];

    // --- A. Query Patient Gallery Images ---
    if (!documentType || documentType === 'gallery') {
      const galleryItems = await database
        .select({
          id: patientGallery.id,
          fileUrl: patientGallery.imageUrl,
          description: patientGallery.description,
          createdAt: patientGallery.createdAt,
          appointmentId: patientGallery.appointmentId,
          appointmentDate: AppointmentModel.appointmentDate,
          doctor: {
            id: doctorUser.id,
            name: doctorUser.name,
            speciality: UserProfessionalModel.speciality,
          },
          patient: {
            id: patientUser.id,
            name: patientUser.name,
          },
          clinic: {
            id: ClinicModel.id,
            clinicName: ClinicModel.clinicName,
          },
        })
        .from(patientGallery)
        .innerJoin(
          AppointmentModel,
          eq(AppointmentModel.id, patientGallery.appointmentId)
        )
        .leftJoin(doctorUser, eq(doctorUser.id, patientGallery.doctorId))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, doctorUser.id)
        )
        .leftJoin(patientUser, eq(patientUser.id, patientGallery.patientId))
        .leftJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
        .where(inArray(patientGallery.patientId, filterPatientIds));

      galleryItems.forEach((item) => {
        allDocuments.push({
          ...item,
          documentType: 'gallery',
          fileName: item.description || 'Gallery Attachment',
        });
      });
    }

    // --- B. Query Manual Prescriptions ---
    if (!documentType || documentType === 'manual_prescription') {
      const manualPrescriptions = await database
        .select({
          id: doctorManualPrescriptionModel.id,
          fileUrl: doctorManualPrescriptionModel.doctorManualPrescription,
          createdAt: doctorManualPrescriptionModel.createdAt,
          appointmentId: doctorManualPrescriptionModel.appointmentId,
          appointmentDate: AppointmentModel.appointmentDate,
          doctor: {
            id: doctorUser.id,
            name: doctorUser.name,
            speciality: UserProfessionalModel.speciality,
          },
          patient: {
            id: patientUser.id,
            name: patientUser.name,
          },
          clinic: {
            id: ClinicModel.id,
            clinicName: ClinicModel.clinicName,
          },
        })
        .from(doctorManualPrescriptionModel)
        .innerJoin(
          AppointmentModel,
          eq(AppointmentModel.id, doctorManualPrescriptionModel.appointmentId)
        )
        .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, doctorUser.id)
        )
        .leftJoin(patientUser, eq(patientUser.id, AppointmentModel.patientId))
        .leftJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
        .where(
          and(
            inArray(AppointmentModel.patientId, filterPatientIds),
            isNotNull(doctorManualPrescriptionModel.doctorManualPrescription)
          )
        );

      manualPrescriptions.forEach((item) => {
        allDocuments.push({
          ...item,
          documentType: 'manual_prescription',
          fileName: 'Manual Prescription',
          description: 'Uploaded by Doctor',
        });
      });
    }

    // --- C. Query Consent Files ---
    if (!documentType || documentType === 'consent_file') {
      const consentFiles = await database
        .select({
          id: AppointmentClinicalModel.id,
          fileUrl: AppointmentClinicalModel.consentFile,
          description: AppointmentClinicalModel.consentNotes,
          createdAt: AppointmentClinicalModel.createdAt,
          appointmentId: AppointmentClinicalModel.appointmentId,
          appointmentDate: AppointmentModel.appointmentDate,
          doctor: {
            id: doctorUser.id,
            name: doctorUser.name,
            speciality: UserProfessionalModel.speciality,
          },
          patient: {
            id: patientUser.id,
            name: patientUser.name,
          },
          clinic: {
            id: ClinicModel.id,
            clinicName: ClinicModel.clinicName,
          },
        })
        .from(AppointmentClinicalModel)
        .innerJoin(
          AppointmentModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, doctorUser.id)
        )
        .leftJoin(patientUser, eq(patientUser.id, AppointmentModel.patientId))
        .leftJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
        .where(
          and(
            inArray(AppointmentModel.patientId, filterPatientIds),
            isNotNull(AppointmentClinicalModel.consentFile)
          )
        );

      consentFiles.forEach((item) => {
        allDocuments.push({
          ...item,
          documentType: 'consent_file',
          fileName: 'Consent Form',
        });
      });
    }

    // --- D. Query Digital Prescriptions ---
    if (!documentType || documentType === 'digital_prescription') {
      const digitalPrescriptions = await database
        .select({
          id: ReportCardModel.id,
          fileUrl: ReportCardModel.prescriptionPdf,
          description: ReportCardModel.finalDiagnosis,
          createdAt: ReportCardModel.createdAt,
          appointmentId: ReportCardModel.appointmentId,
          appointmentDate: AppointmentModel.appointmentDate,
          doctor: {
            id: doctorUser.id,
            name: doctorUser.name,
            speciality: UserProfessionalModel.speciality,
          },
          patient: {
            id: patientUser.id,
            name: patientUser.name,
          },
          clinic: {
            id: ClinicModel.id,
            clinicName: ClinicModel.clinicName,
          },
        })
        .from(ReportCardModel)
        .innerJoin(
          AppointmentModel,
          eq(AppointmentModel.id, ReportCardModel.appointmentId)
        )
        .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, doctorUser.id)
        )
        .leftJoin(patientUser, eq(patientUser.id, ReportCardModel.petientId))
        .leftJoin(ClinicModel, eq(ClinicModel.id, AppointmentModel.clinicId))
        .where(
          and(
            inArray(ReportCardModel.petientId, filterPatientIds),
            isNotNull(ReportCardModel.prescriptionPdf)
          )
        );

      digitalPrescriptions.forEach((item) => {
        allDocuments.push({
          ...item,
          documentType: 'digital_prescription',
          fileName: 'Digital Prescription',
        });
      });
    }

    // --- E. Query Lab Reports ---
    if (!documentType || documentType === 'lab_report') {
      const labReports = await database
        .select({
          id: LabOrderModel.id,
          fileUrl: LabOrderModel.reportPdf,
          description: TestCatalogModel.name,
          createdAt: LabOrderModel.createdAt,
          appointmentId: LabOrderModel.appointmentId,
          appointmentDate: AppointmentModel.appointmentDate,
          doctor: {
            id: doctorUser.id,
            name: doctorUser.name,
            speciality: UserProfessionalModel.speciality,
          },
          patient: {
            id: patientUser.id,
            name: patientUser.name,
          },
          clinic: {
            id: ClinicModel.id,
            clinicName: ClinicModel.clinicName,
          },
        })
        .from(LabOrderModel)
        .innerJoin(
          TestCatalogModel,
          eq(TestCatalogModel.id, LabOrderModel.testId)
        )
        .innerJoin(
          AppointmentModel,
          eq(AppointmentModel.id, LabOrderModel.appointmentId)
        )
        .leftJoin(doctorUser, eq(doctorUser.id, LabOrderModel.doctorId))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, doctorUser.id)
        )
        .leftJoin(patientUser, eq(patientUser.id, LabOrderModel.patientId))
        .leftJoin(ClinicModel, eq(ClinicModel.id, LabOrderModel.clinicId))
        .where(
          and(
            inArray(LabOrderModel.patientId, filterPatientIds),
            isNotNull(LabOrderModel.reportPdf)
          )
        );

      labReports.forEach((item) => {
        allDocuments.push({
          ...item,
          documentType: 'lab_report',
          fileName: `Lab Report - ${item.description || 'Test'}`,
        });
      });
    }

    // Apply Search Filter In-Memory
    let filteredDocs = allDocuments;
    if (query.search) {
      const searchPattern = query.search.toLowerCase();
      filteredDocs = filteredDocs.filter((doc) => {
        const doctorName = doc.doctor?.name?.toLowerCase() || '';
        const clinicName = doc.clinic?.clinicName?.toLowerCase() || '';
        const docName = doc.fileName?.toLowerCase() || '';
        const desc = doc.description?.toLowerCase() || '';
        return (
          doctorName.includes(searchPattern) ||
          clinicName.includes(searchPattern) ||
          docName.includes(searchPattern) ||
          desc.includes(searchPattern)
        );
      });
    }

    // Sort by createdAt descending
    filteredDocs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const totalRecords = filteredDocs.length;
    const paginatedDocs = filteredDocs.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: paginatedDocs,
      pagination: {
        totalRecords,
        totalPages,
        pageNumber: page,
        pageSize: limit,
      },
    };
  }
}
