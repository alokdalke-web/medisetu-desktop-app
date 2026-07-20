/**
 * AppointmentEngineOrchestrator
 *
 * Entry point that coordinates all engine operations after an appointment
 * status change. Dispatches to the appropriate services based on the new status:
 *
 * - Completed / Patient Arrived →
 *   1. DelayTrackerService.recalculate
 *   2. RunningLateNotifier.evaluate
 *   3. TimeToNextService.computeAndBroadcast
 *   4. QueueBroadcastService.emitQueueUpdated
 *   5. QueueBroadcastService.emitPatientUpdated
 *
 * - NoShow →
 *   1. NoShowShiftService.shiftForward
 *   2. DelayTrackerService.recalculate
 *   3. RunningLateNotifier.evaluate
 *   4. QueueBroadcastService.emitQueueUpdated
 *   5. QueueBroadcastService.emitPatientUpdated
 *
 * All operations are fire-and-forget — errors are caught, logged, and
 * never propagated to the caller. The orchestrator must not throw errors
 * that would affect the original status change operation.
 *
 * Requirements: 1.1, 3.1, 4.1, 5.1, 6.1
 */

import redisClient from '../../../configurations/redisConfig';
import logger from '../../../utils/logger';
import { getRedisKey } from '../utils/helpers';
import {
  AppointmentRecord,
  AppointmentStatus,
  IAppointmentEngineOrchestrator,
} from '../interfaces';
import { DelayTrackerService } from './delayTracker.service';
import { NoShowShiftService } from './noShowShift.service';
import { QueueBroadcastService } from './queueBroadcast.service';
import { RunningLateNotifier } from './runningLateNotifier.service';
import {
  MAX_REPEAT_ATTEMPTS,
  REPEAT_INTERVAL_MS,
} from './runningLateQueue.service';

/**
 * The activity flag must outlive the entire running-late repeat window, or
 * RunningLateQueue's "recent activity" gap check silently stops applying
 * during the final stretch of repeat attempts. Add a margin on top of the
 * max repeat duration so the two never drift out of sync again.
 */
const LAST_ACTIVITY_TTL_SECONDS =
  Math.ceil((MAX_REPEAT_ATTEMPTS * REPEAT_INTERVAL_MS) / 1000) + 3600;
import { TimeToNextService } from './timeToNext.service';
import { runningLateQueue } from './runningLateQueue.service';

export class AppointmentEngineOrchestrator implements IAppointmentEngineOrchestrator {
  private delayTrackerService: DelayTrackerService;
  private runningLateNotifier: RunningLateNotifier;
  private noShowShiftService: NoShowShiftService;
  private timeToNextService: TimeToNextService;
  private queueBroadcastService: QueueBroadcastService;

  constructor() {
    // Single shared instance of DelayTrackerService — avoids redundant cache reads
    this.delayTrackerService = new DelayTrackerService();
    this.runningLateNotifier = new RunningLateNotifier();
    this.noShowShiftService = new NoShowShiftService();
    this.timeToNextService = new TimeToNextService();
    this.queueBroadcastService = new QueueBroadcastService();
  }

  /**
   * Called after an appointment status change has been committed to the database.
   * Dispatches to the appropriate engine services based on the new appointment status.
   *
   * This method is fire-and-forget — it catches all errors internally and never
   * throws, ensuring the original status change operation is not affected.
   *
   * @param appointment - The appointment record with the updated status
   * @param previousStatus - The appointment's status before the change
   */
  async onStatusChange(
    appointment: AppointmentRecord,
    previousStatus: AppointmentStatus
  ): Promise<void> {
    const { id, clinicId, doctorId, appointmentDate, appointmentStatus } =
      appointment;

    try {
      const date =
        appointmentDate instanceof Date
          ? appointmentDate.toISOString().split('T')[0]
          : String(appointmentDate).split('T')[0];

      logger.info(
        `[AppointmentEngine] Orchestrator handling status change for appointment=${id}: ` +
          `${previousStatus} → ${appointmentStatus}`
      );

      // Cancel running-late delayed jobs — doctor is now active
      runningLateQueue.cancelAllForDoctor(clinicId, doctorId).catch(() => {});

      switch (appointmentStatus) {
        case 'Completed':
        case 'Confirmed':
        case 'Patient Arrived':
          this.stampDoctorActivity(clinicId, doctorId);
          await this.handleCompletedOrArrived(clinicId, doctorId, date);
          break;

        case 'NoShow':
          this.stampDoctorActivity(clinicId, doctorId);
          await this.handleNoShow(id, clinicId, doctorId, date);
          break;

        default:
          logger.info(
            `[AppointmentEngine] No engine action for status="${appointmentStatus}" on appointment=${id}`
          );
          break;
      }
    } catch (error) {
      // Fire-and-forget: log the error and do not re-throw.
      // The orchestrator must never affect the original status change operation.
      logger.error(
        `[AppointmentEngine] Orchestrator error for appointment=${id}, ` +
          `status change ${previousStatus} → ${appointmentStatus}`,
        { error }
      );
    }
  }

