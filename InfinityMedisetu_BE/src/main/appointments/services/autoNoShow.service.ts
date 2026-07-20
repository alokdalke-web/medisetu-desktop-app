// src/main/appointments/services/autoNoShow.service.ts
import { Queue, Worker } from 'bullmq';
import { database } from '../../../configurations/dbConnection';
import { AppointmentModel } from '../models/appointment.model';
import { eq, and } from 'drizzle-orm';
import { NoShowService } from './noShow.service';
import { NoShowPolicyModel } from '../models/noShowPolicy.model';

interface AutoNoShowJobData {
  appointmentId: string;
  clinicId: string;
}

class AutoNoShowQueue {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.queue = new Queue('auto-no-show', { connection });

    this.worker = new Worker('auto-no-show', this.processJob.bind(this), {
      connection,
    });
  }

  private async processJob(job: { data: AutoNoShowJobData }) {
    const { appointmentId } = job.data;

    // 1. Check current status of appointment
    const [appointment] = await database
      .select({
        id: AppointmentModel.id,
        appointmentStatus: AppointmentModel.appointmentStatus,
      })
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, appointmentId))
      .limit(1);

    if (!appointment) return;

    // 2. Only mark as No Show if it's still eligible
    const eligibleStatuses = ['Upcoming', 'Confirmed', 'Pending'];

    if (eligibleStatuses.includes(appointment.appointmentStatus || '')) {
      await NoShowService.markAsNoShow(
        appointmentId,
        '00000000-0000-0000-0000-000000000000', // System User ID
        'system',
        { reason: 'Auto-marked after grace period' }
      );
    }
  }

  async scheduleAutoNoShow(
    appointmentId: string,
    clinicId: string,
    appointmentDateTime: Date
  ) {
    // 1. Get clinic's grace period
    const [policy] = await database
      .select({ gracePeriodMinutes: NoShowPolicyModel.gracePeriodMinutes })
      .from(NoShowPolicyModel)
      .where(
        and(
          eq(NoShowPolicyModel.clinicId, clinicId),
          eq(NoShowPolicyModel.isActive, true)
        )
      )
      .limit(1);

    const gracePeriod = policy?.gracePeriodMinutes ?? 15;

    // 2. Calculate execution time
    const executionTime = new Date(
      appointmentDateTime.getTime() + gracePeriod * 60 * 1000
    );

    const now = new Date();
    if (executionTime <= now) return;

    const delay = executionTime.getTime() - now.getTime();

    await this.queue.add(
      `auto_no_show_${appointmentId}`,
      { appointmentId, clinicId },
      {
        delay,
        jobId: `auto_no_show_${appointmentId}`,
        removeOnComplete: true,
        removeOnFail: 1000,
      }
    );
  }

  async removeAutoNoShow(appointmentId: string) {
    const job = await this.queue.getJob(`auto_no_show_${appointmentId}`);
    if (job) await job.remove();
  }
}

export const autoNoShowQueue = new AutoNoShowQueue();
