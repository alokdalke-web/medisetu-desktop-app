import { z } from 'zod';

export const appointmentEnumSchema = z.enum([
  'Upcoming',
  'Completed',
  'Cancelled',
  'Rescheduled',
  'Pending',
  'Missed',
  'Confirmed',
  'Patient Arrived',
  'NoShow',
]);
export const bookingSourceSchema = z.enum([
  'mobile_app',
  'web_portal',
  'phone_call',
  'walk_in',
  'system',
]);
export const commonSymptomsEnum = z.enum([
  'Fever',
  'Headache',
  'Body_Pain',
  'Fatigue',
  'Weakness',
  'Loss_of_Appetite',
  'Nausea',
  'Dizziness',
  'Cough',
  'Sore_Throat',
  'Chills',
  'Sweating',
  'Sleep_Disturbance',
]);

export const createAppointmentSchemas = z.object({
  patientId: z.uuid().min(1).optional(),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  appointmentDate: z.string().min(1, 'Appointment date is required'),
  // Token-based appointments don't require appointmentTime
  appointmentTime: z.string().min(1).optional().nullable(),
  // Token number when clinic uses max patients (token-based booking)
  tokenNo: z.coerce.number().int().positive().optional(),
  appointmentStatus: appointmentEnumSchema.optional(),
  commonSymptoms: z.array(commonSymptomsEnum).optional(),
  clinicSymptomIds: z.array(z.string().uuid()).optional(),
  appointmentNotes: z.string().optional().nullable(),
  reReasonForCancellation: z.string().min(1).optional(),
  reasionForReSchedule: z.string().min(1).optional(),
  doctorId: z.uuid().min(1),
  clinicServiceId: z.uuid().min(1).optional(),
  paymentMode: z.string().min(1).optional(),
  paymentStatus: z.string().min(1).optional(),
  price: z.string().optional(),
  primaryServicePrice: z.string().optional(),
  paymentNotes: z.string().optional(),
  // Optional for token-based appointments
  appointmentDurationMinutes: z.string().optional(),
  bookingSource: bookingSourceSchema.optional(),
});
export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().optional().nullable(),
  appointmentTime: z.string().optional().nullable(),
  appointmentType: z.string().optional(),
  appointmentNotes: z.string().optional(),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().optional(),
  price: z.string().optional(),
  primaryServicePrice: z.string().optional(),
  paymentNotes: z.string().optional(),
  refundMode: z.string().optional(),
  refundedAmount: z.number().optional(),
  refundNotes: z.string().optional(),
  appointmentStatus: appointmentEnumSchema.optional(),
  reason: z.string().optional(),
  consentNotes: z.string().optional(),
  commonSymptoms: z.array(commonSymptomsEnum).optional(),
  clinicSymptomIds: z.array(z.string().uuid()).optional(),
  appointmentDurationMinutes: z.string().optional(),
  reReasonForCancellation: z.string().optional(),
  reasionForReSchedule: z.string().nullable().optional(),
  tokenNo: z.coerce.number().int().positive().optional(),
  vitals: z.record(z.string(), z.any()).optional().nullable(),
  referrals: z.record(z.string(), z.any()).optional().nullable(),
  bookingSource: bookingSourceSchema.optional(),
});

export const appointmentQuerySchema = z.object({
  // Pagination
  pageSize: z.string().regex(/^\d+$/, 'pageSize must be a number').optional(),

  pageNumber: z
    .string()
    .regex(/^\d+$/, 'pageNumber must be a number')
    .optional(),

  search: z.string().optional(),

  startDate: z.string().optional(),
  endDate: z.string().optional(),
  doctorId: z.string().optional(),

  // Status filter
  appointmentStatus: z
    .union([
      z.array(
        z.enum([
          'Upcoming',
          'Completed',
          'Cancelled',
          'Rescheduled',
          'Pending',
          'Missed',
          'Confirmed',
          'Patient Arrived',
          'NoShow',
        ])
      ),
      z.enum([
        'Upcoming',
        'Completed',
        'Cancelled',
        'Rescheduled',
        'Patient Arrived',
        'Pending',
        'Missed',
        'Confirmed',
        'NoShow',
      ]),
      z.string(),
    ])
    .optional(),
});

export const clinicAppointmentDetailsQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  doctorId: z.string().uuid('Invalid doctorId').optional(),
});

