import { Router } from 'express';
import {
  addUserController,
  getAllUserController,
  getUserController,
  loginController,
  socialLoginController,
  registerController,
  requestPasswordResetController,
  resetPasswordController,
  sendVerificationController,
  updateAdminPermissionToDoctorController,
  verifyEmailController,
  UpdateUserController,
  requestRegistrationVerificationController,
  verifyRegistrationOTPController,
  changePasswordController,
  generateReferralCodeController,
  GetDoctorServiceController,
  togglePaymentHistory,
  updateUserStatusController,
  archiveController,
  referralsController,
  updateReferralController,
  updateOnboardingProgressController,
  submitForApprovalController,
  verifySubscriptionController,
} from '../../controllers/user.controller';
import {
  addUserSchema,
  getAllPetientsSchema,
  loginSchema,
  socialLoginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateAdminPermissionToDoctorSchema,
  verifyEmailSchema,
  updateUserSchema,
  requestRegistrationSchema,
  verifyOtpSchema,
  setInitialPasswordSchema,
  changePasswordSchema,
  GetDoctorServiceSchema,
  updateUserStatusSchema,
  referralsSchema,
  updateReferralSchema,
  updateOnboardingProgressSchema,
} from '../../schemas/auth.schemas';
import { validate } from '../../../../middlewear/validation.middleware';
import {
  enforceClinicAutoLogout,
  requireAdmin,
  requireAuth,
  requireClinic,
  requireDoctor,
  requireReceptionist,
  requireSuperAdmin,
} from '../../../../middlewear/auth.middleware';
import { requireTurnstile } from '../../../../middlewear/turnstile.middleware';
import { requireAddUserLimit } from '../../../../middlewear/limitation.middleware';
import {
  strictRateLimit,
  otpRateLimit,
} from '../../../../middlewear/rateLimit.middleware';
import { docsRegistry } from '../../../../utils/docsRegistry';
import { UserService } from '../../services/user.service';
import { asyncHandler } from '../../../../middlewear/errorHandler';

// create user router instance
const userRouter = Router();

/**
 * @route POST /api/v1/users/request-registration
 * @desc Request registration verification email
 * @access Public
 */
userRouter.post(
  '/request-registration',
  otpRateLimit,
  validate(requestRegistrationSchema, 'body'),
  requestRegistrationVerificationController
);

/**
 * @route POST /api/v1/users/verify-otp
 * @desc Verify registration OTP
 * @access Public
 */
userRouter.post(
  '/verify-otp',
  otpRateLimit,
  validate(verifyOtpSchema, 'body'),
  verifyRegistrationOTPController
);

/**
 * @route POST /api/v1/users/register
 * @desc Register a new user
 * @access Public
 */
userRouter.post(
  '/register',
  strictRateLimit,
  requireTurnstile(true), // Always require for registration
  validate(registerSchema, 'body'),
  registerController
);

/**
 * @route POST /api/v1/users/login
 * @desc Authenticate user and return token
 * @access Public
 */
userRouter.post(
  '/login',
  strictRateLimit,
  requireTurnstile(false), // Conditional based on failed attempts
  validate(loginSchema, 'body'),
  loginController
);

/**
 * @route POST /api/v1/users/social-login
 * @desc Authenticate with a social identity provider and return token
 * @access Public
 */
userRouter.post(
  '/social-login',
  strictRateLimit,
  validate(socialLoginSchema, 'body'),
  socialLoginController
);

userRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema, 'body'),
  changePasswordController
);

userRouter.get(
  '/generate-referral-code',
  requireAuth,
  generateReferralCodeController
);

userRouter.patch(
  '/update-referral-status/:referralId',
  requireAuth,
  requireSuperAdmin,
  validate(updateReferralSchema, 'body'),
  updateReferralController
);

/**
 * @route POST /api/v1/users/send-verification
 * @desc Send email verification link to current user
 * @access Private
 */
userRouter.post('/send-verification', requireAuth, sendVerificationController);

/**
 * @route GET /api/v1/users/verify-email/:token
 * @desc Verify user email using token
 * @access Public
 */
userRouter.get(
  '/verify-email/:token',
  validate(verifyEmailSchema, 'params'),
  verifyEmailController
);

/**
 * @route POST /api/v1/users/request-password-reset
 * @desc Send password reset link to user's email
 * @access Public
 */
userRouter.post(
  '/request-password-reset',
  strictRateLimit,
  requireTurnstile(true), // Always require for password reset request
  validate(requestPasswordResetSchema, 'body'),
  requestPasswordResetController
);

/**
 * @route POST /api/v1/users/reset-password
 * @desc Reset user password using token from email
 * @access Public
 */
userRouter.post(
  '/reset-password',
  strictRateLimit,
  requireTurnstile(true), // Always require for password reset
  validate(resetPasswordSchema, 'body'),
  resetPasswordController
);

/**
 * @route GET /api/v1/users/
 * @desc Get details of the currently logged-in user
 * @access Private
 */
userRouter.get(
  '/',
  requireAuth,
  // requireReceptionist,
  // requireClinic,
  getUserController
);

/**
 * @route POST /api/v1/users/verify-subscription
 * @desc Take the one-time subscription
 * @access Private
 */
