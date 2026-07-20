// src/schemas/auth.schemas.ts
import { z } from 'zod';

/**
 * Relationship of a patient to their primary (family head) patient.
 * Mirrors the enum stored in `patient_family_links.relationship`.
 */
export const patientRelationshipEnumZod = z.enum([
  'spouse',
  'child',
  'parent',
  'sibling',
  'friend',
  'other',
]);

export const userStatusEnumZod = z.enum([
  'Active',
  'Inactive',
  'Blocked',
  'New',
  'Pending',
  'Reviewing',
  'Rejected',
]);
export const verifyOtpSchema = z.object({
  email: z
    .string('Email must be a string')
    .trim()
    .min(5, 'Email must be at least 5 characters long')
    .max(254, 'Email must be less than 255 characters')
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: 'Email must be lowercase only',
    }),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'name is required'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
      'Password must be at least 8 characters long, with at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .min(8, 'password must be at least 8 characters'),
  token: z.string().min(1, 'Verification session token is required'),
  referralCode: z.string().optional(),
  turnstileToken: z.string().optional(),
  userStatus: z.string().optional(),
});

export const changePasswordSchema = z.object({
  password: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
      'New password must be at least 8 characters long, with at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .min(8, 'New password must be at least 8 characters'),
});

export const requestRegistrationSchema = z.object({
  email: z
    .string('Email must be a string')
    .trim()
    .min(5, 'Email must be at least 5 characters long')
    .max(254, 'Email must be less than 255 characters')
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: 'Email must be lowercase only',
    })
    .refine((val) => !val.endsWith('.'), {
      message: 'Email cannot end with a dot',
    }),
});

export const loginSchema = z.object({
  email: z
    .string('Email must be a string')
    .trim()
    .min(5, 'Email must be at least 5 characters long')
    .max(254, 'Email must be less than 255 characters')
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/,
      'Invalid email format'
    )
    .refine((val) => !val.endsWith('.'), {
      message: 'Email cannot end with a dot',
    }),
  password: z.string().min(1, 'password required'),
});

export const socialLoginSchema = z.object({
  provider: z.enum(['google']),
  idToken: z.string().min(1, 'idToken is required'),
  device: z.enum(['web', 'ios', 'android']).optional().default('web'),
});

export const requestPasswordResetSchema = z.object({
  email: z
    .string('Email must be a string')
    .trim()
    .min(5, 'Email must be at least 5 characters long')
    .max(254, 'Email must be less than 255 characters')
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/,
      'Invalid email format'
    )
    .refine((val) => !val.endsWith('.'), {
      message: 'Email cannot end with a dot',
    }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character'
    ),
});

export const setInitialPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character'
    ),
});

export const sendVerificationSchema = z.object({
  userId: z.uuid().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'token required'),
});

