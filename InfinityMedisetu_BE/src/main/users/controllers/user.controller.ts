// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler, HttpError } from '../../../middlewear/errorHandler';
import { DoctorServices } from '../../doctor/services/doctor.service';
import { doctorRutineDufet } from '../../../utils/avaliblity';
import { LabService } from '../../lab/services/lab.service';
import {
  trackFailedAttempt,
  resetFailedAttempts,
} from '../../../utils/security';
import logger from '../../../utils/logger';
import { sendOk } from '../../../utils/response.utils';
import { sendNotificationToUser } from '../../../utils/notification.utils';
import redisClient from '../../../configurations/redisConfig';
import { ReferralService } from '../../../utils/referralEncodeDecode';
import { ReferralModel } from '../models/referral.model';
import { UserModel } from '../models/user.model';
import { database } from '../../../configurations/dbConnection';
import { desc, eq, sql } from 'drizzle-orm';
import {
  SubscriptionPlanModel,
  ClinicSubscriptionModel,
} from '../../subscription/models/subscription.model';
import { SubscriptionService } from '../../subscription/services/subscription.service';
export const requestRegistrationVerificationController = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.validatedBody;
    const result = await UserService.requestRegistrationVerification(email);
    res.json({ success: true, ...result });
  }
);

export const verifyRegistrationOTPController = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp } = req.validatedBody;
    const result = await UserService.verifyRegistrationOTP(email, otp);
    res.json({ success: true, ...result });
  }
);

export const registerController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const result = await UserService.register(payload);

    if (payload.referralCode) {
      try {
        const referrerId = ReferralService.decodeReferralCode(
          payload.referralCode
        );

        if (typeof referrerId === 'string' && referrerId.length > 0) {
          const [referrer] = await database
            .select({ id: UserModel.id })
            .from(UserModel)
            .where(sql`${UserModel.id} = ${referrerId}`)
            .limit(1);

          if (referrer) {
            await database.insert(ReferralModel).values({
              referredTo: result.user.id,
              referredBy: referrerId,
              referralCode: payload.referralCode,
            });
          }
        }
      } catch {
        console.error('Referral record failed');
      }
    }

    const firstLoginKey = `first_login:user:${result.user.id}`;
    await redisClient.set(firstLoginKey, '1');

    res.status(201).json({
      success: true,
      ...result,
      isFirstLogin: true,
    });
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.validatedBody;
    // const clientIp = req.ip || req.socket.remoteAddress;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const ipKey = `failed_attempts:ip:${clientIp}`;
    const emailKey = `failed_attempts:email:${email}`;

    const userAgent = req.headers['user-agent'];

    try {
      const result = await UserService.login(
        email,
        password,
        clientIp,
        userAgent
      );

      // If MFA is required, return the temporary token and indicator
      if ('mfaRequired' in result) {
        // Success: Reset failed attempts even for MFA flow (primary auth passed)
        await Promise.all([
          resetFailedAttempts(ipKey),
          resetFailedAttempts(emailKey),
        ]);

        res.json({
          success: true,
          mfaRequired: true,
          tempToken: result.tempToken,
        });
        return;
      }

      const { user, token } = result;

      const firstLoginKey = `first_login:user:${user.id}`;
      const hasLoggedInBefore = await redisClient.get(firstLoginKey);
      let isFirstLogin = false;

      if (!hasLoggedInBefore) {
        isFirstLogin = true;
        await redisClient.set(firstLoginKey, '1');
      }

      // Success: Reset failed attempts
      await Promise.all([
        resetFailedAttempts(ipKey),
        resetFailedAttempts(emailKey),
      ]);

      res.json({ success: true, user, token, isFirstLogin });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        // Track failed attempt by IP and Email
        const [ipAttempts, emailAttempts] = await Promise.all([
          trackFailedAttempt(ipKey),
          trackFailedAttempt(emailKey),
        ]);

        logger.warn(
          `Failed login attempt for ${email} from ${clientIp}. IP attempts: ${ipAttempts}, Email attempts: ${emailAttempts}`
        );

        // Return generic error message to avoid bot hints as per instructions
        // throw new HttpError(401, 'Invalid email or password.');
      }
      throw error;
    }
  }
);

