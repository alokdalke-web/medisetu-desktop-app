/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/notification/notification.utils.ts

import * as notificationService from '../main/notifications/services/notifications.service';
import { kafkaManager, socketManager } from '../app';
import { SnsNotificationService } from '../main/notifications/services/sns.service';
import logger from './logger';

/** Socket event and room convention: clients should `join('appointment:<appointmentId>')` to receive this. */
export const APPOINTMENT_PRESCRIPTION_PDF_SOCKET_EVENT =
  'appointment.prescription.pdf_ready';

import { getUserNotificationPreference } from './notificationPreferences.utils';

export type NotifyOpts = {
  userId: string;
  type?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  // optionally: publish key (e.g. userId or conversationId for ordering)
  kafkaKey?: string;
  allowToStoreInDB?: boolean; // default true
};

const NOTIFICATION_TOPIC =
  process.env.KAFKA_NOTIFICATION_TOPIC || 'socket.events.notification';

// Unique identifier for this server instance — used to prevent duplicate
// socket emissions when Kafka consumer runs on the same node that published.
export const NODE_ID = `node_${process.pid}_${Date.now()}`;

/**
 * Persist + deliver notification for a user.
 *
 * Delivery strategy (prevents duplicate emissions):
 * - Always persists to DB first.
 * - Attempts to publish to Kafka. If Kafka is available, the Kafka consumer
 *   will emit to sockets (handles multi-node delivery).
 * - If Kafka publish fails (disconnected/unavailable), falls back to a direct
 *   local socket emit so the user still receives the notification in real time.
 *
 * This ensures exactly-once delivery per node: either Kafka delivers OR local
 * emit delivers, never both.
 */
export async function sendNotificationToUser(opts: NotifyOpts) {
  const payload = {
    userId: opts.userId,
    type: opts.type ?? 'notification',
    title: opts.title,
    body: opts.body,
    data: opts.data ?? null,
    metadata: opts.metadata ?? null,
    ts: new Date().toISOString(),
  };

  let inAppEnabled = true;
  let pushEnabled = true;

  const action = opts.metadata?.action;
  if (opts.userId && action) {
    try {
      const prefs = await getUserNotificationPreference(opts.userId, action);
      inAppEnabled = prefs.inApp;
      pushEnabled = prefs.push;
    } catch (e) {
      logger.error(
        '[NotificationService] Failed to check preferences, default to true',
        e
      );
    }
  }

  // 1) persist to DB
  let dbRecord;
  if (inAppEnabled) {
    try {
      if (opts.allowToStoreInDB !== false) {
        dbRecord = await notificationService.createNotification({
          userId: opts.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          metadata: payload.metadata,
        });
      }
    } catch (e) {
      logger.error('[NotificationService] Failed to persist notification', e);
      // proceed — we still want to deliver via socket / kafka
    }
  }

  // prepare final message shape for socket/kafka
  let message;
  if (inAppEnabled) {
    message = {
      event: 'notification.new',
      payload: {
        notificationId: dbRecord?.id ?? null,
        ...payload,
      },
      room: `user:${opts.userId}`,
      ts: payload.ts,
    };

    // 2) Always emit locally first — ensures the user gets the notification immediately
    //    regardless of Kafka state.
    try {
      if (socketManager) {
        socketManager.emitByKafkaMessage({
          event: message.event,
          payload: message.payload,
          room: message.room,
          socketId: undefined,
        });
      }
    } catch (e) {
      logger.warn('[NotificationService] local emit failed', e);
    }

    // 3) Publish to Kafka for multi-node delivery (other server instances).
    //    Fire-and-forget — don't block the response for Kafka.
    //    Include originNodeId so the consumer on this same node skips re-emission.
    kafkaManager
      .publish(
        NOTIFICATION_TOPIC,
        { ...message, originNodeId: NODE_ID },
        opts.kafkaKey ?? opts.userId
      )
      .catch((e: any) => {
        logger.warn(
          '[NotificationService] Kafka publish failed (non-critical for single-node)',
          e?.message
        );
      });
  }

  // 4) Deliver push notification via SNS (fire-and-forget)
  if (pushEnabled) {
    SnsNotificationService.sendPushNotification(
      opts.userId,
      opts.title,
      opts.body,
      opts.metadata
    ).catch((e) => {
      logger.warn('[NotificationService] Push delivery failed', e?.message);
    });
  }

  return { dbRecord, message };
}

/**
 * After the prescription PDF URL is saved on the report card, notify every socket
 * joined to room `appointment:<appointmentId>` (multi-node via Kafka when available).
 */
export async function broadcastPrescriptionPdfReadyToAppointmentRoom(opts: {
  appointmentId: string;
  reportId: string;
  pdfUrl: string;
}) {
  const room = `appointment:${opts.appointmentId}`;
  const payload = {
    appointmentId: opts.appointmentId,
    reportId: opts.reportId,
    pdfUrl: opts.pdfUrl,
    action: 'prescription_pdf_ready',
    ts: new Date().toISOString(),
  };

  try {
    if (socketManager) {
      socketManager.emitByKafkaMessage({
        event: APPOINTMENT_PRESCRIPTION_PDF_SOCKET_EVENT,
        payload,
        room,
      });
    }
  } catch {
    // non-fatal; same resilience as sendNotificationToUser local emit
  }

  try {
    await socketManager.publishEventToKafka(
      APPOINTMENT_PRESCRIPTION_PDF_SOCKET_EVENT,
      payload,
      room
    );
  } catch {
    // Kafka optional when disconnected
  }
}

/**
 * Publish only (no DB write / no local emit)
 */
export async function publishNotificationOnly(
  opts: Omit<NotifyOpts, 'kafkaKey'> & { kafkaKey?: string }
) {
  const payload = {
    userId: opts.userId,
    type: opts.type ?? 'notification',
    title: opts.title,
    body: opts.body,
    data: opts.data ?? null,
    metadata: opts.metadata ?? null,
    ts: new Date().toISOString(),
  };
  const message = {
    event: 'notification.new',
    payload,
    room: `user:${opts.userId}`,
    ts: payload.ts,
  };
  await kafkaManager.publish(
    process.env.KAFKA_NOTIFICATION_TOPIC ?? 'socket.events.notification',
    message,
    opts.kafkaKey ?? opts.userId
  );
  return message;
}
