import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  text,
  uniqueIndex,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import {
  ClinicModel,
  ClinicServiceModel,
} from '../../clinic/models/clinic.model';
import { UserModel } from '../../users/models/user.model';
import { ClinicCancellationPolicyModel } from '../../cancellation-policy/models/cancellationPolicy.model';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userStatusEnum = pgEnum('apointment_status', [
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

export const noShowMarkedByEnum = pgEnum('no_show_marked_by', [
  'doctor',
  'receptionist',
  'system',
  'admin',
]);

export const bookingSourceEnum = pgEnum('booking_source', [
  'mobile_app',
  'web_portal',
  'phone_call',
  'walk_in',
  'system',
]);

export const commonSymptomsEnum = pgEnum('common_symptoms', [
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

// ─── Core Appointment Model (Scheduling & Status) ────────────────────────────

export const AppointmentModel = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentType: varchar('appointment_type').notNull(),
    appointmentDate: timestamp('appointment_date').notNull(),
    appointmentTime: varchar('appointment_time'),
    tokenNo: integer('token_no'),
    appointmentStatus: userStatusEnum('appointment_status')
      .default('Upcoming')
      .notNull(),
    clinicId: uuid('clinic_id')
      .references(() => ClinicModel.id)
      .notNull(),
    patientId: uuid('patient_id')
      .references(() => UserModel.id)
      .notNull(),
    doctorId: uuid('doctor_id').references(() => UserModel.id, {
      onDelete: 'cascade',
    }),
    clinicServiceId: uuid('clinic_service_id').references(
      () => ClinicServiceModel.id
    ),
    clinicCancellationPolicyId: uuid(
      'clinic_cancellation_policy_id'
    ).references(() => ClinicCancellationPolicyModel.id),
    appointmentDurationMinutes: varchar('appointment_duration_minutes'),
    reReasonForCancellation: text('reason_for_cancellation'),
    reasionForReSchedule: text('reason_for_reschedule'),
    noShowMarkedBy: noShowMarkedByEnum('no_show_marked_by'),
    bookingSource: bookingSourceEnum('booking_source')
      .default('system')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('appointment_unique').on(
      table.clinicId,
      table.patientId,
      table.createdAt
    ),
    index('appointments_appointment_date_idx').on(table.appointmentDate),
    index('appointments_clinic_status_date_idx').on(
      table.clinicId,
      table.appointmentStatus,
      table.appointmentDate
    ),
    index('appointments_doctor_date_idx').on(
      table.doctorId,
      table.appointmentDate
    ),
  ]
);