export const socialLoginController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    const device = (req.query.device as string) || payload.device || 'web';

    const { user, token } = await UserService.socialLogin(
      payload,
      clientIp,
      userAgent,
      device as 'web' | 'ios' | 'android'
    );

    const firstLoginKey = `first_login:user:${user.id}`;
    const hasLoggedInBefore = await redisClient.get(firstLoginKey);
    let isFirstLogin = false;

    if (!hasLoggedInBefore) {
      isFirstLogin = true;
      await redisClient.set(firstLoginKey, '1');
    }

    res.json({ success: true, user, token, isFirstLogin });
  }
);

export const changePasswordController = asyncHandler(
  async (req: Request, res: Response) => {
    const { password, newPassword } = req.validatedBody;
    const userId = req.user?.id;

    if (!userId) throw new HttpError(401, 'Authentication required');

    await UserService.changePassword(userId, password, newPassword);

    res.json({ success: true, message: 'Password changed successfully' });
  }
);

export const generateReferralCodeController = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'Authentication required');

      const referralCode = ReferralService.generateReferralCode(userId);
      const referralLink = `${process.env.FRONTEND_URL}/signup-email?rfc=${referralCode}`;

      const userReferrals = await database
        .select({
          id: ReferralModel.id,
          referredTo: ReferralModel.referredTo,
          referredToName: sql<string>`COALESCE(${UserModel.name}, 'Unknown User')`,
          referredBy: ReferralModel.referredBy,
          referralCode: ReferralModel.referralCode,
          status: ReferralModel.status,
          comments: ReferralModel.comments,
          createdAt: ReferralModel.createdAt,
          updatedAt: ReferralModel.updatedAt,
        })
        .from(ReferralModel)
        .orderBy(desc(ReferralModel.createdAt))
        .leftJoin(UserModel, eq(ReferralModel.referredTo, UserModel.id))
        .where(eq(ReferralModel.referredBy, userId));

      const totalReferrals = userReferrals.length;
      const approvedReferrals = userReferrals.filter(
        (r: any) => r.status === 'approved'
      ).length;
      const pendingReferrals = userReferrals.filter(
        (r: any) => r.status === 'pending'
      ).length;
      const rejectedReferrals = userReferrals.filter(
        (r: any) => r.status === 'rejected'
      ).length;

      res.json({
        success: true,
        referralCode,
        referralLink,
        totalReferrals,
        approvedReferrals,
        pendingReferrals,
        rejectedReferrals,
        allData: userReferrals,
      });
    } catch {
      throw new HttpError(500, 'Failed to generate referral code');
    }
  }
);

export const updateReferralController = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const referralId = req.params.referralId as string;
      const { status, comments } = req.body;

      if (!referralId) {
        throw new HttpError(400, 'Referral ID is required');
      }

      const result = await UserService.updateReferralStatus(referralId, {
        status,
        comments,
      });

      res.json({
        success: true,
        message: result.message,
        data: result.referral,
      });
    } catch {
      throw new HttpError(500, 'Failed to update referral');
    }
  }
);

export const sendVerificationController = asyncHandler(
  async (req: Request, res: Response) => {
    const { user } = req;
    const userId = user.id; // if you have auth middleware
    const result = await UserService.sendEmailVerification(userId);
    res.json({ success: true, ...result });
  }
);

export const verifyEmailController = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.validatedParams;
    const result = await UserService.verifyEmail(token);
    res.json({ success: true, ...result });
  }
);

export const requestPasswordResetController = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.validatedBody;
    const clientIp = req.ip || req.socket.remoteAddress;
    const ipKey = `failed_attempts:ip:${clientIp}`;
    const emailKey = `failed_attempts:email:${email}`;

    try {
      const result = await UserService.requestPasswordReset(email);
      res.json({ success: true, ...result });
    } catch (error) {
      // Track attempts even if it fails (e.g., user not found or rate limited)
      await Promise.all([
        trackFailedAttempt(ipKey),
        trackFailedAttempt(emailKey),
      ]);
      throw error;
    }
  }
);

export const resetPasswordController = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, newPassword } = req.validatedBody;
    const result = await UserService.resetPassword(token, newPassword);
    res.json({ success: true, ...result });
  }
);
export const getUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    // const clinicId = req.clinicId;

    const userId = (user as { id: string }).id;

    const result = await UserService.getUser(userId);

    // if (!result) throw new HttpError(404, 'User not found');

    res.json({ success: true, ...result });
  }
);

export const createCreatePetientController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const clinicId = req.clinicId;
    const result = await UserService.createPatient(payload, clinicId);
    res.json({ success: true, result });
  }
);

