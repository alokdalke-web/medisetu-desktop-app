/**
 * LiveQueueHelper
 *
 * Shared utility for computing patient-facing live queue payloads.
 * Used by the socket join.live-queue handler, the REST endpoint, and the broadcast service.
 */

import redisClient from '../../../configurations/redisConfig';
import { DelayTrackerService } from './delayTracker.service';
import { RunningLateNotifier } from './runningLateNotifier.service';
import { QueueDelayData } from '../interfaces';
import {
  deriveQueueStage,
  getRedisKey,
  isTerminalStatus,
  QueueStage,
} from '../utils/helpers';

export interface LiveQueuePayload {
  appointmentId: string;
  tokenNo: number | null;
  status: string | null;
  appointmentTime: string | null;
  estimatedWaitMinutes: number;
  nowServingToken: number | null;
  patientsAhead: number;
  queuePosition: QueueStage | null;
  totalPatientsInQueue: number;
  avgConsultationMinutes: number | null;
  isRunningLate: boolean;
  runningLateMinutes: number | null;
}

const EMPTY_PAYLOAD: LiveQueuePayload = {
  appointmentId: '',
  tokenNo: null,
  status: null,
  appointmentTime: null,
  estimatedWaitMinutes: 0,
  nowServingToken: null,
  patientsAhead: 0,
  queuePosition: null,
  totalPatientsInQueue: 0,
  avgConsultationMinutes: null,
  isRunningLate: false,
  runningLateMinutes: null,
};

/**
 * Reads the running-late notification flag for a single appointment.
 * The flag's value (set by RunningLateNotifier) is the effective delay in
 * minutes, not just a boolean marker — see runningLateNotifier.service.ts.
 */
async function getRunningLateMinutes(
  appointmentId: string
): Promise<number | null> {
  try {
    const raw = await redisClient.get(getRedisKey('notified', appointmentId));
    if (raw === null) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Computes the full live queue payload for a specific appointment.
 *
 * Always recalculates fresh from the DB rather than trusting the Redis
 * cache, because real-time delay (doctor inactive, wall-clock time has
 * passed the scheduled slot) changes purely with elapsed time — no status
 * change or other event necessarily occurs to invalidate a stale cache
 * entry. This is the per-appointment, patient-initiated read path (REST
 * page load / socket join), so cost is bounded by patient screen-opens,
 * not by broadcast frequency — a single indexed DB query per call.
 */
export async function computeLiveQueuePayload(
  appointmentId: string,
  clinicId: string,
  doctorId: string
): Promise<LiveQueuePayload> {
  const delayTrackerService = new DelayTrackerService();
  const today = new Date().toISOString().split('T')[0];

  const queueData = await delayTrackerService.recalculate(
    clinicId,
    doctorId,
    today
  );

  if (!queueData || queueData.appointments.length === 0) {
    return { ...EMPTY_PAYLOAD, appointmentId };
  }

  // For token-based appointments (no appointmentTime), ensure a running-late
  // job is scheduled using the projected start time from the delay tracker.
  const myEntry = queueData.appointments.find(
    (a) => a.appointmentId === appointmentId
  );
  if (myEntry && !myEntry.scheduledTime && myEntry.projectedStartTime) {
    import('./runningLateQueue.service')
      .then(({ runningLateQueue }) =>
        runningLateQueue.scheduleCheckFromProjectedTime(
          appointmentId,
          clinicId,
          doctorId,
          today,
          myEntry.projectedStartTime
        )
      )
      .catch(() => {});
  }

  // Evaluate the running-late flag against the data we just recalculated,
  // rather than relying solely on the BullMQ job or a status-change event
  // having already run evaluateFromCache. Without this, a patient opening
  // the live-queue screen before the job's next 15-minute repeat would see
  // an unset isRunningLate flag despite estimatedWaitMinutes already
  // reflecting a real delay — the flag would eventually catch up on its own,
  // but only once something else happens to trigger it.
  //
  // Uses the single-appointment variant, not evaluateFromCache, since this
  // runs on every patient screen-open — evaluating the whole doctor's queue
  // here would redundantly re-run for every other patient's appointment too
  // each time anyone from the same queue opens their screen.
  await new RunningLateNotifier()
    .evaluateSingleFromCache(clinicId, appointmentId, queueData)
    .catch(() => {});

  const runningLateMinutes = await getRunningLateMinutes(appointmentId);

  return buildPayloadFromQueue(appointmentId, queueData, runningLateMinutes);
}

/**
 * Builds a patient payload from existing QueueDelayData (no DB call needed).
 * `runningLateMinutes` must be fetched by the caller (kept out of this function
 * so it stays pure/sync — callers that build payloads for many appointments at
 * once should batch the Redis read via mget rather than call this per-entry).
 */
export function buildPayloadFromQueue(
  appointmentId: string,
  queueData: QueueDelayData,
  runningLateMinutes: number | null = null
): LiveQueuePayload {
  const appointments = queueData.appointments;

  const currentlyServing = appointments.find(
    (a) => a.status === 'Confirmed' || a.status === 'Patient Arrived'
  );

  const activeAppointments = appointments.filter(
    (a) => !isTerminalStatus(a.status)
  );

  const durations = appointments
    .filter((a) => a.durationMinutes > 0)
    .map((a) => a.durationMinutes);

  const avgConsultationMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : null;

  const myEntry = appointments.find((a) => a.appointmentId === appointmentId);

  if (!myEntry) {
    return {
      ...EMPTY_PAYLOAD,
      appointmentId,
      nowServingToken: currentlyServing?.tokenNo ?? null,
      avgConsultationMinutes,
    };
  }

  const myIndex = activeAppointments.indexOf(myEntry);
  const patientsAhead = myIndex > 0 ? myIndex : 0;

  const queuePosition = deriveQueueStage(myEntry.status, patientsAhead);

  return {
    appointmentId: myEntry.appointmentId,
    tokenNo: myEntry.tokenNo,
    status: myEntry.status,
    appointmentTime: myEntry.scheduledTime,
    estimatedWaitMinutes: myEntry.estimatedWaitMinutes,
    nowServingToken: currentlyServing?.tokenNo ?? null,
    patientsAhead,
    queuePosition,
    // Patients ahead of this one in queue order (time- or token-based) — not
    // the day's total queue size. Same value as patientsAhead by definition;
    // kept as a separate field name for API stability.
    totalPatientsInQueue: patientsAhead,
    avgConsultationMinutes,
    isRunningLate: runningLateMinutes !== null,
    runningLateMinutes,
  };
}