userRouter.post(
  '/verify-subscription',
  requireAuth,
  requireClinic,
  verifySubscriptionController
);

/**
 * @route POST /api/v1/users/adduser
 * @desc Add a new user (Doctor/Receptionist) to a clinic
 * @access Private (Admin, Clinic)
 */
userRouter.post(
  '/adduser',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(addUserSchema, 'body'),
  requireAddUserLimit,
  addUserController
);

userRouter.post(
  '/update-payment-history',
  requireAuth,
  requireDoctor,
  togglePaymentHistory
);

userRouter.post(
  '/set-initial-password',
  validate(setInitialPasswordSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { token, password } = req.validatedBody;
    const result = await UserService.setInitialPassword(token, password);
    res.json(result);
  })
);

/**
 * @route PUT /api/v1/users/update-admin-permission-to-doctor
 * @desc Grant or revoke admin permissions for a doctor
 * @access Private (Admin, Clinic)
 */
userRouter.put(
  '/update-admin-permission-to-doctor',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(updateAdminPermissionToDoctorSchema, 'body'),
  updateAdminPermissionToDoctorController
);

/**
 * @route PUT /api/v1/users/UpdateAdduser/:userId
 * @desc Update details of a user added to the clinic
 * @access Private (Admin, Clinic)
 */
userRouter.patch(
  '/:userId',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(updateUserSchema, 'body'),
  UpdateUserController
);

userRouter.patch(
  '/status-change/:userId',
  requireAuth,
  requireSuperAdmin,
  validate(updateUserStatusSchema, 'body'),
  updateUserStatusController
);

userRouter.post(
  '/archive/:userId',
  requireAuth,
  requireSuperAdmin,
  archiveController
);

userRouter.get(
  '/get-service/:patientId/:doctorId',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(GetDoctorServiceSchema, 'params'),
  GetDoctorServiceController
);

/**
 * @route GET /api/v1/users/get-all-user
 * @desc Get all users associated with the clinic
 * @access Private (Receptionist, Clinic)
 */
userRouter.get(
  '/get-all-user',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(getAllPetientsSchema, 'query'),
  enforceClinicAutoLogout,
  getAllUserController
);

userRouter.get(
  '/get-all-referrals',
  requireAuth,
  requireSuperAdmin,
  validate(referralsSchema, 'query'),
  referralsController
);

/**
 * @route PUT /api/v1/users/onboarding/progress
 * @desc Update user onboarding progress
 * @access Private
 */
userRouter.put(
  '/onboarding/progress',
  requireAuth,
  validate(updateOnboardingProgressSchema, 'body'),
  updateOnboardingProgressController
);

/**
 * @route POST /api/v1/users/onboarding/submit
 * @desc Submit user profile for approval
 * @access Private
 */
userRouter.post('/onboarding/submit', requireAuth, submitForApprovalController);

export default userRouter;

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/request-registration',
  description: 'Request registration verification OTP',
  requestSchema: requestRegistrationSchema,
  tags: ['users', 'register'],
});
docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/verify-otp',
  description: 'Verify registration OTP and get session token',
  requestSchema: verifyOtpSchema,
  tags: ['users', 'register'],
});
docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/register', // full path as it would appear in the app
  description: 'Create a new user',
  requestSchema: registerSchema,
  tags: ['users', 'register'],
});
docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/login', // full path as it would appear in the app
  description: 'we can login',
  requestSchema: loginSchema,
  tags: ['users', 'login'],
});
docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/social-login',
  description: 'login with a social identity provider',
  requestSchema: socialLoginSchema,
  tags: ['users', 'login'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/users', // full path as it would appear in the app
  description: 'we can get current login user',
  tags: ['users', 'current user'],
});
docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/send-verification', // full path as it would appear in the app
  description: 'we can send verification email',
  requestSchema: registerSchema,
  tags: ['users', 'email verification'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/users/verify-email/:token', // full path as it would appear in the app
  description: 'we can verufy email',
  params: verifyEmailSchema,
  tags: ['users', 'email verification'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/request-password-reset', // full path as it would appear in the app
  description: 'we can send request for reset password',
  requestSchema: requestPasswordResetSchema,
  tags: ['users', 'reset password'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/reset-password', // full path as it would appear in the app
  description: 'we can reset password',
  requestSchema: resetPasswordSchema,
  tags: ['users', 'reset password'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/adduser', // full path as it would appear in the app
  description: 'we can reset password',
  requestSchema: addUserSchema,
  tags: ['users', 'adduser'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/users/get-all-user', // full path as it would appear in the app
  description: 'get all user',
  query: getAllPetientsSchema,
  tags: ['users', 'get all user'],
});

docsRegistry.addEndpoint({
  method: 'put',
  path: '/api/v1/users/update-admin-permission-to-doctor',
  description: 'we can update admin permission to doctor',
  requestSchema: updateAdminPermissionToDoctorSchema,
  tags: ['users', 'update admin permission to doctor'],
});

docsRegistry.addEndpoint({
  method: 'put',
  path: '/api/v1/users/onboarding/progress',
  description: 'Update user onboarding progress',
  requestSchema: updateOnboardingProgressSchema,
  tags: ['users', 'onboarding'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/users/onboarding/submit',
  description: 'Submit user profile for approval',
  tags: ['users', 'onboarding'],
});
