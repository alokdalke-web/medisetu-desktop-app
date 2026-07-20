/**
 * Shared utility functions for the Appointment Engine.
 */

import { AppointmentStatus } from '../interfaces';

const REDIS_PREFIX = 'appointment_engine';

const TERMINAL_STATUSES = new Set(['Completed', 'Cancelled', 'NoShow']);
const SHIFTABLE_STATUSES = new Set(['Upcoming', 'Confirmed']);

/**
 * Resolves the effective appointment duration in minutes.
 *
 * The `appointmentDurationMinutes` column is stored as varchar in the DB.
 * This utility parses it as an integer, falls back to slotMinutes from
 * ClinicAvailability, and ultimately defaults to 30 minutes.
 */
export function resolveAppointmentDuration(
  appointmentDurationMinutes: string | null,
  slotMinutes: number | null
): number {
  if (appointmentDurationMinutes != null) {
    const parsed = parseInt(appointmentDurationMinutes, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (slotMinutes != null && slotMinutes > 0) {
    return slotMinutes;
  }

  return 30;
}

/**
 * Generates a consistent Redis key following the appointment engine conventions.
 *
 * Key patterns:
 * - `appointment_engine:delay:{clinicId}:{doctorId}:{date}`
 * - `appointment_engine:notified:{appointmentId}`
 * - `appointment_engine:time_to_next:{clinicId}:{doctorId}`
 */
export function getRedisKey(type: string, ...parts: string[]): string {
  return [REDIS_PREFIX, type, ...parts].join(':');
}

/**
 * Checks whether an appointment status is terminal (no longer active in the queue).
 * Terminal statuses: Completed, Cancelled, NoShow
 */
export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Checks whether an appointment status is shiftable (eligible for no-show forward shift).
 * Shiftable statuses: Upcoming, Confirmed
 */
export function isShiftableStatus(status: string): boolean {
  return SHIFTABLE_STATUSES.has(status);
}

/**
 * The 4 patient-facing queue stages, plus a terminal "completed" state for
 * appointments that have exited the queue.
 */
export type QueueStage =
  'waiting-area' | 'in-queue' | 'almost-there' | 'consultation' | 'completed';

/**
 * Single source of truth for mapping (status, patientsAhead) to a patient-facing
 * queue stage. Used by both buildPayloadFromQueue and emitPatientUpdated so the
 * two broadcast paths can never drift apart.
 *
 * - waiting-area: default booked status (Upcoming), not checked in yet.
 * - in-queue: reception marked Patient Arrived, but still >5 patients ahead.
 * - almost-there: Patient Arrived AND <=5 patients ahead.
 * - consultation: doctor confirmed (Confirmed) — actively being seen.
 * - completed: any terminal status (Completed/Cancelled/NoShow).
 */
export function deriveQueueStage(
  status: AppointmentStatus,
  patientsAhead: number
): QueueStage {
  if (isTerminalStatus(status)) return 'completed';
  if (status === 'Confirmed') return 'consultation';
  if (status === 'Patient Arrived') {
    return patientsAhead <= 5 ? 'almost-there' : 'in-queue';
  }
  return 'waiting-area';
}
