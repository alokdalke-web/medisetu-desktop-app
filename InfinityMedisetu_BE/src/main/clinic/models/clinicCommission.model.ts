import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
} from 'drizzle-orm/pg-core';
import { ClinicModel } from './clinic.model';

export const ClinicCommissionModel = pgTable('clinic_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id')
    .references(() => ClinicModel.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  commissionType: varchar('commission_type', { length: 50 })
    .default('percentage')
    .notNull(), // 'percentage' | 'fixed'
  commissionValue: decimal('commission_value', {
    precision: 12,
    scale: 2,
  }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
