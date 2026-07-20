import { asyncHandler } from '../../../middlewear/errorHandler';
import { Response, Request } from 'express';
import { DoctorServices } from '../services/doctor.service';
import { PrescriptionQueueService } from '../../pharmacy/services/prescriptionQueue.service';
import { sendOk } from '../../../utils/response.utils';
import {
  toggleFavoriteSchema,
  topMedicinesQuerySchema,
} from '../schemas/doctor.schemas';
import {
  UserModel,
  UserProfessionalModel,
  UserProfileModel,
} from '../../users/models';
import { DoctorQualificationModel } from '../models/doctor.model';
import { and, desc, eq, sql, gte, lte, or } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import { DoctorProfileUpdateRequestModel } from '../models/doctor-profile-update-request.model';
import { ClinicModel } from '../../clinic/models/clinic.model';
import { sendEmail } from '../../../utils/email';
import { profileRequestStatusChangeTemplate } from '../../../htmltamplates/profileRequestStatusChange';
import logger from '../../../utils/logger';
export const updateDoctorController = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user.id;
    const payload = req.validatedBody;
    const clinicId = req.clinicId;
    const profileImage = req.file ? (req.file as any).location : undefined;
    const result = await DoctorServices.updateUser(
      currentUserId,
      clinicId,
      payload,
      profileImage
    );

    return res.status(200).json({
      success: true,
      result,
      message: 'Doctor profile updated successfully',
    });
  }
);

export const updateProfileImageController = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user.id;
    const profileImage = req.file ? (req.file as any).location : undefined;

    if (!profileImage) {
      return res.status(400).json({
        success: false,
        message: 'No profile image file provided',
      });
    }

    await DoctorServices.updateProfileImage(currentUserId, profileImage);

    return res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
    });
  }
);

export const requestDoctorUpdateController = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user.id;
    const clinicId = req.clinicId;
    const payload = req.validatedBody;

    const { reason, ...requestedData } = payload;
    const actualRequestedData = requestedData;

    const [existingRequest] = await database
      .select()
      .from(DoctorProfileUpdateRequestModel)
      .where(
        and(
          eq(DoctorProfileUpdateRequestModel.doctorId, currentUserId),
          eq(DoctorProfileUpdateRequestModel.status, 'pending')
        )
      )
      .limit(1);

    let request;

    if (existingRequest) {
      const [updatedRequest] = await database
        .update(DoctorProfileUpdateRequestModel)
        .set({
          requestedData: actualRequestedData,
          reason: reason || existingRequest.reason,
          updatedAt: new Date(),
        })
        .where(eq(DoctorProfileUpdateRequestModel.id, existingRequest.id))
        .returning();

      request = updatedRequest;

      return res.status(200).json({
        success: true,
        result: request,
        message: 'Existing pending update request has been updated',
      });
    } else {
      const [newRequest] = await database
        .insert(DoctorProfileUpdateRequestModel)
        .values({
          doctorId: currentUserId,
          clinicId: clinicId,
          requestedData: actualRequestedData,
          reason: reason,
          status: 'pending',
        })
        .returning();

      request = newRequest;

      return res.status(200).json({
        success: true,
        result: request,
        message: 'Profile update request submitted for approval',
      });
    }
  }
);