export const appointmentIdSchema = z.object({
  appointmentId: z.string().min(1, 'appointmentId is required'),
});
export const patientIdSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
});
export const serviceIdSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
});
export const doctorIdSchema = z.object({
  doctorId: z.string().min(1, 'doctorId is required'),
});

export const getAppointmentPaymentsSchema = z.object({
  pageSize: z.coerce.number().min(1).optional().default(100),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  doctorId: z.union([z.string(), z.array(z.string())]).optional(),
  patientId: z.union([z.string(), z.array(z.string())]).optional(),
  paymentMode: z.union([z.string(), z.array(z.string())]).optional(),
  refundMode: z.union([z.string(), z.array(z.string())]).optional(),
  paymentStatus: z
    .union([
      z.enum(['Paid', 'Refunded', 'Already Paid', 'Pending']),
      z.array(z.enum(['Paid', 'Refunded', 'Already Paid', 'Pending'])),
    ])
    .optional()
    .default(['Paid', 'Refunded', 'Already Paid', 'Pending']),
  entryType: z.enum(['Credit', 'Debit']).optional(),
});

export const getAvailableSlotsForDateSchemas = z.object({
  date: z.string().min(1, 'date is required'),
  time: z.string().optional(),
  onlyOccupied: z.boolean().optional(),
  occupyMode: z.string().optional(),
});
export const getAvailableSlotsForParamsSchemas = z.object({
  doctorId: z.string().min(1, 'doctorId is required'),
});

export const createPatientGallerySchema = z.object({
  appointmentId: z.string().uuid('Invalid Appointment ID'),
  patientId: z.string().uuid('Invalid Patient ID'),
  description: z.string().optional(),
});

export const medicalCertificateSchema = z.object({
  medicalCondition: z.string().optional(),
  restDays: z.int32().optional(),
  notes: z.array(z.string()).optional().nullable(),
});

export const getPatientGallerySchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID').optional(),
  appointmentId: z.string().uuid('Invalid Appointment ID').optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(30).optional(),
});

export const getDoctorGallerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(30).optional(),
});

export const addMultipleServicesSchema = z.object({
  serviceIds: z
    .array(z.string().uuid())
    .min(1, 'At least one service ID is required'),
  paymentMode: z.string().optional(),
  payment_notes: z.string().optional(),
});

export type CreatePatientGalleryDto = z.infer<
  typeof createPatientGallerySchema
>;
export type GetPatientGalleryDto = z.infer<typeof getPatientGallerySchema>;
export type GetDoctorGalleryDto = z.infer<typeof getDoctorGallerySchema>;
export type AddMultipleServicesDto = z.infer<typeof addMultipleServicesSchema>;

export type GetAppointmentPaymentsDto = z.infer<
  typeof getAppointmentPaymentsSchema
>;
export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;
export type createAppointmentDto = z.infer<typeof createAppointmentSchemas>;
export type appointmentQueryDto = z.infer<typeof appointmentQuerySchema>;
export type ClinicAppointmentDetailsQueryDto = z.infer<
  typeof clinicAppointmentDetailsQuerySchema
>;
export type patientIdDto = z.infer<typeof patientIdSchema>;
export type doctorIdDto = z.infer<typeof doctorIdSchema>;
export type getAvailableSlotsForDateDto = z.infer<
  typeof getAvailableSlotsForDateSchemas
>;

export type getAvailableSlotsForParamsDto = z.infer<
  typeof getAvailableSlotsForParamsSchemas
>;

export const noShowPolicyRuleSchema = z.object({
  count: z.number().min(1),
  action: z.enum(['warning', 'penalty', 'advance_required', 'blocked']),
  penaltyAmount: z.number().optional(),
  penaltyType: z.enum(['fixed', 'percentage']).optional(),
  blockDurationDays: z.number().optional(),
});

export const createNoShowPolicySchema = z.object({
  gracePeriodMinutes: z.number().min(0).default(15),
  rules: z.array(noShowPolicyRuleSchema).default([]),
  isActive: z.boolean().default(true),
});

export const markNoShowSchema = z.object({
  reason: z.string().optional(),
});

export const sendManualPrescriptionNotificationSchema = z.object({
  otp: z.string().min(1, 'OTP is required'),
});

export type CreateNoShowPolicyDto = z.infer<typeof createNoShowPolicySchema>;
export type MarkNoShowDto = z.infer<typeof markNoShowSchema>;
export type SendManualPrescriptionNotificationDto = z.infer<
  typeof sendManualPrescriptionNotificationSchema
>;
