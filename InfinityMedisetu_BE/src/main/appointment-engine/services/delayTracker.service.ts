import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import redisClient from '../../../configurations/redisConfig';
import logger from '../../../utils/logger';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import {
  ClinicAvailability,
  ClinicDateAvailability,
} from '../../clinic/models/clinic.model';
import {
  AppointmentDelayEntry,
  IDelayTrackerService,
  QueueDelayData,
} from '../interfaces';
import {
  getRedisKey,
  isTerminalStatus,
  resolveAppointmentDuration,
} from '../utils/helpers';

const DELAY_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * DelayTrackerService
 *
 * Computes and caches delay data for a doctor's daily queue.
 * Handles both time-based (appointmentTime) and token-based (tokenNo) queues.
 */
export class DelayTrackerService implements IDelayTrackerService {
  /**
   * Recalculates the estimated wait time and cumulative delay for all
   * non-terminal appointments in a doctor's daily queue.
   *
   * Algorithm:
   * 1. Fetch all appointments for (clinicId, doctorId, date) ordered by
   *    appointmentTime ASC or tokenNo ASC.
   * 2. Determine each appointment's duration using the resolution chain:
   *    appointmentDurationMinutes → slotMinutes → 30.
   * 3. Walk the queue sequentially; for each non-terminal appointment,
   *    compute projectedStart = max(scheduledTime, previousProjectedEnd).
   * 4. estimatedWaitMinutes = max(0, projectedStart - scheduledTime) in whole minutes.
   * 5. cumulativeDelayMinutes = delay of the last non-terminal appointment.
   * 6. Store in Redis with 24h TTL.
   */
  async recalculate(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<QueueDelayData> {
    // Fetch appointments for this doctor on this date
    const appointments = await this.fetchDailyQueue(clinicId, doctorId, date);

    // Resolve the slot duration for this doctor/clinic/date
    const slotMinutes = await this.resolveSlotMinutes(clinicId, doctorId, date);

    // Determine if this is a token-based or time-based queue
    const isTokenBased =
      appointments.length > 0 && appointments[0].appointmentTime == null;

    // Check if doctor has started seeing anyone today. Only "Confirmed" means
    // the doctor is actually with a patient — "Patient Arrived" just means
    // checked in/waiting. Treating "Patient Arrived" as "being served" is
    // self-referential for the first patient in the queue: their own arrival
    // status would suppress the real-time-delay computation for themselves,
    // even though the doctor never actually started and is genuinely late.
    // If no one is being served and current time > first scheduled time,
    // factor in real-time delay so patients see accurate wait times
    const isAnyoneBeingServed = appointments.some(
      (a) =>
        !isTerminalStatus(a.appointmentStatus) &&
        a.appointmentStatus === 'Confirmed'
    );

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Walk the queue and compute delay data
    const delayEntries: AppointmentDelayEntry[] = [];
    let previousProjectedEnd: number | null = null;
    let cumulativeDelayMinutes = 0;

    for (const appt of appointments) {
      const duration = resolveAppointmentDuration(
        appt.appointmentDurationMinutes,
        slotMinutes
      );

      if (isTerminalStatus(appt.appointmentStatus)) {
        // Terminal appointments are still included in the entries for reference
        // but do not affect the projected timeline
        delayEntries.push({
          appointmentId: appt.id,
          patientId: appt.patientId,
          userId: appt.patientId,
          status: appt.appointmentStatus as AppointmentDelayEntry['status'],
          scheduledTime: appt.appointmentTime ?? null,
          tokenNo: appt.tokenNo ?? null,
          projectedStartTime: appt.appointmentTime ?? '00:00',
          estimatedWaitMinutes: 0,
          durationMinutes: duration,
        });
        continue;
      }

      // Resolve scheduled time in minutes since midnight
      const scheduledMinutes = isTokenBased
        ? this.computeTokenScheduledMinutes(appt, appointments, slotMinutes)
        : parseTimeToMinutes(appt.appointmentTime);

      // Compute projected start
      let projectedStartMinutes: number;

      if (previousProjectedEnd === null) {
        // First non-terminal appointment:
        // If doctor hasn't started and current time has passed the scheduled time,
        // use current time as the projected start (doctor is running late)
        if (
          !isAnyoneBeingServed &&
          !isTokenBased &&
          nowMinutes > scheduledMinutes
        ) {
          projectedStartMinutes = nowMinutes;
        } else {
          projectedStartMinutes = scheduledMinutes;
        }
      } else {
        // Projected start = max(scheduled time, previous projected end)
        projectedStartMinutes = Math.max(
          scheduledMinutes,
          previousProjectedEnd
        );
      }

      // Estimated wait = max(0, projectedStart - scheduledTime)
      const estimatedWaitMinutes = Math.max(
        0,
        projectedStartMinutes - scheduledMinutes
      );

      // Update previous projected end
      previousProjectedEnd = projectedStartMinutes + duration;

      // Track cumulative delay (will be the last non-terminal's delay)
      cumulativeDelayMinutes = estimatedWaitMinutes;

      delayEntries.push({
        appointmentId: appt.id,
        patientId: appt.patientId,
        userId: appt.patientId,
        status: appt.appointmentStatus as AppointmentDelayEntry['status'],
        scheduledTime: appt.appointmentTime ?? null,
        tokenNo: appt.tokenNo ?? null,
        projectedStartTime: minutesToTimeString(projectedStartMinutes),
        estimatedWaitMinutes,
        durationMinutes: duration,
      });
    }

    const queueDelayData: QueueDelayData = {
      clinicId,
      doctorId,
      date,
      cumulativeDelayMinutes,
      lastCalculatedAt: new Date().toISOString(),
      appointments: delayEntries,
    };

    // Store in Redis with 24h TTL
    await this.storeInRedis(queueDelayData);

    return queueDelayData;
  }

  /**
   * Gets estimated wait time for a specific appointment from cached data.
   *
   * 1. Try per-appointment cache key first (single Redis GET, no DB query)
   * 2. Fall back to full queue cache (requires DB lookup for clinicId/doctorId/date)
   * 3. If all cache misses, recalculate on-the-fly from DB
   * 4. Return 0 if appointment not found in the delay data
   */
  async getEstimatedWaitTime(appointmentId: string): Promise<number> {
    // Step 1: Try per-appointment cache key (fastest path — no DB query)
    try {
      const waitKey = getRedisKey('wait', appointmentId);
      const waitRaw = await redisClient.get(waitKey);

      if (waitRaw) {
        const waitData = JSON.parse(waitRaw);
        return waitData.estimatedWaitMinutes ?? 0;
      }
    } catch {
      // Redis unavailable or parse error — fall through to full lookup
    }

    // Step 2: Look up the appointment to get clinicId, doctorId, date
    const [appointment] = await database
      .select({
        clinicId: AppointmentModel.clinicId,
        doctorId: AppointmentModel.doctorId,
        appointmentDate: AppointmentModel.appointmentDate,
      })
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, appointmentId))
      .limit(1);