export const listUpdateRequestsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, status, doctorId, startDate, endDate, search } =
      req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    // Date filtering - apply only if BOTH startDate and endDate are provided
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      // Set end date to end of day for inclusive filtering
      end.setHours(23, 59, 59, 999);
      conditions.push(
        and(
          gte(DoctorProfileUpdateRequestModel.createdAt, start),
          lte(DoctorProfileUpdateRequestModel.createdAt, end)
        )
      );
    }

    // Status filter
    if (status) {
      conditions.push(
        eq(DoctorProfileUpdateRequestModel.status, status as string)
      );
    }

    // Doctor ID filter
    if (doctorId) {
      conditions.push(
        eq(DoctorProfileUpdateRequestModel.doctorId, doctorId as string)
      );
    }

    // Search filter (searches doctor name, email, mobile, registration number, and clinic name)
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          sql`LOWER(${UserModel.name}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${UserModel.email}) LIKE LOWER(${searchPattern})`,
          sql`${UserModel.mobile} LIKE ${searchPattern}`,
          sql`LOWER(${UserProfessionalModel.registrationNumber}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${ClinicModel.clinicName}) LIKE LOWER(${searchPattern})`
        )
      );
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await database
      .select({
        // Request fields
        id: DoctorProfileUpdateRequestModel.id,
        doctorId: DoctorProfileUpdateRequestModel.doctorId,
        clinicId: DoctorProfileUpdateRequestModel.clinicId,
        requestedData: DoctorProfileUpdateRequestModel.requestedData,
        status: DoctorProfileUpdateRequestModel.status,
        reason: DoctorProfileUpdateRequestModel.reason,
        rejectionReason: DoctorProfileUpdateRequestModel.rejectionReason,
        createdAt: DoctorProfileUpdateRequestModel.createdAt,
        updatedAt: DoctorProfileUpdateRequestModel.updatedAt,

        doctorName: UserModel.name,
        doctorEmail: UserModel.email,
        doctorMobile: UserModel.mobile,
        doctorSpeciality: UserProfessionalModel.speciality,
        doctorRegistrationNumber: UserProfessionalModel.registrationNumber,

        clinicName: ClinicModel.clinicName,
        clinicPhone: ClinicModel.clinicPhone,
      })
      .from(DoctorProfileUpdateRequestModel)
      .leftJoin(
        UserModel,
        eq(DoctorProfileUpdateRequestModel.doctorId, UserModel.id)
      )
      .leftJoin(
        UserProfileModel,
        eq(DoctorProfileUpdateRequestModel.doctorId, UserProfileModel.userId)
      )
      .leftJoin(
        UserProfessionalModel,
        eq(
          DoctorProfileUpdateRequestModel.doctorId,
          UserProfessionalModel.userId
        )
      )
      .leftJoin(
        ClinicModel,
        eq(DoctorProfileUpdateRequestModel.clinicId, ClinicModel.id)
      )
      .where(whereCondition)
      .orderBy(desc(DoctorProfileUpdateRequestModel.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const [total] = await database
      .select({ count: sql<number>`count(*)` })
      .from(DoctorProfileUpdateRequestModel)
      .where(whereCondition);

    // Get statistics by status (filtered by the same conditions)
    const statsResults = await database
      .select({
        status: DoctorProfileUpdateRequestModel.status,
        count: sql<number>`count(*)`,
      })
      .from(DoctorProfileUpdateRequestModel)
      .leftJoin(
        UserModel,
        eq(DoctorProfileUpdateRequestModel.doctorId, UserModel.id)
      )
      .leftJoin(
        UserProfessionalModel,
        eq(
          DoctorProfileUpdateRequestModel.doctorId,
          UserProfessionalModel.userId
        )
      )
      .leftJoin(
        ClinicModel,
        eq(DoctorProfileUpdateRequestModel.clinicId, ClinicModel.id)
      )
      .where(whereCondition)
      .groupBy(DoctorProfileUpdateRequestModel.status);

    // Calculate stats
    const stats = {
      total: Number(total?.count || 0),
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of statsResults) {
      const count = Number(row.count);
      if (row.status === 'pending') {
        stats.pending = count;
      } else if (row.status === 'approved') {
        stats.approved = count;
      } else if (row.status === 'rejected') {
        stats.rejected = count;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Profile update requests retrieved successfully',
      result: {
        stats,
        data: requests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: stats.total,
          totalPages: Math.ceil(stats.total / limitNum),
        },
      },
    });
  }
);

