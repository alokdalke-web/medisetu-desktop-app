// src/main/notifications/services/notifications.service.ts
import { database } from '../../../configurations/dbConnection';
import { NotificationsModel } from '../models/notifications.model';
import { and, desc, eq } from 'drizzle-orm';

export type NotificationInsert = {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function createNotification(record: NotificationInsert) {
  const res = await database
    .insert(NotificationsModel)
    .values({
      userId: record.userId,
      type: record.type,
      title: record.title,
      body: record.body,
      data: record.data ?? null,
      metadata: record.metadata ?? null,
    })
    .returning();
  return res[0];
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notificationId: string) {
  const res = await database
    .update(NotificationsModel)
    .set({ read: true })
    .where(eq(NotificationsModel.id, notificationId))
    .returning();
  return res[0];
}

/**
 * Mark ALL notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string) {
  const res = await database
    .update(NotificationsModel)
    .set({ read: true })
    .where(
      and(
        eq(NotificationsModel.userId, userId),
        eq(NotificationsModel.read, false)
      )
    )
    .returning();

  return {
    count: res.length,
    notifications: res,
  };
}

/**
 * List all notifications for a user (read + unread)
 */
export async function listNotificationsForUser(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  const q = database
    .select()
    .from(NotificationsModel)
    .where(eq(NotificationsModel.userId, userId))
    .orderBy(desc(NotificationsModel.createdAt))
    .limit(opts.limit ?? 50);

  if (opts.offset) q.offset(opts.offset);
  const rows = await q;
  return rows;
}

/**
 * List ONLY unread notifications for a user
 */
export async function listUnreadNotificationsForUser(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  const q = database
    .select()
    .from(NotificationsModel)
    .where(
      and(
        eq(NotificationsModel.userId, userId),
        eq(NotificationsModel.read, false)
      )
    )
    .orderBy(desc(NotificationsModel.createdAt))
    .limit(opts.limit ?? 100);

  if (opts.offset) q.offset(opts.offset);
  const rows = await q;
  return rows;
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await database
    .select({ id: NotificationsModel.id })
    .from(NotificationsModel)
    .where(
      and(
        eq(NotificationsModel.userId, userId),
        eq(NotificationsModel.read, false)
      )
    );

  return rows.length;
}

/**
 * Delete a single notification
 */
export async function deleteNotification(notificationId: string) {
  const res = await database
    .delete(NotificationsModel)
    .where(eq(NotificationsModel.id, notificationId))
    .returning();
  return res[0];
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotificationsForUser(userId: string) {
  const res = await database
    .delete(NotificationsModel)
    .where(eq(NotificationsModel.userId, userId))
    .returning();
  return res;
}
