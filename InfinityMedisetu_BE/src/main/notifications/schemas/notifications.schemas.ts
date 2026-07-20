import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const notifParamsSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

export const registerDeviceSchema = z.object({
  deviceToken: z.string().min(1, 'Device token is required'),
  platform: z.enum(['ios', 'android']),
});

export const unregisterDeviceParamsSchema = z.object({
  deviceToken: z.string().min(1, 'Device token is required'),
});

export type ListQueryDto = z.infer<typeof listQuerySchema>;
export type NotifParamsDto = z.infer<typeof notifParamsSchema>;
export type RegisterDeviceDto = z.infer<typeof registerDeviceSchema>;
export type UnregisterDeviceParamsDto = z.infer<
  typeof unregisterDeviceParamsSchema
>;
