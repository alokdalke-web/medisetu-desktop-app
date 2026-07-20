import {
  index,
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { ClinicModel } from '../../clinic/models/clinic.model';
import { UserModel } from '../../users/models/user.model';

export const labStatusEnum = pgEnum('lab_status', [
  'Active',
  'Inactive',
  'Blocked',
  'New',
]);

export const labCatalogStatusEnum = pgEnum('lab_catalog_status', [
  'active',
  'inactive',
]);

export const LabsModel = pgTable(
  'labs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clinicId: uuid('clinic_id')
      .references(() => ClinicModel.id)
      .notNull(),
    name: varchar('name').notNull(),
    address: text('address').notNull(),
    contactNo: varchar('contact_no').notNull(),
    email: varchar('email').notNull(),
    logo: text('logo'),
    gstNumber: varchar('gst_number', { length: 50 }),
    reportFooter: text('report_footer'),
    deletedAt: timestamp('deleted_at'),
    labStatus: labStatusEnum('lab_status').default('New').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('idx_labs_clinic_id').on(table.clinicId),
  })
);

export const UserLabAssignmentsModel = pgTable(
  'user_lab_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => UserModel.id)
      .notNull(),
    labId: uuid('lab_id')
      .references(() => LabsModel.id)
      .notNull(),
    clinicId: uuid('clinic_id')
      .references(() => ClinicModel.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userLabClinicUnique: uniqueIndex(
      'user_lab_assignments_user_lab_clinic_unique'
    ).on(table.userId, table.labId, table.clinicId),
    labIdIdx: index('idx_user_lab_assignments_lab_id').on(table.labId),
    userIdIdx: index('idx_user_lab_assignments_user_id').on(table.userId),
  })
);

export const LabDepartmentsMasterModel = pgTable(
  'lab_departments_master',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 80 }).notNull(),
    status: labCatalogStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex('lab_departments_master_code_unique').on(
      table.code
    ),
    statusIdx: index('idx_lab_departments_master_status').on(table.status),
    nameIdx: index('idx_lab_departments_master_name').on(table.name),
  })
);

export const LabDepartmentsModel = pgTable(
  'lab_departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    labId: uuid('lab_id')
      .references(() => LabsModel.id)
      .notNull(),
    departmentId: uuid('department_id')
      .references(() => LabDepartmentsMasterModel.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    labDeptUnique: uniqueIndex('lab_dept_unique').on(
      table.labId,
      table.departmentId
    ),
    departmentIdIdx: index('idx_lab_departments_department_id').on(
      table.departmentId
    ),
  })
);