  /**
   * Records the doctor's last real activity (a status change) in Redis.
   * The running-late BullMQ job reads this to distinguish "doctor is active,
   * just between patients" from "doctor is genuinely inactive". Unlike the
   * queue cache's lastCalculatedAt, this is NOT bumped by bookings or by the
   * running-late job's own recalculation — only by actual status changes.
   * Fire-and-forget; zero DB.
   */
  private stampDoctorActivity(clinicId: string, doctorId: string): void {
    redisClient
      .set(
        getRedisKey('last_activity', clinicId, doctorId),
        String(Date.now()),
        'EX',
        LAST_ACTIVITY_TTL_SECONDS
      )
      .catch(() => {});
  }

  /**
   * Handles Completed or Patient Arrived status changes.
   *
   * Flow:
   * 1. Recalculate delay for the doctor's queue
   * 2. Evaluate running-late notifications (pass queueData directly — zero extra DB)
   * 3. Compute and broadcast time-to-next (pass queueData directly — avoids re-read)
   * 4. Emit queue.updated to clinic room
   * 5. Emit appointment.updated to each affected patient
   */
  private async handleCompletedOrArrived(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<void> {
    // Step 1: Recalculate delay (1 DB query — fetchDailyQueue)
    const queueDelayData = await this.delayTrackerService.recalculate(
      clinicId,
      doctorId,
      date
    );

    // Step 2: Evaluate running-late notifications using pre-fetched data (0 extra DB queries)
    try {
      await this.runningLateNotifier.evaluateFromCache(
        clinicId,
        doctorId,
        date,
        queueDelayData
      );
    } catch (error) {
      logger.error(
        `[AppointmentEngine] RunningLateNotifier.evaluate failed for clinic=${clinicId}, doctor=${doctorId}, date=${date}`,
        { error }
      );
    }

    // Step 3: Compute and broadcast time-to-next using pre-fetched queue data (0 extra DB for cache read)
    try {
      await this.timeToNextService.computeAndBroadcastFromQueue(
        clinicId,
        doctorId,
        date,
        queueDelayData
      );
    } catch (error) {
      logger.error(
        `[AppointmentEngine] TimeToNextService.computeAndBroadcast failed for clinic=${clinicId}, doctor=${doctorId}, date=${date}`,
        { error }
      );
    }

    // Step 4: Emit queue.updated to clinic room
    try {
      this.queueBroadcastService.emitQueueUpdated(clinicId, queueDelayData);
    } catch (error) {
      logger.error(
        `[AppointmentEngine] QueueBroadcastService.emitQueueUpdated failed for clinic=${clinicId}`,
        { error }
      );
    }

    // Step 5: Emit appointment.updated to each affected patient
    this.queueBroadcastService
      .emitPatientUpdated(queueDelayData)
      .catch((error) => {
        logger.error(
          `[AppointmentEngine] QueueBroadcastService.emitPatientUpdated failed`,
          { error }
        );
      });
  }

  /**
   * Handles NoShow status changes.
   *
   * Flow:
   * 1. Shift subsequent appointments forward
   * 2. Recalculate delay for the doctor's queue
   * 3. Evaluate running-late notifications (pass queueData directly)
   * 4. Emit queue.updated to clinic room
   * 5. Emit appointment.updated to each affected patient
   */
  private async handleNoShow(
    appointmentId: string,
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<void> {
    // Step 1: Shift forward subsequent appointments
    try {
      await this.noShowShiftService.shiftForward(appointmentId);
    } catch (error) {
      logger.error(
        `[AppointmentEngine] NoShowShiftService.shiftForward failed for appointment=${appointmentId}`,
        { error }
      );
      // Even if shift fails, still proceed with recalculation and broadcast
    }

    // Step 2: Recalculate delay (reflects shifts and removed no-show)
    const queueDelayData = await this.delayTrackerService.recalculate(
      clinicId,
      doctorId,
      date
    );

    // Step 3: Evaluate running-late notifications using pre-fetched data
    try {
      await this.runningLateNotifier.evaluateFromCache(
        clinicId,
        doctorId,
        date,
        queueDelayData
      );
    } catch (error) {
      logger.error(
        `[AppointmentEngine] RunningLateNotifier.evaluate failed for clinic=${clinicId}, doctor=${doctorId}, date=${date}`,
        { error }
      );
    }

    // Step 4: Emit queue.updated to clinic room
    try {
      this.queueBroadcastService.emitQueueUpdated(clinicId, queueDelayData);
    } catch (error) {
      logger.error(
        `[AppointmentEngine] QueueBroadcastService.emitQueueUpdated failed for clinic=${clinicId}`,
        { error }
      );
    }

    // Step 5: Emit appointment.updated to each affected patient
    this.queueBroadcastService
      .emitPatientUpdated(queueDelayData)
      .catch((error) => {
        logger.error(
          `[AppointmentEngine] QueueBroadcastService.emitPatientUpdated failed`,
          { error }
        );
      });
  }
}