export const myUpdateRequestsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, status } = req.query;

    const myId = req.user.id;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (status) {
      conditions.push(
        eq(DoctorProfileUpdateRequestModel.status, status as string)
      );
    }

    conditions.push(
      eq(DoctorProfileUpdateRequestModel.doctorId, myId as string)
    );

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await database
      .select({
        // Request fields
        id: DoctorProfileUpdateRequestModel.id,
        doctorId: DoctorProfileUpdateRequestModel.doctorId,
        clinicId: DoctorProfileUpdateRequestModel.clinicId,
        requestedData: DoctorProfileUpdateRequestModel.requestedData,
        status: DoctorProfileUpdateRequestModel.status,
        reason: DoctorProfileUpdateRequestModel.reason,
        rejectionReason: DoctorProfileUpdateRequestModel.rejectionReason,
        createdAt: DoctorProfileUpdateRequestModel.createdAt,
        updatedAt: DoctorProfileUpdateRequestModel.updatedAt,

        doctorName: UserModel.name,
        doctorEmail: UserModel.email,
        doctorMobile: UserModel.mobile,
        doctorSpeciality: UserProfessionalModel.speciality,
        doctorRegistrationNumber: UserProfessionalModel.registrationNumber,

        clinicName: ClinicModel.clinicName,
        clinicPhone: ClinicModel.clinicPhone,
      })
      .from(DoctorProfileUpdateRequestModel)
      .leftJoin(
        UserModel,
        eq(DoctorProfileUpdateRequestModel.doctorId, UserModel.id)
      )
      .leftJoin(
        UserProfileModel,
        eq(DoctorProfileUpdateRequestModel.doctorId, UserProfileModel.userId)
      )
      .leftJoin(
        UserProfessionalModel,
        eq(
          DoctorProfileUpdateRequestModel.doctorId,
          UserProfessionalModel.userId
        )
      )
      .leftJoin(
        ClinicModel,
        eq(DoctorProfileUpdateRequestModel.clinicId, ClinicModel.id)
      )
      .where(whereCondition)
      .orderBy(desc(DoctorProfileUpdateRequestModel.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [total] = await database
      .select({ count: sql<number>`count(*)` })
      .from(DoctorProfileUpdateRequestModel)
      .where(whereCondition);

    return res.status(200).json({
      success: true,
      result: {
        data: requests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total?.count || 0),
          totalPages: Math.ceil(Number(total?.count || 0) / limitNum),
        },
      },
    });
  }
);

