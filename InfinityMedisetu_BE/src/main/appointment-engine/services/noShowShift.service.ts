import { and, asc, eq, gt, gte, inArray, lt } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import logger from '../../../utils/logger';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import {
  ClinicAvailability,
  ClinicAvailabilityBreak,
} from '../../clinic/models/clinic.model';
import { UniversalNotificationService } from '../../notifications/services/universalNotification.service';
import { broadcastAppointmentChange } from '../../../utils/appointmentRealtime';
import { INoShowShiftService, ShiftResult } from '../interfaces';
import {
  isShiftableStatus,
  resolveAppointmentDuration,
} from '../utils/helpers';
import { DelayTrackerService } from './delayTracker.service';

/**
 * NoShowShiftService
 *
 * Handles forward-shifting of subsequent appointments when a patient is
 * marked as NoShow. All time updates are executed within a single database
 * transaction to maintain consistency — if any update fails, the entire
 * operation is rolled back.
 *
 * Break avoidance: If a shifted time falls within an active break
 * (ClinicAvailabilityBreak with status=true), the appointment is placed
 * at the break's end time instead.
 *
 * Token-based handling: For appointments where tokenNo is set and
 * appointmentTime is NULL, appointmentTime is not modified — instead
 * Estimated_Wait_Time is recalculated via DelayTrackerService.
 */
export class NoShowShiftService implements INoShowShiftService {
  private delayTrackerService: DelayTrackerService;

