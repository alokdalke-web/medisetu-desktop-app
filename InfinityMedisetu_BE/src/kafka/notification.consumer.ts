// src/kafka/notification.consumer.ts
import type { KafkaManager } from '../kafka/kafkaManager';
import type { SocketManager } from '../socket/socketManager';
import logger from '../utils/logger';
import { NODE_ID } from '../utils/notification.utils';

const NOTIFICATION_TOPIC =
  process.env.KAFKA_NOTIFICATION_TOPIC || 'socket.events.notification';

/**
 * Register consumer handler to deliver incoming notification messages.
 * Should be called after kafkaManager.start()
 */
export async function registerNotificationHandlers(
  kafkaManager: KafkaManager,
  socketManager: SocketManager
) {
  await kafkaManager.subscribe(NOTIFICATION_TOPIC, async (kmsg) => {
    try {
      const val = kmsg.value;
      if (!val) return;

      const payloadObj = typeof val === 'string' ? JSON.parse(val) : val;

      if (
        !payloadObj.payload ||
        (!payloadObj.payload.userId && !payloadObj.room)
      ) {
        console.warn('[NotificationConsumer] invalid message', payloadObj);
        return;
      }

      const userId = payloadObj.payload.userId || null;

      // Skip re-emission if this message originated from the same node
      // (already emitted locally in sendNotificationToUser)
      if (payloadObj.originNodeId === NODE_ID) {
        logger.info(
          '[NotificationConsumer] Skipping re-emission for same-node message',
          { notificationId: payloadObj.payload.notificationId, userId }
        );
        return;
      }

      // ============================================================
      // REMOVED: Do NOT persist here - already persisted in sendNotificationToUser()
      // ============================================================
      // The notification is already in DB from notification.utils.ts
      // We only need to forward it to sockets here

      logger.info(
        '[NotificationConsumer] Forwarding notification to sockets:',
        {
          notificationId: payloadObj.payload.notificationId,
          userId,
          event: payloadObj.event,
        }
      );

      // Forward to sockets (this is what we want - just delivery)
      try {
        socketManager.emitByKafkaMessage({
          event: payloadObj.event ?? 'notification.new',
          payload: payloadObj.payload,
          room: payloadObj.room ?? `user:${userId}`,
          socketId: payloadObj.socketId ?? undefined,
        });
      } catch (e) {
        console.error('[NotificationConsumer] emit failed', e);
      }
    } catch (err) {
      console.error('[NotificationConsumer] handler error', err);
    }
  });
}