export const approveDoctorUpdateController = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.validatedBody;

    const id = Array.isArray(requestId) ? requestId[0] : requestId;

    const result = await database.transaction(async (tx) => {
      // Get the request
      const [request] = await tx
        .select()
        .from(DoctorProfileUpdateRequestModel)
        .where(eq(DoctorProfileUpdateRequestModel.id, id))
        .limit(1);

      if (!request) {
        throw new Error('Update request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`This request is already ${request.status}`);
      }

      const [doctorData] = await tx
        .select({
          name: UserModel.name,
          email: UserModel.email,
        })
        .from(UserModel)
        .where(eq(UserModel.id, request.doctorId))
        .limit(1);

      // If rejected, just update status
      if (status === 'rejected') {
        const [updated] = await tx
          .update(DoctorProfileUpdateRequestModel)
          .set({
            status: 'rejected',
            rejectionReason: rejectionReason,
            updatedAt: new Date(),
          })
          .where(eq(DoctorProfileUpdateRequestModel.id, id))
          .returning();

        try {
          const emailHtml = profileRequestStatusChangeTemplate({
            doctorName: doctorData.name || 'Doctor',
            status: 'rejected',
            rejectionReason: rejectionReason,
            supportEmail:
              process.env.SUPPORT_EMAIL || 'support@infinitymedisetu.com',
          });

          await sendEmail(
            doctorData.email ?? '',
            'Profile update request rejected',
            emailHtml
          );
        } catch {
          logger.error('Mail not sent');
        }

        return updated;
      }

      // APPROVED - ONLY update doctorProfile and qualifications
      const payload = request.requestedData as any;

      // 1. Update doctor profile (only if provided)
      if (
        payload.doctorProfile &&
        Object.keys(payload.doctorProfile).length > 0
      ) {
        const userSetObj: Record<string, any> = {};
        const profileSetObj: Record<string, any> = {};
        const professionalSetObj: Record<string, any> = {};

        // ONLY these fields - NO image, NO other fields
        const allowedUserFields = ['name', 'email', 'mobile'];
        const allowedProfileFields = ['alternateMobile']; // NO profileImage
        const allowedProfessionalFields = [
          'qualification',
          'yearsOfExperience',
          'licenseNumber',
          'speciality',
          'registrationNumber',
        ];

        for (const k of allowedUserFields) {
          const val = payload.doctorProfile[k];
          if (val !== undefined) userSetObj[k] = val;
        }
        for (const k of allowedProfileFields) {
          const val = payload.doctorProfile[k];
          if (val !== undefined) profileSetObj[k] = val;
        }
        for (const k of allowedProfessionalFields) {
          const val = payload.doctorProfile[k];
          if (val !== undefined) professionalSetObj[k] = val;
        }

        // Update User table
        if (Object.keys(userSetObj).length > 0) {
          userSetObj.updatedAt = sql`NOW()`;
          await tx
            .update(UserModel)
            .set(userSetObj)
            .where(eq(UserModel.id, request.doctorId));
        }

        // Update UserProfile table (NO image)
        if (Object.keys(profileSetObj).length > 0) {
          profileSetObj.updatedAt = sql`NOW()`;
          await tx
            .insert(UserProfileModel)
            .values({ userId: request.doctorId, ...profileSetObj })
            .onConflictDoUpdate({
              target: [UserProfileModel.userId],
              set: profileSetObj,
            });
        }

        // Update UserProfessional table
        if (Object.keys(professionalSetObj).length > 0) {
          professionalSetObj.updatedAt = sql`NOW()`;
          await tx
            .insert(UserProfessionalModel)
            .values({ userId: request.doctorId, ...professionalSetObj })
            .onConflictDoUpdate({
              target: [UserProfessionalModel.userId],
              set: professionalSetObj,
            });
        }
      }

      if (payload.qualifications && payload.qualifications.length > 0) {
        await tx
          .delete(DoctorQualificationModel)
          .where(eq(DoctorQualificationModel.userId, request.doctorId));

        const newQualifications = payload.qualifications.map((q: any) => ({
          userId: request.doctorId,
          qualificationType: q.qualificationType,
          qualificationTitle: q.qualificationTitle,
          specialization: q.specialization,
          boardOrUniversity: q.boardOrUniversity,
          yearOfCompletion: q.yearOfCompletion,
        }));

        if (newQualifications.length > 0) {
          await tx.insert(DoctorQualificationModel).values(newQualifications);
        }
      }

      // 3. Update request status to approved
      const [updated] = await tx
        .update(DoctorProfileUpdateRequestModel)
        .set({
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(DoctorProfileUpdateRequestModel.id, id))
        .returning();

      try {
        const emailHtml = profileRequestStatusChangeTemplate({
          doctorName: doctorData.name || 'Doctor',
          status: 'approved',
          supportEmail:
            process.env.SUPPORT_EMAIL || 'support@infinitymedisetu.com',
        });

        await sendEmail(
          doctorData.email ?? '',
          'Profile update request approved',
          emailHtml
        );
      } catch {
        logger.error('Mail not sent');
      }

      return updated;
    });

    return res.status(200).json({
      success: true,
      result,
      message: `Update request ${status} successfully`,
    });
  }
);

export const deleteServiceController = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user.id;
    const { serviceId } = req.validatedParams;
    const result = await DoctorServices.deleteService(serviceId, currentUserId);
    return res.status(200).json({ success: true, result });
  }
);

