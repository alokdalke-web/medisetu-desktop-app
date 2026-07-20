import { z } from "zod";

export const appointmentEnumSchema = z.enum([
  "Upcoming",
  "Completed",
  "Cancelled",
  "Rescheduled",
  "Pending",
  "Patient Arrived",
  "Missed",
  "Confirmed",
]);

export const vitalsSchema = z.object({
  bpSys: z.number().nullable().optional(),
  bpDia: z.number().nullable().optional(),
  pulse: z.number().nullable().optional(),
  spo2: z.number().nullable().optional(),
  temperatureC: z.number().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  bmi: z.number().nullable().optional(),
});

export const createAppointmentSchemas = z.object({
  patientId: z.uuid().min(1).optional(),
  appointmentType: z.string().min(1, "Appointment type is required"),
  appointmentDate: z.string().min(1, "Appointment date is required"),
  appointmentTime: z.string().min(1, "Appointment time is required"),
  appointmentStatus: appointmentEnumSchema.optional(),
  appointmentNotes: z.string().min(1).optional(),
  reReasonForCancellation: z.string().min(1).optional(),
  reasionForReSchedule: z.string().min(1).optional(),
  doctorId: z.uuid().min(1).optional(),
});
export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  paymentStatus: z.string().optional(),
  refundMode: z.string().optional(),
  refundedAmount: z.string().optional(),
  refundNotes: z.string().optional(),
  appointmentType: z.string().optional(),
  appointmentNotes: z.string().optional(),
  appointmentStatus: appointmentEnumSchema.optional(),
  vitals: vitalsSchema.optional(),
  reason: z.string().min(1).optional(),
  confirmationReason: z.string().min(1).optional(),
  paymentMode: z.string().optional(),
  paymentNotes: z.string().optional(),
});

export const appointmentQuerySchema = z.object({
  pageSize: z.string().min(1, "appointmentId is required").optional(),
  pageNumber: z.string().min(1, "appointmentId is required").optional(),
  searchBy: z.string().min(1, "appointmentId is required").optional(),
});
export const appointmentIdSchema = z.object({
  appointmentId: z.string().min(1, "appointmentId is required"),
});
export const patientIdSchema = z.object({
  patientId: z.string().min(1, "patientId is required"),
});
export const doctorIdSchema = z.object({
  doctorId: z.string().min(1, "doctorId is required"),
});

export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;
export type createAppointmentDto = z.infer<typeof createAppointmentSchemas>;
export type appointmentQueryDto = z.infer<typeof appointmentQuerySchema>;
export type patientIdDto = z.infer<typeof patientIdSchema>;
export type doctorIdDto = z.infer<typeof doctorIdSchema>;