export const createPetientSchemas = z
  .object({
    name: z.string().min(1, 'name is required'),
    email: z
      .string('Email must be a string')
      .trim()
      .min(5, 'Email must be at least 5 characters long')
      .max(254, 'Email must be less than 255 characters')
      .regex(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/,
        'Invalid email format'
      )
      .refine((val) => !val.endsWith('.'), {
        message: 'Email cannot end with a dot',
      })
      .optional(),
    gender: z.string().min(1, 'gender is required'),
    age: z.number().min(1, 'age is required'),
    dob: z.string().min(1, 'dob is required').optional(),
    mobile: z.string().min(1, 'mobile is required').optional(),
    alternateMobile: z
      .string()
      .min(1, 'alternateMobile is required')
      .optional(),
    address: z.string().min(1, 'address is required').optional(),
    city: z.string().min(1, 'city is required'),
    state: z.string().min(1, 'state is required'),
    zipCode: z.string().nullable().optional(),
    profileImage: z.string().min(1, 'profileImage is required').optional(),
    bloodGroup: z
      .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .optional(),
    height: z.string().max(10).optional(),
    weight: z.string().max(10).optional(),
    allergies: z.array(z.string()).optional(),
    chronicConditions: z.array(z.string()).optional(),
    // Family relation (optional).
    // When `relationship` is provided, the new patient is linked as a family
    // member of a primary patient. The primary is identified either by:
    //   - primaryPatientId: an existing patient's id, OR
    //   - primaryPatientMobile: looked up by mobile; if no patient with that
    //     mobile exists, a new primary patient is created on the fly
    //     (primaryPatientName is then required).
    // The pairing rules are enforced in UserService.createPatient.
    primaryPatientId: z
      .string()
      .uuid('primaryPatientId must be a valid patient id')
      .optional(),
    primaryPatientMobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
      .optional(),
    primaryPatientName: z
      .string()
      .min(1, 'primaryPatientName cannot be empty')
      .optional(),
    relationship: patientRelationshipEnumZod.optional(),
  })
  .refine(
    (data) => {
      // Mobile is required for independent patients (no family link)
      if (
        !data.relationship &&
        !data.primaryPatientId &&
        !data.primaryPatientMobile
      ) {
        return Boolean(data.mobile && data.mobile.trim());
      }
      return true;
    },
    { message: 'mobile is required for independent patients', path: ['mobile'] }
  );

export const updatePetientSchemas = z.object({
  peteintId: z.string().min(1, 'petientId is required'),
  name: z.string().min(1, 'name is required').optional(),
  email: z
    .string()
    .trim()
    .min(5, 'Email must be at least 5 characters long')
    .max(254, 'Email must be less than 255 characters')
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: 'Email must be lowercase only',
    })
    .refine((val) => !val.endsWith('.'), {
      message: 'Email cannot end with a dot',
    })
    .optional(),
  gender: z.string().min(1, 'gender is required').optional(),
  age: z.number().min(1, 'age is required').optional(),
  dob: z.string().min(1, 'dob is required').optional(),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
    .optional(),

  alternateMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit alternate mobile number')
    .optional(),
  address: z.string().min(1, 'address is required').optional(),
  city: z.string().min(1, 'city is required').optional(),
  state: z.string().min(1, 'state is required').optional(),
  zipCode: z.string().nullable().optional(),
  profileImage: z.string().min(1, 'profileImage is required').optional(),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .optional(),
  height: z.string().max(10).optional(),
  weight: z.string().max(10).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
});

export const getPetientSchema = z.object({
  peteintId: z.string().min(1, 'petientId is required'),
});

export const getPetientQuerySchema = z.object({
  familyDetails: z.enum(['true', 'false']).optional(),
});

export const getAllPetientsSchema = z.object({
  pageSize: z.string().min(1, 'pageSize is required').optional(),
  pageNumber: z.string().min(1, 'pageNumber is required').optional(),
  page: z.string().min(1).optional(),
  searchBy: z.string().optional(),
  userType: z
    .enum([
      'Admin',
      'User',
      'Super_Admin',
      'Doctor',
      'Receptionist',
      'Nurse',
      'Patient',
      'Pharmacist',
      'Lab_Assistant',
      'Radiologist',
    ])
    .optional(),
  userStatus: z.enum(['Active', 'Inactive', 'Blocked', 'New']).optional(),
  patientId: z.string().nullable().optional(),
  visitRange: z
    .enum(['yesterday', 'today', 'week', 'month', 'custom'])
    .optional(),
  visitStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'visitStartDate must be YYYY-MM-DD')
    .optional(),
  visitEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'visitEndDate must be YYYY-MM-DD')
    .optional(),
  doctorId: z.string().uuid('doctorId must be a valid UUID').optional(),
  gender: z.string().optional(),
  minAge: z
    .string()
    .regex(/^\d+$/, 'minAge must be a positive integer')
    .optional(),
  maxAge: z
    .string()
    .regex(/^\d+$/, 'maxAge must be a positive integer')
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
    .optional(),
});