export const updateServiceByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user.id;
    const clinicId = req.clinicId;
    const { serviceId } = req.validatedParams;
    const payload = req.validatedBody;
    const result = await DoctorServices.updateServiceById(
      serviceId,
      currentUserId,
      clinicId,
      payload
    );
    return res.status(200).json({
      success: true,
      result,
      message: 'Service updated successfully',
    });
  }
);

export const toggleServiceStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user.id;
    const clinicId = req.clinicId;
    const { serviceId } = req.validatedParams;
    const payload = req.validatedBody;
    const result = await DoctorServices.toggleServiceStatus(
      serviceId,
      currentUserId,
      clinicId,
      payload
    );
    return res.status(200).json({ success: true, result });
  }
);

export const getCurrentDoctorController = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user.id;
    const result = await DoctorServices.getCurrentUser(currentUserId);
    return res.status(200).json({ success: true, result });
  }
);

export const getDoctorByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const params = req.validatedParams;
    const result = await DoctorServices.getDoctorById(params);
    return res.status(200).json({ success: true, result });
  }
);

export const createPlainController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedBody, clinicId: clincId } = req;
    const result = await DoctorServices.createPlain(validatedBody, clincId);
    return res.status(200).json({ success: true, result });
  }
);

export const updatePlainController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedBody, validatedParams } = req;
    const result = await DoctorServices.updatePlain(
      validatedBody,
      validatedParams
    );
    return res.status(200).json({ success: true, result });
  }
);
export const getByIdPlainController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedParams } = req;
    const result = await DoctorServices.getPlain(validatedParams);
    return res.status(200).json({ success: true, result });
  }
);
export const getAllPlainController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery, user, clinicId } = req;
    const result = await DoctorServices.getAllPlain(
      validatedQuery,
      user,
      clinicId
    );
    return res.status(200).json({ success: true, ...result });
  }
);
export const getAllDoctosPlainController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedParams } = req;
    const result = await DoctorServices.getDoctorPlain(validatedParams);
    return res.status(200).json({ success: true, result });
  }
);
export const checkPlainController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery } = req;
    const result = await DoctorServices.checkPlain(validatedQuery);
    return res.status(200).json({ success: true, result });
  }
);

export const getSubscriptionsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery, user, clinicId } = req;
    const result = await DoctorServices.getSubscriptions(
      validatedQuery,
      user,
      clinicId
    );
    return res.status(200).json({
      success: true,
      data: result.results.data,
      summary: result.summary,
      metadata: result.metadata,
    });
  }
);

export const getSubscriptionsListController = asyncHandler(
  async (req: Request, res: Response) => {
    const { user, clinicId } = req;
    const result = await DoctorServices.getSubscriptionsList(user, clinicId);
    return res.status(200).json({ success: true, result });
  }
);

export const getDoctorAvailabilityOnDateController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery, clinicId } = req;
    const result = await DoctorServices.getDoctorsAvailabilityOnDate(
      clinicId,
      validatedQuery
    );
    return res.status(200).json({ success: true, result });
  }
);

export const getDoctorAvailabilityInRangeController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery, clinicId } = req;
    const result = await DoctorServices.getDoctorAvailabilityInRange(
      clinicId,
      validatedQuery
    );
    return res.status(200).json({ success: true, result });
  }
);

export const getFrequentMedicinesController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery, clinicId } = req;

    const result = await PrescriptionQueueService.getFrequentMedicines(
      clinicId,
      validatedQuery
    );
    sendOk(res, 'Invoice retrieved successfully', result);
  }
);

export const getTopMedicinesController = asyncHandler(
  async (req: Request, res: Response) => {
    const queryParams = topMedicinesQuerySchema.parse(req.query);
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await DoctorServices.getTopMedicines(doctorId, queryParams);

    sendOk(res, 'Top Medicine retrieved successfully', result);
  }
);