export const updatePetientController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const result = await UserService.updatePatient(payload);
    res.json({ success: true, result });
  }
);

export const getPetientController = asyncHandler(
  async (req: Request, res: Response) => {
    const petientId = req.validatedParams.peteintId;
    const includeFamilyDetails = req.validatedQuery?.familyDetails === 'true';
    const result = await UserService.getPeteintById(
      petientId,
      includeFamilyDetails
    );
    if (!result) throw new HttpError(404, 'User not found');
    res.json({ success: true, result });
  }
);

export const getAllPetientController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const query = req.validatedQuery;
    const user = req.user;
    const result = await UserService.getAllPeteints(clinicId, query, user);
    // if (!result) throw new HttpError(404, 'User not found');
    res.json({ success: true, result });
  }
);

export const addUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const clinicId = req.clinicId;

    const result = await UserService.addUser(clinicId, payload);

    // Invalidate overview cache when any staff or doctor is added
    await redisClient.del(`clinic_limits_overview:${clinicId}`);

    if (payload.userType === 'Doctor') {
      // await DoctorServices.updateUser(result.id, clinicId, doctorRutineDufet);
      await sendNotificationToUser({
        userId: result.id,
        title: 'Schedule Alert',
        body: 'Your default schedule is created by system. Please update.',
        type: 'alert',
        metadata: {
          clinicId: clinicId,
          source: 'schedule-update',
        },
      });
    }

    // Lab_Assistant: assign to the specified lab
    if (payload.userType === 'Lab_Assistant') {
      await LabService.updateLabUser(result.id, clinicId, payload.labId);
    }

    // Pharmacist: assign to the specified pharmacy
    if (payload.userType === 'Pharmacist' && payload.pharmacyId) {
      const { PharmacyService } =
        await import('../../pharmacy/services/pharmacy.service');
      await PharmacyService.assignUserToPharmacy(
        payload.pharmacyId,
        result.id,
        clinicId,
        'Pharmacist'
      );
    }

    res.json({
      success: true,
      message: "Sent to user's on email verification successfully",
      result,
    });
  }
);

export const togglePaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;

    // Fetch user data using the same pattern as registerController
    const [user] = await database
      .select({
        id: UserModel.id,
        userType: UserModel.userType,
        isAdminDoctorAccess: UserModel.isAdminDoctorAccess,
        paymentVisible: UserModel.paymentVisible,
      })
      .from(UserModel)
      .where(sql`${UserModel.id} = ${userId}`)
      .limit(1);

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const hasAccess =
      user.isAdminDoctorAccess === true || user.userType === 'Doctor';
    if (!hasAccess) {
      throw new HttpError(400, 'Insufficient Role');
    }

    const [updatedUser] = await database
      .update(UserModel)
      .set({
        paymentVisible: sql`NOT ${UserModel.paymentVisible}`,
      })
      .where(sql`${UserModel.id} = ${userId}`)
      .returning({
        userId: UserModel.id,
        paymentVisible: UserModel.paymentVisible,
      });

    res.status(200).json({
      success: true,
      message: 'Payment history visibility updated',
      data: updatedUser,
    });
  }
);

export const UpdateUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const userId = req.params.userId as string;
    const clinicId = req.clinicId;

    const user = await UserService.updateUser(userId, clinicId, payload);

    // Invalidate limits cache when user is updated (userType may change)
    if (clinicId) {
      await redisClient.del(`clinic_limits_overview:${clinicId}`);
    }

    res.status(200).json({
      message: 'User updated successfully',
      data: user,
    });
  }
);

export const updateUserStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const payload = req.validatedBody;
    const clinicId = req.clinicId;

    const user = await UserService.updateUserStatus(userId as string, payload);

    // Invalidate limits cache when user status changes (Active/Inactive affects counts)
    if (clinicId) {
      await redisClient.del(`clinic_limits_overview:${clinicId}`);
    }

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: user,
    });
  }
);

export const archiveController = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const clinicId = req.clinicId;

    const user = await UserService.archive(userId as string);

    // Invalidate limits cache when user is archived/unarchived
    if (clinicId) {
      await redisClient.del(`clinic_limits_overview:${clinicId}`);
    }

    const action = user.isArchive ? 'archived' : 'unarchived';
    const message = `User ${action} successfully`;

    res.status(200).json({
      success: true,
      message: message,
    });
  }
);

