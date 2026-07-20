/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  // not,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import path from 'path';
import z from 'zod';
import { database } from '../../../configurations/dbConnection';
import redisClient from '../../../configurations/redisConfig';
import { deleteFromS3 } from '../../../configurations/s3';
import { AuthUser } from '../../../middlewear/auth.middleware';
import { HttpError } from '../../../middlewear/errorHandler';
import { envConfig } from '../../../utils/envConfig';
import logger from '../../../utils/logger';
import {
  getUserById,
  notifyAppointmentCanceled,
  notifyAppointmentConfirmed,
  notifyAppointmentCreated,
  notifyAppointmentRescheduled,
} from '../../../utils/notificationHelpers';
import { sendNotificationToUser } from '../../../utils/notification.utils';
import { broadcastAppointmentChange } from '../../../utils/appointmentRealtime';
import { pagination } from '../../../utils/utils';
import { ClinicSymptomCountModel } from '../../clinic/models/clinic-symptom-count.model';
import { ClinicSymptomModel } from '../../clinic/models/clinic-symptom.model';
import {
  ClinicAppointmentPlainModel,
  ClinicAssignModel,
  ClinicAvailability,
  ClinicAvailabilityBreak,
  ClinicDateAvailability,
  ClinicDateAvailabilityTimeSlots,
  ClinicModel,
  ClinicServiceModel,
} from '../../clinic/models/clinic.model';
import { DoctorQualificationModel } from '../../doctor/models/doctor.model';
import { AppointmentNotificationService } from '../../notifications/services/appointmentNotification.service';
import { smsReminderQueue } from '../../notifications/services/appointmentSmsReminder.service';
import { whatsAppReminderQueue } from '../../notifications/services/appointmentWhatsappReminder.service';
import {
  ReportCardModel,
  PrescriptionModel,
} from '../../reports/models/reports.model';
import { UserModel } from '../../users/models/user.model';
import { UserDevicesModel } from '../../users/models/userDevices.model';
import { UserProfileModel } from '../../users/models/userProfile.model';
import { UserProfessionalModel } from '../../users/models/userProfessional.model';
import { AppointmentClinicalModel } from '../models/appointment-clinical.model';
import { AppointmentPaymentModel } from '../models/appointment-payment.model';
import { AppointmentModel } from '../models/appointment.model';
import { DoctorReviewsModel } from '../../doctor/models/doctorReview.model';
import { appointmentMultipleService } from '../models/appointmentMultipleService.model';
import { doctorGallery } from '../models/doctorGallery.model';
import { doctorManualPrescriptionModel } from '../models/doctorManualPrescription.model';
import { medicalCertificateModel } from '../models/medicalCertificate.model';
import { patientGallery } from '../models/patientGallery.model';
import {
  appointmentQueryDto,
  ClinicAppointmentDetailsQueryDto,
  createAppointmentDto,
  CreatePatientGalleryDto,
  GetAppointmentPaymentsDto,
  getAvailableSlotsForDateDto,
  getAvailableSlotsForParamsDto,
  UpdateAppointmentDto,
  updateAppointmentSchema,
} from '../schemas/appointment.schemas';
import { AppointmentActivityHistoryService } from './appointment-activity-history.service';
import { autoNoShowQueue } from './autoNoShow.service';
import { AppointmentEngineOrchestrator } from '../../appointment-engine/services/orchestrator.service';
import {
  AppointmentRecord,
  AppointmentStatus,
} from '../../appointment-engine/interfaces';

type Slot = {
  start: string; // ISO-like: YYYY-MM-DDTHH:mm:00
  end: string;
  clinicAvailabilityId: string;
  source: 'availability' | 'break' | 'appointment';
  status?: 'available' | 'break' | 'Confirmed' | 'booked' | 'reserved';
  breakId?: string;
  breakType?: string;
  appointmentId?: string;
  appointmentStatus?: string;
  patientId?: string;
  // Token-mode response (when ClinicAvailability.noOfPatients is set)
  totalTokens?: number;
  availableTokens?: number;
  tokens?: Array<{
    tokenNo: number;
    status: 'available' | 'booked' | 'reserved';
    appointmentId?: string;
    appointmentStatus?: string;
    patientId?: string;
  }>;
};

/**
 * Parse time strings into minutes since midnight.
 * Accepts: "09:00", "9:00", "09:00 AM", "9:00AM", "5:30 PM", "17:30"
 */
function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const t = time.trim();

  // 12-hour with AM/PM or 24-hour with colon
  const ampmMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const min = Number(ampmMatch[2] ?? 0);
    const ampm = ampmMatch[3].toLowerCase();
    if (hour === 12 && ampm === 'am') hour = 0;
    if (hour !== 12 && ampm === 'pm') hour += 12;
    return hour * 60 + min;
  }

  const hhmmMatch = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    const min = Number(hhmmMatch[2]);
    return hour * 60 + min;
  }

  // plain numeric string — last 3 digits (optional) OR single hour like "9"
  const plainNumMatch = t.match(/^(\d{1,2})$/);
  if (plainNumMatch) {
    const hour = Number(plainNumMatch[1]);
    return hour * 60;
  }

  // try parse with Date (fallback) — extracts hour/minute from current date
  const parsed = new Date(`1970-01-01T${t}`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getUTCHours() * 60 + parsed.getUTCMinutes();
  }

  return null;
}