export const medicineFavoriteController = asyncHandler(
  async (req: Request, res: Response) => {
    const { medicineId } = toggleFavoriteSchema.parse(req.params);
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized user' });
    }

    const result = await DoctorServices.toggleFavorite(doctorId, medicineId);

    sendOk(
      res,
      `Medicine ${result.isFavorite ? 'added to' : 'removed from'} favorites`,
      result
    );
  }
);

// Get doctor preferences
export const getDoctorPreferencesController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.params.doctorId as string;
    const result = await DoctorServices.getDoctorPreferences(doctorId);

    res.status(200).json({
      success: true,
      result,
    });
  }
);

// Add/Update doctor preferences
export const upsertDoctorPreferencesController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.params.doctorId as string;
    const data = req.body;

    const result = await DoctorServices.upsertDoctorPreferences(doctorId, data);

    res.status(200).json({
      success: true,
      message: 'Preferences saved successfully',
      result,
    });
  }
);

// Get doctor prescription template
export const getDoctorPrescriptionTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.params.doctorId as string;
    const result = await DoctorServices.getDoctorPrescriptionTemplate(doctorId);

    res.status(200).json({
      success: true,
      result,
    });
  }
);

// Add/Update doctor prescription template
export const upsertDoctorPrescriptionTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.params.doctorId as string;
    const data = req.body;

    const result = await DoctorServices.upsertDoctorPrescriptionTemplate(
      doctorId,
      data
    );

    res.status(200).json({
      success: true,
      message: 'Doctor prescription template saved successfully',
      result,
    });
  }
);

// delete doctor prescription template
export const deleteDoctorPrescriptionTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.params.doctorId as string;
    const result =
      await DoctorServices.deleteDoctorPrescriptionTemplate(doctorId);
    return res.status(200).json({
      success: true,
      message: 'Doctor prescription template deleted successfully',
      result,
    });
  }
);

export const deleteDoctorLeaveController = asyncHandler(
  async (req: Request, res: Response) => {
    const leaveId = req.params.leaveId as string;
    const result = await DoctorServices.deleteDoctorLeave(leaveId);
    return res.status(200).json({
      success: true,
      message: 'Doctor leave deleted successfully',
      result,
    });
  }
);

export const getDoctorManualTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;

    const template = await DoctorServices.getDoctorManualTemplate(doctorId);

    if (!template) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No template found for this doctor',
      });
    }

    return res.status(200).json({
      success: true,
      data: template,
    });
  }
);

export const upsertDoctorManualTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;
    const { templateHtml, printType } = req.validatedBody;
    const templateImage = (req.file as any)?.location || null;

    const template = await DoctorServices.upsertTemplate(
      doctorId,
      templateHtml || null,
      templateImage,
      printType
    );

    return res.status(200).json({
      success: true,
      message:
        templateImage || templateHtml || printType
          ? 'Template saved successfully'
          : 'Template cleared successfully',
      data: template,
    });
  }
);

export const deleteDoctorManualTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;

    await DoctorServices.deleteTemplate(doctorId);

    return res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });
  }
);

export const updateDoctorPrescriptionTypeController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;

    const result = await DoctorServices.updateDoctorPrescriptionType(doctorId);

    return res.status(200).json({
      success: true,
      message: 'Doctor prescription type updated successfully',
      data: result,
    });
  }
);

export const getDoctorPrescriptionTypeController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;

    const result = await DoctorServices.getDoctorPrescriptionType(doctorId);

    res.status(200).json({
      success: true,
      message: 'Doctor prescription type fetched successfully',
      data: result,
    });
  }
);

export const updateDoctorPrescriptionPrintTypeController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;

    const result = await DoctorServices.DoctorPrescriptionPrintType(doctorId);

    return res.status(200).json({
      success: true,
      message: 'Doctor prescription print type updated successfully',
      data: result,
    });
  }
);
