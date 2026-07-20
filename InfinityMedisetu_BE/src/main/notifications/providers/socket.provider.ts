import { NotificationProvider } from './provider.interface';
import { UniversalNotificationOptions } from '../types';
import { kafkaManager, socketManager } from '../../../app';
import { NODE_ID } from '../../../utils/notification.utils';
import logger from '../../../utils/logger';

const NOTIFICATION_TOPIC =
  process.env.KAFKA_NOTIFICATION_TOPIC || 'socket.events.notification';

export class SocketProvider implements NotificationProvider {
  async send(
    options: UniversalNotificationOptions & { dbRecordId?: string }
  ): Promise<void> {
    const { recipient, event, title, body, data, metadata } = options;

    const room =
      recipient.socketRoom ||
      (recipient.userId ? `user:${recipient.userId}` : null);
    if (!room) {
      return; // Socket delivery requires a user ID or a custom socket room
    }

    const payload = {
      userId: recipient.userId || null,
      type: event,
      title,
      body,
      data: data || null,
      metadata: metadata || null,
      ts: new Date().toISOString(),
    };

    const message = {
      event: 'notification.new',
      payload: {
        notificationId: (options as any).dbRecordId || null,
        ...payload,
      },
      room,
      ts: payload.ts,
    };

    // 1) Emit locally first to ensure immediate delivery on this node
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
      logger.warn('[SocketProvider] local emit failed', e);
    }

    // 2) Publish to Kafka for other nodes to consume
    try {
      if (kafkaManager) {
        await kafkaManager.publish(
          NOTIFICATION_TOPIC,
          { ...message, originNodeId: NODE_ID },
          recipient.userId || room
        );
      }
    } catch (e: any) {
      logger.warn(
        '[SocketProvider] Kafka publish failed (non-critical for single-node)',
        e?.message
      );
    }
  }
}
