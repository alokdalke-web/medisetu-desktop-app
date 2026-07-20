import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  varchar,
  text,
  integer,
  uniqueIndex,
  doublePrecision,
} from 'drizzle-orm/pg-core';
import { UserModel } from '../../users/models/user.model';
import { numeric } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const clinicStatusEnum = pgEnum('clinic_status', [
  'Active',
  'Inactive',
  'Blocked',
]);

export const clinicOnboardingStatusEnum = pgEnum('clinic_onboarding_status', [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
]);

// permission types (string identifiers)
export const ClinicModel = pgTable(
  'clinics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => UserModel.id)
      .notNull(),
    clinicName: varchar('clinic_name', { length: 150 }).notNull(),
    Tagline: varchar('tagline'),
    clinicAddress: text('clinic_address'),
    clinicPhone: varchar('clinic_phone', { length: 20 }),
    State: varchar('state'),
    City: varchar('city'),
    ZipCode: integer('zip_code'),
    clinicLogo: text('clinic_logo'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    status: clinicStatusEnum('status').default('Active').notNull(),
    razorpayAccountId: varchar('razorpay_account_id', { length: 255 }),
    routeStatus: varchar('route_status', { length: 50 }).default('INACTIVE'),
    routeOnboardedAt: timestamp('route_onboarded_at'),
    onboardingStatus: clinicOnboardingStatusEnum('onboarding_status')
      .default('NOT_STARTED')
      .notNull(),
    approvalRequestSent: boolean('approval_request_sent')
      .default(false)
      .notNull(),
    currentStep: integer('current_step').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [uniqueIndex('user_unique').on(table.userId)]
);

export const ClinicServiceModel = pgTable(
  'clinics_service',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clinicId: uuid('clinic_id')
      .references(() => ClinicModel.id)
      .notNull(),
    serviceName: varchar('service_name', { length: 250 }).notNull(),
    price: integer('price'),
    currency: varchar('currency', { length: 8 }).default('USD').notNull(),
    additionalServices: text('additional_services'),
    canBeBookedByPatient: boolean('can_be_booked_by_patient')
      .default(true)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
    doctorId: uuid('doctor_id').references(() => UserModel.id),
    durationDays: integer('duration'),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('clinic_service_unique').on(
      table.clinicId,
      table.serviceName,
      table.doctorId
    ),
  ]
);

export const ClinicAvailability = pgTable(
  'clinic_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    clinicId: uuid('clinic_id')
      .references(() => ClinicModel.id)
      .notNull(),
    dayOfWeek: varchar('day_of_week').notNull(),

    startTime: varchar('start_time'),
    endTime: varchar('end_time'),

    breaksStart: varchar('breaks_start'),
    breaksEnd: varchar('breaks_end'),

    isAvailable: boolean('is_available').default(true).notNull(),

    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    doctorId: uuid('doctor_id').references(() => UserModel.id),
    slotMinutes: integer('slotMinutes'),
    stepMinutes: integer('stepMinutes'),
    // If set, doctor uses token-based booking for this day (max patients/tokens)
    noOfPatients: integer('no_of_patients'),
  },
  (t) => [uniqueIndex('ux_clinic_day').on(t.clinicId, t.dayOfWeek, t.doctorId)]
);

export const ClinicAvailabilityBreak = pgTable(
  'clinic_availability_break',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clinicAvailabilityId: uuid('clinic_id')
      .references(() => ClinicAvailability.id)
      .notNull(),
    breakType: varchar('break_type').notNull(),
    startTime: varchar('start_time'),
    endTime: varchar('end_time'),
    notes: text('notes'),
    status: boolean('status').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('ux_clinic_break').on(t.clinicAvailabilityId, t.breakType),
  ]
);

export const ClinicAssignModel = pgTable(
  'clinic_assign',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => UserModel.id)
      .notNull(),
    clinicId: uuid('clinic_id')
      .references(() => ClinicModel.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('user_clinic_unique').on(table.userId, table.clinicId),
  ]
);
export const appointmentPlainStatusEnum = pgEnum('appointment_plain_status', [
  'active',
  'inactive',
  'paused',
  'trial',
  'cancelled',
  'expired',
]);

export const paymentModeEnum = pgEnum('payment_mode_enum', [
  'cash',
  'upi',
  'card',
  'insurance',
]);

export const paymentStatusEnum = pgEnum('payment_status_enum', [
  'paid',
  'pending',
  'refunded',
]);

export const ClinicAppointmentPlainModel = pgTable('clinic_appointments', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  doctorId: uuid('doctor_id')
    .references(() => UserModel.id, { onDelete: 'cascade' })
    .notNull(),

  patientId: uuid('patient_id')
    .references(() => UserModel.id, { onDelete: 'cascade' })
    .notNull(),

  clinicId: uuid('clinc_id')
    .references(() => ClinicModel.id, { onDelete: 'cascade' })
    .notNull(),

  doctorSubscriptionId: uuid('doctor_subscription_id')
    .references(() => ClinicServiceModel.id, { onDelete: 'cascade' })
    .notNull(),

  expireAt: timestamp('expireAt').notNull(), // optional: interval type

  // Status & Notes
  status: appointmentPlainStatusEnum('status').notNull().default('active'), // scheduled, completed, cancelled, no-show
  notes: text('notes'),

  // Billing
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum('payment_status'), // paid, pending, refunded
  paymentMode: paymentModeEnum('payment_mode'), // cash, upi, card, insurance

  // Meta
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ClinicDateAvailability = pgTable(
  'clinic_date_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clinicId: uuid('clinic_id')
      .references(() => ClinicModel.id)
      .notNull(),
    doctorId: uuid('doctor_id')
      .references(() => UserModel.id)
      .notNull(),
    date: timestamp('date').notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    notes: text('notes'),
    slotMinutes: integer('slot_minutes'),
    stepMinutes: integer('step_minutes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('ux_clinic_doctor_date').on(t.clinicId, t.doctorId, t.date),
  ]
);

export const ClinicDateAvailabilityTimeSlots = pgTable(
  'clinic_date_availability_time_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clinicDateAvailabilityId: uuid('clinic_date_availability_id')
      .references(() => ClinicDateAvailability.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    startTime: varchar('start_time').notNull(),
    endTime: varchar('end_time').notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('ux_clinic_date_time_slot').on(
      t.clinicDateAvailabilityId,
      t.startTime,
      t.endTime
    ),
  ]
);
