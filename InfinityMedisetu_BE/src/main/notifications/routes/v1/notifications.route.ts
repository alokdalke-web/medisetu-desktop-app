// src/main/notifications/routes/v1/notifications.route.ts
import { Router } from 'express';
import { requireAuth } from '../../../../middlewear/auth.middleware';
import { validate } from '../../../../middlewear/validation.middleware';
import { docsRegistry } from '../../../../utils/docsRegistry';
import {
  registerDeviceHandler,
  unregisterDeviceHandler,
  listNotificationsHandler,
  listUnreadNotificationsHandler,
  markReadHandler,
  deleteNotificationHandler,
  deleteAllHandler,
} from '../../controllers/notifications.controller';
import {
  listQuerySchema,
  notifParamsSchema,
  registerDeviceSchema,
  unregisterDeviceParamsSchema,
} from '../../schemas/notifications.schemas';

const router = Router();

// Device Token Registration Endpoints
router.post(
  '/devices',
  requireAuth,
  validate(registerDeviceSchema, 'body'),
  registerDeviceHandler
);

router.delete(
  '/devices/:deviceToken',
  requireAuth,
  validate(unregisterDeviceParamsSchema, 'params'),
  unregisterDeviceHandler
);

// Notification Inbox Endpoints
router.get(
  '/',
  requireAuth,
  validate(listQuerySchema, 'query'),
  listNotificationsHandler
);

router.get(
  '/unread',
  requireAuth,
  validate(listQuerySchema, 'query'),
  listUnreadNotificationsHandler
);

router.put(
  '/read/:notificationId',
  requireAuth,
  validate(notifParamsSchema, 'params'),
  markReadHandler
);

router.delete('/all', requireAuth, deleteAllHandler);

router.delete(
  '/:notificationId',
  requireAuth,
  validate(notifParamsSchema, 'params'),
  deleteNotificationHandler
);

export default router;

// ─── API Docs ─────────────────────────────────────────────────────────────────

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/notifications/devices',
  description:
    'Register a device push token (FCM token) for the authenticated user',
  requestSchema: registerDeviceSchema,
  tags: ['notifications'],
});

docsRegistry.addEndpoint({
  method: 'delete',
  path: '/api/v1/notifications/devices/:deviceToken',
  description: 'Unregister a device push token',
  params: unregisterDeviceParamsSchema,
  tags: ['notifications'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/notifications',
  description: 'List notifications for current user',
  query: listQuerySchema,
  tags: ['notifications'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/notifications/unread',
  description: 'List unread notifications for current user',
  query: listQuerySchema,
  tags: ['notifications'],
});

docsRegistry.addEndpoint({
  method: 'put',
  path: '/api/v1/notifications/read/:notificationId',
  description: 'Mark a notification as read',
  params: notifParamsSchema,
  tags: ['notifications'],
});

docsRegistry.addEndpoint({
  method: 'delete',
  path: '/api/v1/notifications/:notificationId',
  description: 'Delete a notification',
  params: notifParamsSchema,
  tags: ['notifications'],
});

docsRegistry.addEndpoint({
  method: 'delete',
  path: '/api/v1/notifications/all',
  description: 'Delete all notifications for current user',
  tags: ['notifications'],
});
