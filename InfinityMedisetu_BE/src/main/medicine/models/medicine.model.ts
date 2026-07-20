import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { UserModel } from '../../users/models/user.model';

/**
 * Medicine Master Table
 * Stores medicine information synced from 1mg API or manually added
 */
export const MedicineModel = pgTable(
  'medicines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdByUserId: uuid('created_by_user_id').references(() => UserModel.id), // NULL = Global/System, Value = Doctor Private
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 50 }),
    genericName: varchar('generic_name', { length: 255 }),
    manufacturer: varchar('manufacturer', { length: 255 }),
    composition: text('composition'),
    form: varchar('form', { length: 50 }), // tablet, syrup, injection, etc.
    strength: varchar('strength', { length: 50 }), // e.g., "500mg"
    category: varchar('category', { length: 100 }),
    requiresPrescription: boolean('requires_prescription').default(false),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    // Global medicines (where createdByUserId is NULL) must have unique names
    uniqueIndex('ux_medicine_name_global')
      .on(table.name, table.form)
      .where(sql`${table.createdByUserId} IS NULL`),
    // Private medicines must have unique names per user
    uniqueIndex('ux_medicine_name_user')
      .on(table.name, table.form, table.createdByUserId)
      .where(sql`${table.createdByUserId} IS NOT NULL`),
  ]
);
