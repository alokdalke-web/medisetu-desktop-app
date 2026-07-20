/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  and,
  between,
  desc,
  eq,
  gt,
  gte,
  isNull,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { createRazorpayRouteAccount } from '../../../utils/razorpay';
import { database } from '../../../configurations/dbConnection';
import { notifyClinicCreated } from '../../../utils/notificationHelpers';
import redisClient from '../../../configurations/redisConfig';
import { deleteFromS3 } from '../../../configurations/s3';
import { HttpError } from '../../../middlewear/errorHandler';
import { doctorRutineDufet } from '../../../utils/avaliblity';
import logger from '../../../utils/logger';
import { NoShowPolicyModel } from '../../appointments/models/noShowPolicy.model';
import { DoctorQualificationModel } from '../../doctor/models/doctor.model';
import { DoctorServices } from '../../doctor/services/doctor.service';
import { LabsModel } from '../../lab/models/lab.model';
import { PharmacyModel } from '../../pharmacy/models/pharmacy.model';
import {
  ClinicSubscriptionModel,
  SubscriptionPlanModel,
} from '../../subscription/models/subscription.model';
import { UserModel } from '../../users/models/user.model';
import { UserProfileModel } from '../../users/models/userProfile.model';
import { UserProfessionalModel } from '../../users/models/userProfessional.model';
import { ClinicAssignRow, FullClinicResponse } from '../clinic.types';
import { ClinicAssignModel, ClinicModel } from '../models/clinic.model';
import { ClinicReminderModel } from '../models/clinicReminder.model';
import { ClinicSettingsModel } from '../models/clinicSettings.model';
import {
  FullDoctorClinicDto,
  FulUpdateClinicSchemaDto,
} from '../schemas/clinic.schemas';

export class ClinicService {
  /**
   * Creates a new clinic + service + availability and updates doctor profile
   */
  static async createClinic(userId: string, payload: FullDoctorClinicDto) {
    const [existingClinic] = await database
      .select({ id: ClinicModel.id })
      .from(ClinicModel)
      .where(eq(ClinicModel.userId, userId))
      .limit(1);

    const isNewClinic = !existingClinic;

    const result = await database.transaction(async (tx) => {
      const [clinic] = await tx
        .insert(ClinicModel)
        .values({
          userId,
          clinicName: payload.clinicDetails.clinicName,
          clinicPhone: payload.clinicDetails.clinicPhone,
          Tagline: payload.clinicDetails.Tagline,
          clinicAddress: payload.clinicDetails.clinicAddress,
          State: payload.clinicDetails.State,
          City: payload.clinicDetails.City,
          ZipCode: payload.clinicDetails.ZipCode,
          clinicLogo: payload.clinicDetails.clinicLogo,
          latitude: payload.clinicDetails.latitude,
          longitude: payload.clinicDetails.longitude,
        })
        .onConflictDoUpdate({
          target: [ClinicModel.userId],
          set: {
            clinicName: payload.clinicDetails.clinicName,
            clinicPhone: payload.clinicDetails.clinicPhone,
            Tagline: payload.clinicDetails.Tagline,
            clinicAddress: payload.clinicDetails.clinicAddress,
            State: payload.clinicDetails.State,
            City: payload.clinicDetails.City,
            ZipCode: payload.clinicDetails.ZipCode,
            clinicLogo: payload.clinicDetails.clinicLogo,
            latitude: payload.clinicDetails.latitude,
            longitude: payload.clinicDetails.longitude,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: ClinicModel.id,
          userId: ClinicModel.userId,
          latitude: ClinicModel.latitude,
          longitude: ClinicModel.longitude,
        });
      if (
        payload.adminProfile &&
        Object.keys(payload.adminProfile).length > 0
      ) {
        const userSetObj: Record<string, any> = {};
        const profileSetObj: Record<string, any> = {};
        const professionalSetObj: Record<string, any> = {};

        const allowedUserFields = [
          'name',
          'mobile',
          'isAdminDoctorAccess',
        ] as const;
        const allowedProfileFields = [
          'alternateMobile',
          'profileImage',
        ] as const;
        const allowedProfessionalFields = [
          'speciality',
          'registrationNumber',
          'qualification',
        ] as const;

        for (const k of allowedUserFields) {
          let val = (payload.adminProfile as any)[k];
          if (typeof val === 'undefined' && (payload as any)[k]) {
            val = (payload as any)[k];
          }
          if (typeof val !== 'undefined') userSetObj[k] = val;
        }
        for (const k of allowedProfileFields) {
          let val = (payload.adminProfile as any)[k];
          if (typeof val === 'undefined' && (payload as any)[k]) {
            val = (payload as any)[k];
          }
          if (typeof val !== 'undefined') profileSetObj[k] = val;
        }
        for (const k of allowedProfessionalFields) {
          let val = (payload.adminProfile as any)[k];
          if (typeof val === 'undefined' && (payload as any)[k]) {
            val = (payload as any)[k];
          }
          if (typeof val !== 'undefined') professionalSetObj[k] = val;
        }

        if (Object.keys(userSetObj).length > 0) {
          userSetObj.updatedAt = sql`NOW()`;
          await tx
            .update(UserModel)
            .set(userSetObj)
            .where(eq(UserModel.id, userId));
        }
        if (Object.keys(profileSetObj).length > 0) {
          profileSetObj.updatedAt = sql`NOW()`;
          await tx
            .insert(UserProfileModel)
            .values({ userId, ...profileSetObj })
            .onConflictDoUpdate({
              target: [UserProfileModel.userId],
              set: profileSetObj,
            });
        }
        if (Object.keys(professionalSetObj).length > 0) {
          professionalSetObj.updatedAt = sql`NOW()`;
          await tx
            .insert(UserProfessionalModel)
            .values({ userId, ...professionalSetObj })
            .onConflictDoUpdate({
              target: [UserProfessionalModel.userId],
              set: professionalSetObj,
            });
        }
      }

      await tx
        .insert(ClinicAssignModel)
        .values({
          userId: userId,
          clinicId: clinic.id,
        })
        .onConflictDoUpdate({
          target: [ClinicAssignModel.userId, ClinicAssignModel.clinicId],
          set: {
            updatedAt: new Date(),
          },
        });
      return clinic;
    });

    // Check if admin is being granted doctor access - outside transaction
    // if (payload.adminProfile?.isAdminDoctorAccess) {
    //   await DoctorServices.updateUser(
    //     userId,
    //     result.id,
    //     doctorRutineDufet as any
    //   );
    // }

    // Auto-assign free plan with default limits on clinic creation
    await ClinicService.assignDefaultFreePlan(result.id);

    if (isNewClinic) {
      // Find the performer's user info
      const [performer] = await database
        .select({
          name: UserModel.name,
          userType: UserModel.userType,
        })
        .from(UserModel)
        .where(eq(UserModel.id, userId))
        .limit(1);

      if (performer) {
        notifyClinicCreated(
          result.id,
          payload.clinicDetails.clinicName,
          userId,
          performer.name || 'Admin/Doctor',
          performer.userType
        ).catch((err) => {
          logger.error(
            `[Notification] Failed to send clinic creation notification to super admins:`,
            err
          );
        });
      }
    }

    return result;
  }

  /**
   * Assigns the default free plan to a newly created clinic.
   * This ensures every clinic starts with the free tier limits.
   * If the free plan doesn't exist, it logs a warning and skips.
   */
  static async assignDefaultFreePlan(clinicId: string): Promise<void> {
    try {
      // 1. Find the free plan
      const [freePlan] = await database
        .select({
          id: SubscriptionPlanModel.id,
          slug: SubscriptionPlanModel.slug,
        })
        .from(SubscriptionPlanModel)
        .where(eq(SubscriptionPlanModel.slug, 'Free'))
        .limit(1);

      if (!freePlan) {
        logger.warn(
          `[ClinicService] Free plan not found in subscription_plans. Skipping default assignment for clinic ${clinicId}.`
        );
        return;
      }

      // 2. Check if clinic already has an active subscription (idempotent)
      const [existingSub] = await database
        .select({ id: ClinicSubscriptionModel.id })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.clinicId, clinicId),
            eq(ClinicSubscriptionModel.active, true)
          )
        )
        .limit(1);

