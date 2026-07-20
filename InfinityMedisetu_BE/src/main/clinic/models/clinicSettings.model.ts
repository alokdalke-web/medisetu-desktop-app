import {
  pgTable,
  uuid,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { ClinicModel } from './clinic.model';

export const ClinicSettingsModel = pgTable('clinic_settings', {
  id: uuid('id').primaryKey().defaultRandom(),

  clinicId: uuid('clinic_id')
    .references(() => ClinicModel.id)
    .notNull()
    .unique(),

  voiceCallEnabled: boolean('voice_call_enabled').default(false).notNull(),

  smsEnabled: boolean('sms_enabled').default(false).notNull(),

  whatsappEnabled: boolean('whatsapp_enabled').default(false).notNull(),

  loginAlertsEnabled: boolean('login_alerts_enabled').default(false).notNull(),

  autoLogoutMinutes: integer('auto_logout_minutes'),

  runningLateThresholdMinutes: integer(
    'running_late_threshold_minutes'
  ).default(10),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  updatedAt: timestamp('updated_at').defaultNow(),
});
