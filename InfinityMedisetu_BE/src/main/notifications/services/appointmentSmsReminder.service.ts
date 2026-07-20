// src/main/appointments/services/appointment-sms-reminder.service.ts (Update existing)
import { Job, Queue, Worker } from 'bullmq';
import { sendSMS } from '../../../utils/smsClient';
import { database } from '../../../configurations/dbConnection';
import { eq, and } from 'drizzle-orm';
import { ClinicReminderModel } from '../../clinic/models/clinicReminder.model';
import { ClinicSettingsModel } from '../../clinic/models/clinicSettings.model';

interface SMSReminderJobData {
  appointmentId: string;
  patientMobile: string;
  clinicName: string;
  appointmentTime: string;
  appointmentDate: string;
  reminderName: string;
  tokenNo?: number | null;
}

class AppointmentSMSReminderQueue {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.queue = new Queue('appointment-sms-reminders', { connection });
    this.worker = new Worker(
      'appointment-sms-reminders',
      this.processJob.bind(this),
      { connection }
    );
  }

  private async processJob(job: Job) {
    await this.sendSMSReminder(job.data);
  }

  private async sendSMSReminder(data: SMSReminderJobData) {
    const appointmentTime = new Date(data.appointmentTime);
    const appointmentDate = new Date(data.appointmentDate);

    const formattedTime = appointmentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let timeOrTokenInfo: string;
    if (data.tokenNo) {
      timeOrTokenInfo = `Token No: ${data.tokenNo}`;
    } else {
      timeOrTokenInfo = `Time: ${formattedTime}`;
    }

    const message = `Appointment Reminder: \n\nClinic: ${data.clinicName}\nDate: ${formattedDate}\n${timeOrTokenInfo}\n\nPlease arrive 10 minutes early.`;

    const formattedMobile = this.formatMobileNumber(data.patientMobile);
    await sendSMS(formattedMobile, message);
  }

  private formatMobileNumber(mobile: string): string {
    const clean = mobile.replace(/\D/g, '');
    if (mobile.startsWith('+')) return mobile;
    if (clean.length === 10) return `+91${clean}`;
    if (clean.startsWith('0')) return `+91${clean.substring(1)}`;
    if (clean.startsWith('91') && clean.length === 12) return `+${clean}`;
    return mobile;
  }

  // Get clinic SMS reminders
  async getClinicSMSReminders(
    clinicId: string
  ): Promise<Array<{ timeValue: number; timeUnit: string }>> {
    const reminders = await database
      .select({
        timeValue: ClinicReminderModel.timeValue,
        timeUnit: ClinicReminderModel.timeUnit,
      })
      .from(ClinicReminderModel)
      .where(
        and(
          eq(ClinicReminderModel.clinicId, clinicId),
          eq(ClinicReminderModel.reminderType, 'Appointment'),
          eq(ClinicReminderModel.isActive, true),
          eq(ClinicSettingsModel.smsEnabled, true)
        )
      )
      .leftJoin(
        ClinicSettingsModel,
        eq(ClinicSettingsModel.clinicId, ClinicReminderModel.clinicId)
      );

    return reminders;
  }

  // Schedule SMS reminders
  async scheduleSMSReminders(
    appointmentId: string,
    patientMobile: string,
    clinicId: string,
    clinicName: string,
    appointmentDateTime: Date,
    tokenNo: number | null
  ) {
    // Check if SMS is enabled for this clinic
    const [settings] = await database
      .select()
      .from(ClinicSettingsModel)
      .where(eq(ClinicSettingsModel.clinicId, clinicId));

    if (!settings?.smsEnabled) {
      return; // SMS not enabled
    }

    // Get SMS reminder settings
    const reminders = await this.getClinicSMSReminders(clinicId);
    if (reminders.length === 0) {
      return; // No SMS reminders configured
    }

    const appointmentTime = new Date(appointmentDateTime);
    const now = new Date();

    for (const reminder of reminders) {
      // Calculate offset in milliseconds
      let offset = 0;
      switch (reminder.timeUnit) {
        case 'Minutes':
          offset = reminder.timeValue * 60 * 1000;
          break;
        case 'Hours':
          offset = reminder.timeValue * 60 * 60 * 1000;
          break;
        case 'Days':
          offset = reminder.timeValue * 24 * 60 * 60 * 1000;
          break;
      }

      const reminderTime = new Date(appointmentTime.getTime() - offset);

      if (reminderTime > now) {
        const delay = reminderTime.getTime() - now.getTime();
        const reminderName = `${reminder.timeValue} ${reminder.timeUnit} before`;

        await this.queue.add(
          `sms_${appointmentId}_${reminder.timeValue}${reminder.timeUnit}`,
          {
            appointmentId,
            patientMobile,
            clinicName,
            appointmentTime: appointmentTime.toISOString(),
            appointmentDate:
              appointmentTime.toISOString().split('T')[0] + 'T00:00:00.000Z',
            reminderName,
            tokenNo,
          },
          {
            delay,
            jobId: `sms_${appointmentId}_${reminder.timeValue}${reminder.timeUnit}`,
          }
        );
      }
    }
  }

  // Remove SMS reminders
  async removeSMSReminders(appointmentId: string, clinicId: string) {
    const reminders = await this.getClinicSMSReminders(clinicId);

    for (const reminder of reminders) {
      const jobId = `sms_${appointmentId}_${reminder.timeValue}${reminder.timeUnit}`;
      const job = await this.queue.getJob(jobId);
      if (job) await job.remove();
    }
  }
}

export const smsReminderQueue = new AppointmentSMSReminderQueue();
