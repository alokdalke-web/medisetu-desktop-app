import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  pgEnum,
  uniqueIndex,
  json,
} from 'drizzle-orm/pg-core';
import { UserModel } from '../../users/models/user.model';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import { MedicineModel } from '../../medicine/models/medicine.model';
import { jsonb } from 'drizzle-orm/pg-core';
export const reportStatusEnum = pgEnum('report_status', [
  'Uploaded',
  'Pendig',
  'Approved',
  'Rejected',
  'Reviewed',
  'Completed',
  'Shared',
]);

export const ReportsModel = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportType: varchar('report_type', { length: 150 }).notNull(),
    description: text('description'),
    petientId: uuid('petient_id')
      .references(() => UserModel.id)
      .notNull(),
    reportDocs: text('report_docs').notNull(),
    reportStatus: reportStatusEnum('report_status').default('Pendig').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [uniqueIndex('ux_report').on(t.reportType, t.petientId)]
);

export const ReportCardModel = pgTable('report_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  petientId: uuid('petient_id')
    .references(() => UserModel.id)
    .notNull(),
  appointmentId: uuid('appointment_id')
    .references(() => AppointmentModel.id)
    .notNull(),
  reportId: uuid('report_id').references(() => ReportsModel.id),
  comorbidities: text('comorbidities').array(),
  habits: text('habits').array(),
  // vitals: json('vitals'),
  generalExamination: text('general_examination').array(),
  systemExamination: text('system_examination'),
  provisionalDiagnosis: text('provisional_diagnosis'),
  differentialDiagnosis: text('differential_diagnosis'),
  finalDiagnosis: text('final_diagnosis'),
  investigations: text('investigations'),
  advice: text('advice'),
  clinicalNotes: text('clinical_notes'),
  allergies: text('allergies').array(),
  surgerySuggested: text('surgerySuggested').array(),
  visitingDays: text('visitingDays').array(),
  visitingNotes: varchar('visiting_notes'),
  prescriptionPdf: text('prescription_pdf'),
  followUpInDays: varchar('follow_up_in_days'),
  followUpDate: timestamp('follow_up_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const PrescriptionModel = pgTable('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportCardId: uuid('report_card_id')
    .references(() => ReportCardModel.id)
    .notNull(),
  petientId: uuid('petient_id')
    .references(() => UserModel.id)
    .notNull(),
  medicineId: uuid('medicine_id').references(() => MedicineModel.id),
  prescribedBy: uuid('prescribed_by').references(() => UserModel.id),
  medicineName: varchar('medicine_name').notNull(),
  composition: varchar('composition'),
  strength: varchar('strength'),
  dosage: varchar('dosage').notNull(),
  frequency: varchar('frequency').notNull(),
  duration: varchar('duration').notNull(),
  manufacturer: varchar('manufacturer'),
  medicineCount: varchar('medicine_count'),
  marketer: varchar('marketer'),
  imageUrl: text('image_url'),
  notes: text('notes'),
  uses: json('uses'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const favouritePrescriptionModel = pgTable('favourite_prescription', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id')
    .references(() => UserModel.id)
    .notNull(),
  favouritePrescriptionName: varchar('favourite_prescription_name'),
  medicine: jsonb('medicine'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const PrescriptionTemplateModel = pgTable('prescription_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: uuid('doctor_id')
    .notNull()
    .references(() => UserModel.id),
  templateName: varchar('template_name', { length: 50 }).notNull(),
  fontFamily: varchar('font_family', { length: 100 }).notNull(),
  color1: varchar('color1', { length: 20 }).notNull(),
  color2: varchar('color2', { length: 20 }).notNull(),
  color3: varchar('color3', { length: 20 }).notNull(),
  color4: varchar('color4', { length: 20 }).notNull(),
  color5: varchar('color5', { length: 20 }).notNull(),
  color6: varchar('color6', { length: 20 }).notNull(),
  color7: varchar('color7', { length: 20 }).notNull(),
  color8: varchar('color8', { length: 20 }).notNull(),
  color9: varchar('color9', { length: 20 }).notNull(),
  color10: varchar('color10', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
