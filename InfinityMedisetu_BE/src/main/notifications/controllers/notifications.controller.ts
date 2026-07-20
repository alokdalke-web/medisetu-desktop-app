import { Request, Response } from 'express';
import { asyncHandler } from '../../../middlewear/errorHandler';
import {
  sendCreated,
  sendNoContent,
  sendOk,
} from '../../../utils/response.utils';
import { SnsNotificationService } from '../services/sns.service';
import {
  listNotificationsForUser,
  listUnreadNotificationsForUser,
  markNotificationRead,
  deleteNotification,
  deleteAllNotificationsForUser,
} from '../services/notifications.service';
import { database } from '../../../configurations/dbConnection';
import { NotificationsModel } from '../models/notifications.model';
import { and, eq } from 'drizzle-orm';

/**
 * POST /api/v1/notifications/devices
 * Register device token for push notifications (FCM tokens).
 */
export const registerDeviceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { deviceToken, platform } = req.validatedBody;
    const result = await SnsNotificationService.registerDevice(
      req.user.id,
      deviceToken,
      platform
    );
    return sendCreated(res, 'Device registered successfully', result);
  }
);

/**
 * DELETE /api/v1/notifications/devices/:deviceToken
 * Unregister device token.
 */
export const unregisterDeviceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { deviceToken } = req.validatedParams;
    await SnsNotificationService.unregisterDevice(deviceToken);
    return sendNoContent(res, 'Device unregistered successfully');
  }
);

/**
 * GET /api/v1/notifications
 * Get all notifications for the authenticated user.
 */
export const listNotificationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit, offset } = req.validatedQuery ?? {};
    const result = await listNotificationsForUser(req.user.id, {
      limit,
      offset,
    });
    return sendOk(res, 'Notifications fetched successfully', result);
  }
);

/**
 * GET /api/v1/notifications/unread
 * Get unread notifications for the authenticated user.
 */
export const listUnreadNotificationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit, offset } = req.validatedQuery ?? {};
    const result = await listUnreadNotificationsForUser(req.user.id, {
      limit,
      offset,
    });
    return sendOk(res, 'Unread notifications fetched successfully', result);
  }
);

/**
 * PUT /api/v1/notifications/read/:notificationId
 * Mark a specific notification as read.
 */
export const markReadHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { notificationId } = req.validatedParams;

    const [own] = await database
      .select({ id: NotificationsModel.id })
      .from(NotificationsModel)
      .where(
        and(
          eq(NotificationsModel.id, notificationId),
          eq(NotificationsModel.userId, req.user.id)
        )
      )
      .limit(1);

    if (!own) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification not found' });
    }

    const result = await markNotificationRead(notificationId);
    return sendOk(res, 'Notification marked as read', result);
  }
);

/**
 * DELETE /api/v1/notifications/:notificationId
 * Delete a specific notification.
 */
export const deleteNotificationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { notificationId } = req.validatedParams;

    const [own] = await database
      .select({ id: NotificationsModel.id })
      .from(NotificationsModel)
      .where(
        and(
          eq(NotificationsModel.id, notificationId),
          eq(NotificationsModel.userId, req.user.id)
        )
      )
      .limit(1);

    if (!own) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification not found' });
    }

    const result = await deleteNotification(notificationId);
    return sendOk(res, 'Notification deleted successfully', result);
  }
);

/**
 * DELETE /api/v1/notifications/all
 * Delete all notifications for the authenticated user.
 */
export const deleteAllHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await deleteAllNotificationsForUser(req.user.id);
    return sendOk(res, 'All notifications deleted successfully', {
      deletedCount: result?.length ?? 0,
    });
  }
);