    if (!appointment || !appointment.doctorId) {
      return 0;
    }

    const date = appointment.appointmentDate.toISOString().split('T')[0];

    // Step 3: Try to read from full queue Redis cache
    let delayData: QueueDelayData | null = null;

    try {
      delayData = await this.getQueueDelayData(
        appointment.clinicId,
        appointment.doctorId,
        date
      );
    } catch {
      // Redis unavailable — will fall through to on-the-fly computation
    }

    if (delayData) {
      const entry = delayData.appointments.find(
        (a) => a.appointmentId === appointmentId
      );
      return entry?.estimatedWaitMinutes ?? 0;
    }

    // Step 4: Redis unavailable or no data — compute on-the-fly from DB
    logger.warn(
      `[DelayTracker] Redis cache miss for appointment ${appointmentId}. Computing delay on-the-fly from DB.`
    );

    const computedData = await this.recalculate(
      appointment.clinicId,
      appointment.doctorId,
      date
    );

    const entry = computedData.appointments.find(
      (a) => a.appointmentId === appointmentId
    );
    return entry?.estimatedWaitMinutes ?? 0;
  }

  /**
   * Gets per-appointment cached wait data directly from Redis.
   * Returns null if cache miss or Redis is unavailable.
   * Used by the patient detail API for fast, DB-free lookups.
   */
  async getAppointmentWaitCache(appointmentId: string): Promise<{
    estimatedWaitMinutes: number;
    status: string;
    appointmentTime: string | null;
    projectedStartTime: string;
    lastUpdated: string;
  } | null> {
    try {
      const waitKey = getRedisKey('wait', appointmentId);
      const raw = await redisClient.get(waitKey);

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Gets the full queue delay data from Redis cache.
   *
   * 1. Read from Redis key `appointment_engine:delay:{clinicId}:{doctorId}:{date}`
   * 2. Parse and return the QueueDelayData
   * 3. Return null if key doesn't exist or Redis is unavailable
   */
  async getQueueDelayData(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<QueueDelayData | null> {
    const key = getRedisKey('delay', clinicId, doctorId, date);

    try {
      const raw = await redisClient.get(key);

      if (!raw) {
        return null;
      }

      const data: QueueDelayData = JSON.parse(raw);
      return data;
    } catch (error) {
      logger.warn(
        `[DelayTracker] Failed to read delay data from Redis for key=${key}. Returning null.`,
        { error }
      );
      return null;
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Fetches the daily queue of appointments for a doctor, ordered correctly
   * for both time-based and token-based modes.
   */
  private async fetchDailyQueue(
    clinicId: string,
    doctorId: string,
    date: string
  ) {
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const nextDay = new Date(startOfDay);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const appointments = await database
      .select({
        id: AppointmentModel.id,
        appointmentDate: AppointmentModel.appointmentDate,
        appointmentTime: AppointmentModel.appointmentTime,
        tokenNo: AppointmentModel.tokenNo,
        appointmentStatus: AppointmentModel.appointmentStatus,
        clinicId: AppointmentModel.clinicId,
        patientId: AppointmentModel.patientId,
        doctorId: AppointmentModel.doctorId,
        appointmentDurationMinutes: AppointmentModel.appointmentDurationMinutes,
      })
      .from(AppointmentModel)
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          eq(AppointmentModel.doctorId, doctorId),
          gte(AppointmentModel.appointmentDate, startOfDay),
          lt(AppointmentModel.appointmentDate, nextDay)
        )
      )
      .orderBy(
        asc(AppointmentModel.appointmentTime),
        asc(AppointmentModel.tokenNo)
      );

    return appointments;
  }

  /**
   * Resolves the slot duration for this doctor/clinic/date.
   * Priority: Redis cache → ClinicDateAvailability → ClinicAvailability → null
   * Cached in Redis for 1 hour (slot config rarely changes during the day).
   */
  async resolveSlotMinutes(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<number | null> {
    // Try Redis cache first
    const cacheKey = getRedisKey('slot_minutes', clinicId, doctorId, date);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached !== null) {
        return cached === 'null' ? null : parseInt(cached, 10);
      }
    } catch {
      // Redis unavailable — fall through to DB
    }

    // First try date-specific availability
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const nextDay = new Date(startOfDay);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const [dateAvailability] = await database
      .select({
        slotMinutes: ClinicDateAvailability.slotMinutes,
      })
      .from(ClinicDateAvailability)
      .where(
        and(
          eq(ClinicDateAvailability.clinicId, clinicId),
          eq(ClinicDateAvailability.doctorId, doctorId),
          gte(ClinicDateAvailability.date, startOfDay),
          lt(ClinicDateAvailability.date, nextDay)
        )
      )
      .limit(1);

    if (dateAvailability?.slotMinutes) {
      // Cache for 1 hour
      await redisClient
        .set(cacheKey, String(dateAvailability.slotMinutes), 'EX', 3600)
        .catch(() => {});
      return dateAvailability.slotMinutes;
    }

    // Fall back to day-of-week availability
    const dayOfWeek = getDayNameFromDate(new Date(`${date}T00:00:00Z`));

    const [weekdayAvailability] = await database
      .select({
        slotMinutes: ClinicAvailability.slotMinutes,
      })
      .from(ClinicAvailability)
      .where(
        and(
          eq(ClinicAvailability.clinicId, clinicId),
          eq(ClinicAvailability.doctorId, doctorId),
          eq(ClinicAvailability.dayOfWeek, dayOfWeek)
        )
      )
      .limit(1);

    const result = weekdayAvailability?.slotMinutes ?? null;

    // Cache result (even null) for 1 hour
    await redisClient.set(cacheKey, String(result), 'EX', 3600).catch(() => {});

    return result;
  }

  /**
   * For token-based queues, compute the "scheduled" start time as the
   * cumulative duration of all preceding tokens from queue start.
   * This uses the first appointment's time or a default start time.
   */
  private computeTokenScheduledMinutes(
    currentAppt: { tokenNo: number | null; appointmentTime: string | null },
    allAppointments: Array<{
      tokenNo: number | null;
      appointmentDurationMinutes: string | null;
      appointmentTime: string | null;
    }>,
    slotMinutes: number | null
  ): number {
    // For token-based, position is derived from tokenNo ordering
    // The "scheduled time" is the sum of durations of all preceding tokens
    // We use index 0 as the base start time
    const currentIndex = allAppointments.indexOf(currentAppt as any);
    let cumulativeMinutes = 0;

    for (let i = 0; i < currentIndex; i++) {
      cumulativeMinutes += resolveAppointmentDuration(
        allAppointments[i].appointmentDurationMinutes,
        slotMinutes
      );
    }

    return cumulativeMinutes;
  }

  /**
   * Stores the computed delay data in Redis with 24h TTL.
   * Uses a version field with atomic Lua script for race condition handling.
   * If the version in Redis is already newer than what we're writing,
   * we skip the write (another process produced fresher data).
   * Also writes per-appointment wait time cache keys for fast patient API lookups.
   * Logs a warning if Redis is unavailable but does not throw.
   */
  private async storeInRedis(data: QueueDelayData): Promise<void> {
    const key = getRedisKey('delay', data.clinicId, data.doctorId, data.date);

    try {
      // Atomically set only if our version is newer than what's currently stored.
      // The Lua script reads the current version, and only writes if the new
      // version is greater, preventing stale data from overwriting fresh data.
      const luaScript = `
                local current = redis.call('GET', KEYS[1])
                local newVersion = tonumber(ARGV[2])
                if current then
                    local ok, decoded = pcall(cjson.decode, current)
                    if ok and decoded.version and tonumber(decoded.version) >= newVersion then
                        return 0
                    end
                end
                redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[3]))
                return 1
            `;

      // Version is derived from lastCalculatedAt (set once, at the start of
      // recalculate()), not from a read-then-increment against the current
      // Redis value. A read-then-increment race lets two concurrent instances
      // read the same existing version and compute the same "next" version,
      // so the Lua compare-and-set (`>=`) can't tell them apart. A timestamp
      // fixed at computation start is monotonic per-writer regardless of what
      // else is happening in Redis, which is what the Lua guard actually needs.
      const newVersion = Date.parse(data.lastCalculatedAt);

      const payload = JSON.stringify({ ...data, version: newVersion });

      const result = await redisClient.eval(
        luaScript,
        1,
        key,
        payload,
        String(newVersion),
        String(DELAY_TTL_SECONDS)
      );

      if (result === 0) {
        logger.warn(
          `[DelayTracker] Stale version detected for key=${key}. Skipping write — a newer version already exists.`
        );
      } else {
        // Queue data was written successfully — write per-appointment cache keys
        await this.storePerAppointmentCache(data);
      }
    } catch (error) {
      logger.warn(
        `[DelayTracker] Failed to store delay data in Redis for key=${key}. Computed data returned to caller.`,
        { error }
      );
    }
  }

  /**
   * Writes a per-appointment cache key for each non-terminal appointment.
   * Key: `appointment_engine:wait:{appointmentId}`
   * TTL: 24 hours
   *
   * This enables the patient detail API to fetch estimated wait time
   * with a single Redis GET — no DB lookup needed.
   */
  private async storePerAppointmentCache(data: QueueDelayData): Promise<void> {
    const pipeline = redisClient.pipeline();

    for (const entry of data.appointments) {
      if (isTerminalStatus(entry.status)) {
        continue;
      }

      const waitKey = getRedisKey('wait', entry.appointmentId);
      const waitPayload = JSON.stringify({
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
        status: entry.status,
        appointmentTime: entry.scheduledTime,
        projectedStartTime: entry.projectedStartTime,
        lastUpdated: data.lastCalculatedAt,
      });

      pipeline.set(waitKey, waitPayload, 'EX', DELAY_TTL_SECONDS);
    }

    try {
      await pipeline.exec();
    } catch (error) {
      logger.warn(
        `[DelayTracker] Failed to write per-appointment cache keys for clinic=${data.clinicId}, doctor=${data.doctorId}`,
        { error }
      );
    }
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
