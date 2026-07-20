// src/utils/__tests__/smsClient.test.ts
import { sendSMS, sendWhatsApp, formatWhatsAppNumber } from '../smsClient';
import { SnsNotificationService } from '../../main/notifications/services/sns.service';

// Mock SnsNotificationService
jest.mock('../../main/notifications/services/sns.service', () => {
  return {
    SnsNotificationService: {
      sendTransactionalSms: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('smsClient AWS SNS routing and WhatsApp placeholder tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DLT_TEMPLATE_APPOINTMENT_REMINDER: 'REMINDER_TPL_ID',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should format and route +91 numbers to SnsNotificationService with matched template ID', async () => {
    await sendSMS(
      '+919876543210',
      'Appointment Reminder: \n\nClinic: Apollo\nDate: 10th Jul\nTime: 10:00 AM\n\nPlease arrive 10 minutes early.'
    );

    expect(SnsNotificationService.sendTransactionalSms).toHaveBeenCalledWith(
      '+919876543210',
      'Appointment Reminder: \n\nClinic: Apollo\nDate: 10th Jul\nTime: 10:00 AM\n\nPlease arrive 10 minutes early.',
      'REMINDER_TPL_ID'
    );
  });

  it('should format and route international numbers directly to SnsNotificationService without DLT attributes', async () => {
    await sendSMS('15550100', 'Hello International SMS');

    expect(SnsNotificationService.sendTransactionalSms).toHaveBeenCalledWith(
      '+15550100',
      'Hello International SMS'
    );
  });

  it('should call sendWhatsApp as a successful no-op placeholder', async () => {
    await expect(
      sendWhatsApp('+919876543210', 'WhatsApp content')
    ).resolves.toBeUndefined();
  });

  it('should format WhatsApp numbers correctly', () => {
    expect(formatWhatsAppNumber('+919876543210')).toBe(
      'whatsapp:+919876543210'
    );
    expect(formatWhatsAppNumber('9876543210')).toBe('whatsapp:+919876543210');
    expect(formatWhatsAppNumber('whatsapp:+919876543210')).toBe(
      'whatsapp:+919876543210'
    );
  });
});
