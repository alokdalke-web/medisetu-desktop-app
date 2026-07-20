// src/main/appointments/services/appointment-whatsapp-reminder.service.ts
import { Job, Queue, Worker } from 'bullmq';
import { database } from '../../../configurations/dbConnection';
import { eq, and } from 'drizzle-orm';
import { ClinicReminderModel } from '../../clinic/models/clinicReminder.model';
import { ClinicSettingsModel } from '../../clinic/models/clinicSettings.model';
import { sendWhatsApp } from '../../../utils/smsClient';

interface WhatsAppReminderJobData {
  appointmentId: string;
  patientMobile: string;
  clinicName: string;
  appointmentTime: string;
  appointmentDate: string;
  reminderName: string;
  tokenNo?: number | null;
}

class AppointmentWhatsAppReminderQueue {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.queue = new Queue('appointment-whatsapp-reminders', { connection });
    this.worker = new Worker(
      'appointment-whatsapp-reminders',
      this.processJob.bind(this),
      { connection }
    );
  }

  private async processJob(job: Job) {
    await this.sendWhatsAppReminder(job.data);
  }

  private async sendWhatsAppReminder(data: WhatsAppReminderJobData) {
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

    await sendWhatsApp(data.patientMobile, message);
  }

  // Get clinic WhatsApp reminders
  async getClinicWhatsAppReminders(
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
          eq(ClinicSettingsModel.whatsappEnabled, true)
        )
      )
      .leftJoin(
        ClinicSettingsModel,
        eq(ClinicSettingsModel.clinicId, ClinicReminderModel.clinicId)
      );

    return reminders;
  }

  // Schedule WhatsApp reminders
  async scheduleWhatsAppReminders(
    appointmentId: string,
    patientMobile: string,
    clinicId: string,
    clinicName: string,
    appointmentDateTime: Date,
    tokenNo: number | null
  ) {
    // Check if WhatsApp is enabled for this clinic
    const [settings] = await database
      .select()
      .from(ClinicSettingsModel)
      .where(eq(ClinicSettingsModel.clinicId, clinicId));

    if (!settings?.whatsappEnabled) {
      return; // WhatsApp not enabled
    }

    // Get WhatsApp reminder settings
    const reminders = await this.getClinicWhatsAppReminders(clinicId);
    if (reminders.length === 0) {
      return; // No WhatsApp reminders configured
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
          `whatsapp_${appointmentId}_${reminder.timeValue}${reminder.timeUnit}`,
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
            jobId: `whatsapp_${appointmentId}_${reminder.timeValue}${reminder.timeUnit}`,
          }
        );
      }
    }
  }

  // Remove WhatsApp reminders
  async removeWhatsAppReminders(appointmentId: string, clinicId: string) {
    const reminders = await this.getClinicWhatsAppReminders(clinicId);

    for (const reminder of reminders) {
      const jobId = `whatsapp_${appointmentId}_${reminder.timeValue}${reminder.timeUnit}`;
      const job = await this.queue.getJob(jobId);
      if (job) await job.remove();
    }
  }
}

export const whatsAppReminderQueue = new AppointmentWhatsAppReminderQueue();