  constructor() {
    this.delayTrackerService = new DelayTrackerService();
  }
  /**
   * Shifts all subsequent "Upcoming" or "Confirmed" appointments forward
   * (to earlier times) by the duration of the no-show appointment.
   *
   * Algorithm:
   * 1. Look up the no-show appointment to get clinicId, doctorId, date, and duration
   * 2. Determine shiftAmount = duration of the no-show appointment
   * 3. Fetch subsequent appointments with shiftable status, ordered by time/token
   * 4. For time-based: newTime = currentTime - shiftAmount (forward = earlier),
   *    with break avoidance (skip active breaks)
   * 5. For token-based (tokenNo set, appointmentTime NULL): do NOT modify
   *    appointmentTime; recalculate Estimated_Wait_Time via DelayTrackerService
   * 6. Execute all time-based updates in a single DB transaction
   * 7. Roll back entirely on failure
   * 8. Return the ShiftResult with old and new times
   */
  async shiftForward(noShowAppointmentId: string): Promise<ShiftResult> {
    // Step 1: Look up the no-show appointment
    const [noShowAppt] = await database
      .select({
        id: AppointmentModel.id,
        clinicId: AppointmentModel.clinicId,
        doctorId: AppointmentModel.doctorId,
        appointmentDate: AppointmentModel.appointmentDate,
        appointmentTime: AppointmentModel.appointmentTime,
        tokenNo: AppointmentModel.tokenNo,
        appointmentDurationMinutes: AppointmentModel.appointmentDurationMinutes,
        appointmentStatus: AppointmentModel.appointmentStatus,
        patientId: AppointmentModel.patientId,
      })
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, noShowAppointmentId))
      .limit(1);

    if (!noShowAppt) {
      logger.warn(
        `[NoShowShift] Appointment not found: ${noShowAppointmentId}`
      );
      return { shiftedAppointments: [] };
    }

    if (!noShowAppt.doctorId) {
      logger.warn(
        `[NoShowShift] No doctor assigned to appointment: ${noShowAppointmentId}`
      );
      return { shiftedAppointments: [] };
    }

    const date = noShowAppt.appointmentDate.toISOString().split('T')[0];

    // Step 2: Determine shiftAmount from the no-show appointment's duration
    const slotMinutes = await this.resolveSlotMinutes(
      noShowAppt.clinicId,
      noShowAppt.doctorId,
      date
    );
    const shiftAmount = resolveAppointmentDuration(
      noShowAppt.appointmentDurationMinutes,
      slotMinutes
    );

    // Step 3: Fetch subsequent appointments with shiftable status
    const subsequentAppointments = await this.fetchSubsequentAppointments(
      noShowAppt.clinicId,
      noShowAppt.doctorId,
      noShowAppt.appointmentDate,
      noShowAppt.appointmentTime,
      noShowAppt.tokenNo
    );

    // Filter to only shiftable statuses
    const shiftableAppointments = subsequentAppointments.filter((appt) =>
      isShiftableStatus(appt.appointmentStatus)
    );

    if (shiftableAppointments.length === 0) {
      logger.info(
        `[NoShowShift] No shiftable appointments found after appointment ${noShowAppointmentId}`
      );
      return { shiftedAppointments: [] };
    }

    // Check if this is a token-based queue (tokenNo set, appointmentTime NULL)
    const isTokenBasedQueue = shiftableAppointments.every(
      (appt) => appt.tokenNo != null && appt.appointmentTime == null
    );

    if (isTokenBasedQueue) {
      // Token-based handling: do NOT modify appointmentTime,
      // recalculate Estimated_Wait_Time instead
      logger.info(
        `[NoShowShift] Token-based queue detected for appointment ${noShowAppointmentId}. ` +
          `Skipping time shift; triggering delay recalculation for ${shiftableAppointments.length} token appointments.`
      );

      await this.delayTrackerService.recalculate(
        noShowAppt.clinicId,
        noShowAppt.doctorId,
        date
      );

      return { shiftedAppointments: [] };
    }

    // Fetch active breaks for break avoidance
    const activeBreaks = await this.fetchActiveBreaks(
      noShowAppt.clinicId,
      noShowAppt.doctorId,
      date
    );

    // Step 4 & 5: Compute new times with break avoidance, execute in a single transaction
    const shiftedAppointments: ShiftResult['shiftedAppointments'] = [];

    try {
      await database.transaction(async (tx) => {
        for (const appt of shiftableAppointments) {
          if (!appt.appointmentTime) {
            // Mixed queue: token-based appointment without time — skip time modification,
            // delay recalculation will handle it after the transaction
            continue;
          }

          const currentMinutes = parseTimeToMinutes(appt.appointmentTime);
          let newMinutes = currentMinutes - shiftAmount;
          newMinutes = Math.max(0, newMinutes);

          // Break avoidance: check if new time falls within any active break
          newMinutes = this.avoidBreaks(newMinutes, activeBreaks);

          const newTime = minutesToTimeString(newMinutes);

          // Update the appointment time in the database
          await tx
            .update(AppointmentModel)
            .set({ appointmentTime: newTime })
            .where(eq(AppointmentModel.id, appt.id));

          shiftedAppointments.push({
            appointmentId: appt.id,
            patientId: appt.patientId,
            userId: appt.patientId,
            oldTime: appt.appointmentTime,
            newTime,
          });
        }
      });

      logger.info(
        `[NoShowShift] Successfully shifted ${shiftedAppointments.length} appointments forward by ${shiftAmount} minutes for no-show appointment ${noShowAppointmentId}`
      );
    } catch (error) {
      logger.error(
        `[NoShowShift] Transaction failed for no-show appointment ${noShowAppointmentId}. All changes rolled back.`,
        { error }
      );
      throw error;
    }

    // Fire-and-forget notifications after successful shift
    // Never fail the overall operation because of notification errors
    if (shiftedAppointments.length > 0) {
      this.notifyShiftedAppointments(
        shiftedAppointments,
        noShowAppt.clinicId,
        noShowAppt.doctorId
      ).catch((error) => {
        logger.error(
          `[NoShowShift] Unexpected error in notification dispatch for no-show appointment ${noShowAppointmentId}`,
          { error }
        );
      });
    }

    // If there were any token-based appointments in a mixed queue,
    // trigger delay recalculation after the time-based shifts are committed
    const hasTokenAppointments = shiftableAppointments.some(
      (appt) => appt.tokenNo != null && appt.appointmentTime == null
    );
    if (hasTokenAppointments) {
      await this.delayTrackerService.recalculate(
        noShowAppt.clinicId,
        noShowAppt.doctorId,
        date
      );
    }

    return { shiftedAppointments };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Sends notifications to all affected patients after a successful schedule shift
   * and broadcasts the change to the clinic room.
   *
   * Uses Promise.allSettled so one notification failure doesn't block others.
   * This is fire-and-forget — errors are logged but never thrown.
   *
   * Requirements: 5.3, 5.4
   */
  private async notifyShiftedAppointments(
    shiftedAppointments: ShiftResult['shiftedAppointments'],
    clinicId: string,
    doctorId: string | null
  ): Promise<void> {
    // Send patient notifications via UniversalNotificationService
    const notificationPromises = shiftedAppointments.map((shifted) =>
      UniversalNotificationService.send({
        recipient: {
          userId: shifted.userId,
          socketRoom: `user:${shifted.userId}`,
        },
        event: 'appointment_shifted',
        channels: ['push', 'socket'],
        title: 'Appointment Time Updated',
        body: `Your appointment has been moved earlier. New time: ${shifted.newTime} (previously ${shifted.oldTime}).`,
        data: {
          appointmentId: shifted.appointmentId,
          oldTime: shifted.oldTime,
          newTime: shifted.newTime,
        },
      }).catch((error) => {
        logger.error(
          `[NoShowShift] Failed to notify patient for appointment=${shifted.appointmentId}`,
          { error }
        );
      })
    );

    await Promise.allSettled(notificationPromises);

    // Broadcast schedule shift to clinic room via broadcastAppointmentChange
    for (const shifted of shiftedAppointments) {
      broadcastAppointmentChange({
        appointmentId: shifted.appointmentId,
        clinicId,
        doctorId: doctorId ?? undefined,
        patientId: shifted.patientId,
        action: 'rescheduled',
        data: {
          reason: 'noshow_shift',
          oldTime: shifted.oldTime,
          newTime: shifted.newTime,
        },
      });
    }

    logger.info(
      `[NoShowShift] Notification dispatch completed for ${shiftedAppointments.length} shifted appointments in clinic=${clinicId}`
    );
  }

  /**
   * Checks if a computed time (in minutes since midnight) falls within any
   * active break window. If so, returns the break's end time instead.
   * If the break window is invalid (startTime >= endTime), it is skipped
   * and an error is logged.
   */
  private avoidBreaks(
    timeMinutes: number,
    breaks: Array<{ startTime: string | null; endTime: string | null }>
  ): number {
    for (const brk of breaks) {
      const breakStart = parseTimeToMinutes(brk.startTime);
      const breakEnd = parseTimeToMinutes(brk.endTime);

      // Skip invalid break windows (startTime >= endTime)
      if (breakStart >= breakEnd) {
        logger.error(
          `[NoShowShift] Invalid break window detected: startTime=${brk.startTime} >= endTime=${brk.endTime}. Skipping break.`
        );
        continue;
      }

      // If the new time falls within the break (startTime <= newTime < endTime),
      // place the appointment at the break's end time
      if (timeMinutes >= breakStart && timeMinutes < breakEnd) {
        logger.info(
          `[NoShowShift] Shifted time ${minutesToTimeString(timeMinutes)} falls within break ` +
            `(${brk.startTime}-${brk.endTime}). Placing at break end: ${brk.endTime}`
        );
        return breakEnd;
      }
    }

    return timeMinutes;
  }

  /**
   * Fetches active breaks (status=true) for the doctor's clinic availability
   * on the given date. First resolves the clinicAvailabilityId via the day-of-week
   * or date-specific availability, then queries ClinicAvailabilityBreak.
   */
  private async fetchActiveBreaks(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<Array<{ startTime: string | null; endTime: string | null }>> {
    // Determine the day of week to find the ClinicAvailability record
    const dayOfWeek = getDayNameFromDate(new Date(`${date}T00:00:00Z`));

    // Find the ClinicAvailability record for this doctor/clinic/day
    const availabilityRecords = await database
      .select({
        id: ClinicAvailability.id,
      })
      .from(ClinicAvailability)
      .where(
        and(
          eq(ClinicAvailability.clinicId, clinicId),
          eq(ClinicAvailability.doctorId, doctorId),
          eq(ClinicAvailability.dayOfWeek, dayOfWeek)
        )
      );

    if (availabilityRecords.length === 0) {
      return [];
    }

    const availabilityIds = availabilityRecords.map((r) => r.id);

    // Fetch active breaks for these availability records
    const breaks = await database
      .select({
        startTime: ClinicAvailabilityBreak.startTime,
        endTime: ClinicAvailabilityBreak.endTime,
      })
      .from(ClinicAvailabilityBreak)
      .where(
        and(
          inArray(
            ClinicAvailabilityBreak.clinicAvailabilityId,
            availabilityIds
          ),
          eq(ClinicAvailabilityBreak.status, true)
        )
      );

    return breaks;
  }

  /**
   * Fetches appointments that come after the no-show appointment in queue order.
   * For time-based: appointments with appointmentTime > noShowTime on the same date.
   * For token-based: appointments with tokenNo > noShowTokenNo on the same date.
   */
  private async fetchSubsequentAppointments(
    clinicId: string,
    doctorId: string,
    appointmentDate: Date,
    appointmentTime: string | null,
    tokenNo: number | null
  ) {
    const dateStr = appointmentDate.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00Z`);
    const nextDay = new Date(startOfDay);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const baseConditions = [
      eq(AppointmentModel.clinicId, clinicId),
      eq(AppointmentModel.doctorId, doctorId),
      gte(AppointmentModel.appointmentDate, startOfDay),
      lt(AppointmentModel.appointmentDate, nextDay),
    ];

    if (appointmentTime) {
      // Time-based: fetch appointments with time after the no-show's time
      const appointments = await database
        .select({
          id: AppointmentModel.id,
          appointmentTime: AppointmentModel.appointmentTime,
          tokenNo: AppointmentModel.tokenNo,
          appointmentStatus: AppointmentModel.appointmentStatus,
          patientId: AppointmentModel.patientId,
          appointmentDurationMinutes:
            AppointmentModel.appointmentDurationMinutes,
        })
        .from(AppointmentModel)
        .where(
          and(
            ...baseConditions,
            gt(AppointmentModel.appointmentTime, appointmentTime)
          )
        )
        .orderBy(
          asc(AppointmentModel.appointmentTime),
          asc(AppointmentModel.tokenNo)
        );

      return appointments;
    } else if (tokenNo !== null) {
      // Token-based: fetch appointments with tokenNo > noShowTokenNo
      const appointments = await database
        .select({
          id: AppointmentModel.id,
          appointmentTime: AppointmentModel.appointmentTime,
          tokenNo: AppointmentModel.tokenNo,
          appointmentStatus: AppointmentModel.appointmentStatus,
          patientId: AppointmentModel.patientId,
          appointmentDurationMinutes:
            AppointmentModel.appointmentDurationMinutes,
        })
        .from(AppointmentModel)
        .where(and(...baseConditions, gt(AppointmentModel.tokenNo, tokenNo)))
        .orderBy(asc(AppointmentModel.tokenNo));

      return appointments;
    }

    // No time or token reference — return empty
    logger.warn(
      `[NoShowShift] No-show appointment has neither appointmentTime nor tokenNo. Cannot determine subsequent appointments.`
    );
    return [];
  }

  /**
   * Resolves the slot duration for this doctor/clinic/date.
   * Uses DelayTrackerService.resolveSlotMinutes which checks Redis cache first.
   */
  private async resolveSlotMinutes(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<number | null> {
    // Delegate to the shared delay tracker which has Redis caching
    return this.delayTrackerService.resolveSlotMinutes(
      clinicId,
      doctorId,
      date
    );
  }
}

// ─── Local Helper Functions ───────────────────────────────────────────────────

/**
 * Parses a time string (e.g., "09:00", "9:00 AM", "14:30") into minutes since midnight.
 * Returns 0 if the time cannot be parsed.
 */
function parseTimeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const t = time.trim();

  // Handle 12-hour format with AM/PM
  const ampmMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const min = Number(ampmMatch[2] ?? 0);
    const ampm = ampmMatch[3].toLowerCase();
    if (hour === 12 && ampm === 'am') hour = 0;
    if (hour !== 12 && ampm === 'pm') hour += 12;
    return hour * 60 + min;
  }

  // Handle 24-hour format HH:MM or HH:MM:SS
  const hhmmMatch = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    const min = Number(hhmmMatch[2]);
    return hour * 60 + min;
  }

  return 0;
}

/**
 * Converts minutes since midnight back to a "HH:MM" time string.
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Returns the English weekday name (e.g., "Monday") for a given date.
 */
function getDayNameFromDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}