      if (existingSub) {
        // Already has a subscription, skip
        return;
      }

      // 3. Create free subscription (no expiry)
      await database.insert(ClinicSubscriptionModel).values({
        clinicId,
        planId: freePlan.id,
        startsAt: new Date(),
        expiresAt: null, // Free plan never expires
        active: true,
        provider: 'system',
        providerSubscriptionId: 'default-free',
        paymentMode: 'free',
        transactionId: `free_${Date.now()}`,
        paymentStatus: 'success',
        price: '0.00',
      });

      // 4. Invalidate any cached subscription data
      await redisClient.del(`clinic_active_subscription:${clinicId}`);
      await redisClient.del(`clinic_plan:${clinicId}`);
      await redisClient.del(`clinic_details:${clinicId}`);

      logger.info(
        `[ClinicService] Default free plan assigned to clinic ${clinicId}`
      );
    } catch (error) {
      // Don't fail clinic creation if plan assignment fails
      logger.error(
        `[ClinicService] Failed to assign default free plan to clinic ${clinicId}:`,
        error
      );
    }
  }

  static async updateClinic(
    userId: string,
    payload: FulUpdateClinicSchemaDto
  ): Promise<any> {
    // find clinic
    const [existingClinic] = await database
      .select({ id: ClinicModel.id })
      .from(ClinicModel)
      .where(eq(ClinicModel.userId, userId));

    if (!existingClinic) throw new HttpError(404, 'Clinic not found');
    const clinicId = existingClinic.id;
    return this.updateClinicById(clinicId, payload);
  }

  static async updateClinicById(
    clinicId: string,
    payload: FulUpdateClinicSchemaDto,
    profileImage?: string
  ): Promise<any> {
    const [existingClinic] = await database
      .select({
        id: ClinicModel.id,
        userId: ClinicModel.userId,
        clinicLogo: ClinicModel.clinicLogo,
      })
      .from(ClinicModel)
      .where(eq(ClinicModel.id, clinicId));

    if (!existingClinic) throw new HttpError(404, 'Clinic not found');

    const [existingUser] = await database
      .select({ profileImage: UserProfileModel.profileImage })
      .from(UserModel)
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .where(eq(UserModel.id, existingClinic.userId));

    await database.transaction(async (tx) => {
      // === 1) clinicDetails: update only if provided and only provided fields ===
      if (payload.qualifications && payload.qualifications.length > 0) {
        await DoctorServices.updateDoctorProfile(
          tx,
          payload,
          existingClinic.userId
        );
      }
      if (profileImage) {
        {
          await tx
            .insert(UserProfileModel)
            .values({
              userId: existingClinic.userId,
              profileImage: profileImage,
            })
            .onConflictDoUpdate({
              target: [UserProfileModel.userId],
              set: {
                profileImage: profileImage,
                updatedAt: sql`NOW()`,
              },
            });
        }
      }
      if (
        payload.clinicDetails &&
        Object.keys(payload.clinicDetails).length > 0
      ) {
        const setObj: Record<string, any> = {};
        // copy only defined fields into setObj
        const allowed = [
          'clinicName',
          'clinicPhone',
          'Tagline',
          'clinicAddress',
          'State',
          'City',
          'ZipCode',
          'clinicLogo',
          'status',
          'latitude',
          'longitude',
        ] as const;
        for (const k of allowed) {
          const val = (payload.clinicDetails as any)[k];
          if (typeof val !== 'undefined') setObj[k] = val;
        }
        if (Object.keys(setObj).length > 0) {
          setObj.updatedAt = sql`NOW()`;
          await tx
            .update(ClinicModel)
            .set(setObj)
            .where(eq(ClinicModel.id, clinicId))
            .returning({
              id: ClinicModel.id,
              clinicName: ClinicModel.clinicName,
              clinicPhone: ClinicModel.clinicPhone,
              Tagline: ClinicModel.Tagline,
              clinicAddress: ClinicModel.clinicAddress,
              State: ClinicModel.State,
              City: ClinicModel.City,
              ZipCode: ClinicModel.ZipCode,
              clinicLogo: ClinicModel.clinicLogo,
              status: ClinicModel.status,
              latitude: ClinicModel.latitude,
              longitude: ClinicModel.longitude,
            });
        }
      }

      if (
        payload.adminProfile &&
        Object.keys(payload.adminProfile).length > 0
      ) {
        const [clinic] = await tx
          .select({ userId: ClinicModel.userId })
          .from(ClinicModel)
          .where(eq(ClinicModel.id, clinicId));

        if (!clinic) throw new HttpError(404, 'Clinic not found');

        const userSetObj: Record<string, any> = {};
        const profileSetObj: Record<string, any> = {};
        const professionalSetObj: Record<string, any> = {};

        const allowedUserFields = [
          'name',
          'mobile',
          'isAdminDoctorAccess',
        ] as const;
        const allowedProfileFields = [
          'alternateMobile',
          'profileImage',
          'upiIds',
        ] as const;
        const allowedProfessionalFields = [
          'speciality',
          'registrationNumber',
          'qualification',
        ] as const;

        for (const k of allowedUserFields) {
          let val = (payload.adminProfile as any)[k];
          if (typeof val === 'undefined' && (payload as any)[k]) {
            val = (payload as any)[k];
          }
          if (typeof val !== 'undefined') userSetObj[k] = val;
        }
        for (const k of allowedProfileFields) {
          let val = (payload.adminProfile as any)[k];
          if (typeof val === 'undefined' && (payload as any)[k]) {
            val = (payload as any)[k];
          }
          if (typeof val !== 'undefined') profileSetObj[k] = val;
        }
        for (const k of allowedProfessionalFields) {
          let val = (payload.adminProfile as any)[k];
          if (typeof val === 'undefined' && (payload as any)[k]) {
            val = (payload as any)[k];
          }
          if (typeof val !== 'undefined') professionalSetObj[k] = val;
        }

        if (Object.keys(userSetObj).length > 0) {
          userSetObj.updatedAt = sql`NOW()`;
          await tx
            .update(UserModel)
            .set(userSetObj)
            .where(eq(UserModel.id, clinic.userId));
        }
        if (Object.keys(profileSetObj).length > 0) {
          profileSetObj.updatedAt = sql`NOW()`;
          await tx
            .insert(UserProfileModel)
            .values({ userId: clinic.userId, ...profileSetObj })
            .onConflictDoUpdate({
              target: [UserProfileModel.userId],
              set: profileSetObj,
            });
        }
        if (Object.keys(professionalSetObj).length > 0) {
          professionalSetObj.updatedAt = sql`NOW()`;
          await tx
            .insert(UserProfessionalModel)
            .values({ userId: clinic.userId, ...professionalSetObj })
            .onConflictDoUpdate({
              target: [UserProfessionalModel.userId],
              set: professionalSetObj,
            });
        }
      }
    }); // end transaction

    if (
      payload.clinicDetails?.clinicLogo &&
      existingClinic.clinicLogo &&
      existingClinic.clinicLogo !== payload.clinicDetails.clinicLogo
    ) {
      await deleteFromS3(existingClinic.clinicLogo).catch(console.error);
    }

    // Delete old profile image if it was updated
    const newProfileImage = profileImage || payload.adminProfile?.profileImage;
    if (
      newProfileImage &&
      existingUser?.profileImage &&
      existingUser.profileImage !== newProfileImage
    ) {
      await deleteFromS3(existingUser.profileImage).catch(console.error);
    }

    // Check if admin is being granted doctor access - outside transaction
    if (payload.adminProfile?.isAdminDoctorAccess) {
      // We need the userId for the clinic admin
      const [clinic] = await database
        .select({ userId: ClinicModel.userId })
        .from(ClinicModel)
        .where(eq(ClinicModel.id, clinicId));

      if (clinic) {
        await DoctorServices.updateUser(
          clinic.userId,
          clinicId,
          doctorRutineDufet as any
        );
      }
    }

    try {
      await redisClient.del(`clinic_details:${clinicId}`);
      await redisClient.del(`doctor_public_profile:${existingClinic.userId}`);
    } catch (err) {
      logger.error(
        `[Cache] Error invalidating clinic/doctor cache in updateClinicById for clinic ${clinicId}:`,
        err
      );
    }

    return this.getClinicById(clinicId);
  }
  /**
   * Get full nested clinic by userId
   */
  static async getClinicByUserId(
    userId: string,
    clinicId: string
  ): Promise<FullClinicResponse | null> {
    // find clinic
    return await database.transaction(async (tx) => {
      const [clinic] = await tx
        .select()
        .from(ClinicModel)
        .where(eq(ClinicModel.id, clinicId));
      const [policy] = await tx
        .select({
          isActive: NoShowPolicyModel.isActive,
        })
        .from(NoShowPolicyModel)
        .where(eq(NoShowPolicyModel.clinicId, clinicId));
      const [profile] = await tx
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          socialProvider: UserModel.socialProvider,
          socialProviderId: UserModel.socialProviderId,
          userType: UserModel.userType,
          userStatus: UserModel.userStatus,
          emailVerifiedAt: UserModel.emailVerifiedAt,
          isUserBlocked: UserModel.isUserBlocked,
          isAdminDoctorAccess: UserModel.isAdminDoctorAccess,
          isArchive: UserModel.isArchive,
          paymentVisible: UserModel.paymentVisible,
          createdAt: UserModel.createdAt,
          updatedAt: UserModel.updatedAt,
          // Onboarding fields from clinic (not user)
          onboardingStatus: ClinicModel.onboardingStatus,
          approvalRequestSent: ClinicModel.approvalRequestSent,
          currentStep: ClinicModel.currentStep,
          // Profile fields
          alternateMobile: UserProfileModel.alternateMobile,
          gender: UserProfileModel.gender,
          address: UserProfileModel.address,
          city: UserProfileModel.city,
          state: UserProfileModel.state,
          zipCode: UserProfileModel.zipCode,
          profileImage: UserProfileModel.profileImage,
          upiIds: UserProfileModel.upiIds,
          age: UserProfileModel.age,
          dob: UserProfileModel.dob,
          // Professional fields
          qualification: UserProfessionalModel.qualification,
          yearsOfExperience: UserProfessionalModel.yearsOfExperience,
          licenseNumber: UserProfessionalModel.licenseNumber,
          speciality: UserProfessionalModel.speciality,
          registrationNumber: UserProfessionalModel.registrationNumber,
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, UserModel.id)
        )
        .leftJoin(ClinicModel, eq(ClinicModel.userId, UserModel.id))
        .where(eq(UserModel.id, userId));

      if (!profile) {
        return null;
      }

      let subscriptionDetails: any = {
        planName: 'Free',
        price: '0.00',
        slug: 'Free',
        providerSubscriptionId: null,
        expiresAt: null,
        active: true,
      };

      if (
        profile.userType === 'Admin' ||
        profile.userType === 'Doctor' ||
        profile.userType === 'Receptionist'
      ) {
        const [subscription] = await tx
          .select({
            expiresAt: ClinicSubscriptionModel.expiresAt,
            paymentStatus: ClinicSubscriptionModel.paymentStatus,
            active: ClinicSubscriptionModel.active,
            slug: SubscriptionPlanModel.slug,
            planName: SubscriptionPlanModel.name,
            price: SubscriptionPlanModel.price,
            providerSubscriptionId:
              ClinicSubscriptionModel.providerSubscriptionId,
          })
          .from(ClinicSubscriptionModel)
          .leftJoin(
            SubscriptionPlanModel,
            eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
          )
          .where(
            and(
              eq(ClinicSubscriptionModel.clinicId, clinicId),
              eq(ClinicSubscriptionModel.active, true)
            )
          )
          .orderBy(desc(ClinicSubscriptionModel.createdAt))
          .limit(1);
        // 4️⃣ If subscription exists → override FREE plan
        if (
          subscription &&
          subscription.paymentStatus === 'success' &&
          subscription.active
        ) {
          // Check expiry: null expiresAt means never expires (Free plan)
          const isValid =
            !subscription.expiresAt ||
            new Date(subscription.expiresAt).setHours(23, 59, 59, 999) >=
              Date.now();

          if (isValid) {
            subscriptionDetails = {
              planName: subscription.planName ?? 'Free',
              price:
                subscription.providerSubscriptionId === 'pro-yearly'
                  ? Number(subscription.price ?? 0) * 12 * 0.9
                  : (subscription.price ?? '0.00'),
              slug: subscription.slug ?? 'Free',
              expiresAt: subscription.expiresAt ?? null,
              active: subscription.active,
              providerSubscriptionId:
                subscription.providerSubscriptionId ?? null,
            };
          }
        }
      }
      const qualification = await database
        .select()
        .from(DoctorQualificationModel)
        .where(eq(DoctorQualificationModel.userId, userId));
      return {
        clinic,
        profile,
        subscription: subscriptionDetails,
        qualification,
        noShowPolicyActive: policy?.isActive ?? false,
      };
    });
  }

  static async getClinicDetailsByUserId(
    userId: string,
    clinicId: string
  ): Promise<FullClinicResponse | null> {
    return this.getClinicDetailsById(clinicId);
  }

  /**
   * Get full nested clinic by clinicId
   */
  static async getClinicById(
    clinicId: string
  ): Promise<FullClinicResponse | null> {
    return await database.transaction(async (tx) => {
      const [clinic] = await tx
        .select()
        .from(ClinicModel)
        .where(eq(ClinicModel.id, clinicId));

      const [profile] = await database
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          socialProvider: UserModel.socialProvider,
          socialProviderId: UserModel.socialProviderId,
          userType: UserModel.userType,
          userStatus: UserModel.userStatus,
          emailVerifiedAt: UserModel.emailVerifiedAt,
          isUserBlocked: UserModel.isUserBlocked,
          isAdminDoctorAccess: UserModel.isAdminDoctorAccess,
          isArchive: UserModel.isArchive,
          paymentVisible: UserModel.paymentVisible,
          createdAt: UserModel.createdAt,
          updatedAt: UserModel.updatedAt,
          // Onboarding fields from clinic (not user)
          onboardingStatus: ClinicModel.onboardingStatus,
          approvalRequestSent: ClinicModel.approvalRequestSent,
          currentStep: ClinicModel.currentStep,
          alternateMobile: UserProfileModel.alternateMobile,
          gender: UserProfileModel.gender,
          address: UserProfileModel.address,
          city: UserProfileModel.city,
          state: UserProfileModel.state,
          zipCode: UserProfileModel.zipCode,
          profileImage: UserProfileModel.profileImage,
          upiIds: UserProfileModel.upiIds,
          age: UserProfileModel.age,
          dob: UserProfileModel.dob,
          qualification: UserProfessionalModel.qualification,
          yearsOfExperience: UserProfessionalModel.yearsOfExperience,
          licenseNumber: UserProfessionalModel.licenseNumber,
          speciality: UserProfessionalModel.speciality,
          registrationNumber: UserProfessionalModel.registrationNumber,
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, UserModel.id)
        )
        .leftJoin(ClinicModel, eq(ClinicModel.userId, UserModel.id))
        .where(eq(UserModel.id, clinic.userId));

      return {
        clinic,
        profile,
      };
    });
  }
  static async getClinicDetailsById(
    clinicId: string
  ): Promise<FullClinicResponse | null> {
    const cacheKey = `clinic_details:${clinicId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.error(
        `[Cache] Error reading clinic details cache for clinic ${clinicId}:`,
        err
      );
    }

    const result = await database.transaction(async (tx) => {
      const [clinic] = await tx
        .select()
        .from(ClinicModel)
        .where(eq(ClinicModel.id, clinicId));

      if (!clinic) return null;

      const [profile] = await database
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          socialProvider: UserModel.socialProvider,
          socialProviderId: UserModel.socialProviderId,
          userType: UserModel.userType,
          userStatus: UserModel.userStatus,
          emailVerifiedAt: UserModel.emailVerifiedAt,
          isUserBlocked: UserModel.isUserBlocked,
          isAdminDoctorAccess: UserModel.isAdminDoctorAccess,
          isArchive: UserModel.isArchive,
          paymentVisible: UserModel.paymentVisible,
          createdAt: UserModel.createdAt,
          updatedAt: UserModel.updatedAt,
          // Onboarding fields from clinic (not user)
          onboardingStatus: ClinicModel.onboardingStatus,
          approvalRequestSent: ClinicModel.approvalRequestSent,
          currentStep: ClinicModel.currentStep,
          alternateMobile: UserProfileModel.alternateMobile,
          gender: UserProfileModel.gender,
          address: UserProfileModel.address,
          city: UserProfileModel.city,
          state: UserProfileModel.state,
          zipCode: UserProfileModel.zipCode,
          profileImage: UserProfileModel.profileImage,
          age: UserProfileModel.age,
          dob: UserProfileModel.dob,
          qualification: UserProfessionalModel.qualification,
          yearsOfExperience: UserProfessionalModel.yearsOfExperience,
          licenseNumber: UserProfessionalModel.licenseNumber,
          speciality: UserProfessionalModel.speciality,
          registrationNumber: UserProfessionalModel.registrationNumber,
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, UserModel.id)
        )
        .leftJoin(ClinicModel, eq(ClinicModel.userId, UserModel.id))
        .where(eq(UserModel.id, clinic.userId));

      // Fetch subscription details
      const [subscription] = await tx
        .select({
          planName: SubscriptionPlanModel.name,
          price: SubscriptionPlanModel.price,
          slug: SubscriptionPlanModel.slug,
          expiresAt: ClinicSubscriptionModel.expiresAt,
          active: ClinicSubscriptionModel.active,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          SubscriptionPlanModel,
          eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.clinicId, clinicId),
            eq(ClinicSubscriptionModel.active, true)
          )
        )
        .limit(1);

      // Fetch subscription history
      const subscriptionHistory = await tx
        .select({
          planName: SubscriptionPlanModel.name,
          price: SubscriptionPlanModel.price,
          slug: SubscriptionPlanModel.slug,
          expiresAt: ClinicSubscriptionModel.expiresAt,
          active: ClinicSubscriptionModel.active,
          startsAt: ClinicSubscriptionModel.startsAt,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          SubscriptionPlanModel,
          eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
        )
        .where(eq(ClinicSubscriptionModel.clinicId, clinicId))
        .orderBy(desc(ClinicSubscriptionModel.startsAt));

      // Fetch counts, users, pharmacies, labs in parallel (with limits)
      const [
        [userCount],
        [pharmacyCount],
        [labCount],
        usersData,
        pharmacies,
        labs,
      ] = await Promise.all([
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(ClinicAssignModel)
          .where(eq(ClinicAssignModel.clinicId, clinicId)),
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(PharmacyModel)
          .where(
            and(
              eq(PharmacyModel.clinicId, clinicId),
              eq(PharmacyModel.isDeleted, false)
            )
          ),
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(LabsModel)
          .where(eq(LabsModel.clinicId, clinicId)),
        tx
          .select({ user: UserModel })
          .from(UserModel)
          .innerJoin(
            ClinicAssignModel,
            eq(UserModel.id, ClinicAssignModel.userId)
          )
          // .where(eq(ClinicAssignModel.clinicId, clinicId))
          .where(
            and(
              eq(ClinicAssignModel.clinicId, clinicId),
              ne(UserModel.userType, 'Patient') // Exclude patients
            )
          )
          .limit(100),
        tx
          .select()
          .from(PharmacyModel)
          .where(
            and(
              eq(PharmacyModel.clinicId, clinicId),
              eq(PharmacyModel.isDeleted, false)
            )
          )
          .limit(50),
        tx
          .select()
          .from(LabsModel)
          .where(eq(LabsModel.clinicId, clinicId))
          .limit(50),
      ]);

      const users = usersData.map((row) => row.user);

      const sortedUsers = users.sort((a, b) => {
        const priorityOrder: { [key: string]: number } = {
          Admin: 1,
          Doctor: 2,
          Receptionist: 3,
        };

        const priorityA = priorityOrder[a.userType] || 999;
        const priorityB = priorityOrder[b.userType] || 999;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // If same priority or both are other types, sort alphabetically by userType
        return a.userType.localeCompare(b.userType);
      });

      return {
        clinic,
        profile,
        subscription: subscription || undefined,
        subscriptionHistory,
        counts: {
          totalUsers: Number(userCount?.count || 0),
          totalPharmacies: Number(pharmacyCount?.count || 0),
          totalLabs: Number(labCount?.count || 0),
        },
        users: sortedUsers,
        pharmacies,
        labs,
        payments: subscriptionHistory, // Using subscription history as payment details
      };
    });

    if (result) {
      try {
        await redisClient.setex(cacheKey, 43200, JSON.stringify(result));
      } catch (err) {
        logger.error(
          `[Cache] Error writing clinic details cache for clinic ${clinicId}:`,
          err
        );
      }
    }

    return result;
  }

  /**
   * Get all clinics
   */
  static async assignClinicToUser(
    clinicId: string,
    userId: string
  ): Promise<ClinicAssignRow[]> {
    return await database
      .insert(ClinicAssignModel)
      .values({
        userId,
        clinicId,
      })
      .onConflictDoUpdate({
        target: [ClinicAssignModel.userId, ClinicAssignModel.clinicId],
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  /**
   * Get all available clinics with pagination and search
   */
  static async getAvailableClinics(opts: {
    page: number;
    limit: number;
    search?: string;
    status?: 'Active' | 'Inactive' | 'Blocked';
  }) {
    const offset = (opts.page - 1) * opts.limit;

    const filters = [];
    if (opts.search) {
      filters.push(
        sql`LOWER(${ClinicModel.clinicName}) LIKE LOWER(${'%' + opts.search + '%'})`
      );
    }
    if (opts.status) {
      filters.push(eq(ClinicModel.status, opts.status));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const results = await database
      .select({
        id: ClinicModel.id,
        clinicName: ClinicModel.clinicName,
        clinicPhone: ClinicModel.clinicPhone,
        Tagline: ClinicModel.Tagline,
        clinicAddress: ClinicModel.clinicAddress,
        State: ClinicModel.State,
        City: ClinicModel.City,
        clinicLogo: ClinicModel.clinicLogo,
        createdAt: ClinicModel.createdAt,
        status: ClinicModel.status,
        latitude: ClinicModel.latitude,
        longitude: ClinicModel.longitude,
        planName: SubscriptionPlanModel.name,
      })
      .from(ClinicModel)
      .leftJoin(
        ClinicSubscriptionModel,
        and(
          eq(ClinicModel.id, ClinicSubscriptionModel.clinicId),
          eq(ClinicSubscriptionModel.active, true),
          or(
            isNull(ClinicSubscriptionModel.expiresAt),
            gt(ClinicSubscriptionModel.expiresAt, new Date())
          )
        )
      )
      .leftJoin(
        SubscriptionPlanModel,
        eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
      )
      .where(whereClause)
      .limit(opts.limit)
      .offset(offset);

    const clinics = results.map((row) => ({
      id: row.id,
      clinicName: row.clinicName,
      clinicPhone: row.clinicPhone,
      Tagline: row.Tagline,
      clinicAddress: row.clinicAddress,
      State: row.State,
      City: row.City,
      clinicLogo: row.clinicLogo,
      createdAt: row.createdAt,
      status: row.status,
      latitude: row.latitude,
      longitude: row.longitude,
      planName: row.planName || 'Free',
    }));

    const [totalCount] = await database
      .select({ count: sql`count(*)::int` })
      .from(ClinicModel)
      .where(whereClause);

    // Fetch overall clinic statistics (across all clinics, not just filtered)
    const statsResults = await database
      .select({
        status: ClinicModel.status,
        count: sql`count(*)::int`,
      })
      .from(ClinicModel)
      .groupBy(ClinicModel.status);

    // Calculate stats with all statuses
    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      blocked: 0,
    };

    for (const row of statsResults) {
      const count = row.count as number;
      stats.total += count;
      if (row.status === 'Active') {
        stats.active = count;
      } else if (row.status === 'Inactive') {
        stats.inactive = count;
      } else if (row.status === 'Blocked') {
        stats.blocked = count;
      }
    }

    return {
      stats,
      data: clinics,
      pagination: {
        total: totalCount.count,
        page: opts.page,
        limit: opts.limit,
        totalPages: Math.ceil((totalCount.count as number) / opts.limit),
      },
    };
  }

  /**
   * Get clinic detail by ID with full data for superadmin
   */
  static async getClinicDetailById(clinicId: string) {
    const result = await this.getClinicDetailsById(clinicId);
    if (!result) throw new HttpError(404, 'Clinic not found');
    return result;
  }

  static async clinicSettingUpsert(clinicId: string, payload: any) {
    const result = await database.transaction(async (tx) => {
      const { settings, reminders } = payload;

      // 1️⃣ Upsert clinic settings
      const [existingSettings] = await tx
        .select()
        .from(ClinicSettingsModel)
        .where(eq(ClinicSettingsModel.clinicId, clinicId))
        .limit(1);

      let clinicSettings;

      if (existingSettings) {
        [clinicSettings] = await tx
          .update(ClinicSettingsModel)
          .set({
            ...settings,
            updatedAt: new Date(),
          })
          .where(eq(ClinicSettingsModel.clinicId, clinicId))
          .returning();
      } else {
        [clinicSettings] = await tx
          .insert(ClinicSettingsModel)
          .values({
            clinicId,
            ...settings,
          })
          .returning();
      }

      // 2️⃣ Handle reminders
      if (Array.isArray(reminders)) {
        const incomingIds = reminders
          .filter((r: any) => r.id)
          .map((r: any) => r.id);

        // Soft delete removed reminders
        if (incomingIds.length) {
          await tx
            .update(ClinicReminderModel)
            .set({
              isActive: false,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(ClinicReminderModel.clinicId, clinicId),
                notInArray(ClinicReminderModel.id, incomingIds)
              )
            );
        }

        for (const reminder of reminders) {
          if (reminder.id) {
            // ✏️ Update
            await tx
              .update(ClinicReminderModel)
              .set({
                timeValue: reminder.timeValue,
                timeUnit: reminder.timeUnit,
                reminderType: reminder.reminderType,
                isActive: reminder.isActive ?? true,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(ClinicReminderModel.id, reminder.id),
                  eq(ClinicReminderModel.clinicId, clinicId)
                )
              );
          } else {
            // ➕ Create
            await tx.insert(ClinicReminderModel).values({
              clinicId,
              timeValue: reminder.timeValue,
              timeUnit: reminder.timeUnit,
              reminderType: reminder.reminderType,
            });
          }
        }
      }

      return {
        settings: clinicSettings,
        reminders,
      };
    });

    try {
      await redisClient.del(`clinic_settings:${clinicId}`);
      await redisClient.del(`clinic_autologout:${clinicId}`);
      // Invalidate appointment engine threshold cache so running-late
      // notifications use the updated value immediately
      await redisClient.del(`appointment_engine:threshold:${clinicId}`);
    } catch (err) {
      logger.error(
        `[Cache] Failed to invalidate settings cache for clinic ${clinicId}:`,
        err
      );
    }

    return result;
  }

  static async getSetting(clinicId: string) {
    const cacheKey = `clinic_settings:${clinicId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.error(
        `[Cache] Error reading settings cache for clinic ${clinicId}:`,
        err
      );
    }

    const [settings] = await database
      .select({
        id: ClinicSettingsModel.id,
        clinicId: ClinicSettingsModel.clinicId,
        voiceCallEnabled: ClinicSettingsModel.voiceCallEnabled,
        smsEnabled: ClinicSettingsModel.smsEnabled,
        whatsappEnabled: ClinicSettingsModel.whatsappEnabled,
        loginAlertsEnabled: ClinicSettingsModel.loginAlertsEnabled,
        autoLogoutMinutes: ClinicSettingsModel.autoLogoutMinutes,
        runningLateThresholdMinutes:
          ClinicSettingsModel.runningLateThresholdMinutes,
      })
      .from(ClinicSettingsModel)
      .where(eq(ClinicSettingsModel.clinicId, clinicId))
      .limit(1);

    const reminders = await database
      .select({
        id: ClinicReminderModel.id,
        clinicId: ClinicReminderModel.clinicId,
        timeValue: ClinicReminderModel.timeValue,
        timeUnit: ClinicReminderModel.timeUnit,
        reminderType: ClinicReminderModel.reminderType,
        isActive: ClinicReminderModel.isActive,
      })
      .from(ClinicReminderModel)
      .where(
        and(
          eq(ClinicReminderModel.clinicId, clinicId),
          isNull(ClinicReminderModel.deletedAt)
        )
      )
      .orderBy(ClinicReminderModel.createdAt);

    const result = { settings, reminders };

    try {
      await redisClient.setex(cacheKey, 86400, JSON.stringify(result));
    } catch (err) {
      logger.error(
        `[Cache] Error writing settings cache for clinic ${clinicId}:`,
        err
      );
    }

    return result;
  }

  static async deleteReminder(clinicId: string, reminderId: string) {
    const [updated] = await database
      .update(ClinicReminderModel)
      .set({
        deletedAt: new Date(),
        isActive: false,
      })
      .where(
        and(
          eq(ClinicReminderModel.id, reminderId),
          eq(ClinicReminderModel.clinicId, clinicId)
        )
      )
      .returning();

    if (!updated) {
      throw new HttpError(404, 'Reminder not found');
    }

    try {
      await redisClient.del(`clinic_settings:${clinicId}`);
      await redisClient.del(`clinic_autologout:${clinicId}`);
    } catch (err) {
      logger.error(
        `[Cache] Failed to invalidate settings cache for clinic ${clinicId}:`,
        err
      );
    }

    return updated;
  }

  static async getClinicsWithDoctors(filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    const { startDate, endDate } = filters || {};

    const clinicConditions = [eq(ClinicModel.status, 'Active')];

    if (startDate && endDate) {
      clinicConditions.push(
        between(ClinicModel.createdAt, new Date(startDate), new Date(endDate))
      );
    } else if (startDate) {
      clinicConditions.push(gte(ClinicModel.createdAt, new Date(startDate)));
    } else if (endDate) {
      clinicConditions.push(lte(ClinicModel.createdAt, new Date(endDate)));
    }

    const doctorsWithClinics = await database
      .select({
        doctor: {
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          gender: UserProfileModel.gender,
          qualification: UserProfessionalModel.qualification,
          yearsOfExperience: UserProfessionalModel.yearsOfExperience,
          licenseNumber: UserProfessionalModel.licenseNumber,
          speciality: UserProfessionalModel.speciality,
          registrationNumber: UserProfessionalModel.registrationNumber,
          profileImage: UserProfileModel.profileImage,
          userStatus: UserModel.userStatus,
          isArchive: UserModel.isArchive,
          userType: UserModel.userType,
          createdAt: UserModel.createdAt,
        },
        clinic: {
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          tagline: ClinicModel.Tagline,
          clinicAddress: ClinicModel.clinicAddress,
          clinicPhone: ClinicModel.clinicPhone,
          state: ClinicModel.State,
          city: ClinicModel.City,
          zipCode: ClinicModel.ZipCode,
          clinicLogo: ClinicModel.clinicLogo,
          status: ClinicModel.status,
          latitude: ClinicModel.latitude,
          longitude: ClinicModel.longitude,
        },
      })
      .from(UserModel)
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .leftJoin(
        UserProfessionalModel,
        eq(UserProfessionalModel.userId, UserModel.id)
      )
      .innerJoin(ClinicAssignModel, eq(ClinicAssignModel.userId, UserModel.id))
      .innerJoin(
        ClinicModel,
        and(eq(ClinicModel.id, ClinicAssignModel.clinicId), ...clinicConditions)
      )
      .where(and(sql`${UserModel.userType} IN ('Admin', 'Doctor')`))
      .orderBy(desc(UserModel.createdAt));

    const result = doctorsWithClinics.map((item) => ({
      id: item.doctor.id,
      name: item.doctor.name,
      email: item.doctor.email,
      mobile: item.doctor.mobile,
      gender: item.doctor.gender,
      qualification: item.doctor.qualification,
      yearsOfExperience: item.doctor.yearsOfExperience,
      licenseNumber: item.doctor.licenseNumber,
      speciality: item.doctor.speciality,
      registrationNumber: item.doctor.registrationNumber,
      profileImage: item.doctor.profileImage,
      userStatus: item.doctor.userStatus,
      userType: item.doctor.userType,
      isArchive: item.doctor.isArchive,
      createdAt: item.doctor.createdAt,
      clinic: item.clinic,
    }));

    return result;
  }

  /**
   * Onboards a clinic to Razorpay Route by creating a linked account.
   */
  static async onboardRouteAccount(clinicId: string) {
    const [clinic] = await database
      .select({
        id: ClinicModel.id,
        clinicName: ClinicModel.clinicName,
        userId: ClinicModel.userId,
        razorpayAccountId: ClinicModel.razorpayAccountId,
      })
      .from(ClinicModel)
      .where(eq(ClinicModel.id, clinicId))
      .limit(1);

    if (!clinic) throw new HttpError(404, 'Clinic not found');
    if (clinic.razorpayAccountId) {
      throw new HttpError(400, 'Clinic is already onboarded on Razorpay Route');
    }

    const [user] = await database
      .select({
        email: UserModel.email,
        mobile: UserModel.mobile,
        name: UserModel.name,
      })
      .from(UserModel)
      .where(eq(UserModel.id, clinic.userId))
      .limit(1);

    if (!user) throw new HttpError(404, 'Clinic owner not found');
    if (!user.email) {
      throw new HttpError(
        400,
        'Clinic owner email is required for Razorpay onboarding'
      );
    }

    const razorpayAccount = await createRazorpayRouteAccount({
      email: user.email,
      phone: user.mobile || '9999999999',
      name: clinic.clinicName,
      referenceId: clinic.id,
      contactName: user.name || clinic.clinicName,
    });

    const [updatedClinic] = await database
      .update(ClinicModel)
      .set({
        razorpayAccountId: razorpayAccount.id,
        routeStatus: 'PENDING',
        updatedAt: new Date(),
      })
      .where(eq(ClinicModel.id, clinicId))
      .returning();

    try {
      await redisClient.del(`clinic_details:${clinicId}`);
    } catch (err) {
      logger.error(
        `[Cache] Error invalidating clinic details cache in onboardRouteAccount for clinic ${clinicId}:`,
        err
      );
    }

    return updatedClinic;
  }
}
