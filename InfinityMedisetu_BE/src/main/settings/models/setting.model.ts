// src/models/access.models.ts
import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { UserModel } from '../../users/models/user.model';

// permission types (string identifiers)
export const SettingModel = pgTable(
  'settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => UserModel.id)
      .notNull(),
    emailNotification: boolean('email_notification').default(false).notNull(),
    smsNotification: boolean('sms_notification').default(false).notNull(),
    whatsappNotification: boolean('whatsapp_notification')
      .default(false)
      .notNull(),
    appointmentReminder: integer('appointment_reminder').default(1).notNull(),
    notificationPreferences: jsonb('notification_preferences'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [uniqueIndex('setting_unique').on(table.userId)]
);
