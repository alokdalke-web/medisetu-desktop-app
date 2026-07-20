// src/utils/smsClient.ts
import { SnsNotificationService } from '../main/notifications/services/sns.service';
import logger from './logger';

export async function sendSMS(to: string, body: string): Promise<void> {
  const formattedTo = to.startsWith('+') ? to : `+${to}`;

  // Apply DLT compliance routing only for Indian numbers (+91)
  if (formattedTo.startsWith('+91')) {
    let templateId: string | undefined;
    if (body.includes('Appointment Confirmed:')) {
      templateId = process.env.DLT_TEMPLATE_APPOINTMENT_CONFIRMED;
    } else if (body.includes('Appointment Reminder:')) {
      templateId = process.env.DLT_TEMPLATE_APPOINTMENT_REMINDER;
    } else if (body.includes('marked as No Show')) {
      templateId = process.env.DLT_TEMPLATE_APPOINTMENT_NO_SHOW;
    } else if (body.includes('appointment is completed')) {
      templateId = process.env.DLT_TEMPLATE_PRESCRIPTION_COMPLETED;
    } else if (body.includes('appointment tomorrow at')) {
      templateId = process.env.DLT_TEMPLATE_PRESCRIPTION_FOLLOWUP;
    }

    await SnsNotificationService.sendTransactionalSms(
      formattedTo,
      body,
      templateId
    );
    return;
  }

  // Non-Indian international numbers routed to AWS SNS without DLT template ID
  await SnsNotificationService.sendTransactionalSms(formattedTo, body);
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  // Option 3 Placeholder: Empty placeholder for future WhatsApp provider
  logger.warn(`WhatsApp message to ${to} is unconfigured. Content: ${body}`);
  return Promise.resolve();
}

export function formatWhatsAppNumber(mobile: string): string {
  const clean = mobile.replace(/\D/g, '');

  if (mobile.startsWith('whatsapp:')) return mobile;
  if (mobile.startsWith('+')) return `whatsapp:${mobile}`;
  if (clean.length === 10) return `whatsapp:+91${clean}`;
  if (clean.startsWith('0')) return `whatsapp:+91${clean.substring(1)}`;
  if (clean.startsWith('91') && clean.length === 12)
    return `whatsapp:+${clean}`;

  return `whatsapp:${mobile}`;
}

export async function sendAppointmentNotification(
  mobile: string,
  body: string,
  smsEnabled: boolean,
  whatsappEnabled: boolean
): Promise<void> {
  const promises = [];

  const formattedMobile = mobile.startsWith('+')
    ? mobile
    : `+91${mobile.replace(/\D/g, '')}`;

  if (smsEnabled) {
    promises.push(
      sendSMS(formattedMobile, body).catch((err: Error) => {
        logger.error(`SMS failed: ${err.message}`);
      })
    );
  }

  if (whatsappEnabled) {
    promises.push(
      sendWhatsApp(formattedMobile, body).catch((err: Error) => {
        logger.error(`WhatsApp failed: ${err.message}`);
      })
    );
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}
