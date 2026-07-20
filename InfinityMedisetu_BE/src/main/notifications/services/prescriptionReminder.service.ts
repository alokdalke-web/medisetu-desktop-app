// src/main/reports/services/prescription-reminder.service.ts
import { Queue, Worker } from 'bullmq';
import { database } from '../../../configurations/dbConnection';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import { eq } from 'drizzle-orm';
import { sendAppointmentNotification } from '../../../utils/smsClient';
import { ClinicSettingsModel } from '../../clinic/models/clinicSettings.model';

interface FollowUpJobData {
  appointmentId: string;
  patientMobile: string;
  clinicName: string;
  clinicId: string;
}

class PrescriptionReminderQueue {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.queue = new Queue('prescription-followups', { connection });
    this.worker = new Worker(
      'prescription-followups',
      this.processJob.bind(this),
      { connection }
    );

    this.worker.on('completed', () => {
      // console.log(`✅ Follow-up reminder sent for appointment ${job.data.appointmentId}`);
    });

    this.worker.on('failed', () => {
      // console.error(`❌ Follow-up reminder failed:`, err.message);
    });
  }

  private async processJob(job: { data: FollowUpJobData }) {
    await this.sendFollowUpReminder(job.data);
  }

  private async sendFollowUpReminder(data: FollowUpJobData) {
    // 1. Get clinic settings
    const [clinicSettings] = await database
      .select({
        smsEnabled: ClinicSettingsModel.smsEnabled,
        whatsappEnabled: ClinicSettingsModel.whatsappEnabled,
      })
      .from(ClinicSettingsModel)
      .where(eq(ClinicSettingsModel.clinicId, data.clinicId));

    if (
      !clinicSettings ||
      (!clinicSettings.smsEnabled && !clinicSettings.whatsappEnabled)
    ) {
      return;
    }

    // 2. Create message
    const message = `You have an appointment tomorrow at ${data.clinicName}. \n\nThank You.`;

    // 3. Actually send it!
    await sendAppointmentNotification(
      data.patientMobile,
      message,
      clinicSettings.smsEnabled,
      clinicSettings.whatsappEnabled
    );
  }

  async scheduleFollowUpReminder(
    appointmentId: string,
    patientMobile: string,
    clinicName: string,
    clinicId: string,
    followUpInDays: number
  ) {
    // Get appointment date from DB
    const [appointment] = await database
      .select({ appointmentDate: AppointmentModel.appointmentDate })
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, appointmentId))
      .limit(1);

    if (!appointment?.appointmentDate) return;

    // Calculate follow-up date
    const appointmentDate = new Date(appointment.appointmentDate);
    const followUpDate = new Date(appointmentDate);
    followUpDate.setDate(appointmentDate.getDate() + followUpInDays);

    // Calculate reminder date (1 day before follow-up)
    const reminderDate = new Date(followUpDate);
    reminderDate.setDate(followUpDate.getDate() - 1);
    reminderDate.setHours(8, 30, 0, 0); // 14:00 IST = 08:30 UTC

    if (reminderDate < new Date()) {
      return; // Don't schedule past reminders
    }

    const delay = reminderDate.getTime() - Date.now();

    if (delay > 0) {
      await this.queue.add(
        `followup_${appointmentId}`,
        { appointmentId, patientMobile, clinicName, clinicId },
        { delay, jobId: `followup_${appointmentId}` }
      );
    }
  }

  async removeFollowUpReminder(appointmentId: string) {
    const job = await this.queue.getJob(`followup_${appointmentId}`);
    if (job) await job.remove();
  }
}

export const prescriptionReminderQueue = new PrescriptionReminderQueue();
