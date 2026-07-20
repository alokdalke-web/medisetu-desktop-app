import { NotificationProvider } from './provider.interface';
import { UniversalNotificationOptions } from '../types';
import { SnsNotificationService } from '../services/sns.service';

export class SmsProvider implements NotificationProvider {
  async send(options: UniversalNotificationOptions): Promise<void> {
    const { recipient, body, event } = options;
    if (!recipient.mobile) {
      throw new Error('SMS provider requires a recipient mobile number');
    }

    let templateId: string | undefined;
    switch (event) {
      case 'patient_otp':
        templateId = process.env.DLT_TEMPLATE_PATIENT_OTP;
        break;
      case 'appointment_confirmed':
        templateId = process.env.DLT_TEMPLATE_APPOINTMENT_CONFIRMED;
        break;
      case 'appointment_reminder':
        templateId = process.env.DLT_TEMPLATE_APPOINTMENT_REMINDER;
        break;
      case 'appointment_no_show':
        templateId = process.env.DLT_TEMPLATE_APPOINTMENT_NO_SHOW;
        break;
      case 'prescription_completed':
        templateId = process.env.DLT_TEMPLATE_PRESCRIPTION_COMPLETED;
        break;
      case 'prescription_followup':
        templateId = process.env.DLT_TEMPLATE_PRESCRIPTION_FOLLOWUP;
        break;
      default:
        templateId = undefined;
    }

    await SnsNotificationService.sendTransactionalSms(
      recipient.mobile,
      body,
      templateId
    );
  }
}
