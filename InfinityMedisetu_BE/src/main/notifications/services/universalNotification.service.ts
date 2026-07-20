import { UniversalNotificationOptions } from '../types';
import { PushProvider } from '../providers/push.provider';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { SocketProvider } from '../providers/socket.provider';
import * as dbService from './notifications.service';
import { getUserNotificationPreference } from '../../../utils/notificationPreferences.utils';
import logger from '../../../utils/logger';

const pushProvider = new PushProvider();
const emailProvider = new EmailProvider();
const smsProvider = new SmsProvider();
const socketProvider = new SocketProvider();

export class UniversalNotificationService {
  /**
   * Dispatches a notification across specified channels (Push, Email, SMS, WebSockets).
   * Persists the message to the database if a userId is provided.
   */
  static async send(options: UniversalNotificationOptions) {
    const { recipient, event, channels, title, body, data, metadata } = options;

    let inAppEnabled = true;
    let pushEnabled = true;

    if (recipient.userId && event) {
      try {
        const prefs = await getUserNotificationPreference(
          recipient.userId,
          event
        );
        inAppEnabled = prefs.inApp;
        pushEnabled = prefs.push;
      } catch (err) {
        logger.error(
          '[UniversalNotificationService] Failed to check preferences, default to true',
          err
        );
      }
    }

    // 1) Write to Database if a userId is present (User Inbox logs)
    let dbRecord = null;
    if (recipient.userId && inAppEnabled) {
      try {
        dbRecord = await dbService.createNotification({
          userId: recipient.userId,
          type: event,
          title,
          body,
          data: data || null,
          metadata: metadata || null,
        });
      } catch (err) {
        logger.error(
          '[UniversalNotificationService] Failed to persist notification to DB:',
          err
        );
      }
    }

    // 2) Dispatch to all requested channels concurrently
    const promises = channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'push':
            if (pushEnabled) {
              await pushProvider.send(options);
            }
            break;
          case 'email':
            await emailProvider.send(options);
            break;
          case 'sms':
            await smsProvider.send(options);
            break;
          case 'socket':
            // Include database record ID if available so real-time sockets can trace/mark read
            if (inAppEnabled) {
              await socketProvider.send({
                ...options,
                dbRecordId: dbRecord?.id,
              } as any);
            }
            break;
          default:
            logger.warn(
              `[UniversalNotificationService] Unsupported channel: ${channel}`
            );
        }
      } catch (err: any) {
        logger.error(
          `[UniversalNotificationService] Failure delivering channel "${channel}":`,
          err?.message || err
        );
      }
    });

    await Promise.allSettled(promises);
    return dbRecord;
  }
}
