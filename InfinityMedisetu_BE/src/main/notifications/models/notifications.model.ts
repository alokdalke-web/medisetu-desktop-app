import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { UserModel } from '../../users/models/user.model';

export const NotificationsModel = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => UserModel.id, { onDelete: 'cascade' })
      .notNull(),
    type: varchar('type', { length: 120 }).notNull(), // e.g. 'message', 'system', 'appointment'
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data'), // arbitrary JSON payload
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    metadata: jsonb('metadata'), // optional meta (source, severity, etc)
  },
  (table) => [
    index('notifications_user_created_idx').on(
      table.userId,
      table.createdAt.desc()
    ),
    index('notifications_user_unread_idx')
      .on(table.userId, table.createdAt.desc())
      .where(sql`${table.read} = false`),
  ]
);