export const referralsSchema = z.object({
  pageSize: z.string().min(1, 'pageSize is required').optional(),
  pageNumber: z.string().min(1, 'pageNumber is required').optional(),
  page: z.string().min(1).optional(),
  searchBy: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  referredByName: z.string().optional(),
  referredToName: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const updateReferralSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  comments: z.string().optional().nullable(),
});

export const GetDoctorServiceSchema = z.object({
  doctorId: z.string().uuid(),
  patientId: z.string().uuid(),
});

export const addUserSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    email: z
      .string()
      .trim()
      .min(5, 'Email must be at least 5 characters long')
      .max(254, 'Email must be less than 255 characters')
      .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
        message: 'Email must be lowercase only',
      })
      .refine((val) => !val.endsWith('.'), {
        message: 'Email cannot end with a dot',
      }),
    userType: z.enum([
      'Doctor',
      'Receptionist',
      'Nurse',
      'Pharmacist',
      'Lab_Assistant',
      'Radiologist',
    ]),
    speciality: z.string().nullable().optional(),
    registrationNumber: z.string().nullable().optional(),
    labId: z.string().uuid().optional(),
    pharmacyId: z.string().uuid().optional(),
    mobile: z.string().length(10).optional(),
    userStatus: z.enum(['Active', 'Inactive', 'Blocked', 'New']).optional(),
  })
  .superRefine((data, ctx) => {
    // Lab_Assistant requires labId
    if (data.userType === 'Lab_Assistant' && !data.labId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'labId is required when adding a Lab Assistant',
        path: ['labId'],
      });
    }
    // Pharmacist requires pharmacyId
    if (data.userType === 'Pharmacist' && !data.pharmacyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pharmacyId is required when adding a Pharmacist',
        path: ['pharmacyId'],
      });
    }
    // Doctor should have speciality
    if (data.userType === 'Doctor' && !data.speciality) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'speciality is recommended for Doctor accounts',
        path: ['speciality'],
      });
    }
  });

export const updateAdminPermissionToDoctorSchema = z.object({
  isAdminDoctorAccess: z.boolean(),
  speciality: z.string().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),

    email: z
      .string()
      .trim()
      .min(5)
      .max(254)
      .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
        message: 'Email must be lowercase only',
      })
      .refine((val) => !val.endsWith('.'), {
        message: 'Email cannot end with a dot',
      })
      .optional(),

    speciality: z.string().nullable().optional(),

    mobile: z.string().length(10).nullable().optional(),

    userStatus: userStatusEnumZod.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be updated',
  });

export const updateUserStatusSchema = z.object({
  userStatus: userStatusEnumZod.optional(),
});

export const searchPatientSchema = z.object({
  search: z.string().optional(),
  pageSize: z.string().optional().default('30'),
  pageNumber: z.string().optional().default('1'),
});

export const checkPatientByMobileSchema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
});

export const onboardingStatusEnumZod = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
]);

export const updateOnboardingProgressSchema = z.object({
  onboardingStatus: onboardingStatusEnumZod.optional(),
  approvalRequestSent: z.boolean().optional(),
  currentStep: z.number().int().min(0).optional(),
});

// export type
export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type SocialLoginDto = z.infer<typeof socialLoginSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type CreatePetientDto = z.infer<typeof createPetientSchemas>;
export type UpdatePetientDto = z.infer<typeof updatePetientSchemas>;
export type getAllPetientsDto = z.infer<typeof getAllPetientsSchema>;
export type addUserDto = z.infer<typeof addUserSchema>;
export type updateAdminPermissionToDoctorDto = z.infer<
  typeof updateAdminPermissionToDoctorSchema
>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SearchPatientDto = z.infer<typeof searchPatientSchema>;
export type CheckPatientByMobileDto = z.infer<
  typeof checkPatientByMobileSchema
>;
export type GetAllReferralsDto = z.infer<typeof referralsSchema>;
export type UpdateReferralDto = z.infer<typeof updateReferralSchema>;
export type UpdateOnboardingProgressDto = z.infer<
  typeof updateOnboardingProgressSchema
>;