function getDayNameFromDate(d: Date): string {
  // returns English weekday name matching your stored values (e.g., "Monday")
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

interface PaymentTransaction {
  patientName: string;
  patientMobile: string;
  doctorName: string;
  doctorSpeciality: string;
  serviceName: string;
  appointmentDate: Date;
  price: number;
  entryType: 'Credit' | 'Debit';
  paymentMode?: string;
  refundMode?: string;
  refundNotes?: string;
  transactionId: string;
  originalAppointmentId: string;
  gatewayTransactionId?: string;
}

type ClinicAppointmentDetailsMetricKey =
  | 'totalAppointments'
  | 'completed'
  | 'upcoming'
  | 'cancelled'
  | 'noShow'
  | 'confirmed'
  | 'patientArrived';

type ClinicAppointmentDetailsCounts = Record<
  ClinicAppointmentDetailsMetricKey,
  number
>;

function formatDateOnlyLocal(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnlyLocal(dateLike?: string) {
  if (!dateLike) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const raw = String(dateLike).trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new HttpError(400, 'Invalid date');
    }

    return parsed;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Invalid date');
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function getSingleDayRange(dateLike?: string) {
  const start = parseDateOnlyLocal(dateLike);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function buildMetricComparison(current: number, previous: number) {
  const changeCount = current - previous;
  const comparisonBase = Math.max(current, previous);
  const percentageChange =
    comparisonBase === 0
      ? 0
      : Number(((changeCount / comparisonBase) * 100).toFixed(2));
  const percentageLabel = `${percentageChange > 0 ? '+' : ''}${percentageChange}%`;
  const trend =
    changeCount > 0 ? 'increase' : changeCount < 0 ? 'decrease' : 'no_change';

  return {
    count: current,
    previousCount: previous,
    changeCount,
    percentageChange,
    percentageLabel,
    trend,
  };
}

function convertTo24Hour(time12h: string) {
  const [time, modifier] = time12h.split(' ');
  const [hours, minutes] = time.split(':');

  let hour = parseInt(hours, 10);

  if (modifier === 'PM' && hour !== 12) {
    hour += 12;
  }

  if (modifier === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

function hashStringToInt32(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// Appointment Service
export class AppointmentService {
  static async createAppointment(
    userId: string,
    clinicId: string,
    payload: createAppointmentDto,
    performerUserId?: string /* use your createAppointmentDto type */
  ) {
    // Validate input basic shape (you probably already do this with Zod elsewhere)
    const schema = z.object({
      patientId: z.uuid().optional(),
      appointmentDate: z.string().min(1),
      appointmentTime: z.string().min(1).optional().nullable(),
      tokenNo: z.number().int().positive().optional(),
      appointmentType: z.string().optional(),
      appointmentNotes: z.string().optional().nullable(),
      doctorId: z.uuid(),
      clinicServiceId: z.uuid().optional(),
      paymentMode: z.string().optional(),
      paymentStatus: z.string().optional(),
      price: z.string().optional(),
      primaryServicePrice: z.string().optional(),
      paymentNotes: z.string().optional(),
      appointmentDurationMinutes: z.string().optional(),
      bookingSource: z
        .enum(['mobile_app', 'web_portal', 'phone_call', 'walk_in', 'system'])
        .optional(),
    });
    schema.parse(payload);
    if (!payload.doctorId || !payload.patientId) {
      throw new HttpError(400, 'DoctorId and PatientId required');
    }

    const queryUserIds = [payload.doctorId, payload.patientId];
    if (performerUserId) {
      queryUserIds.push(performerUserId);
    }

    const users = await database
      .select({
        id: UserModel.id,
        status: UserModel.userStatus,
        userType: UserModel.userType,
      })
      .from(UserModel)
      .where(inArray(UserModel.id, queryUserIds));

    const doctor = users.find((u) => u.id === payload.doctorId);
    const patient = users.find((u) => u.id === payload.patientId);
    const performer = performerUserId
      ? users.find((u) => u.id === performerUserId)
      : null;

    // Deduce booking source based on who created the appointment
    let deducedBookingSource:
      'mobile_app' | 'web_portal' | 'phone_call' | 'walk_in' | 'system' =
      'walk_in';
    if (payload.bookingSource) {
      deducedBookingSource = payload.bookingSource as any;
    } else if (performer) {
      const userType = performer.userType;
      if (userType === 'Patient') {
        deducedBookingSource = 'mobile_app';
      } else if (
        ['Receptionist', 'Admin', 'Super_Admin', 'Doctor'].includes(userType)
      ) {
        deducedBookingSource = 'walk_in';
      } else {
        deducedBookingSource = 'system';
      }
    } else {
      deducedBookingSource = 'system';
    }

    // Validate both users exist and are in a valid state
    const validateUser = (
      user: (typeof users)[0] | undefined,
      role: string
    ) => {
      if (!user) throw new HttpError(404, `${role} not found`);
      if (user.status === 'Inactive')
        throw new HttpError(400, `${role} account is inactive`);
      if (user.status === 'Blocked')
        throw new HttpError(403, `${role} account is blocked`);
    };

    validateUser(doctor, 'Doctor');
    validateUser(patient, 'Patient');

    return await database.transaction(async (trx) => {
      const {
        patientId,
        appointmentDate,
        appointmentTime,
        tokenNo,
        commonSymptoms,
        clinicSymptomIds,
        bookingSource,
        ...rest
      } = payload;

      // Auto-link patient to clinic if not already linked
      await trx
        .insert(ClinicAssignModel)
        .values({ userId: patientId!, clinicId })
        .onConflictDoUpdate({
          target: [ClinicAssignModel.userId, ClinicAssignModel.clinicId],
          set: { updatedAt: new Date() },
        });

      const now = new Date();
      const apptDateObj = new Date(appointmentDate);

      if (Number.isNaN(apptDateObj.getTime())) {
        throw new HttpError(400, 'Invalid appointmentDate');
      }

      // Serialize concurrent bookings for this doctor + date using a Postgres transaction advisory lock
      const dateOnlyStr = apptDateObj.toISOString().split('T')[0];
      const key1 = hashStringToInt32(payload.doctorId);
      const key2 = hashStringToInt32(dateOnlyStr);
      await trx.execute(sql`SELECT pg_advisory_xact_lock(${key1}, ${key2})`);

      const todayAtMidnight = new Date(now);
      todayAtMidnight.setHours(0, 0, 0, 0);

      // Compare dates (not times)
      if (apptDateObj.getTime() < todayAtMidnight.getTime()) {
        throw new HttpError(400, 'Appointment date cannot be in the past');
      }

      const dayName = getDayNameFromDate(apptDateObj); // e.g., "Monday"

      // find clinic availability for that day
      const [availability] = await trx
        .select()
        .from(ClinicAvailability)
        .where(
          and(
            eq(ClinicAvailability.clinicId, clinicId),
            eq(ClinicAvailability.doctorId, payload.doctorId),
            // case-insensitive day match: compare lower(...)
            sql`lower(${ClinicAvailability.dayOfWeek}) = ${dayName.toLowerCase()}`
          )
        );

      if (!availability || availability.isAvailable === false) {
        throw new HttpError(400, `Clinic is not available on ${dayName}`);
      }

      // Validate clinicServiceId exists before proceeding
      if (payload.clinicServiceId) {
        const [service] = await trx
          .select()
          .from(ClinicServiceModel)
          .where(eq(ClinicServiceModel.id, payload.clinicServiceId));
        if (!service) {
          throw new HttpError(400, 'Clinic service not found');
        }
      }

      // Token-based booking mode (max patients/day)
      const maxTokens =
        typeof (availability as any).noOfPatients === 'number'
          ? Number((availability as any).noOfPatients)
          : null;

      const isTokenMode = maxTokens !== null && maxTokens > 0;

      // Normalize appointmentDate to "date only" boundaries for token conflicts
      const dateOnly = new Date(apptDateObj);
      dateOnly.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);

      const finalAppointmentTime: string | null | undefined = appointmentTime;
      let finalTokenNo: number | null | undefined = tokenNo ?? undefined;

      if (!payload.paymentMode) {
        rest.paymentStatus = 'Already Paid';
      }

      if (payload.paymentMode == 'Pay Later') {
        rest.paymentStatus = 'Pending';
      }

      if (payload.paymentMode === 'Not Required') {
        rest.paymentStatus = 'Free Consultation';
      }

      if (isTokenMode) {
        // Find booked tokens on that date
        const apptStatuses = [
          'Upcoming',
          'Confirmed',
          'Patient Arrived',
          'Pending',
          'Rescheduled',
          'Completed',
        ] as const;
        const booked = await trx
          .select({
            tokenNo: AppointmentModel.tokenNo,
          })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.clinicId, clinicId),
              eq(AppointmentModel.doctorId, payload.doctorId),
              gte(AppointmentModel.appointmentDate, dateOnly),
              lt(AppointmentModel.appointmentDate, nextDay),
              inArray(AppointmentModel.appointmentStatus, apptStatuses)
            )
          );

        const bookedSet = new Set(
          booked.map((b) => Number(b.tokenNo)).filter((n) => Number.isFinite(n))
        );

        // If tokenNo not provided, auto-assign from highest booked token
        if (!finalTokenNo) {
          // Find the highest booked token number
          const bookedTokens = Array.from(bookedSet).sort((a, b) => a - b);
          const highestBooked =
            bookedTokens.length > 0 ? Math.max(...bookedTokens) : 0;

          // Start looking from (highestBooked + 1) to maxTokens
          for (let t = highestBooked + 1; t <= maxTokens; t++) {
            if (!bookedSet.has(t)) {
              finalTokenNo = t;
              break;
            }
          }
        }

        if (!finalTokenNo) {
          throw new HttpError(400, 'No tokens available for this date');
        }
        if (finalTokenNo < 1 || finalTokenNo > maxTokens) {
          throw new HttpError(
            400,
            `tokenNo must be between 1 and ${maxTokens}`
          );
        }
        if (bookedSet.has(finalTokenNo)) {
          throw new HttpError(400, `Token ${finalTokenNo} is already booked`);
        }

        // In token mode, appointmentTime is not required
        // finalAppointmentTime = null;
      } else {
        // Time-slot based booking (existing behavior)
        if (!appointmentTime) {
          throw new HttpError(400, 'appointmentTime is required');
        }

        // parse times into minutes
        const apptMin = parseTimeToMinutes(appointmentTime);
        if (apptMin === null)
          throw new HttpError(400, 'Invalid appointmentTime format');

        const startMin = parseTimeToMinutes(availability.startTime) ?? null;
        const endMin = parseTimeToMinutes(availability.endTime) ?? null;

        // Check for date-specific availability
        const dateOnlyForCheck = new Date(apptDateObj);
        dateOnlyForCheck.setHours(0, 0, 0, 0);
        const nextDayForCheck = new Date(dateOnlyForCheck);
        nextDayForCheck.setDate(nextDayForCheck.getDate() + 1);

        // Fetch date-specific availability and breaks in parallel
        const [dateAvailabilityResult, breaks] = await Promise.all([
          trx
            .select()
            .from(ClinicDateAvailability)
            .where(
              and(
                eq(ClinicDateAvailability.clinicId, clinicId),
                eq(ClinicDateAvailability.doctorId, payload.doctorId),
                gte(ClinicDateAvailability.date, dateOnlyForCheck),
                lt(ClinicDateAvailability.date, nextDayForCheck)
              )
            ),
          trx
            .select()
            .from(ClinicAvailabilityBreak)
            .where(
              and(
                eq(ClinicAvailabilityBreak.status, false),
                eq(
                  ClinicAvailabilityBreak.clinicAvailabilityId,
                  availability.id
                )
              )
            ),
        ]);

        const [dateAvailability] = dateAvailabilityResult;

        let isValidTime = false;
        let useDateSpecificSlots = false;
        // let dateSpecificStartMin = null;
        // let dateSpecificEndMin = null;

        if (dateAvailability && dateAvailability.isAvailable) {
          // Check date-specific time slots
          const dateTimeSlots = await trx
            .select()
            .from(ClinicDateAvailabilityTimeSlots)
            .where(
              and(
                eq(
                  ClinicDateAvailabilityTimeSlots.clinicDateAvailabilityId,
                  dateAvailability.id
                ),
                eq(ClinicDateAvailabilityTimeSlots.isAvailable, true)
              )
            );

          if (dateTimeSlots.length > 0) {
            useDateSpecificSlots = true;
          }

          for (const slot of dateTimeSlots) {
            const slotStartMin = parseTimeToMinutes(slot.startTime);
            const slotEndMin = parseTimeToMinutes(slot.endTime);
            if (
              slotStartMin !== null &&
              slotEndMin !== null &&
              apptMin >= slotStartMin &&
              apptMin < slotEndMin
            ) {
              isValidTime = true;
              // dateSpecificStartMin = slotStartMin;
              // dateSpecificEndMin = slotEndMin;
              break;
            }
          }

          if (!isValidTime && dateTimeSlots.length > 0) {
            throw new HttpError(
              400,
              `Appointment time ${appointmentTime} is outside available time slots for this date`
            );
          }
        }

        // If no date-specific slots found or no valid time in date-specific slots, use weekly availability
        if (!useDateSpecificSlots || !isValidTime) {
          if (startMin !== null && endMin !== null) {
            if (!(apptMin >= startMin && apptMin < endMin)) {
              throw new HttpError(
                400,
                `Appointment time ${appointmentTime} is outside clinic availability (${availability.startTime} - ${availability.endTime})`
              );
            }
          }
        }

        // Only validate breaks, duration, and overlaps for weekly schedule (not for date-specific slots)
        if (!useDateSpecificSlots) {
          // breaks already fetched above in parallel

          for (const b of breaks) {
            const bStart = parseTimeToMinutes(b.startTime);
            const bEnd = parseTimeToMinutes(b.endTime);
            if (bStart !== null && bEnd !== null) {
              // if appointment falls inside a break -> reject
              if (apptMin >= bStart && apptMin < bEnd) {
                throw new HttpError(
                  400,
                  `Appointment time ${appointmentTime} falls during break (${b.breakType}: ${b.startTime} - ${b.endTime})`
                );
              }
            }
          }

          // ── Custom duration validation ──────────────────────────────────────
          const defaultDuration =
            Number((availability as any).slotMinutes) || 30;
          const requestedDuration = payload.appointmentDurationMinutes
            ? Number(payload.appointmentDurationMinutes)
            : defaultDuration;

          if (!Number.isFinite(requestedDuration) || requestedDuration < 1) {
            throw new HttpError(
              400,
              'appointmentDurationMinutes must be a positive number'
            );
          }

          const apptEndMin = apptMin + requestedDuration;

          // Guard: must not extend past availability end
          if (endMin !== null && apptEndMin > endMin) {
            const endHH = Math.floor(apptEndMin / 60)
              .toString()
              .padStart(2, '0');
            const endMM = (apptEndMin % 60).toString().padStart(2, '0');
            throw new HttpError(
              400,
              `Appointment with ${requestedDuration} min duration would end at ${endHH}:${endMM} which is after clinic availability end (${availability.endTime})`
            );
          }

          // Guard: must not extend into any break
          for (const b of breaks) {
            const bStart = parseTimeToMinutes(b.startTime);
            const bEnd = parseTimeToMinutes(b.endTime);
            if (bStart !== null && bEnd !== null) {
              if (apptMin < bEnd && apptEndMin > bStart) {
                throw new HttpError(
                  400,
                  `Appointment duration causes overlap with break (${b.breakType}: ${b.startTime} - ${b.endTime})`
                );
              }
            }
          }

          // Guard: must not overlap another existing time-based appointment on same doctor/clinic/date
          {
            const dayStart = new Date(apptDateObj);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const existingAppts = await trx
              .select({
                id: AppointmentModel.id,
                appointmentTime: AppointmentModel.appointmentTime,
                appointmentDurationMinutes:
                  AppointmentModel.appointmentDurationMinutes,
              })
              .from(AppointmentModel)
              .where(
                and(
                  eq(AppointmentModel.clinicId, clinicId),
                  eq(AppointmentModel.doctorId, payload.doctorId),
                  gte(AppointmentModel.appointmentDate, dayStart),
                  lt(AppointmentModel.appointmentDate, dayEnd),
                  inArray(AppointmentModel.appointmentStatus, [
                    'Upcoming',
                    'Confirmed',
                    'Patient Arrived',
                    'Pending',
                    'Rescheduled',
                    'Completed',
                  ])
                )
              );

            for (const ea of existingAppts) {
              const eaStart = parseTimeToMinutes(ea.appointmentTime ?? '');
              if (eaStart == null) continue;
              const eaDur = Math.max(
                1,
                Number(ea.appointmentDurationMinutes) || defaultDuration
              );
              const eaEnd = eaStart + eaDur;
              if (apptMin < eaEnd && apptEndMin > eaStart) {
                throw new HttpError(
                  400,
                  `Appointment time overlaps with an existing appointment (${ea.appointmentTime})`
                );
              }
            }
          }
          // ── End custom duration validation ──────────────────────────────────

          // Store the validated (possibly custom) duration back into rest so the
          // insert picks it up correctly.
          rest.appointmentDurationMinutes = String(requestedDuration);
        }
      }

      // ── COMMON: Check for existing appointment for same patient on same date ──
      const dayStart = new Date(apptDateObj);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [existingPatientAppt] = await trx
        .select({ id: AppointmentModel.id })
        .from(AppointmentModel)
        .where(
          and(
            eq(AppointmentModel.clinicId, clinicId),
            eq(AppointmentModel.patientId, patientId ?? userId),
            gte(AppointmentModel.appointmentDate, dayStart),
            lt(AppointmentModel.appointmentDate, dayEnd),
            inArray(AppointmentModel.appointmentStatus, [
              'Upcoming',
              'Confirmed',
              'Patient Arrived',
              'Pending',
              'Rescheduled',
              'Completed',
            ])
          )
        );

      if (existingPatientAppt) {
        throw new HttpError(
          409,
          'Patient already has an appointment on this date.'
        );
      }

      // ── COMMON: Insert appointment (works for both token and time-slot modes) ──
      // Separate payment and clinical fields from core appointment data
      const restAny: any = { ...rest };
      const _paymentMode = restAny.paymentMode ?? null;
      const _paymentStatus = restAny.paymentStatus ?? 'Paid';
      const _price = restAny.price ?? null;
      const _primarySvcPrice = restAny.primaryServicePrice ?? null;
      const _paymentNotes = restAny.paymentNotes ?? null;
      const _appointmentNotes = restAny.appointmentNotes ?? null;
      // Remove payment/clinical fields to get only core appointment fields
      delete restAny.paymentMode;
      delete restAny.paymentStatus;
      delete restAny.price;
      delete restAny.primaryServicePrice;
      delete restAny.paymentNotes;
      delete restAny.appointmentNotes;
      delete restAny.bookingSource;
      const coreRest = restAny;

      const { ClinicCancellationPolicyModel } =
        await import('../../cancellation-policy/models/cancellationPolicy.model');
      const [activePolicy] = await trx
        .select({ id: ClinicCancellationPolicyModel.id })
        .from(ClinicCancellationPolicyModel)
        .where(
          and(
            eq(ClinicCancellationPolicyModel.clinicId, clinicId),
            eq(ClinicCancellationPolicyModel.isActive, true)
          )
        )
        .limit(1);

      const [appointment] = await trx
        .insert(AppointmentModel)
        .values({
          patientId: patientId ?? userId,
          clinicId,
          appointmentDate: apptDateObj,
          appointmentTime: finalAppointmentTime ?? null,
          tokenNo: finalTokenNo ?? null,
          clinicCancellationPolicyId: activePolicy?.id || null,
          bookingSource: bookingSource ?? deducedBookingSource,
          ...coreRest,
          appointmentStatus: 'Pending',
        })
        .returning();

      if (!appointment) {
        throw new HttpError(
          500,
          'Failed to create appointment. Please try again.'
        );
      }

      // Insert payment data into separate table
      await trx.insert(AppointmentPaymentModel).values({
        appointmentId: appointment.id,
        paymentMode:
          _paymentMode === 'razorpay' ? 'Online' : (_paymentMode ?? null),
        paymentStatus: _paymentStatus ?? 'Paid',
        price: _price ?? null,
        primaryServicePrice: _primarySvcPrice ?? _price ?? null,
        paymentNotes: _paymentNotes ?? null,
      });

      // Insert clinical data into separate table
      await trx.insert(AppointmentClinicalModel).values({
        appointmentId: appointment.id,
        commonSymptoms: commonSymptoms ?? [],
        clinicSymptomIds: clinicSymptomIds ?? [],
        appointmentNotes: _appointmentNotes ?? null,
      });
      // ===============================
      // 🔥 SUBSCRIPTION HANDLING START
      // ===============================

      if (payload.clinicServiceId) {
        const patientFinalId = patientId ?? userId;

        // 1️⃣ Check existing active subscription
        const [existingSubscription] = await trx
          .select()
          .from(ClinicAppointmentPlainModel)
          .where(
            and(
              eq(ClinicAppointmentPlainModel.patientId, patientFinalId),
              eq(ClinicAppointmentPlainModel.doctorId, payload.doctorId),
              eq(
                ClinicAppointmentPlainModel.doctorSubscriptionId,
                payload.clinicServiceId
              ),
              eq(ClinicAppointmentPlainModel.status, 'active'),
              gte(ClinicAppointmentPlainModel.expireAt, apptDateObj)
            )
          );

        // 2️⃣ If no active subscription → create one
        if (!existingSubscription) {
          const [service] = await trx
            .select()
            .from(ClinicServiceModel)
            .where(eq(ClinicServiceModel.id, payload.clinicServiceId));

          if (!service) {
            throw new HttpError(400, 'Clinic service not found');
          }

          const expireDate = new Date(apptDateObj);
          const durationDays = Number(service.durationDays ?? 0);
          if (Number.isFinite(durationDays) && durationDays > 0) {
            expireDate.setDate(expireDate.getDate() + durationDays);
          }
          const rawPaymentMode = payload.paymentMode?.toLowerCase();
          const paymentMode =
            rawPaymentMode === 'cash' ||
            rawPaymentMode === 'upi' ||
            rawPaymentMode === 'card' ||
            rawPaymentMode === 'insurance'
              ? rawPaymentMode
              : 'cash';

          await trx.insert(ClinicAppointmentPlainModel).values({
            doctorId: payload.doctorId,
            patientId: patientFinalId,
            clinicId,
            doctorSubscriptionId: payload.clinicServiceId,
            expireAt: expireDate,
            amount: String(service.price ?? 0),
            paymentStatus: 'paid',
            paymentMode,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // ===============================
      // 🔥 SUBSCRIPTION HANDLING END
      // ===============================

      // Schedule notifications AFTER transaction commits (non-blocking)
      // Store data needed for notifications
      // const notificationData = {
      //   appointmentId: appointment.id,
      //   patientId: appointment.patientId,
      //   clinicId,
      //   appointmentDate: appointment.appointmentDate,
      //   appointmentTime: appointment.appointmentTime,
      //   tokenNo: finalTokenNo ?? null,
      // };

      if (envConfig.ENABLE_NOTIFICATIONS !== 'false') {
        // Fire-and-forget: schedule reminders without blocking the transaction
        const patientMobile = (
          await trx
            .select({ mobile: UserModel.mobile })
            .from(UserModel)
            .where(eq(UserModel.id, appointment.patientId))
        )?.[0]?.mobile;

        const clinicName = (
          await trx
            .select({ clinicName: ClinicModel.clinicName })
            .from(ClinicModel)
            .where(eq(ClinicModel.id, clinicId))
        )?.[0]?.clinicName;

        if (patientMobile && appointment.appointmentTime && clinicName) {
          const [hours, minutes] = appointment.appointmentTime
            .split(':')
            .map(Number);
          const appointmentDateTime = new Date(appointment.appointmentDate);
          appointmentDateTime.setHours(hours, minutes, 0, 0);

          // Non-blocking: don't await queue operations
          Promise.allSettled([
            smsReminderQueue.scheduleSMSReminders(
              appointment.id,
              patientMobile,
              clinicId,
              clinicName,
              appointmentDateTime,
              finalTokenNo ?? null
            ),
            whatsAppReminderQueue.scheduleWhatsAppReminders(
              appointment.id,
              patientMobile,
              clinicId,
              clinicName,
              appointmentDateTime,
              finalTokenNo ?? null
            ),
            autoNoShowQueue.scheduleAutoNoShow(
              appointment.id,
              clinicId,
              appointmentDateTime
            ),
          ]).catch((err) => {
            logger.error('Failed to schedule notification reminders', err);
          });
        }
      }

      // Update symptom counts
      if (clinicSymptomIds && clinicSymptomIds.length > 0) {
        const dateStr = apptDateObj.toISOString().split('T')[0];
        for (const symptomId of clinicSymptomIds) {
          await trx
            .insert(ClinicSymptomCountModel)
            .values({
              symptomId,
              date: dateStr,
              count: 1,
            })
            .onConflictDoUpdate({
              target: [
                ClinicSymptomCountModel.symptomId,
                ClinicSymptomCountModel.date,
              ],
              set: {
                count: sql`${ClinicSymptomCountModel.count} + 1`,
              },
            });
        }
      }

      // Get performer details
      const performer = await getUserById(performerUserId || userId);
      const patientInfo = await getUserById(appointment.patientId);

      if (performer && patientInfo && payload.paymentMode !== 'razorpay') {
        // Fire-and-forget notification
        notifyAppointmentCreated(
          clinicId,
          appointment.id,
          performer.id,
          patientInfo.name,
          performer.name,
          performer.userType,
          coreRest.doctorId, // ✅ assigned doctor only
          appointment.patientId // Patient ID
        ).catch((err) => {
          logger.error('Failed to send appointment created notification', err);
        });
      }

      // 🔴 Real-time broadcast to clinic room (auto-update on doctor/reception screens)
      broadcastAppointmentChange({
        appointmentId: appointment.id,
        clinicId,
        doctorId: coreRest.doctorId,
        patientId: appointment.patientId,
        action: 'created',
        performerUserId: performerUserId || userId,
      });

      setTimeout(async () => {
        try {
          if (payload.paymentMode == 'Pay Later') {
            await AppointmentActivityHistoryService.logActivity({
              appointmentId: appointment.id,
              action: 'PAYMENT_STATUS',
              performedBy: performerUserId || userId,
              newState: appointment,
              remarks: 'Payment is pending for this appointment',
            });
          } else if (payload.paymentMode) {
            await AppointmentActivityHistoryService.logActivity({
              appointmentId: appointment.id,
              action: 'PAYMENT_STATUS',
              performedBy: performerUserId || userId,
              newState: appointment,
              remarks:
                'Payment received for this appointment by ' +
                payload.paymentMode,
            });
          } else if (payload.paymentMode === 'Not Required') {
            await AppointmentActivityHistoryService.logActivity({
              appointmentId: appointment.id,
              action: 'PAYMENT_STATUS',
              performedBy: performerUserId || userId,
              newState: appointment,
              remarks:
                'Payment not required for this appointment as it is free consultation',
            });
          } else {
            await AppointmentActivityHistoryService.logActivity({
              appointmentId: appointment.id,
              action: 'PAYMENT_STATUS',
              performedBy: performerUserId || userId,
              newState: appointment,
              remarks:
                'Payment not required for this appointment as it is under follow-up period',
            });
          }
        } catch (err) {
          logger.error('Failed to log payment activity in setTimeout', err);
        }
      }, 1);

      // Log activity
      await AppointmentActivityHistoryService.logActivity({
        appointmentId: appointment.id,
        action: 'CREATED',
        performedBy: performerUserId || userId,
        newState: appointment,
        remarks: `Appointment created`,
        tx: trx,
      });

      if (
        envConfig.ENABLE_NOTIFICATIONS !== 'false' &&
        payload.paymentMode !== 'razorpay'
      ) {
        // Fire-and-forget: send immediate notification without blocking
        const patientData = (
          await trx
            .select({ mobile: UserModel.mobile })
            .from(UserModel)
            .where(eq(UserModel.id, appointment.patientId))
        )?.[0];

        const clinicData = (
          await trx
            .select({ clinicName: ClinicModel.clinicName })
            .from(ClinicModel)
            .where(eq(ClinicModel.id, clinicId))
        )?.[0];

        if (
          patientData?.mobile &&
          clinicData?.clinicName &&
          appointment.appointmentTime
        ) {
          AppointmentNotificationService.sendImmediateNotification(
            appointment.id,
            clinicId,
            patientData.mobile,
            clinicData.clinicName,
            appointment.appointmentDate,
            appointment.appointmentTime,
            finalTokenNo ?? null
          ).catch((err) => {
            logger.error('Failed to send immediate notification', err);
          });
        }
      }

      // Invalidate dashboard caches when appointment is created
      const createdApptDate = new Date(appointment.appointmentDate);
      const todayForCache = new Date();
      await redisClient.del(`revenue_overview:${clinicId}:all:week`);
      await redisClient.del(`revenue_overview:${clinicId}:all:month`);
      if (coreRest.doctorId) {
        await redisClient.del(
          `revenue_overview:${clinicId}:doctor:${coreRest.doctorId}:week`
        );
        await redisClient.del(
          `revenue_overview:${clinicId}:doctor:${coreRest.doctorId}:month`
        );
        // Invalidate today overview only if appointment is for today
        if (
          createdApptDate.getUTCFullYear() === todayForCache.getUTCFullYear() &&
          createdApptDate.getUTCMonth() === todayForCache.getUTCMonth() &&
          createdApptDate.getUTCDate() === todayForCache.getUTCDate()
        ) {
          await redisClient.del(
            `today_overview:${clinicId}:doctor:${coreRest.doctorId}`
          );
        }
      }

      // Schedule running-late delayed job + populate queue cache (fire-and-forget)
      if (coreRest.doctorId && appointment.appointmentTime) {
        // Schedule BullMQ job that fires at (appointmentTime + threshold)
        import('../../appointment-engine/services/runningLateQueue.service')
          .then(({ runningLateQueue }) =>
            runningLateQueue.scheduleCheck(
              appointment.id,
              clinicId,
              coreRest.doctorId!,
              appointment.appointmentDate,
              appointment.appointmentTime!
            )
          )
          .catch(() => {});

        // Populate delay cache + broadcast queue update if appointment is for today
        if (
          createdApptDate.getUTCFullYear() === todayForCache.getUTCFullYear() &&
          createdApptDate.getUTCMonth() === todayForCache.getUTCMonth() &&
          createdApptDate.getUTCDate() === todayForCache.getUTCDate()
        ) {
          import('../../appointment-engine/services/delayTracker.service')
            .then(async ({ DelayTrackerService }) => {
              const tracker = new DelayTrackerService();
              const dateStr = createdApptDate.toISOString().split('T')[0];
              const queueData = await tracker.recalculate(
                clinicId,
                coreRest.doctorId!,
                dateStr
              );

              // Broadcast updated queue to dashboard so it reflects the new appointment
              const { QueueBroadcastService } =
                await import('../../appointment-engine/services/queueBroadcast.service');
              const broadcaster = new QueueBroadcastService();
              broadcaster.emitQueueUpdated(clinicId, queueData);
              await broadcaster.emitPatientUpdated(queueData);
            })
            .catch(() => {});
        }
      }

      return appointment;
    });
  }

  // update appointment
  static async updateAppointment(
    appointmentId: string,
    payload: UpdateAppointmentDto,
    performerUserId?: string,
    performerUserType?: string
  ) {
    // Validate payload shape
    try {
      updateAppointmentSchema.parse(payload);
    } catch (err) {
      if (err instanceof z.ZodError) throw err;
      throw err;
    }

    // Capture previous status for appointment engine hook
    let previousAppointmentStatus: string | null = null;

    const updated = await database.transaction(async (trx) => {
      // 1) Fetch existing appointment
      const [existing] = await trx
        .select()
        .from(AppointmentModel)
        .where(eq(AppointmentModel.id, appointmentId));
      if (!existing || !existing.doctorId) {
        throw new HttpError(400, 'Appointment not found');
      }

      // If appointment status is updating to Cancelled, run policy checks
      if (payload.appointmentStatus === 'Cancelled') {
        const { PolicyEvaluationService } =
          await import('../../cancellation-policy/services/policyEvaluation.service');
        await PolicyEvaluationService.evaluateCancellation(
          appointmentId,
          performerUserId || 'system',
          performerUserType || 'System',
          {
            reasonCode: payload.reReasonForCancellation || 'other',
            comments:
              payload.reason || payload.reReasonForCancellation || undefined,
          }
        );
      }

      // Capture previous status for appointment engine orchestrator
      previousAppointmentStatus = existing.appointmentStatus;

      // Fetch existing payment record for comparison
      const [existingPaymentRecord] = await trx
        .select()
        .from(AppointmentPaymentModel)
        .where(eq(AppointmentPaymentModel.appointmentId, appointmentId));

      // Create a combined existing object for backward-compatible comparisons
      const existingWithPayment = {
        ...existing,
        paymentStatus: existingPaymentRecord?.paymentStatus ?? null,
        paymentMode: existingPaymentRecord?.paymentMode ?? null,
      };

      // Optional: check permission (patient or clinic admin etc.)
      // if (existing.patientId !== userId) throw new HttpError(400,"Not allowed to update this appointment");

      // 2) Determine new date/time values (fall back to existing if not provided)
      const newDate = payload.appointmentDate
        ? new Date(payload.appointmentDate)
        : new Date(existing.appointmentDate);
      if (Number.isNaN(newDate.getTime())) {
        throw new HttpError(400, 'Invalid appointmentDate');
      }
      const now = new Date();

      // Compare — reject past dates
      // if (newDate.getTime() < now.getTime()) {
      //   throw new HttpError(400, 'Appointment date cannot be in the past');
      // }

      const todayAtMidnight = new Date(now);
      todayAtMidnight.setHours(0, 0, 0, 0);

      // Compare dates (not times)
      // if (newDate.getTime() < todayAtMidnight.getTime()) {
      //   throw new HttpError(400, 'Appointment date cannot be in the past');
      // }

      const newTime =
        typeof payload.appointmentTime !== 'undefined'
          ? payload.appointmentTime
          : existing.appointmentTime;

      const isTimeBasedUpdate =
        typeof newTime === 'string' && newTime.length > 0;

      // 3) Check clinic availability for the day
      const dayName = getDayNameFromDate(newDate);

      const [availability] = await trx
        .select()
        .from(ClinicAvailability)
        .where(
          and(
            eq(ClinicAvailability.clinicId, existing.clinicId),
            eq(ClinicAvailability.doctorId, existing.doctorId),
            sql`lower(${ClinicAvailability.dayOfWeek}) = ${dayName.toLowerCase()}`
          )
        );

      if (!availability || availability.isAvailable === false) {
        throw new HttpError(400, `Clinic is not available on ${dayName}`);
      }

      const isTokenBasedAppointment =
        existing.tokenNo !== null || payload.tokenNo;

      if (isTimeBasedUpdate && !isTokenBasedAppointment) {
        // If refundMode is present, skip clinic availability check (this is a refund update)
        if (payload.refundMode) {
          // Skip all clinic availability validations for refunds
          // Just continue with the update
        } else {
          // Parse minutes and check within availability start/end
          const apptMin = parseTimeToMinutes(newTime as string);
          if (apptMin === null) {
            throw new HttpError(400, 'Invalid appointmentTime format');
          }

          // const startMin = parseTimeToMinutes(availability.startTime);
          // const endMin = parseTimeToMinutes(availability.endTime);

          // if (startMin !== null && endMin !== null) {
          //   if (!(apptMin >= startMin && apptMin < endMin)) {
          //     throw new HttpError(
          //       400,
          //       `Appointment time ${newTime} is outside clinic availability (${availability.startTime} - ${availability.endTime})`
          //     );
          //   }
          // }

          // Check breaks — appointment must not fall inside any break
          const breaks = await trx
            .select()
            .from(ClinicAvailabilityBreak)
            .where(
              and(
                eq(ClinicAvailabilityBreak.status, false),
                eq(
                  ClinicAvailabilityBreak.clinicAvailabilityId,
                  availability.id
                )
              )
            );

          for (const b of breaks) {
            const bStart = parseTimeToMinutes(b.startTime);
            const bEnd = parseTimeToMinutes(b.endTime);
            if (bStart !== null && bEnd !== null) {
              if (apptMin >= bStart && apptMin < bEnd) {
                throw new HttpError(
                  400,
                  `Appointment time ${newTime} falls during break (${b.breakType}: ${b.startTime} - ${b.endTime})`
                );
              }
            }
          }

          // Conflict check: ensure there isn't another appointment at same clinic/date/time
          const [conflict] = await trx
            .select()
            .from(AppointmentModel)
            .where(
              and(
                eq(AppointmentModel.clinicId, existing.clinicId),
                eq(AppointmentModel.doctorId, existing.doctorId),
                ne(AppointmentModel.appointmentStatus, 'Cancelled'),
                eq(
                  AppointmentModel.appointmentDate,
                  new Date(newDate.toDateString())
                ),
                eq(AppointmentModel.appointmentTime, newTime as string),
                // exclude the appointment being updated
                sql`${AppointmentModel.id} <> ${appointmentId}`
              )
            );

          if (conflict) {
            throw new HttpError(
              400,
              'This doctor already has an appointment at the selected date and time'
            );
          }
        }
      }

      if (
        payload.paymentStatus &&
        payload.paymentStatus.toLowerCase() === 'refunded' &&
        existing.clinicServiceId
      ) {
        await trx
          .update(ClinicAppointmentPlainModel)
          .set({
            paymentStatus: 'refunded',
            status: 'inactive', // optional but recommended
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(ClinicAppointmentPlainModel.patientId, existing.patientId),
              eq(ClinicAppointmentPlainModel.doctorId, existing.doctorId),
              eq(
                ClinicAppointmentPlainModel.doctorSubscriptionId,
                existing.clinicServiceId
              ),
              eq(ClinicAppointmentPlainModel.status, 'active')
            )
          );
      }
      // / / 7) Build update payload (only provided fields)
      const setObj: Record<string, any> = {};
      const paymentSetObj: Record<string, any> = {};
      const clinicalSetObj: Record<string, any> = {};

      if (payload.appointmentDate) setObj.appointmentDate = newDate;
      if (typeof payload.appointmentTime !== 'undefined')
        setObj.appointmentTime = newTime;
      if (payload.appointmentType)
        setObj.appointmentType = payload.appointmentType;

      if (typeof payload.appointmentStatus !== 'undefined')
        setObj.appointmentStatus = payload.appointmentStatus;

      if (payload.appointmentDurationMinutes)
        setObj.appointmentDurationMinutes = payload.appointmentDurationMinutes;

      // Payment fields → AppointmentPaymentModel
      if (payload.paymentMode) {
        paymentSetObj.paymentMode =
          payload.paymentMode === 'razorpay' ? 'Online' : payload.paymentMode;
      }
      if (payload.paymentStatus)
        paymentSetObj.paymentStatus = payload.paymentStatus;
      if (payload.price) paymentSetObj.price = payload.price;
      if (payload.paymentNotes)
        paymentSetObj.paymentNotes = payload.paymentNotes;
      if (payload.refundMode) paymentSetObj.refundMode = payload.refundMode;
      if (payload.refundedAmount)
        paymentSetObj.refundedAmount = payload.refundedAmount;
      if (payload.refundNotes) paymentSetObj.refundNotes = payload.refundNotes;

      // Clinical fields → AppointmentClinicalModel
      if (typeof payload.appointmentNotes !== 'undefined')
        clinicalSetObj.appointmentNotes = payload.appointmentNotes;
      if (payload.consentNotes)
        clinicalSetObj.consentNotes = payload.consentNotes;
      if (payload.clinicSymptomIds)
        clinicalSetObj.clinicSymptomIds = payload.clinicSymptomIds;
      if (payload.vitals) clinicalSetObj.vitals = payload.vitals;
      if (payload.referrals) clinicalSetObj.referrals = payload.referrals;

      // Core appointment fields
      if (payload.bookingSource) setObj.bookingSource = payload.bookingSource;

      if (payload.reReasonForCancellation)
        setObj.reReasonForCancellation = payload.reReasonForCancellation;

      if (payload.reasionForReSchedule)
        setObj.reasionForReSchedule = payload.reasionForReSchedule;

      if (typeof payload.tokenNo !== 'undefined')
        setObj.tokenNo = payload.tokenNo;

      // Update core appointment
      setObj.updatedAt = new Date();

      const [updated] = await trx
        .update(AppointmentModel)
        .set(setObj)
        .where(eq(AppointmentModel.id, appointmentId))
        .returning();

      if (!updated) throw new HttpError(400, 'Failed to update appointment');

      // Update payment table if there are payment changes
      if (Object.keys(paymentSetObj).length > 0) {
        paymentSetObj.updatedAt = new Date();
        const [existingPayment] = await trx
          .select()
          .from(AppointmentPaymentModel)
          .where(eq(AppointmentPaymentModel.appointmentId, appointmentId));

        if (existingPayment) {
          await trx
            .update(AppointmentPaymentModel)
            .set(paymentSetObj)
            .where(eq(AppointmentPaymentModel.appointmentId, appointmentId));
        } else {
          await trx.insert(AppointmentPaymentModel).values({
            appointmentId,
            ...paymentSetObj,
          });
        }
      }

      // Update clinical table if there are clinical changes
      if (Object.keys(clinicalSetObj).length > 0) {
        clinicalSetObj.updatedAt = new Date();
        const [existingClinical] = await trx
          .select()
          .from(AppointmentClinicalModel)
          .where(eq(AppointmentClinicalModel.appointmentId, appointmentId));

        if (existingClinical) {
          await trx
            .update(AppointmentClinicalModel)
            .set(clinicalSetObj)
            .where(eq(AppointmentClinicalModel.appointmentId, appointmentId));
        } else {
          await trx.insert(AppointmentClinicalModel).values({
            appointmentId,
            ...clinicalSetObj,
          });
        }
      }

      // NEW: Reschedule reminders if appointment date/time changed
      const dateChanged =
        payload.appointmentDate &&
        new Date(payload.appointmentDate).toDateString() !==
          new Date(existing.appointmentDate).toDateString();

      const timeChanged =
        payload.appointmentTime &&
        payload.appointmentTime !== existing.appointmentTime;

      if (envConfig.ENABLE_NOTIFICATIONS !== 'false') {
        if ((dateChanged || timeChanged) && updated.appointmentTime) {
          const [hours, minutes] = updated.appointmentTime
            .split(':')
            .map(Number);
          const appointmentDateTime = new Date(updated.appointmentDate);
          appointmentDateTime.setHours(hours, minutes, 0, 0);

          const [clinic_name] = await trx
            .select({ clinicName: ClinicModel.clinicName })
            .from(ClinicModel)
            .where(eq(ClinicModel.id, existing.clinicId));

          const [patient] = await trx
            .select({ mobile: UserModel.mobile })
            .from(UserModel)
            .where(eq(UserModel.id, updated.patientId));

          if (appointmentDateTime > now && patient?.mobile) {
            await smsReminderQueue.removeSMSReminders(
              appointmentId,
              existing.clinicId
            );
            await whatsAppReminderQueue.removeWhatsAppReminders(
              appointmentId,
              existing.clinicId
            );

            // Schedule SMS reminders if enabled
            await smsReminderQueue.scheduleSMSReminders(
              updated.id,
              patient.mobile,
              existing.clinicId,
              clinic_name.clinicName,
              appointmentDateTime,
              null
            );

            // Schedule WhatsApp reminders if enabled
            await whatsAppReminderQueue.scheduleWhatsAppReminders(
              updated.id,
              patient.mobile,
              existing.clinicId,
              clinic_name.clinicName,
              appointmentDateTime,
              null
            );

            // Reschedule Auto No Show
            await autoNoShowQueue.removeAutoNoShow(appointmentId);
            await autoNoShowQueue.scheduleAutoNoShow(
              updated.id,
              existing.clinicId,
              appointmentDateTime
            );

            // Reschedule running-late check
            if (updated.doctorId && updated.appointmentTime) {
              import('../../appointment-engine/services/runningLateQueue.service')
                .then(({ runningLateQueue }) => {
                  runningLateQueue.cancelCheck(appointmentId);
                  return runningLateQueue.scheduleCheck(
                    updated.id,
                    existing.clinicId,
                    updated.doctorId!,
                    updated.appointmentDate,
                    updated.appointmentTime!
                  );
                })
                .catch(() => {});

              // Recalculate and broadcast queue if rescheduled appointment is for today
              const rescheduledDate = new Date(updated.appointmentDate);
              const todayDate = new Date();
              if (
                rescheduledDate.getUTCFullYear() ===
                  todayDate.getUTCFullYear() &&
                rescheduledDate.getUTCMonth() === todayDate.getUTCMonth() &&
                rescheduledDate.getUTCDate() === todayDate.getUTCDate()
              ) {
                import('../../appointment-engine/services/delayTracker.service')
                  .then(async ({ DelayTrackerService }) => {
                    const tracker = new DelayTrackerService();
                    const dateStr = rescheduledDate.toISOString().split('T')[0];
                    const queueData = await tracker.recalculate(
                      existing.clinicId,
                      updated.doctorId!,
                      dateStr
                    );
                    const { QueueBroadcastService } =
                      await import('../../appointment-engine/services/queueBroadcast.service');
                    const broadcaster = new QueueBroadcastService();
                    broadcaster.emitQueueUpdated(existing.clinicId, queueData);
                    await broadcaster.emitPatientUpdated(queueData);
                  })
                  .catch(() => {});
              }
            }
          }
        } else if (
          payload.appointmentStatus === 'Cancelled' ||
          payload.appointmentStatus === 'Completed' ||
          payload.appointmentStatus === 'NoShow'
        ) {
          // Remove auto no show if appointment is finished or cancelled
          await autoNoShowQueue.removeAutoNoShow(appointmentId);

          // Cancel running-late check for this appointment
          import('../../appointment-engine/services/runningLateQueue.service')
            .then(({ runningLateQueue }) =>
              runningLateQueue.cancelCheck(appointmentId)
            )
            .catch(() => {});
        }
      }

      // Log activity
      const actions: Array<
        | 'UPDATED'
        | 'CONFIRMED'
        | 'STATUS_CHANGED'
        | 'RESCHEDULED'
        | 'PATIENT_ARRIVED'
        | 'CANCELLED'
        | 'COMPLETED'
        | 'PAYMENT_STATUS'
        | 'VITALS_UPDATED'
      > = [];
      let remarks = 'Appointment updated';
      if (
        payload.appointmentStatus &&
        payload.appointmentStatus !== existing.appointmentStatus
      ) {
        if (payload.appointmentStatus === 'Cancelled') {
          actions.push('CANCELLED');
          remarks = `Appointment cancelled: ${payload.reReasonForCancellation || 'No reason provided'}`;
        } else if (payload.appointmentStatus === 'Confirmed') {
          actions.push('CONFIRMED');
          remarks = `Appointment confirmed ${payload.reason ? '(Reason: ' + payload.reason + ')' : ''}`;
        } else if (payload.appointmentStatus === 'Completed') {
          actions.push('COMPLETED');
          remarks = `Appointment completed`;
        } else {
          actions.push('STATUS_CHANGED');
          remarks = `Status changed from ${existing.appointmentStatus} to ${payload.appointmentStatus}`;
        }
      }

      const isReceptionist =
        performerUserType?.toLowerCase() === 'receptionist';

      if (payload.vitals && isReceptionist) {
        actions.push('VITALS_UPDATED');
        remarks = `Vitals updated`;
      }

      if (
        payload.paymentStatus &&
        payload.paymentStatus !== existingWithPayment.paymentStatus
      ) {
        if (payload.paymentStatus == 'Refunded') {
          actions.push('PAYMENT_STATUS');
          remarks = `₹${payload.refundedAmount} has been refunded by ${payload.refundMode} ${payload.refundNotes ? ` (${payload.refundNotes})` : ''}`;
        } else if (payload.paymentStatus == 'Paid') {
          actions.push('PAYMENT_STATUS');
          remarks =
            'Payment received for this appointment by ' + payload.paymentMode;
        }
      }

      if (payload.appointmentDate || payload.appointmentTime) {
        const dateChanged =
          payload.appointmentDate &&
          new Date(payload.appointmentDate).toDateString() !==
            new Date(existing.appointmentDate).toDateString();
        const timeChanged =
          payload.appointmentTime &&
          payload.appointmentTime !== existing.appointmentTime;

        if (dateChanged || timeChanged) {
          actions.push('RESCHEDULED');
          remarks = `Appointment rescheduled to ${updated.appointmentDate.toDateString()} at ${updated.appointmentTime}`;
        }
      }

      if (actions.length === 0) {
        actions.push('UPDATED');
      }

      // Log each detected action (or just the primary one)
      // For simplicity, let's log the most important one or a generic UPDATED
      const primaryAction =
        actions.find((a) => a === 'CANCELLED') ||
        actions.find((a) => a === 'CONFIRMED') ||
        actions.find((a) => a === 'COMPLETED') ||
        actions.find((a) => a === 'RESCHEDULED') ||
        actions.find((a) => a === 'PATIENT_ARRIVED') ||
        actions.find((a) => a === 'STATUS_CHANGED') ||
        actions.find((a) => a === 'PAYMENT_STATUS') ||
        actions.find((a) => a === 'VITALS_UPDATED') ||
        'UPDATED';

      await AppointmentActivityHistoryService.logActivity({
        appointmentId: updated.id,
        action: primaryAction,
        performedBy: performerUserId || 'system',
        previousState: existing,
        newState: updated,
        remarks: remarks,
        tx: trx,
      });

      // Get performer details and send appropriate notification
      const performer = await getUserById(performerUserId || 'system');
      if (performer) {
        if (updated.appointmentStatus === 'Cancelled') {
          await notifyAppointmentCanceled(
            updated.clinicId,
            updated.id,
            performer.id,
            performer.name,
            performer.userType,
            updated.doctorId || undefined,
            updated.patientId
          );
        } else if (updated.appointmentStatus === 'Confirmed') {
          await notifyAppointmentConfirmed(
            updated.id,
            performer.id,
            performer.name,
            performer.userType,
            updated.doctorId || undefined,
            updated.patientId,
            updated.clinicId
          );

          const [patient] = await trx
            .select({ mobile: UserModel.mobile })
            .from(UserModel)
            .where(eq(UserModel.id, updated.patientId));

          const [clinic] = await trx
            .select({ clinicName: ClinicModel.clinicName })
            .from(ClinicModel)
            .where(eq(ClinicModel.id, updated.clinicId));

          if (
            patient?.mobile &&
            clinic?.clinicName &&
            updated.appointmentTime
          ) {
            await AppointmentNotificationService.sendImmediateNotification(
              updated.id,
              updated.clinicId,
              patient.mobile,
              clinic.clinicName,
              updated.appointmentDate,
              updated.appointmentTime,
              updated.tokenNo ?? null
            );
          }
        } else if (payload.appointmentDate || payload.appointmentTime) {
          // If date or time changed, it's a reschedule
          await notifyAppointmentRescheduled(
            updated.id,
            performer.id,
            performer.name,
            performer.userType,
            updated.doctorId || undefined,
            updated.patientId,
            updated.clinicId
          );
        }
      }

      // 🔴 Real-time broadcast to clinic room (auto-update on doctor/reception screens)
      {
        let action: import('../../../utils/appointmentRealtime').AppointmentRealtimeAction =
          'updated';
        if (payload.appointmentStatus === 'Cancelled') action = 'cancelled';
        else if (payload.appointmentStatus === 'Confirmed')
          action = 'confirmed';
        else if (payload.appointmentStatus === 'Completed')
          action = 'completed';
        else if (payload.appointmentStatus === 'NoShow') action = 'noshow';
        else if (payload.appointmentDate || payload.appointmentTime)
          action = 'rescheduled';
        else if (payload.paymentStatus) action = 'payment_updated';
        else if (payload.vitals) action = 'vitals_updated';

        broadcastAppointmentChange({
          appointmentId: updated.id,
          clinicId: updated.clinicId,
          doctorId: updated.doctorId || undefined,
          patientId: updated.patientId,
          action,
          performerUserId: performerUserId || 'system',
          data: {
            appointmentStatus: updated.appointmentStatus,
            appointmentDate: updated.appointmentDate,
            appointmentTime: updated.appointmentTime,
          },
        });
      }

      // Invalidate revenue overview cache when appointment is updated
      await redisClient.del(`revenue_overview:${updated.clinicId}:all:week`);
      await redisClient.del(`revenue_overview:${updated.clinicId}:all:month`);
      if (updated.doctorId) {
        await redisClient.del(
          `revenue_overview:${updated.clinicId}:doctor:${updated.doctorId}:week`
        );
        await redisClient.del(
          `revenue_overview:${updated.clinicId}:doctor:${updated.doctorId}:month`
        );

        // Invalidate today overview only if appointment is for today
        const appointmentDate = new Date(updated.appointmentDate);
        const today = new Date();
        if (
          appointmentDate.getUTCFullYear() === today.getUTCFullYear() &&
          appointmentDate.getUTCMonth() === today.getUTCMonth() &&
          appointmentDate.getUTCDate() === today.getUTCDate()
        ) {
          await redisClient.del(
            `today_overview:${updated.clinicId}:doctor:${updated.doctorId}`
          );
        }
      }

      if (envConfig.ENABLE_NOTIFICATIONS !== 'false') {
        const [patient] = await trx
          .select({ mobile: UserModel.mobile })
          .from(UserModel)
          .where(eq(UserModel.id, updated.patientId));

        const [clinic] = await trx
          .select({ clinicName: ClinicModel.clinicName })
          .from(ClinicModel)
          .where(eq(ClinicModel.id, updated.clinicId));

        // Instant SMS/WhatsApp reminders if enabled
        if (
          patient?.mobile &&
          clinic?.clinicName &&
          !payload.appointmentStatus &&
          updated.appointmentTime
        ) {
          await AppointmentNotificationService.sendImmediateNotification(
            updated.id,
            updated.clinicId,
            patient.mobile,
            clinic.clinicName,
            updated.appointmentDate,
            updated.appointmentTime,
            null
          );
        }
      }

      return updated;
    });

    // ─── Appointment Engine: fire-and-forget post-commit hook ───────────────
    // The orchestrator handles all errors internally and never throws.
    if (
      updated &&
      previousAppointmentStatus &&
      payload.appointmentStatus &&
      payload.appointmentStatus !== previousAppointmentStatus
    ) {
      const engineRecord: AppointmentRecord = {
        id: updated.id,
        appointmentDate: updated.appointmentDate,
        appointmentTime: updated.appointmentTime,
        tokenNo: updated.tokenNo,
        appointmentStatus: updated.appointmentStatus as AppointmentStatus,
        clinicId: updated.clinicId,
        patientId: updated.patientId,
        doctorId: updated.doctorId!,
        appointmentDurationMinutes: updated.appointmentDurationMinutes ?? null,
        userId: updated.patientId, // patientId references UserModel.id
      };

      const orchestrator = new AppointmentEngineOrchestrator();
      orchestrator
        .onStatusChange(
          engineRecord,
          previousAppointmentStatus as AppointmentStatus
        )
        .catch((err) => {
          logger.error(
            `[AppointmentEngine] Post-commit orchestrator hook failed for appointment=${updated.id}`,
            { error: err }
          );
        });
    }

    return updated;
  }

  static async upsertDoctorManualPrescription(
    doctorId: string,
    appointmentId: string,
    doctorManualPrescription?: string | null
  ) {
    try {
      const [appointment] = await database
        .select({
          id: AppointmentModel.id,
          doctorId: AppointmentModel.doctorId,
          appointmentDate: AppointmentModel.appointmentDate,
          appointmentTime: AppointmentModel.appointmentTime,
          tokenNo: AppointmentModel.tokenNo,
          appointmentStatus: AppointmentModel.appointmentStatus,
          clinicId: AppointmentModel.clinicId,
          patientId: AppointmentModel.patientId,
          appointmentDurationMinutes:
            AppointmentModel.appointmentDurationMinutes,
        })
        .from(AppointmentModel)
        .where(
          and(
            eq(AppointmentModel.id, appointmentId),
            eq(AppointmentModel.doctorId, doctorId)
          )
        )
        .limit(1);

      if (!appointment) {
        throw new HttpError(
          403,
          'You can only add prescriptions to your own appointments'
        );
      }

      const existingdoctorManualPrescription = await database
        .select()
        .from(doctorManualPrescriptionModel)
        .where(eq(doctorManualPrescriptionModel.appointmentId, appointmentId))
        .limit(1);

      const now = new Date();
      const isFirstUpload = existingdoctorManualPrescription.length === 0;

      if (
        existingdoctorManualPrescription.length > 0 &&
        doctorManualPrescription
      ) {
        const oldFilePath =
          existingdoctorManualPrescription[0].doctorManualPrescription;
        if (oldFilePath) {
          try {
            await deleteFromS3(oldFilePath);
          } catch {
            logger.warn('Failed to delete old prescription');
          }
        }
      }

      if (existingdoctorManualPrescription.length > 0) {
        const updateData: any = {
          updatedAt: now,
        };

        if (doctorManualPrescription !== undefined) {
          updateData.doctorManualPrescription = doctorManualPrescription;
        }

        const [updatedPrescription] = await database
          .update(doctorManualPrescriptionModel)
          .set(updateData)
          .where(eq(doctorManualPrescriptionModel.appointmentId, appointmentId))
          .returning();
        return updatedPrescription;
      } else {
        const [newTemplate] = await database
          .insert(doctorManualPrescriptionModel)
          .values({
            appointmentId,
            doctorManualPrescription: doctorManualPrescription || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (isFirstUpload) {
          await database
            .update(AppointmentModel)
            .set({
              appointmentStatus: 'Completed',
              updatedAt: now,
            })
            .where(eq(AppointmentModel.id, appointmentId));

          // ─── Appointment Engine: fire-and-forget post-commit hook ───────────────
          if (appointment.doctorId) {
            const engineRecord: AppointmentRecord = {
              id: appointment.id,
              appointmentDate: appointment.appointmentDate,
              appointmentTime: appointment.appointmentTime,
              tokenNo: appointment.tokenNo,
              appointmentStatus: 'Completed' as AppointmentStatus,
              clinicId: appointment.clinicId,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              appointmentDurationMinutes:
                appointment.appointmentDurationMinutes ?? null,
              userId: appointment.patientId,
            };

            const orchestrator = new AppointmentEngineOrchestrator();
            orchestrator
              .onStatusChange(
                engineRecord,
                appointment.appointmentStatus as AppointmentStatus
              )
              .catch((err) => {
                logger.error(
                  `[AppointmentEngine] Post-commit orchestrator hook failed for auto-completed appointment=${appointmentId}`,
                  { error: err }
                );
              });
          }
        }

        return newTemplate;
      }
    } catch {
      throw new HttpError(500, 'An unexpected error occurred');
    }
  }

  static async sendManualPrescriptionNotification(
    doctorId: string,
    appointmentId: string,
    otp: string
  ) {
    const [appointment] = await database
      .select({
        id: AppointmentModel.id,
        patientId: AppointmentModel.patientId,
      })
      .from(AppointmentModel)
      .where(
        and(
          eq(AppointmentModel.id, appointmentId),
          eq(AppointmentModel.doctorId, doctorId)
        )
      )
      .limit(1);

    if (!appointment) {
      throw new HttpError(404, 'Appointment not found or not assigned to you');
    }

    const doctorDevices = await database
      .select()
      .from(UserDevicesModel)
      .where(eq(UserDevicesModel.userId, doctorId));

    if (doctorDevices.length === 0) {
      throw new HttpError(
        400,
        'No registered mobile devices found. Please log in to the MediSetu app on your phone to receive notifications.'
      );
    }

    const [patient] = await database
      .select({ name: UserModel.name })
      .from(UserModel)
      .where(eq(UserModel.id, appointment.patientId))
      .limit(1);

    const patientName = patient?.name || 'Patient';
    const uploadUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/doctor/upload-manual-prescription?appointmentId=${appointmentId}`;

    await sendNotificationToUser({
      userId: doctorId,
      title: 'Upload Manual Prescription',
      body: `Tap here to upload the manual prescription for ${patientName}`,
      type: 'prescription_upload',
      allowToStoreInDB: false,
      metadata: {
        action: 'upload_manual_prescription',
        otp: otp,
        appointmentId: appointmentId,
        url: uploadUrl,
      },
    });
  }

  static async updateConsentFile(id: string, consentFile: string) {
    return await database.transaction(async (trx) => {
      // Upsert into clinical table
      const [existingClinical] = await trx
        .select()
        .from(AppointmentClinicalModel)
        .where(eq(AppointmentClinicalModel.appointmentId, id));

      if (existingClinical) {
        await trx
          .update(AppointmentClinicalModel)
          .set({
            consentFile: consentFile,
            updatedAt: new Date(),
          })
          .where(eq(AppointmentClinicalModel.appointmentId, id));
      } else {
        await trx.insert(AppointmentClinicalModel).values({
          appointmentId: id,
          consentFile: consentFile,
        });
      }

      // Also update the main appointment's updatedAt
      const [updatedAppointment] = await trx
        .update(AppointmentModel)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(AppointmentModel.id, id))
        .returning();

      return {
        appointment: updatedAppointment,
      };
    });
  }

  static async getAppointmentPaymentTransactions(
    query: GetAppointmentPaymentsDto,
    user: any,
    clinicId: string
  ) {
    return await database.transaction(async (tx) => {
      // Check authorization
      if (
        !['Admin', 'Doctor', 'Receptionist', 'Super_Admin'].includes(
          user.userType
        )
      ) {
        throw new HttpError(
          403,
          'Access denied. Only Admin, Doctor, and Receptionist can access this resource.'
        );
      }

      const conditions = [];

      // Clinic filter
      conditions.push(eq(AppointmentModel.clinicId, clinicId));

      // Role-based filtering
      if (user.userType === 'Doctor') {
        conditions.push(eq(AppointmentModel.doctorId, user.id));
      }

      // Payment status filter - include all relevant statuses
      if (query.paymentStatus) {
        const inputStatuses = Array.isArray(query.paymentStatus)
          ? query.paymentStatus
          : [query.paymentStatus];
        const paymentStatuses: string[] = [];
        for (const s of inputStatuses) {
          paymentStatuses.push(s);
          paymentStatuses.push(s.toLowerCase());
          paymentStatuses.push(s.toUpperCase());
          const camel = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
          if (!paymentStatuses.includes(camel)) {
            paymentStatuses.push(camel);
          }
        }
        conditions.push(
          inArray(AppointmentPaymentModel.paymentStatus, paymentStatuses)
        );
      } else {
        // Default: include Paid, Refunded, Already Paid, Pending
        conditions.push(
          inArray(AppointmentPaymentModel.paymentStatus, [
            'Paid',
            'paid',
            'PAID',
            'Refunded',
            'refunded',
            'REFUNDED',
            'Already Paid',
            'already paid',
            'ALREADY PAID',
            'Pending',
            'pending',
            'PENDING',
          ])
        );
      }

      // Doctor filter
      if (query.doctorId) {
        const doctorIds = Array.isArray(query.doctorId)
          ? query.doctorId
          : [query.doctorId];
        conditions.push(inArray(AppointmentModel.doctorId, doctorIds));
      }

      // Patient filter
      if (query.patientId) {
        const patientIds = Array.isArray(query.patientId)
          ? query.patientId
          : [query.patientId];
        conditions.push(inArray(AppointmentModel.patientId, patientIds));
      }

      // Date filtering
      let start: Date, end: Date;

      if (query.startDate) {
        start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
      }

      if (query.endDate) {
        end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }

      conditions.push(gte(AppointmentModel.appointmentDate, start));
      conditions.push(lte(AppointmentModel.appointmentDate, end));

      // Aliases for joins
      const patientUser = alias(UserModel, 'patientUser');
      const doctorUser = alias(UserModel, 'doctorUser');

      // Search condition
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        const isGenericKeyword = [
          'credit',
          'debit',
          'primary',
          'additional',
        ].some((kw) => searchLower.includes(kw) || kw.includes(searchLower));

        if (!isGenericKeyword) {
          const searchPattern = `%${searchLower}%`;
          conditions.push(
            sql`(
              lower(${patientUser.name}) LIKE ${searchPattern} OR 
              lower(${doctorUser.name}) LIKE ${searchPattern} OR 
              lower(${ClinicServiceModel.serviceName}) LIKE ${searchPattern} OR
              ${patientUser.mobile} LIKE ${searchPattern} OR
              lower(${AppointmentPaymentModel.transactionId}) LIKE ${searchPattern} OR
              lower(cast(${AppointmentModel.id} as text)) LIKE ${searchPattern}
            )`
          );
        }
      }

      // Fetch all appointments that match the criteria
      const appointments = await tx
        .select({
          id: AppointmentModel.id,
          appointmentDate: AppointmentModel.appointmentDate,
          createdAt: AppointmentModel.createdAt,
          paymentStatus: AppointmentPaymentModel.paymentStatus,
          paymentMode: AppointmentPaymentModel.paymentMode,
          refundMode: AppointmentPaymentModel.refundMode,
          refundedAmount: AppointmentPaymentModel.refundedAmount,
          refundNotes: AppointmentPaymentModel.refundNotes,
          primaryServicePrice: AppointmentPaymentModel.primaryServicePrice,
          price: AppointmentPaymentModel.price,
          transactionId: AppointmentPaymentModel.transactionId,
          gatewayOrderId: AppointmentPaymentModel.gatewayOrderId,
          gatewayResponse: AppointmentPaymentModel.gatewayResponse,
          serviceId: ClinicServiceModel.id,
          serviceName: ClinicServiceModel.serviceName,
          doctorId: doctorUser.id,
          doctorName: doctorUser.name,
          doctorSpeciality: sql<string>`(SELECT speciality FROM user_professionals WHERE user_id = ${doctorUser.id} LIMIT 1)`,
          patientId: patientUser.id,
          patientName: patientUser.name,
          patientMobile: patientUser.mobile,
        })
        .from(AppointmentModel)
        .innerJoin(
          AppointmentPaymentModel,
          eq(AppointmentModel.id, AppointmentPaymentModel.appointmentId)
        )
        .leftJoin(patientUser, eq(AppointmentModel.patientId, patientUser.id))
        .leftJoin(doctorUser, eq(AppointmentModel.doctorId, doctorUser.id))
        .leftJoin(
          ClinicServiceModel,
          eq(AppointmentModel.clinicServiceId, ClinicServiceModel.id)
        )
        .where(and(...conditions))
        .orderBy(desc(AppointmentModel.createdAt));

      // Fetch additional services for ALL appointments that might need them
      const allAppointmentIds = appointments.map((apt) => apt.id);
      const additionalServicesMap = new Map<string, any[]>();

      if (allAppointmentIds.length > 0) {
        const additionalServices = await tx
          .select({
            appointmentId: appointmentMultipleService.appointmentId,
            serviceId: appointmentMultipleService.serviceId,
            serviceName: ClinicServiceModel.serviceName,
            price: appointmentMultipleService.price,
            paymentMode: appointmentMultipleService.paymentMode,
            payment_notes: appointmentMultipleService.payment_notes,
            createdAt: appointmentMultipleService.createdAt,
          })
          .from(appointmentMultipleService)
          .leftJoin(
            ClinicServiceModel,
            eq(appointmentMultipleService.serviceId, ClinicServiceModel.id)
          )
          .where(
            inArray(appointmentMultipleService.appointmentId, allAppointmentIds)
          );

        additionalServices.forEach((service) => {
          if (!additionalServicesMap.has(service.appointmentId)) {
            additionalServicesMap.set(service.appointmentId, []);
          }
          additionalServicesMap.get(service.appointmentId)!.push(service);
        });
      }

      // Transform appointments into payment transactions
      let transactions: PaymentTransaction[] = [];

      appointments.forEach((appointment) => {
        const additionalServices =
          additionalServicesMap.get(appointment.id) || [];
        const statusLower = appointment.paymentStatus?.toLowerCase();

        if (statusLower === 'paid' || statusLower === 'pending') {
          // Credit entry for primary service (using primaryServicePrice, NOT price)
          const primaryPrice =
            Number(appointment.primaryServicePrice) ||
            Number(appointment.price) ||
            0;

          if (primaryPrice > 0) {
            transactions.push({
              patientName: appointment.patientName || 'Unknown',
              patientMobile: appointment.patientMobile || 'N/A',
              doctorName: appointment.doctorName || 'Unknown',
              doctorSpeciality: appointment.doctorSpeciality || 'General',
              serviceName: appointment.serviceName || 'Consultation',
              appointmentDate:
                appointment.appointmentDate || appointment.createdAt,
              price: primaryPrice,
              entryType: 'Credit',
              paymentMode: appointment.paymentMode || 'Unknown',
              transactionId: `CREDIT-PRIMARY-${appointment.id}`,
              originalAppointmentId: appointment.id,
              gatewayTransactionId: appointment.transactionId || undefined,
            });
          }

          // Credit entries for additional services
          additionalServices.forEach((service, index) => {
            const servicePrice = Number(service.price) || 0;
            if (servicePrice > 0) {
              transactions.push({
                patientName: appointment.patientName || 'Unknown',
                patientMobile: appointment.patientMobile || 'N/A',
                doctorName: appointment.doctorName || 'Unknown',
                doctorSpeciality: appointment.doctorSpeciality || 'General',
                serviceName: service.serviceName || `Additional Service`,
                appointmentDate:
                  appointment.appointmentDate || appointment.createdAt,
                price: servicePrice,
                entryType: 'Credit',
                paymentMode:
                  service.paymentMode || appointment.paymentMode || 'Unknown',
                transactionId: `CREDIT-ADDITIONAL-${appointment.id}-${index}`,
                originalAppointmentId: appointment.id,
                gatewayTransactionId: appointment.transactionId || undefined,
              });
            }
          });
        } else if (statusLower === 'refunded') {
          // Credit entry for primary service (original payment)
          const primaryPrice = Number(appointment.primaryServicePrice) || 0;

          if (primaryPrice > 0) {
            transactions.push({
              patientName: appointment.patientName || 'Unknown',
              patientMobile: appointment.patientMobile || 'N/A',
              doctorName: appointment.doctorName || 'Unknown',
              doctorSpeciality: appointment.doctorSpeciality || 'General',
              serviceName: appointment.serviceName || 'Consultation',
              appointmentDate:
                appointment.appointmentDate || appointment.createdAt,
              price: primaryPrice,
              entryType: 'Credit',
              paymentMode: appointment.paymentMode || 'Unknown',
              transactionId: `CREDIT-PRIMARY-${appointment.id}`,
              originalAppointmentId: appointment.id,
              gatewayTransactionId: appointment.transactionId || undefined,
            });
          }

          // Credit entries for additional services (original payments)
          additionalServices.forEach((service, index) => {
            const servicePrice = Number(service.price) || 0;
            if (servicePrice > 0) {
              transactions.push({
                patientName: appointment.patientName || 'Unknown',
                patientMobile: appointment.patientMobile || 'N/A',
                doctorName: appointment.doctorName || 'Unknown',
                doctorSpeciality: appointment.doctorSpeciality || 'General',
                serviceName: service.serviceName || `Additional Service`,
                appointmentDate:
                  appointment.appointmentDate || appointment.createdAt,
                price: servicePrice,
                entryType: 'Credit',
                paymentMode:
                  service.paymentMode || appointment.paymentMode || 'Unknown',
                transactionId: `CREDIT-ADDITIONAL-${appointment.id}-${index}`,
                originalAppointmentId: appointment.id,
                gatewayTransactionId: appointment.transactionId || undefined,
              });
            }
          });

          // Debit entry for refund (using refundedAmount)
          const refundAmount = appointment.refundedAmount
            ? parseFloat(appointment.refundedAmount)
            : primaryPrice +
              additionalServices.reduce(
                (sum, s) => sum + (Number(s.price) || 0),
                0
              );

          if (refundAmount > 0) {
            transactions.push({
              patientName: appointment.patientName || 'Unknown',
              patientMobile: appointment.patientMobile || 'N/A',
              doctorName: appointment.doctorName || 'Unknown',
              doctorSpeciality: appointment.doctorSpeciality || 'General',
              serviceName: 'Refund',
              appointmentDate:
                appointment.appointmentDate || appointment.createdAt,
              price: refundAmount,
              entryType: 'Debit',
              refundMode:
                appointment.refundMode || appointment.paymentMode || 'Unknown',
              refundNotes: appointment.refundNotes || 'Refund processed',
              transactionId: `DEBIT-${appointment.id}`,
              originalAppointmentId: appointment.id,
              gatewayTransactionId: appointment.transactionId || undefined,
            });
          }
        } else if (statusLower === 'already paid') {
          // For "Already Paid" appointments: ONLY capture additional service entries
          // Primary service is NOT included since it was paid elsewhere

          additionalServices.forEach((service, index) => {
            const servicePrice = Number(service.price) || 0;
            if (servicePrice > 0) {
              transactions.push({
                patientName: appointment.patientName || 'Unknown',
                patientMobile: appointment.patientMobile || 'N/A',
                doctorName: appointment.doctorName || 'Unknown',
                doctorSpeciality: appointment.doctorSpeciality || 'General',
                serviceName: service.serviceName || `Additional Service`,
                appointmentDate:
                  appointment.appointmentDate || appointment.createdAt,
                price: servicePrice,
                entryType: 'Credit',
                paymentMode: service.paymentMode || 'Unknown',
                transactionId: `ADDITIONAL-CREDIT-${appointment.id}-${index}`,
                originalAppointmentId: appointment.id,
                gatewayTransactionId: appointment.transactionId || undefined,
              });
            }
          });
        }
      });

      // Filter out transactions with invalid payment modes
      transactions = transactions.filter((t) => {
        const mode = t.entryType === 'Credit' ? t.paymentMode : t.refundMode;
        return mode && mode !== 'Not Required';
      });

      // Filter by search query on transactions
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        transactions = transactions.filter((t) => {
          return (
            t.patientName.toLowerCase().includes(searchLower) ||
            t.patientMobile.toLowerCase().includes(searchLower) ||
            t.doctorName.toLowerCase().includes(searchLower) ||
            t.doctorSpeciality.toLowerCase().includes(searchLower) ||
            t.serviceName.toLowerCase().includes(searchLower) ||
            (t.transactionId &&
              t.transactionId.toLowerCase().includes(searchLower)) ||
            (t.gatewayTransactionId &&
              t.gatewayTransactionId.toLowerCase().includes(searchLower)) ||
            (t.paymentMode &&
              t.paymentMode.toLowerCase().includes(searchLower)) ||
            (t.refundMode && t.refundMode.toLowerCase().includes(searchLower))
          );
        });
      }

      // Filter by payment mode
      if (query.paymentMode) {
        const paymentModes = Array.isArray(query.paymentMode)
          ? query.paymentMode
          : [query.paymentMode];

        transactions = transactions.filter((t) => {
          if (t.entryType === 'Credit') {
            return paymentModes.includes(t.paymentMode || '');
          } else if (t.entryType === 'Debit') {
            return paymentModes.includes(t.refundMode || '');
          }
          return true;
        });
      }

      // Filter by entry type
      if (query.entryType) {
        transactions = transactions.filter(
          (t) => t.entryType === query.entryType
        );
      }

      // Calculate summary statistics
      const summary = {
        totalCreditAmount: transactions
          .filter((t) => t.entryType === 'Credit')
          .reduce((sum, t) => sum + t.price, 0),
        totalDebitAmount: transactions
          .filter((t) => t.entryType === 'Debit')
          .reduce((sum, t) => sum + t.price, 0),
        netAmount: transactions.reduce(
          (sum, t) =>
            t.entryType === 'Credit' ? sum + t.price : sum - t.price,
          0
        ),
        totalTransactions: transactions.length,
        creditTransactions: transactions.filter((t) => t.entryType === 'Credit')
          .length,
        debitTransactions: transactions.filter((t) => t.entryType === 'Debit')
          .length,
        paymentModeSummary: {
          credit: transactions
            .filter((t) => t.entryType === 'Credit')
            .reduce(
              (acc, t) => {
                const mode = t.paymentMode || 'Unknown';
                acc[mode] = (acc[mode] || 0) + t.price;
                return acc;
              },
              {} as Record<string, number>
            ),
          debit: transactions
            .filter((t) => t.entryType === 'Debit')
            .reduce(
              (acc, t) => {
                const mode = t.refundMode || 'Unknown';
                acc[mode] = (acc[mode] || 0) + t.price;
                return acc;
              },
              {} as Record<string, number>
            ),
        },
      };

      // Apply pagination
      const pageSize = Math.max(Number(query.pageSize) || 100, 1);
      const pageNumber = Math.max(Number(query.pageNumber) || 1, 1);
      const { limit, offset } = pagination(pageNumber, pageSize);

      const paginatedTransactions = transactions.slice(offset, offset + limit);
      const totalRecords = transactions.length;
      const totalPages = Math.ceil(totalRecords / pageSize);

      return {
        data: paginatedTransactions,
        summary,
        metadata: {
          totalRecords,
          totalPages,
          currentPage: pageNumber,
          pageSize,
          dateRange: {
            start,
            end,
          },
        },
      };
    });
  }

  static escapeLike(s: string) {
    return s.replace(/[%_\\]/g, (m) => `\\${m}`);
  }

  // get all clinic appointments
  static async getAllClinicAppointments(
    clinicId: string,
    query: appointmentQueryDto,
    user: AuthUser
  ) {
    return await database.transaction(async (trx) => {
      const pageSize = Math.max(Number(query?.pageSize) || 10, 1);
      const pageNumber = Math.max(Number(query?.pageNumber) || 1, 1);
      const { limit, offset } = pagination(pageNumber, pageSize);

      // Build where clause safely
      const whereClauses: any[] = [];

      if (user.userType === 'Patient')
        whereClauses.push(eq(AppointmentModel.patientId, user.id));
      if (user.userType === 'Doctor')
        whereClauses.push(eq(AppointmentModel.doctorId, user.id));
      if (user.userType === 'Admin' || user.userType === 'Receptionist')
        whereClauses.push(eq(AppointmentModel.clinicId, clinicId));

      // Allow Admin and Receptionist to filter by doctorId
      if (
        (user.userType === 'Admin' || user.userType === 'Receptionist') &&
        query.doctorId
      ) {
        whereClauses.push(eq(AppointmentModel.doctorId, query.doctorId));
      }

      {
        const now = new Date();
        let start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
        let end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        if (query.startDate) {
          const [sy, sm, sd] = query.startDate.split('-').map(Number);
          start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
          if (!query.endDate) {
            end = new Date(sy, sm - 1, sd, 23, 59, 59, 999);
          }
        }
        if (query.endDate) {
          const [ey, em, ed] = query.endDate.split('-').map(Number);
          end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        }
        whereClauses.push(gte(AppointmentModel.appointmentDate, start));
        whereClauses.push(lte(AppointmentModel.appointmentDate, end));
      }

      const patientUser = alias(UserModel, 'patientUser');
      const doctorUser = alias(UserModel, 'doctorUser');

      if (query?.search) {
        const raw = String(query.search).trim();
        if (raw.length > 0) {
          const terms = raw.split(/\s+/).slice(0, 5);
          const termConditions = terms.map((term) => {
            const escaped = this.escapeLike(term);
            const pattern = `%${escaped}%`.toLowerCase();
            const byName = sql`lower(${patientUser.name}) LIKE ${pattern}`;
            const byEmail = sql`lower(${patientUser.email}) LIKE ${pattern}`;
            const byMobile = sql`lower(${patientUser.mobile}) LIKE ${pattern}`;
            const byAltMobile = sql`lower((SELECT alternate_mobile FROM user_profiles WHERE user_id = ${patientUser.id})) LIKE ${pattern}`;
            const byAppointmentType = sql`lower(${AppointmentModel.appointmentType}) LIKE ${pattern}`;
            const byAppointmentStatus = sql`lower(CAST(${AppointmentModel.appointmentStatus} AS text)) LIKE ${pattern}`;
            return or(
              byName,
              byEmail,
              byMobile,
              byAltMobile,
              byAppointmentType,
              byAppointmentStatus
            );
          });
          if (termConditions.length === 1) {
            whereClauses.push(termConditions[0]);
          } else if (termConditions.length > 1) {
            whereClauses.push(and(...termConditions));
          }
        }
      }

      // Removed standalone patient name search in favor of above multi-field search

      if (query?.appointmentStatus) {
        const raw = Array.isArray(query.appointmentStatus)
          ? query.appointmentStatus
          : [query.appointmentStatus];
        const normalized = raw
          .flatMap((s) => (typeof s === 'string' ? s.split(',') : s))
          .map((s) => String(s).trim())
          .filter((s) =>
            [
              'Upcoming',
              'Completed',
              'Cancelled',
              'Rescheduled',
              'Patient Arrived',
              'Pending',
              'Missed',
              'Confirmed',
              'NoShow',
            ].includes(s)
          );
        if (normalized.length > 0) {
          whereClauses.push(
            inArray(AppointmentModel.appointmentStatus, normalized as any)
          );
        }
      }

      // total count of appointments matching the criteria
      const totalRecords = await trx
        .select({ count: sql`COUNT(${AppointmentModel.id})` })
        .from(AppointmentModel)
        .leftJoin(patientUser, eq(patientUser.id, AppointmentModel.patientId))
        .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
        .where(and(...whereClauses));

      const totalCount = Number(totalRecords?.[0]?.count ?? 0) || 0;
      const totalPages =
        totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

      const latestQualification = trx
        .select({
          qualificationTitle: DoctorQualificationModel.qualificationTitle,
        })
        .from(DoctorQualificationModel)
        .where(eq(DoctorQualificationModel.userId, doctorUser.id))
        .orderBy(desc(DoctorQualificationModel.yearOfCompletion))
        .limit(1);

      const patients = await trx
        .select({
          id: patientUser.id,
          name: patientUser.name,
          mobile: patientUser.mobile,
          profileImage: sql<string>`(SELECT profile_image FROM user_profiles WHERE user_id = ${patientUser.id} LIMIT 1)`,
          appointment: {
            id: AppointmentModel.id,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            appointmentDurationMinutes:
              AppointmentModel.appointmentDurationMinutes,
            appointmentType: AppointmentModel.appointmentType,
            appointmentStatus: AppointmentModel.appointmentStatus,
            paymentMethod: AppointmentPaymentModel.paymentMode,
            paymentStatus: AppointmentPaymentModel.paymentStatus,
            refundMode: AppointmentPaymentModel.refundMode,
            refundedAmount: AppointmentPaymentModel.refundedAmount,
            refundNotes: AppointmentPaymentModel.refundNotes,
            tokenNo: AppointmentModel.tokenNo,
            bookingSource: AppointmentModel.bookingSource,
          },
          doctor: {
            id: doctorUser.id,
            name: doctorUser.name,
            email: doctorUser.email,
            mobile: doctorUser.mobile,
            gender: sql<string>`(SELECT gender FROM user_profiles WHERE user_id = ${doctorUser.id} LIMIT 1)`,
            profileImage: sql<string>`(SELECT profile_image FROM user_profiles WHERE user_id = ${doctorUser.id} LIMIT 1)`,
            qualification: sql`(${latestQualification})`,
          },
          service: {
            id: ClinicServiceModel.id,
            serviceName: ClinicServiceModel.serviceName,
            servicePrice: ClinicServiceModel.price,
          },
        })
        .from(AppointmentModel)
        .leftJoin(patientUser, eq(patientUser.id, AppointmentModel.patientId))
        .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
        .leftJoin(
          AppointmentPaymentModel,
          eq(AppointmentModel.id, AppointmentPaymentModel.appointmentId)
        )
        .leftJoin(
          ClinicServiceModel,
          eq(ClinicServiceModel.id, AppointmentModel.clinicServiceId)
        )
        .where(and(...whereClauses))
        // stable ordering so paging is deterministic:
        .orderBy(
          desc(AppointmentModel.updatedAt),
          desc(AppointmentModel.appointmentDate),
          desc(AppointmentModel.appointmentTime)
        )
        .limit(limit)
        .offset(offset);

      return {
        patients,
        pagination: {
          totalRecords: totalCount,
          totalPages,
          currentPage: pageNumber,
          pageSize,
        },
      };
    });
  }

  static async getClinicAppointmentDetails(
    clinicId: string,
    query: ClinicAppointmentDetailsQueryDto,
    user: AuthUser
  ) {
    const selectedDate = query.date || query.startDate;
    const currentRange = getSingleDayRange(selectedDate);
    const previousRange = {
      start: new Date(currentRange.start),
      end: new Date(currentRange.start),
    };
    previousRange.start.setDate(previousRange.start.getDate() - 1);

    const getCountsForRange = async (
      start: Date,
      end: Date
    ): Promise<ClinicAppointmentDetailsCounts> => {
      return await database.transaction(async (trx) => {
        const whereClauses: any[] = [
          eq(AppointmentModel.clinicId, clinicId),
          gte(AppointmentModel.appointmentDate, start),
          lt(AppointmentModel.appointmentDate, end),
        ];

        if (user.userType === 'Patient') {
          whereClauses.push(eq(AppointmentModel.patientId, user.id));
        }

        if (user.userType === 'Doctor') {
          whereClauses.push(eq(AppointmentModel.doctorId, user.id));
        }

        if (
          query.doctorId &&
          ['Admin', 'Receptionist', 'Super_Admin'].includes(user.userType)
        ) {
          whereClauses.push(eq(AppointmentModel.doctorId, query.doctorId));
        }

        const [counts] = await trx
          .select({
            totalAppointments: sql<number>`COUNT(*)::int`,
            completed: sql<number>`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Completed' THEN 1 END)::int`,
            upcoming: sql<number>`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Pending' THEN 1 END)::int`,
            cancelled: sql<number>`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Cancelled' THEN 1 END)::int`,
            noShow: sql<number>`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'NoShow' THEN 1 END)::int`,
            confirmed: sql<number>`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Confirmed' THEN 1 END)::int`,
            patientArrived: sql<number>`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Patient Arrived' THEN 1 END)::int`,
          })
          .from(AppointmentModel)
          .where(and(...whereClauses));

        return {
          totalAppointments: Number(counts?.totalAppointments ?? 0),
          completed: Number(counts?.completed ?? 0),
          upcoming: Number(counts?.upcoming ?? 0),
          cancelled: Number(counts?.cancelled ?? 0),
          noShow: Number(counts?.noShow ?? 0),
          confirmed: Number(counts?.confirmed ?? 0),
          patientArrived: Number(counts?.patientArrived ?? 0),
        };
      });
    };

    const [currentCounts, previousCounts] = await Promise.all([
      getCountsForRange(currentRange.start, currentRange.end),
      getCountsForRange(previousRange.start, previousRange.end),
    ]);

    return {
      date: formatDateOnlyLocal(currentRange.start),
      previousDate: formatDateOnlyLocal(previousRange.start),
      totalAppointments: buildMetricComparison(
        currentCounts.totalAppointments,
        previousCounts.totalAppointments
      ),
      completed: buildMetricComparison(
        currentCounts.completed,
        previousCounts.completed
      ),
      upcoming: buildMetricComparison(
        currentCounts.upcoming,
        previousCounts.upcoming
      ),
      cancelled: buildMetricComparison(
        currentCounts.cancelled,
        previousCounts.cancelled
      ),
      noShow: buildMetricComparison(
        currentCounts.noShow,
        previousCounts.noShow
      ),
      confirmed: buildMetricComparison(
        currentCounts.confirmed,
        previousCounts.confirmed
      ),
      patientArrived: buildMetricComparison(
        currentCounts.patientArrived,
        previousCounts.patientArrived
      ),
    };
  }

  // get all user appointments
  static async getALlUserAppountment(
    userId: string,
    query: appointmentQueryDto
  ) {
    return await database.transaction(async (trx) => {
      const pageSize = Math.max(Number(query?.pageSize) || 10, 1);
      const pageNumber = Math.max(Number(query?.pageNumber) || 1, 1);
      const { limit, offset } = pagination(pageNumber, pageSize);

      // Build where clause safely
      const whereClauses: any[] = [eq(AppointmentModel.patientId, userId)];

      if (query?.search) {
        const raw = String(query.search).trim();
        if (raw.length > 0) {
          const terms = raw.split(/\s+/).slice(0, 5);

          const termConditions = terms.map((term) => {
            const escaped = this.escapeLike(term);
            const pattern = `%${escaped}%`.toLowerCase();

            const byName = sql`lower(${UserModel.name}) LIKE ${pattern}`;
            const byEmail = sql`lower(${UserModel.email}) LIKE ${pattern}`;
            const byMobile = sql`lower(${UserModel.mobile}) LIKE ${pattern}`;
            const byAltMobile = sql`lower(${UserProfileModel.alternateMobile}) LIKE ${pattern}`;
            const byAppointmentType = sql`lower(${AppointmentModel.appointmentType}) LIKE ${pattern}`;
            const byAppointmentStatus = sql`lower(CAST(${AppointmentModel.appointmentStatus} AS text)) LIKE ${pattern}`;

            // For a single term, any of these fields may match => OR
            return or(
              byName,
              byEmail,
              byMobile,
              byAltMobile,
              byAppointmentType,
              byAppointmentStatus
            );
          });

          // Combine multiple term conditions with AND (each term must appear somewhere)
          if (termConditions.length === 1) {
            whereClauses.push(termConditions[0]);
          } else if (termConditions.length > 1) {
            whereClauses.push(and(...termConditions));
          }
        }
      }

      // total count of appointments matching the criteria
      const totalRecords = await trx
        .select({ count: sql`COUNT(${AppointmentModel.id})` })
        .from(AppointmentModel)
        .where(and(...whereClauses));

      const totalCount = Number(totalRecords?.[0]?.count ?? 0) || 0;
      const totalPages =
        totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
      const doctor = alias(UserModel, 'doctor');

      // fetch patients with their appointment (this will return one row per appointment)
      // If you want only latest appointment per patient, see note below.
      const patients = await trx
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          gender: UserProfileModel.gender,
          age: UserProfileModel.age,
          dob: UserProfileModel.dob,
          alternateMobile: UserProfileModel.alternateMobile,
          address: UserProfileModel.address,
          city: UserProfileModel.city,
          state: UserProfileModel.state,
          zipCode: UserProfileModel.zipCode,
          profileImage: UserProfileModel.profileImage,
          status: UserModel.userStatus,
          updatedAt: UserModel.updatedAt,
          createdAt: UserModel.createdAt,
          doctor: {
            id: doctor.id,
            name: doctor.name,
            email: doctor.email,
            mobile: doctor.mobile,
            status: doctor.userStatus,
            updatedAt: doctor.updatedAt,
            createdAt: doctor.createdAt,
          },
          appointment: {
            id: AppointmentModel.id,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            appointmentType: AppointmentModel.appointmentType,
            appointmentNotes: AppointmentClinicalModel.appointmentNotes,
            appointmentStatus: AppointmentModel.appointmentStatus,
            reReasonForCancellation: AppointmentModel.reReasonForCancellation,
            reasionForReSchedule: AppointmentModel.reasionForReSchedule,
            bookingSource: AppointmentModel.bookingSource,
          },
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .leftJoin(
          AppointmentModel,
          eq(UserModel.id, AppointmentModel.patientId)
        )
        .leftJoin(doctor, eq(doctor.id, AppointmentModel.doctorId))
        .leftJoin(
          AppointmentClinicalModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .where(and(...whereClauses))
        // stable ordering so paging is deterministic:
        .orderBy(
          desc(UserModel.createdAt),
          desc(AppointmentModel.appointmentDate),
          desc(AppointmentModel.appointmentTime)
        )
        .limit(limit)
        .offset(offset);

      return {
        patients,
        pagination: {
          totalRecords: totalCount,
          totalPages,
          currentPage: pageNumber,
          pageSize,
        },
      };
    });
  }

  // get appointment by id
  // static async getAppointment(appointmentId: string) {
  //   return await database.transaction(async (trx) => {
  //     const result = await trx
  //       .select({
  //         id: UserModel.id,
  //         name: UserModel.name,
  //         email: UserModel.email,
  //         mobile: UserModel.mobile,
  //         gender: UserModel.gender,
  //         age: UserModel.age,
  //         dob: UserModel.dob,
  //         alternateMobile: UserModel.alternateMobile,
  //         address: UserModel.address,
  //         city: UserModel.city,
  //         state: UserModel.state,
  //         zipCode: UserModel.zipCode,
  //         profileImage: UserModel.profileImage,
  //         status: UserModel.userStatus,
  //         updatedAt: UserModel.updatedAt,
  //         createdAt: UserModel.createdAt,
  //         appointment: {
  //           id: AppointmentModel.id,
  //           doctorId: AppointmentModel.doctorId,
  //           appointmentDate: AppointmentModel.appointmentDate,
  //           appointmentTime: AppointmentModel.appointmentTime,
  //           appointmentType: AppointmentModel.appointmentType,
  //           appointmentNotes: AppointmentModel.appointmentNotes,
  //           appointmentStatus: AppointmentModel.appointmentStatus,
  //           reReasonForCancellation: AppointmentModel.reReasonForCancellation,
  //           reasionForReSchedule: AppointmentModel.reasionForReSchedule,
  //           tokenNo: AppointmentModel.tokenNo,
  //           clinicServiceId: AppointmentModel.clinicServiceId,
  //           paymentMode: AppointmentModel.paymentMode,
  //           commonSymptoms: AppointmentModel.commonSymptoms,
  //           clinicSymptomIds: AppointmentModel.clinicSymptomIds,
  //         },
  //       })
  //       .from(UserModel)
  //       .innerJoin(
  //         AppointmentModel,
  //         eq(UserModel.id, AppointmentModel.patientId)
  //       )
  //       .where(eq(AppointmentModel.id, appointmentId))
  //       .limit(1); // Just in case, even though appointmentId should be unique

  //     return result.length > 0 ? result[0] : null;
  //   });
  // }

  static async getAppointment(
    appointmentId: string,
    requestingUser: { id: string; userType: string; clinicId?: string }
  ) {
    const DoctorUser = alias(UserModel, 'doctor');
    return await database.transaction(async (trx) => {
      const appointment = await trx
        .select({
          id: AppointmentModel.id,
          patientId: AppointmentModel.patientId,
          doctorId: AppointmentModel.doctorId,
          clinicId: AppointmentModel.clinicId,
          appointmentStatus: AppointmentModel.appointmentStatus,
        })
        .from(AppointmentModel)
        .where(eq(AppointmentModel.id, appointmentId))
        .limit(1);

      if (!appointment.length) {
        throw new Error('Appointment not found');
      }

      const appointmentData = appointment[0];

      let hasAccess = false;

      switch (requestingUser.userType) {
        case 'Admin':
        case 'Receptionist':
          if (
            requestingUser.clinicId &&
            appointmentData.clinicId === requestingUser.clinicId
          ) {
            hasAccess = true;
          }
          break;

        case 'Doctor':
          if (appointmentData.doctorId === requestingUser.id) {
            hasAccess = true;
          }
          break;

        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        throw new Error(
          'You do not have permission to access this appointment'
        );
      }

      // Get main appointment with user details
      const result = await trx
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          gender: UserProfileModel.gender,
          age: UserProfileModel.age,
          dob: UserProfileModel.dob,
          alternateMobile: UserProfileModel.alternateMobile,
          address: UserProfileModel.address,
          city: UserProfileModel.city,
          state: UserProfileModel.state,
          zipCode: UserProfileModel.zipCode,
          profileImage: UserProfileModel.profileImage,
          status: UserModel.userStatus,
          updatedAt: UserModel.updatedAt,
          createdAt: UserModel.createdAt,
          appointment: {
            id: AppointmentModel.id,
            doctorId: AppointmentModel.doctorId,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            appointmentType: AppointmentModel.appointmentType,
            appointmentNotes: AppointmentClinicalModel.appointmentNotes,
            appointmentStatus: AppointmentModel.appointmentStatus,
            reReasonForCancellation: AppointmentModel.reReasonForCancellation,
            reasionForReSchedule: AppointmentModel.reasionForReSchedule,
            tokenNo: AppointmentModel.tokenNo,
            clinicServiceId: AppointmentModel.clinicServiceId,
            vitals: AppointmentClinicalModel.vitals,
            referrals: AppointmentClinicalModel.referrals,
            paymentMode: AppointmentPaymentModel.paymentMode,
            paymentStatus: AppointmentPaymentModel.paymentStatus,
            price: AppointmentPaymentModel.price,
            primaryServicePrice: AppointmentPaymentModel.primaryServicePrice,
            paymentNotes: AppointmentPaymentModel.paymentNotes,
            refundMode: AppointmentPaymentModel.refundMode,
            refundedAmount: AppointmentPaymentModel.refundedAmount,
            refundNotes: AppointmentPaymentModel.refundNotes,
            transactionId: AppointmentPaymentModel.transactionId,
            gatewayOrderId: AppointmentPaymentModel.gatewayOrderId,
            gatewayResponse: AppointmentPaymentModel.gatewayResponse,
            consentNotes: AppointmentClinicalModel.consentNotes,
            consentFile: AppointmentClinicalModel.consentFile,
            commonSymptoms: AppointmentClinicalModel.commonSymptoms,
            clinicSymptomIds: AppointmentClinicalModel.clinicSymptomIds,
            bookingSource: AppointmentModel.bookingSource,
          },
          doctor: {
            id: DoctorUser.id,
            name: DoctorUser.name,
            email: DoctorUser.email,
            mobile: DoctorUser.mobile,
            speciality: sql<string>`(SELECT speciality FROM user_professionals WHERE user_id = ${DoctorUser.id} LIMIT 1)`,
            profileImage: sql<string>`(SELECT profile_image FROM user_profiles WHERE user_id = ${DoctorUser.id} LIMIT 1)`,
          },
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .innerJoin(
          AppointmentModel,
          eq(UserModel.id, AppointmentModel.patientId)
        )
        .leftJoin(
          AppointmentPaymentModel,
          eq(AppointmentModel.id, AppointmentPaymentModel.appointmentId)
        )
        .leftJoin(
          AppointmentClinicalModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .innerJoin(DoctorUser, eq(AppointmentModel.doctorId, DoctorUser.id))

        .where(eq(AppointmentModel.id, appointmentId))
        .limit(1);

      if (!result.length) return null;

      const baseData = result[0];

      const manualPrescription = await trx
        .select({
          id: doctorManualPrescriptionModel.id,
          doctorManualPrescription:
            doctorManualPrescriptionModel.doctorManualPrescription,
          createdAt: doctorManualPrescriptionModel.createdAt,
          updatedAt: doctorManualPrescriptionModel.updatedAt,
        })
        .from(doctorManualPrescriptionModel)
        .where(eq(doctorManualPrescriptionModel.appointmentId, appointmentId))
        .limit(1);

      // Get clinic service details
      let clinicService = null;
      if (baseData.appointment.clinicServiceId) {
        const serviceResult = await trx
          .select({
            id: ClinicServiceModel.id,
            serviceName: ClinicServiceModel.serviceName,
            price: ClinicServiceModel.price,
            currency: ClinicServiceModel.currency,
            durationDays: ClinicServiceModel.durationDays,
            additionalServices: ClinicServiceModel.additionalServices,
          })
          .from(ClinicServiceModel)
          .where(
            eq(ClinicServiceModel.id, baseData.appointment.clinicServiceId)
          )
          .limit(1);

        if (serviceResult.length > 0) {
          clinicService = serviceResult[0];
        }
      }

      // Get symptom details - FIXED with proper type checking
      let symptoms: any[] = [];
      const clinicSymptomIds = baseData.appointment.clinicSymptomIds;

      // Check if clinicSymptomIds exists and is an array with items
      if (
        clinicSymptomIds &&
        Array.isArray(clinicSymptomIds) &&
        clinicSymptomIds.length > 0
      ) {
        symptoms = await trx
          .select({
            id: ClinicSymptomModel.id,
            name: ClinicSymptomModel.name,
            description: ClinicSymptomModel.description,
            status: ClinicSymptomModel.status,
          })
          .from(ClinicSymptomModel)
          .where(inArray(ClinicSymptomModel.id, clinicSymptomIds));
      }

      // Get digital prescription details (Report Card)
      const reportCards = await trx
        .select()
        .from(ReportCardModel)
        .where(eq(ReportCardModel.appointmentId, appointmentId))
        .limit(1);

      // Get prescribed medicines
      let digitalPrescriptions: any[] = [];
      if (reportCards.length > 0) {
        digitalPrescriptions = await trx
          .select({
            id: PrescriptionModel.id,
            medicineId: PrescriptionModel.medicineId,
            medicineName: PrescriptionModel.medicineName,
            composition: PrescriptionModel.composition,
            strength: PrescriptionModel.strength,
            dosage: PrescriptionModel.dosage,
            frequency: PrescriptionModel.frequency,
            duration: PrescriptionModel.duration,
            notes: PrescriptionModel.notes,
            manufacturer: PrescriptionModel.manufacturer,
            medicineCount: PrescriptionModel.medicineCount,
            marketer: PrescriptionModel.marketer,
            imageUrl: PrescriptionModel.imageUrl,
            uses: PrescriptionModel.uses,
          })
          .from(PrescriptionModel)
          .where(eq(PrescriptionModel.reportCardId, reportCards[0].id));
      }

      // Get review details if any
      const reviews = await trx
        .select({
          id: DoctorReviewsModel.id,
          rating: DoctorReviewsModel.rating,
          reviewText: DoctorReviewsModel.reviewText,
          replyText: DoctorReviewsModel.replyText,
          createdAt: DoctorReviewsModel.createdAt,
        })
        .from(DoctorReviewsModel)
        .where(eq(DoctorReviewsModel.appointmentId, appointmentId))
        .limit(1);

      // Construct final response
      return {
        ...baseData,
        clinicService: clinicService,
        symptoms: symptoms,
        manualPrescription:
          manualPrescription.length > 0 ? manualPrescription[0] : null,
        reportCard: reportCards.length > 0 ? reportCards[0] : null,
        prescriptions: digitalPrescriptions,
        review: reviews.length > 0 ? reviews[0] : null,
      };
    });
  }

  // get appointment by patient id
  static async getAppointmentByPatient(patientId: string) {
    return await database.transaction(async (trx) => {
      const result = await trx
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          gender: UserProfileModel.gender,
          age: UserProfileModel.age,
          dob: UserProfileModel.dob,
          alternateMobile: UserProfileModel.alternateMobile,
          address: UserProfileModel.address,
          city: UserProfileModel.city,
          state: UserProfileModel.state,
          zipCode: UserProfileModel.zipCode,
          profileImage: UserProfileModel.profileImage,
          status: UserModel.userStatus,
          updatedAt: UserModel.updatedAt,
          createdAt: UserModel.createdAt,
          appointment: {
            id: AppointmentModel.id,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            appointmentType: AppointmentModel.appointmentType,
            appointmentNotes: AppointmentClinicalModel.appointmentNotes,
            appointmentStatus: AppointmentModel.appointmentStatus,
            reReasonForCancellation: AppointmentModel.reReasonForCancellation,
            reasionForReSchedule: AppointmentModel.reasionForReSchedule,
            bookingSource: AppointmentModel.bookingSource,
          },
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .innerJoin(
          AppointmentModel,
          eq(UserModel.id, AppointmentModel.patientId)
        )
        .leftJoin(
          AppointmentClinicalModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .where(eq(UserModel.id, patientId))
        .limit(1); // Just in case, even though patientId should be unique

      return result.length > 0 ? result[0] : null;
    });
  }

  static async getLastPatientReportCard(patientId: string, clinicId: string) {
    return await database.transaction(async (trx) => {
      // Validate that the patient belongs to the clinic
      const isAssigned = await trx
        .select({ id: ClinicAssignModel.id })
        .from(ClinicAssignModel)
        .where(
          and(
            eq(ClinicAssignModel.userId, patientId),
            eq(ClinicAssignModel.clinicId, clinicId)
          )
        )
        .limit(1);

      if (!isAssigned.length) {
        throw new HttpError(
          403,
          'Access denied. Patient is not assigned to this clinic.'
        );
      }

      const reportCards = await trx
        .select({
          id: ReportCardModel.id,
          habits: ReportCardModel.habits,
          provisionalDiagnosis: ReportCardModel.provisionalDiagnosis,
          allergies: ReportCardModel.allergies,
          createdAt: ReportCardModel.createdAt,
          appointmentId: ReportCardModel.appointmentId,
          appointmentDate: AppointmentModel.appointmentDate,
        })
        .from(ReportCardModel)
        .leftJoin(
          AppointmentModel,
          eq(ReportCardModel.appointmentId, AppointmentModel.id)
        )
        .leftJoin(
          alias(UserModel, 'doctor'),
          eq(AppointmentModel.doctorId, alias(UserModel, 'doctor').id)
        )
        .where(
          and(
            eq(ReportCardModel.petientId, patientId),
            eq(AppointmentModel.clinicId, clinicId)
          )
        )
        .orderBy(desc(ReportCardModel.createdAt))
        .limit(1);

      if (!reportCards.length) {
        return null;
      }

      const reportCard = reportCards[0];

      return {
        id: reportCard.id,
        appointmentId: reportCard.appointmentId,
        appointmentDate: reportCard.appointmentDate,
        habits: reportCard.habits,
        provisionalDiagnosis: reportCard.provisionalDiagnosis,
        allergies: reportCard.allergies,
        createdAt: reportCard.createdAt,
      };
    });
  }

  // get appointment by doctor id
  static async getAppointmentByDoctor(doctorId: string) {
    return await database.transaction(async (trx) => {
      const result = await trx
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          gender: UserProfileModel.gender,
          age: UserProfileModel.age,
          dob: UserProfileModel.dob,
          alternateMobile: UserProfileModel.alternateMobile,
          address: UserProfileModel.address,
          city: UserProfileModel.city,
          state: UserProfileModel.state,
          zipCode: UserProfileModel.zipCode,
          profileImage: UserProfileModel.profileImage,
          status: UserModel.userStatus,
          updatedAt: UserModel.updatedAt,
          createdAt: UserModel.createdAt,
          appointment: {
            id: AppointmentModel.id,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            appointmentType: AppointmentModel.appointmentType,
            appointmentNotes: AppointmentClinicalModel.appointmentNotes,
            appointmentStatus: AppointmentModel.appointmentStatus,
            reReasonForCancellation: AppointmentModel.reReasonForCancellation,
            reasionForReSchedule: AppointmentModel.reasionForReSchedule,
            bookingSource: AppointmentModel.bookingSource,
          },
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .innerJoin(
          AppointmentModel,
          eq(UserModel.id, AppointmentModel.doctorId)
        )
        .leftJoin(
          AppointmentClinicalModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .where(eq(UserModel.id, doctorId))
        .limit(1); // Just in case, even though doctorId should be unique

      return result.length > 0 ? result[0] : null;
    });
  }

  // normalize date to yyyy-mm-dd
  static normalizeToDateOnly(dateLike: string) {
    // Accept either "YYYY-MM-DD" or a full ISO and return "YYYY-MM-DD"
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) {
      // fallback: try to extract yyyy-mm-dd
      const m = String(dateLike).match(/(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : null;
    }
    // Use UTC date to avoid local timezone shifts when storing/comparing day
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // convert hh:mm to minutes since midnight
  static hhmmToMinutes(hhmm: string | null | undefined) {
    if (!hhmm) return null;
    const s = String(hhmm).trim();

    // handle "hh:mm" (24-hour)
    const plainMatch = s.match(/^(\d{1,2}):(\d{2})$/);
    if (plainMatch) {
      const h = Number(plainMatch[1]);
      const m = Number(plainMatch[2]);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    }

    // handle "hh:mm AM/PM"
    const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampmMatch) {
      let h = Number(ampmMatch[1]);
      const m = Number(ampmMatch[2]);
      const meridiem = ampmMatch[3].toUpperCase();
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      if (meridiem === 'AM') {
        if (h === 12) h = 0;
      } else {
        if (h !== 12) h += 12;
      }
      return h * 60 + m;
    }

    // fallback: extract digits
    const fallback = s.match(/(\d{1,2}):(\d{2})/);
    if (fallback) {
      const h = Number(fallback[1]);
      const m = Number(fallback[2]);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    }

    return null;
  }

  // convert minutes since midnight to hh:mm
  static minutesToIso(dateOnlyYMD: string, minutesSinceMidnight: number) {
    const hh = Math.floor(minutesSinceMidnight / 60)
      .toString()
      .padStart(2, '0');
    const mm = (minutesSinceMidnight % 60).toString().padStart(2, '0');
    // dateOnlyYMD must be "YYYY-MM-DD"
    return `${dateOnlyYMD}T${hh}:${mm}:00`;
  }

  // check if two time ranges overlap
  static rangesOverlap(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number
  ) {
    // use <= to treat touching boundaries as overlap
    return aStart < bEnd && bStart <= aEnd;
  }

  // Add small helpers (inside same class, near other helpers)
  static appointmentFullyContainsSlot(
    apptStart: number,
    apptEnd: number,
    slotStart: number,
    slotEnd: number
  ) {
    return apptStart <= slotStart && apptEnd >= slotEnd;
  }

  // check if appointment starts at slot time
  static appointmentStartsAtSlot(apptStart: number, slotStart: number) {
    return apptStart === slotStart;
  }

  static async getAvailableSlotsForDate(
    clinicId: string,
    query: getAvailableSlotsForDateDto & {
      onlyOccupied?: boolean;
      occupyMode?: 'partial' | 'full' | 'start';
    } = {
      onlyOccupied: false,
      occupyMode: 'partial',
      date: new Date().toISOString().split('T')[0],
    },
    params: getAvailableSlotsForParamsDto
  ): Promise<{ slots: Slot[]; shifts?: string[] }> {
    return await database.transaction(async (tx) => {
      const rawDate = typeof query === 'string' ? query : (query as any)?.date;
      const dateStr = this.normalizeToDateOnly(rawDate);
      if (!dateStr) return { slots: [] };

      const startOfDay = new Date(`${dateStr}T00:00:00Z`);
      const nextDay = new Date(startOfDay);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      let finalSlots: Slot[] = [];
      let shifts: string[] = [];
      let isTokenBooking = false; // Add flag to track if we've already processed token booking

      // Helper function to format time for display (12-hour format with AM/PM)
      const formatTimeForDisplay = (timeStr: string): string => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      };

      // Helper function to convert minutes to time string (HH:MM)
      const minutesToTimeStr = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };

      // Helper function to calculate shifts from availability and breaks
      const calculateShifts = (
        availStart: string | null,
        availEnd: string | null,
        breaks: { startTime: string | null; endTime: string | null }[]
      ): string[] => {
        // Return empty array if start or end is null
        if (!availStart || !availEnd) return [];

        const shiftsArray: string[] = [];

        // Convert times to minutes for comparison
        const availStartMin = this.hhmmToMinutes(availStart);
        const availEndMin = this.hhmmToMinutes(availEnd);

        if (availStartMin === null || availEndMin === null) return [];

        // Filter breaks that have valid start and end times
        const validBreaks = breaks
          .filter((b) => b.startTime && b.endTime)
          .map((b) => ({
            start: this.hhmmToMinutes(b.startTime as string),
            end: this.hhmmToMinutes(b.endTime as string),
            startTime: b.startTime as string,
            endTime: b.endTime as string,
          }))
          .filter((b) => b.start !== null && b.end !== null) as {
          start: number;
          end: number;
          startTime: string;
          endTime: string;
        }[];

        // Sort breaks by start time
        validBreaks.sort((a, b) => a.start - b.start);

        let currentStart = availStartMin;

        for (const breakItem of validBreaks) {
          const breakStart = breakItem.start;
          const breakEnd = breakItem.end;

          // If there's a gap before this break, add as a shift
          if (currentStart < breakStart) {
            shiftsArray.push(
              `${formatTimeForDisplay(minutesToTimeStr(currentStart))} - ${formatTimeForDisplay(minutesToTimeStr(breakStart))}`
            );
          }

          // Move current start to after the break
          currentStart = Math.max(currentStart, breakEnd);
        }

        // Add final shift after all breaks
        if (currentStart < availEndMin) {
          shiftsArray.push(
            `${formatTimeForDisplay(minutesToTimeStr(currentStart))} - ${formatTimeForDisplay(minutesToTimeStr(availEndMin))}`
          );
        }

        return shiftsArray;
      };

      // 1️⃣ Check if this doctor/clinic/day uses token-based booking (noOfPatients)
      const weekdayForToken = new Date(
        `${dateStr}T00:00:00Z`
      ).toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'UTC',
      });

      const tokenAvailRows = await tx
        .select()
        .from(ClinicAvailability)
        .where(
          and(
            eq(ClinicAvailability.clinicId, clinicId),
            eq(ClinicAvailability.doctorId, params.doctorId),
            eq(ClinicAvailability.dayOfWeek, weekdayForToken),
            eq(ClinicAvailability.isAvailable, true)
          )
        );

      let tokenCapacity = 0;
      let tokenClinicAvailabilityId: string | null = null;
      for (const row of tokenAvailRows) {
        const n = (row as any).noOfPatients as number | null | undefined;
        if (typeof n === 'number' && n > tokenCapacity) {
          tokenCapacity = n;
          tokenClinicAvailabilityId = (row as any).id as string;
        }
      }

      const dateUnavailable = await tx
        .select()
        .from(ClinicDateAvailability)
        .where(
          and(
            eq(ClinicDateAvailability.clinicId, clinicId),
            eq(ClinicDateAvailability.doctorId, params.doctorId),
            eq(ClinicDateAvailability.date, startOfDay)
          )
        );

      // If date availability record exists and is NOT true (either false or null), skip token booking
      const shouldSkipToken =
        dateUnavailable.length > 0 &&
        (dateUnavailable[0].isAvailable === false ||
          dateUnavailable[0].isAvailable === null);

      if (tokenCapacity > 0 && tokenClinicAvailabilityId && !shouldSkipToken) {
        isTokenBooking = true; // Set flag that this is a token booking

        const apptStatuses = [
          'Confirmed',
          'Patient Arrived',
          'Pending',
          'Rescheduled',
          'Upcoming',
          'Completed',
        ] as const;
        const booked = await tx
          .select({
            id: AppointmentModel.id,
            tokenNo: AppointmentModel.tokenNo,
            appointmentStatus: AppointmentModel.appointmentStatus,
            patientId: AppointmentModel.patientId,
          })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.clinicId, clinicId),
              eq(AppointmentModel.doctorId, params.doctorId),
              gte(AppointmentModel.appointmentDate, startOfDay),
              lt(AppointmentModel.appointmentDate, nextDay),
              inArray(AppointmentModel.appointmentStatus, apptStatuses)
            )
          );

        const bookedMap = new Map<number, (typeof booked)[number]>();
        const bookedTokens: number[] = [];
        for (const b of booked) {
          const t =
            b.tokenNo == null ? null : Number(b.tokenNo as unknown as number);
          if (t && Number.isFinite(t)) {
            bookedMap.set(t, b);
            bookedTokens.push(t);
          }
        }

        const tokens: Slot['tokens'] = Array.from(
          { length: tokenCapacity },
          (_, i) => {
            const tokenNo = i + 1;
            const b = bookedMap.get(tokenNo);
            return b
              ? {
                  tokenNo,
                  status:
                    b.appointmentStatus === 'Confirmed' ||
                    b.appointmentStatus === 'Patient Arrived'
                      ? 'booked'
                      : 'reserved',
                  appointmentId: b.id,
                  appointmentStatus: b.appointmentStatus,
                  patientId: b.patientId,
                }
              : { tokenNo, status: 'available' as const };
          }
        );

        // Calculate autoToken
        let autoToken: number | '-' = '-';

        if (bookedTokens.length > 0) {
          bookedTokens.sort((a, b) => a - b);
          const highestBooked = Math.max(...bookedTokens);

          for (let t = highestBooked + 1; t <= tokenCapacity; t++) {
            if (!bookedMap.has(t)) {
              autoToken = t;
              break;
            }
          }
        } else {
          autoToken = 1;
        }

        if (autoToken !== '-' && bookedMap.has(autoToken)) {
          autoToken = '-';
        }

        if (bookedMap.size === tokenCapacity) {
          autoToken = '-';
        }

        const availRow = tokenAvailRows.find(
          (r: any) => r.id === tokenClinicAvailabilityId
        );

        if (!availRow?.startTime || !availRow?.endTime) {
          throw new Error('Start time or End time missing');
        }

        const start24 = convertTo24Hour(availRow.startTime);
        const end24 = convertTo24Hour(availRow.endTime);

        const start = `${dateStr}T${start24}:00`;
        const end = `${dateStr}T${end24}:00`;

        // Calculate shifts for token-based booking
        const breaks = await tx
          .select()
          .from(ClinicAvailabilityBreak)
          .where(
            and(
              eq(
                ClinicAvailabilityBreak.clinicAvailabilityId,
                tokenClinicAvailabilityId
              ),
              eq(ClinicAvailabilityBreak.status, true)
            )
          );

        const calculatedShifts = calculateShifts(
          availRow.startTime,
          availRow.endTime,
          breaks
        );

        if (calculatedShifts.length > 0) {
          shifts = calculatedShifts;
        }

        const slot = {
          start: start,
          end: end,
          clinicAvailabilityId: tokenClinicAvailabilityId,
          source: 'availability' as const,
          status: 'available' as const,
          tokens: tokens ?? [],
          totalTokens: tokenCapacity,
          availableTokens: (tokens ?? []).filter(
            (t) => t.status === 'available'
          ).length,
          autoToken: autoToken,
        };

        finalSlots.push(slot);
      }

      // Only process non-token bookings if we haven't already processed a token booking
      if (!isTokenBooking) {
        const dateAvail = await tx
          .select()
          .from(ClinicDateAvailability)
          .where(
            and(
              eq(ClinicDateAvailability.clinicId, clinicId),
              eq(ClinicDateAvailability.doctorId, params.doctorId),
              eq(ClinicDateAvailability.date, startOfDay)
            )
          );

        if (dateAvail.length > 0) {
          const da = dateAvail[0];
          if (da.isAvailable) {
            const dateAvailTimeSlots = await tx
              .select()
              .from(ClinicDateAvailabilityTimeSlots)
              .where(
                and(
                  eq(
                    ClinicDateAvailabilityTimeSlots.clinicDateAvailabilityId,
                    da.id
                  ),
                  eq(ClinicDateAvailabilityTimeSlots.isAvailable, true)
                )
              );

            if (dateAvailTimeSlots.length > 0) {
              const slotDuration = Number(da.slotMinutes) || 30;
              const bufferMinutes = Number(da.stepMinutes) || 0;
              const stepDuration = slotDuration + bufferMinutes;

              // Added //
              const apptStatuses = [
                'Confirmed',
                'Patient Arrived',
                'Pending',
                'Rescheduled',
                'Upcoming',
                'Completed',
              ] as const;
              const appointments = await tx
                .select({
                  id: AppointmentModel.id,
                  appointmentTime: AppointmentModel.appointmentTime,
                  appointmentDurationMinutes:
                    AppointmentModel.appointmentDurationMinutes,
                  appointmentStatus: AppointmentModel.appointmentStatus,
                  patientId: AppointmentModel.patientId,
                })
                .from(AppointmentModel)
                .where(
                  and(
                    eq(AppointmentModel.clinicId, clinicId),
                    eq(AppointmentModel.doctorId, params.doctorId),
                    gte(AppointmentModel.appointmentDate, startOfDay),
                    lt(AppointmentModel.appointmentDate, nextDay),
                    inArray(AppointmentModel.appointmentStatus, apptStatuses)
                  )
                );

              const appointmentRanges = (appointments || [])
                .map((a: any) => {
                  const startMin = this.hhmmToMinutes(a.appointmentTime);
                  if (startMin == null) return null;
                  const duration = Math.max(
                    1,
                    Number(a.appointmentDurationMinutes) || 30
                  );
                  return {
                    start: startMin,
                    end: startMin + duration,
                    id: a.id,
                    status: a.appointmentStatus,
                    patientId: a.patientId,
                  };
                })
                .filter(Boolean);
              // Added //

              for (const ts of dateAvailTimeSlots) {
                const startTimeMinutes = this.hhmmToMinutes(ts.startTime);
                const endTimeMinutes = this.hhmmToMinutes(ts.endTime);

                if (startTimeMinutes === null || endTimeMinutes === null) {
                  continue;
                }

                for (
                  let s = startTimeMinutes;
                  s < endTimeMinutes;
                  s += stepDuration
                ) {
                  const e = s + slotDuration;
                  if (e > endTimeMinutes) continue;

                  // finalSlots.push({
                  //   start: this.minutesToIso(dateStr, s),
                  //   end: this.minutesToIso(dateStr, e),
                  //   clinicAvailabilityId: da.id,
                  //   source: 'availability',
                  //   status: 'available',
                  // });

                  // Added //
                  const overlappingAppt = appointmentRanges.find(
                    (ar) => ar && ar.start < e && ar.end > s
                  );

                  if (overlappingAppt) {
                    finalSlots.push({
                      start: this.minutesToIso(dateStr, s),
                      end: this.minutesToIso(dateStr, e),
                      clinicAvailabilityId: da.id,
                      source: 'appointment',
                      status:
                        overlappingAppt.status === 'Confirmed' ||
                        overlappingAppt.status === 'Patient Arrived'
                          ? 'booked'
                          : 'reserved',
                      appointmentId: overlappingAppt.id,
                      appointmentStatus: overlappingAppt.status,
                      patientId: overlappingAppt.patientId,
                    });
                  } else {
                    finalSlots.push({
                      start: this.minutesToIso(dateStr, s),
                      end: this.minutesToIso(dateStr, e),
                      clinicAvailabilityId: da.id,
                      source: 'availability',
                      status: 'available',
                    });
                  }
                  // Added //
                }
              }
            }
          }
        } else {
          const weekday = new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(
            'en-US',
            {
              weekday: 'long',
              timeZone: 'UTC',
            }
          );

          const availRows = await tx
            .select()
            .from(ClinicAvailability)
            .where(
              and(
                eq(ClinicAvailability.clinicId, clinicId),
                eq(ClinicAvailability.doctorId, params.doctorId),
                eq(ClinicAvailability.dayOfWeek, weekday),
                eq(ClinicAvailability.isAvailable, true)
              )
            );

          if (availRows && availRows.length > 0) {
            // If day availability is token-based, return token availability instead of time slots
            const tokenCapacity = Number((availRows[0] as any).noOfPatients);
            if (Number.isFinite(tokenCapacity) && tokenCapacity > 0) {
              // This is the duplicate token booking - we should skip it since we already handled token bookings above
              // Instead of creating a slot here, we'll just set the shifts

              // Calculate shifts for this availability
              const breaks = await tx
                .select()
                .from(ClinicAvailabilityBreak)
                .where(
                  and(
                    eq(
                      ClinicAvailabilityBreak.clinicAvailabilityId,
                      availRows[0].id
                    ),
                    eq(ClinicAvailabilityBreak.status, true)
                  )
                );

              const calculatedShifts = calculateShifts(
                availRows[0].startTime,
                availRows[0].endTime,
                breaks
              );

              // Only set shifts if not already set
              if (calculatedShifts.length > 0 && shifts.length === 0) {
                shifts = calculatedShifts;
              }

              // Skip creating the duplicate slot
              return {
                slots: finalSlots,
                shifts: shifts.length > 0 ? shifts : undefined,
              };
            } else {
              // Non-token based availability
              const availIds = availRows.map((r: any) => r.id);

              const breaks = await tx
                .select()
                .from(ClinicAvailabilityBreak)
                .where(
                  and(
                    inArray(
                      ClinicAvailabilityBreak.clinicAvailabilityId,
                      availIds
                    ),
                    eq(ClinicAvailabilityBreak.status, true)
                  )
                );

              // Calculate shifts for the main availability
              if (availRows.length > 0 && shifts.length === 0) {
                const calculatedShifts = calculateShifts(
                  availRows[0].startTime,
                  availRows[0].endTime,
                  breaks
                );
                if (calculatedShifts.length > 0) {
                  shifts = calculatedShifts;
                }
              }

              const apptStatuses = [
                'Confirmed',
                'Patient Arrived',
                'Pending',
                'Rescheduled',
                'Upcoming',
                'Completed',
              ] as const;

              const appointments = await tx
                .select({
                  id: AppointmentModel.id,
                  appointmentTime: AppointmentModel.appointmentTime,
                  appointmentDurationMinutes:
                    AppointmentModel.appointmentDurationMinutes,
                  appointmentStatus: AppointmentModel.appointmentStatus,
                  patientId: AppointmentModel.patientId,
                })
                .from(AppointmentModel)
                .where(
                  and(
                    eq(AppointmentModel.clinicId, clinicId),
                    eq(AppointmentModel.doctorId, params.doctorId),
                    gte(AppointmentModel.appointmentDate, startOfDay),
                    lt(AppointmentModel.appointmentDate, nextDay),
                    inArray(AppointmentModel.appointmentStatus, apptStatuses)
                  )
                );

              const appointmentRanges = (appointments || [])
                .map((a: any) => {
                  const startMin = this.hhmmToMinutes(a.appointmentTime);
                  if (startMin == null) return null;
                  const duration = Math.max(
                    1,
                    Number(a.appointmentDurationMinutes) || 30
                  );
                  return {
                    start: startMin,
                    end: startMin + duration,
                    id: a.id,
                    status: a.appointmentStatus,
                    patientId: a.patientId,
                  };
                })
                .filter(Boolean);

              const breaksByAvail: Record<
                string,
                {
                  start: number;
                  end: number;
                  id?: string;
                  breakType?: string;
                }[]
              > = {};
              for (const b of breaks || []) {
                if (!b.startTime || !b.endTime) continue;
                const s = this.hhmmToMinutes(b.startTime);
                const e = this.hhmmToMinutes(b.endTime);
                if (s == null || e == null) continue;
                if (!breaksByAvail[b.clinicAvailabilityId])
                  breaksByAvail[b.clinicAvailabilityId] = [];
                breaksByAvail[b.clinicAvailabilityId].push({
                  start: s,
                  end: e,
                  id: b.id,
                  breakType: b.breakType,
                });
              }

              for (const avail of availRows) {
                const availId = avail.id;
                const startMin = this.hhmmToMinutes(avail.startTime);
                const endMin = this.hhmmToMinutes(avail.endTime);
                if (startMin == null || endMin == null) continue;

                const breakRanges = breaksByAvail[availId] ?? [];
                const slotMinutes = Number(avail.slotMinutes) || 30;
                const bufferMinutes = Number(avail.stepMinutes) || 0;

                // Build a sorted list of all blockers (appointments + breaks) for this avail
                const allBlockers: {
                  start: number;
                  end: number;
                  type: 'appointment' | 'break';
                  data: any;
                }[] = [
                  ...appointmentRanges
                    .filter(
                      (ar) => ar && ar.start < endMin && ar.end > startMin
                    )
                    .map((ar) => ({
                      start: ar!.start,
                      end: ar!.end,
                      type: 'appointment' as const,
                      data: ar,
                    })),
                  ...breakRanges
                    .filter((br) => br.start < endMin && br.end > startMin)
                    .map((br) => ({
                      start: br.start,
                      end: br.end,
                      type: 'break' as const,
                      data: br,
                    })),
                ].sort((a, b) => a.start - b.start);

                /**
                 * Dynamic cursor approach:
                 * - cursor starts at availability start.
                 * - At each position, attempt to place a full slotMinutes slot.
                 * - If a blocker starts before the slot ends:
                 *   - Emit the booked/break block.
                 *   - Advance cursor to max(blockerEnd + bufferMinutes, next natural grid pos).
                 *     This ensures the NEXT slot starts right after the blocker ends
                 *     (plus any buffer), NOT stuck at the old fixed-grid position.
                 * - If no blocker: emit available slot, advance by slotMinutes + bufferMinutes.
                 */
                let cursor = startMin;
                let blockerIndex = 0;

                while (cursor + slotMinutes <= endMin) {
                  const slotEnd = cursor + slotMinutes;

                  // Advance blocker index to first blocker that ends after cursor
                  while (
                    blockerIndex < allBlockers.length &&
                    allBlockers[blockerIndex].end <= cursor
                  ) {
                    blockerIndex++;
                  }

                  const nextBlocker =
                    blockerIndex < allBlockers.length
                      ? allBlockers[blockerIndex]
                      : null;

                  // No blocker overlaps this slot — fully available
                  if (!nextBlocker || nextBlocker.start >= slotEnd) {
                    finalSlots.push({
                      start: this.minutesToIso(dateStr, cursor),
                      end: this.minutesToIso(dateStr, slotEnd),
                      clinicAvailabilityId: availId,
                      source: 'availability',
                      status: 'available',
                    });
                    cursor = slotEnd + bufferMinutes;
                    continue;
                  }

                  // Emit the booked/break block (clipped to [cursor, endMin])
                  const blockStart = Math.max(nextBlocker.start, cursor);
                  const blockEnd = Math.min(nextBlocker.end, endMin);

                  if (blockStart < blockEnd) {
                    if (nextBlocker.type === 'appointment') {
                      finalSlots.push({
                        start: this.minutesToIso(dateStr, blockStart),
                        end: this.minutesToIso(dateStr, blockEnd),
                        clinicAvailabilityId: availId,
                        source: 'appointment',
                        status:
                          nextBlocker.data.status === 'Confirmed' ||
                          nextBlocker.data.status === 'Patient Arrived'
                            ? 'booked'
                            : 'reserved',
                        appointmentId: nextBlocker.data.id,
                        appointmentStatus: nextBlocker.data.status,
                        patientId: nextBlocker.data.patientId,
                      });
                    } else {
                      finalSlots.push({
                        start: this.minutesToIso(dateStr, blockStart),
                        end: this.minutesToIso(dateStr, blockEnd),
                        clinicAvailabilityId: availId,
                        source: 'break',
                        status: 'break',
                        breakId: nextBlocker.data.id,
                        breakType: nextBlocker.data.breakType,
                      });
                    }
                  }

                  // Advance cursor to right after the blocker ends (+ buffer),
                  // so the next available slot starts immediately after.
                  cursor = blockEnd + bufferMinutes;
                  blockerIndex++;
                }
              }
            }
          }
        }
      }

      // If caller asked only for occupied slots (appointments), filter
      if ((query as any).onlyOccupied ?? false) {
        finalSlots = finalSlots.filter((x) => x.source === 'appointment');
      }

      // Remove past slots for today based on the time provided (IST)
      const thresholdTime = query.time;
      if (!isTokenBooking && thresholdTime && dateStr) {
        const thresholdMinutes = this.hhmmToMinutes(thresholdTime);
        if (thresholdMinutes !== null) {
          const now = new Date();
          const istTodayYMD = now
            .toLocaleDateString('en-GB', {
              timeZone: 'Asia/Kolkata',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
            .split('/')
            .reverse()
            .join('-');

          if (dateStr === istTodayYMD) {
            finalSlots = finalSlots.filter((s) => {
              const slotTimePart = s.start.split('T')[1];
              const slotMinutes = this.hhmmToMinutes(slotTimePart);
              return slotMinutes !== null && slotMinutes > thresholdMinutes;
            });
          }
        }
      }

      finalSlots.sort((a, b) => (a.start < b.start ? -1 : 1));

      // Return slots with shifts array at the root level
      const result: { slots: Slot[]; shifts?: string[] } = {
        slots: finalSlots,
      };

      if (shifts.length > 0) result.shifts = shifts;

      return result;
    });
  }

  static async createGalleryImage(
    doctorId: string,
    imageUrl: string,
    data: CreatePatientGalleryDto
  ) {
    const [result] = await database
      .insert(patientGallery)
      .values({
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        doctorId: doctorId,
        imageUrl,
        description: data.description,
      })
      .returning();

    return result;
  }

  static async getPatientGallery(
    patientId?: string,
    appointmentId?: string,
    page: number = 1,
    limit: number = 30
  ) {
    const offset = (page - 1) * limit;

    // Get total count
    let total = 0;
    if (patientId && appointmentId) {
      const countResult = await database
        .select({ count: sql<number>`count(*)` })
        .from(patientGallery)
        .where(
          and(
            eq(patientGallery.patientId, patientId),
            eq(patientGallery.appointmentId, appointmentId)
          )
        );
      total = Number(countResult[0]?.count) || 0;
    } else if (patientId) {
      const countResult = await database
        .select({ count: sql<number>`count(*)` })
        .from(patientGallery)
        .where(eq(patientGallery.patientId, patientId));
      total = Number(countResult[0]?.count) || 0;
    } else if (appointmentId) {
      const countResult = await database
        .select({ count: sql<number>`count(*)` })
        .from(patientGallery)
        .where(eq(patientGallery.appointmentId, appointmentId));
      total = Number(countResult[0]?.count) || 0;
    } else {
      const countResult = await database
        .select({ count: sql<number>`count(*)` })
        .from(patientGallery);
      total = Number(countResult[0]?.count) || 0;
    }

    let data: any[] = [];
    if (patientId && appointmentId) {
      data = await database
        .select()
        .from(patientGallery)
        .where(
          and(
            eq(patientGallery.patientId, patientId),
            eq(patientGallery.appointmentId, appointmentId)
          )
        )
        .orderBy(desc(patientGallery.createdAt))
        .limit(limit)
        .offset(offset);
    } else if (patientId) {
      data = await database
        .select()
        .from(patientGallery)
        .where(eq(patientGallery.patientId, patientId))
        .orderBy(desc(patientGallery.createdAt))
        .limit(limit)
        .offset(offset);
    } else if (appointmentId) {
      data = await database
        .select()
        .from(patientGallery)
        .where(eq(patientGallery.appointmentId, appointmentId))
        .orderBy(desc(patientGallery.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      data = await database
        .select()
        .from(patientGallery)
        .orderBy(desc(patientGallery.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getGalleryImageById(id: string) {
    const [result] = await database
      .select()
      .from(patientGallery)
      .where(eq(patientGallery.id, id));

    return result;
  }

  static async deleteGalleryImage(id: string, doctorId: string) {
    const image = await this.getGalleryImageById(id);

    if (!image) {
      throw new HttpError(404, 'Image not found');
    }

    if (image.doctorId != doctorId) {
      throw new HttpError(403, 'You do not have access to delete this image.');
    }

    if (image.imageUrl) {
      await deleteFromS3(image.imageUrl);
    }

    const [result] = await database
      .delete(patientGallery)
      .where(eq(patientGallery.id, id))
      .returning();

    return result;
  }

  static async deleteGalleryImagesByAppointment(
    appointmentId: string,
    doctorId: string
  ) {
    const [appointment] = await database
      .select()
      .from(AppointmentModel)
      .where(eq(AppointmentModel.id, appointmentId));

    if (!appointment) {
      throw new HttpError(404, 'Appointment not found');
    }

    if (appointment.doctorId !== doctorId) {
      throw new HttpError(403, 'You do not have access to delete this images.');
    }

    const { data: images } = await this.getPatientGallery(
      undefined,
      appointmentId
    );

    for (const image of images) {
      if (image.imageUrl) {
        await deleteFromS3(image.imageUrl);
      }
    }

    const result = await database
      .delete(patientGallery)
      .where(eq(patientGallery.appointmentId, appointmentId))
      .returning();

    return result;
  }

  static async createDoctorGalleryImage(doctorId: string, imageUrl: string) {
    const [result] = await database
      .insert(doctorGallery)
      .values({
        doctorId: doctorId,
        imageUrl: imageUrl,
      })
      .returning();

    return result;
  }

  static async getDoctorGallery(
    doctorId: string,
    page: number = 1,
    limit: number = 30
  ) {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(doctorGallery)
      .where(eq(doctorGallery.doctorId, doctorId));

    const total = Number(countResult[0]?.count) || 0;

    // Get paginated data
    const data = await database
      .select()
      .from(doctorGallery)
      .where(eq(doctorGallery.doctorId, doctorId))
      .orderBy(desc(doctorGallery.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getDoctorGalleryImageById(id: string) {
    const [result] = await database
      .select()
      .from(doctorGallery)
      .where(eq(doctorGallery.id, id));

    return result;
  }

  static async deleteDoctorGalleryImage(id: string, doctorId: string) {
    const image = await this.getDoctorGalleryImageById(id);

    if (!image) {
      throw new HttpError(404, 'Image not found');
    }

    if (image.doctorId !== doctorId) {
      throw new HttpError(403, 'You do not have access to delete this image.');
    }

    if (image.imageUrl) {
      await deleteFromS3(image.imageUrl);
    }

    // Delete from database
    const [result] = await database
      .delete(doctorGallery)
      .where(eq(doctorGallery.id, id))
      .returning();

    return result;
  }

  private static basePath = path.join(process.cwd(), 'public', 'Doctor Images');

  static async getDoctorGalleryFromLocal(
    doctorId: string,
    page: number = 1,
    limit: number = 30
  ) {
    try {
      // Get doctor's specialty
      const specialtyResult = await database
        .select({ specialty: UserProfessionalModel.speciality })
        .from(UserModel)
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, UserModel.id)
        )
        .where(eq(UserModel.id, doctorId));

      const doctorSpecialty =
        specialtyResult[0]?.specialty || 'General Physician';

      const baseUrl =
        'https://infninity-medisatu.s3.ap-south-1.amazonaws.com/docoter_refernce_images/Doctor%20Images';

      // Check each image with HEAD request
      const validImages: {
        id: string;
        url: string;
        filename: string;
        size: number;
        mimeType: string;
        createdAt: Date;
      }[] = [];

      const checkPromises: Promise<void>[] = [];

      for (let i = 1; i <= 20; i++) {
        const filename = `${doctorSpecialty}${i}.jpg`;
        const url = `${baseUrl}/${encodeURIComponent(doctorSpecialty)}/${encodeURIComponent(filename)}`;

        const checkPromise = fetch(url, { method: 'HEAD' })
          .then((response) => {
            if (response.ok) {
              validImages.push({
                id: filename,
                url: url,
                filename: filename,
                size: 0,
                mimeType: 'image/jpeg',
                createdAt: new Date(),
              });
            }
          })
          .catch(() => {
            // Image doesn't exist, skip
          });

        checkPromises.push(checkPromise);
      }

      await Promise.all(checkPromises);

      if (validImages.length === 0) {
        return {
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      validImages.sort((a, b) => {
        const numA = parseInt(a.filename.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.filename.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

      const total = validImages.length;
      const offset = (page - 1) * limit;
      const paginatedFiles = validImages.slice(offset, offset + limit);

      return {
        data: paginatedFiles,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching doctor gallery:', error);
      return {
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  }

  static async getMedicalCertificate(appointmentId: string) {
    const [result] = await database
      .select()
      .from(medicalCertificateModel)
      .where(eq(medicalCertificateModel.appointmentId, appointmentId));

    return result;
  }

  static async upsertMedicalCertificate(
    appointmentId: string,
    medicalCondition?: string,
    restDays?: number,
    notes?: string[] | null
  ) {
    try {
      const now = new Date();

      const existingCertificate = await database
        .select()
        .from(medicalCertificateModel)
        .where(eq(medicalCertificateModel.appointmentId, appointmentId))
        .limit(1);

      if (existingCertificate.length > 0) {
        const updateData: any = {
          updatedAt: now,
        };

        if (medicalCondition !== undefined)
          updateData.medicalCondition = medicalCondition;
        if (restDays !== undefined) updateData.restDays = restDays;
        if (notes !== undefined) updateData.notes = notes;

        const [updatedCertificate] = await database
          .update(medicalCertificateModel)
          .set(updateData)
          .where(eq(medicalCertificateModel.appointmentId, appointmentId))
          .returning();

        return updatedCertificate;
      } else {
        const [newCertificate] = await database
          .insert(medicalCertificateModel)
          .values({
            appointmentId: appointmentId,
            medicalCondition: medicalCondition || '',
            restDays: restDays || 0,
            notes: notes || [],
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return newCertificate;
      }
    } catch {
      throw new HttpError(
        500,
        'An unexpected error occurred while saving medical certificate'
      );
    }
  }
}
