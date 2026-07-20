import { z } from 'zod';

// Enum for currency (expand as needed)
// const currencyEnum = z.enum(['INR', 'USD', 'EUR']);

// 📍 1. Clinic Details
const clinicDetailsSchema = z.object({
  clinicName: z.string().min(2),
  clinicPhone: z.string().min(10).max(15),
  Tagline: z.string().optional(),
  clinicAddress: z.string().optional(),
  State: z.string(),
  City: z.string(),
  ZipCode: z.coerce
    .number()
    .int()
    .refine(
      (n) => n >= 100000 && n <= 999999,
      'ZipCode must be exactly 6 digits'
    ),
  clinicLogo: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// // 📍 2. Doctor Profile
const adminProfileSchema = z.object({
  name: z.string().min(2),
  // email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'invalid email'),
  mobile: z.string().trim().optional().or(z.literal('')),

  alternateMobile: z.string().trim().optional().or(z.literal('')),
  profileImage: z.string().optional(),
  isAdminDoctorAccess: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (val === true || val === 'true') return true;
      if (val === false || val === 'false') return false;
      return false;
    }),
  speciality: z.string().optional(),
  registrationNumber: z.string().optional(),
});

// 📍 5. Final Schema Wrapper
export const fullDoctorClinicSchema = z.object({
  clinicDetails: clinicDetailsSchema,
  adminProfile: adminProfileSchema.partial().optional(),
});

export type FullDoctorClinicDto = z.infer<typeof fullDoctorClinicSchema>;

export const getClinicSchema = z.object({
  clinicId: z.string(),
});

// 📍 1. Clinic Details
const updateClinicDetailsSchema = z.object({
  clinicName: z.string().min(2).optional(),
  clinicPhone: z.string().min(10).max(15).optional().or(z.literal('')),
  Tagline: z.string().optional().optional(),
  clinicAddress: z.string().optional().optional(),
  State: z.string().optional(),
  City: z.string().optional(),
  ZipCode: z.coerce.number().int().min(100000).optional(), // assuming Indian PIN codes
  clinicLogo: z.string().optional().optional(),
  status: z.enum(['Active', 'Inactive', 'Blocked']).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// // 📍 2. Doctor Profile
const updateAdminProfileSchema = z.object({
  name: z.string().min(2).optional(),
  // email: z
  //   .string()
  //   .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'invalid email')
  //   .optional(),
  mobile: z.string().optional().or(z.literal('')),
  alternateMobile: z.string().optional().or(z.literal('')),
  profileImage: z.string().optional(),
  isAdminDoctorAccess: z.boolean().optional(),
  speciality: z.string().optional(),
  registrationNumber: z.string().optional(),
  upiIds: z.array(z.string()).optional(),
});
export const doctorQualificationSchema = z.object({
  qualificationType: z.string(),
  qualificationTitle: z.string(),
  specialization: z.string().optional(),
  boardOrUniversity: z.string().optional(),
  yearOfCompletion: z.coerce.number().int().optional(),
});

export const doctorQualificationsSchema = z.array(doctorQualificationSchema);

export const updateClinicSchema = z.object({
  clinicDetails: updateClinicDetailsSchema.partial().optional(),
  adminProfile: updateAdminProfileSchema.partial().optional(),
  qualifications: doctorQualificationsSchema.optional(),
});

export type FulUpdateClinicSchemaDto = z.infer<typeof updateClinicSchema>;

export const assignClincToUserSchemas = z.object({
  clinicId: z.uuid().min(1, 'clinicId is required'),
});
export type AssignClincToUserDto = z.infer<typeof assignClincToUserSchemas>;

export const availableClinicsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Blocked']).optional(),
});

export type AvailableClinicsQueryDto = z.infer<
  typeof availableClinicsQuerySchema
>;

export const clinicDetailParamsSchema = z.object({
  clinicId: z.string().uuid('Invalid clinicId'),
});

export const reminderParamsSchema = z.object({
  reminderId: z.string().uuid('Invalid reminderId'),
});

const clinicSettingsSchema = z.object({
  voiceCallEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),

  loginAlertsEnabled: z.boolean().optional(),

  autoLogoutMinutes: z.number().int().min(1).nullable().optional(),

  runningLateThresholdMinutes: z
    .number()
    .int()
    .min(5)
    .max(60)
    .default(10)
    .optional(),
});

const reminderSchema = z.object({
  id: z.string().uuid().optional(),

  timeValue: z.number().int().min(1),

  timeUnit: z.enum(['Minutes', 'Hours', 'Days']),

  reminderType: z.string().min(1),

  isActive: z.boolean().optional(),
});

export const upsertClinicSettingsSchema = z.object({
  settings: clinicSettingsSchema.optional(),

  reminders: z.array(reminderSchema).optional(),
});

export const getClinicsWithDoctorsQuerySchema = z
  .object({
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format' })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be less than or equal to endDate',
      path: ['endDate'],
    }
  );

export type ClinicSettingsDto = z.infer<typeof clinicSettingsSchema>;
export type ClinicReminderDto = z.infer<typeof reminderSchema>;
export type UpsertClinicSettingsDto = z.infer<
  typeof upsertClinicSettingsSchema
>;
export type GetClinicsWithDoctorsQuery = z.infer<
  typeof getClinicsWithDoctorsQuerySchema
>;