export const GetDoctorServiceController = asyncHandler(
  async (req: Request, res: Response) => {
    const patientId = req.params.patientId as string;
    const doctorId = req.params.doctorId as string;

    const services = await UserService.clinicService({
      patientId,
      doctorId,
      date: new Date().toISOString().split('T')[0],
    });

    res.status(200).json({
      message: 'Services fetched successfully',
      data: services,
    });
  }
);

export const updateAdminPermissionToDoctorController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const clinicId = req.clinicId;
    const userId = req.user.id;

    const result = await UserService.updateAdminPermissionToDoctor(
      userId,
      payload
    );
    if (result[0].isAdminDoctorAccess) {
      await DoctorServices.updateUser(userId, clinicId, doctorRutineDufet);
    }

    // Invalidate limits cache — toggling isAdminDoctorAccess affects doctor counts
    if (clinicId) {
      await redisClient.del(`clinic_limits_overview:${clinicId}`);
    }

    res.json({
      success: true,
      message: 'Admin permission updated successfully',
      result,
    });
  }
);

export const getAllUserController = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const clinicId = req.clinicId;
      const query = req.validatedQuery;
      const result = await UserService.getAllUser(clinicId, query);

      res.json({
        success: true,
        message: 'user data fetched successfully',
        result,
      });
    } catch {
      throw new HttpError(500, 'Failed to fetch user data');
    }
  }
);

export const referralsController = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const query = req.validatedQuery;
      const result = await UserService.referrals(query);

      res.json({
        success: true,
        message: 'Referral data fetched successfully',
        result,
      });
    } catch {
      throw new HttpError(500, 'Failed to fetch referral data');
    }
  }
);

export const searchPatientController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const query = req.validatedQuery;
    const result = await UserService.searchPatient(clinicId, query);
    return sendOk(res, 'Patients searched successfully', result);
  }
);

export const checkPatientByMobileController = asyncHandler(
  async (req: Request, res: Response) => {
    const { mobile } = req.validatedQuery;
    const result = await UserService.checkPatientByMobile(mobile);
    return sendOk(res, 'Patient lookup successful', result);
  }
);

/**
 * Update user onboarding progress
 * @route PUT /api/v1/users/onboarding/progress
 */
export const updateOnboardingProgressController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new HttpError(401, 'Authentication required');

    const payload = req.validatedBody;
    const result = await UserService.updateOnboardingProgress(userId, payload);

    res.json({
      success: true,
      message: 'Onboarding progress updated successfully',
      data: result,
    });
  }
);

/**
 * Submit user profile for approval
 * @route POST /api/v1/users/onboarding/submit
 */
export const submitForApprovalController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new HttpError(401, 'Authentication required');

    const result = await UserService.submitForApproval(userId);

    res.json({
      success: true,
      message: 'Profile submitted for approval successfully',
      data: result,
    });
  }
);

/**
 * Take the one-time 'Pro' subscription
 * @route POST /api/v1/users/verify-subscription
 */
export const verifySubscriptionController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    if (!clinicId) {
      throw new HttpError(400, 'Clinic ID is required');
    }

    // Find the 'Pro' plan
    const [proPlan] = await database
      .select({
        id: SubscriptionPlanModel.id,
        price: SubscriptionPlanModel.price,
      })
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.name, 'Pro'))
      .limit(1);

    if (!proPlan) {
      throw new HttpError(404, "Subscription plan 'Pro' not found");
    }

    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Deactivate previous active subscriptions for this clinic
    await database
      .update(ClinicSubscriptionModel)
      .set({ active: false })
      .where(eq(ClinicSubscriptionModel.clinicId, clinicId));

    // Insert new subscription
    const [newSubscription] = await database
      .insert(ClinicSubscriptionModel)
      .values({
        clinicId,
        planId: proPlan.id,
        startsAt,
        expiresAt,
        active: true,
        price: '0',
        transactionId: 'N/A',
        paymentStatus: 'success',
      })
      .returning();

    // Redis cache invalidate for clinic active subscription
    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);
    await redisClient.del(`clinic_details:${clinicId}`);

    // Call updateUserSubscriptionExpiryCache
    await SubscriptionService.updateUserSubscriptionExpiryCache(
      clinicId,
      expiresAt
    );

    res.json({
      success: true,
      message: 'Subscription verified and activated successfully',
      data: newSubscription,
    });
  }
);
