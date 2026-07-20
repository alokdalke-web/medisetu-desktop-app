/* eslint-disable @typescript-eslint/no-explicit-any */
// services/dashboard.service.ts
import {
  and,
  between,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  sql,
  or,
  gt,
  isNull,
} from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import redisClient from '../../../configurations/redisConfig';
import { AuthUser } from '../../../middlewear/auth.middleware';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import { AppointmentPaymentModel } from '../../appointments/models/appointment-payment.model';
import { AppointmentClinicalModel } from '../../appointments/models/appointment-clinical.model';
import { AppointmentService } from '../../appointments/services/appointment.service';
import { ClinicSymptomCountModel } from '../../clinic/models/clinic-symptom-count.model';
import { ClinicSymptomModel } from '../../clinic/models/clinic-symptom.model';
import {
  ClinicAppointmentPlainModel,
  ClinicAssignModel,
  ClinicModel,
} from '../../clinic/models/clinic.model';
import {
  ClinicSubscriptionModel,
  SubscriptionPlanModel,
} from '../../subscription/models/subscription.model';
import { UserModel } from '../../users/models/user.model';
import { UserProfileModel } from '../../users/models/userProfile.model';

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonths(d: Date, months: number) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m + months, 1));
}
function formatLabel(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class DashboardService {
  /**
   * Return completed appointments aggregated by date using Drizzle.
   * - clinicId: required
   * - opts:
   *    - days: number of days back from now (default 30)
   *    - startDate, endDate: Date or ISO string to override range (inclusive)
   */
  static async getCompletedAppointmentsByDate(
    clinicId: string,
    opts?: {
      days?: number;
      startDate?: string | Date;
      endDate?: string | Date;
    }
  ) {
    const days = opts?.days ?? 30;
    const now = new Date();
    const end = opts?.endDate ? new Date(opts.endDate) : now;
    end.setHours(23, 59, 59, 999);

    let start: Date;
    if (opts?.startDate) {
      start = new Date(opts.startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
    }

    // Query to get completed appointments grouped by date
    let rows: Array<any> = [];
    try {
      rows = await database
        .select({
          date: sql`DATE(${AppointmentModel.appointmentDate})`,
          count: sql`COUNT(*)::int`,
        })
        .from(AppointmentModel)
        .where(
          and(
            eq(AppointmentModel.appointmentStatus, 'Completed'),
            eq(AppointmentModel.clinicId, clinicId),
            gte(AppointmentModel.appointmentDate, start),
            lte(AppointmentModel.appointmentDate, end)
          )
        )
        .groupBy(sql`DATE(${AppointmentModel.appointmentDate})`)
        .orderBy(sql`DATE(${AppointmentModel.appointmentDate}) asc`);
    } catch (err) {
      // Fallback: use raw SQL if Drizzle SQL expression fails
      const fallbackSql = `
        SELECT
          DATE(appointment_date) AS date,
          COUNT(*)::int AS count
        FROM appointments
        WHERE appointment_status = 'Completed'
          AND clinic_id = $1
          AND appointment_date >= $2
          AND appointment_date <= $3
        GROUP BY DATE(appointment_date)
        ORDER BY DATE(appointment_date) ASC;
      `;
      const params = [clinicId, start.toISOString(), end.toISOString()];

      const dbAny = database as any;
      let res: any;
      if (typeof dbAny.query === 'function') {
        res = await dbAny.query(fallbackSql, params);
        rows = res.rows ?? [];
      } else if (typeof dbAny.execute === 'function') {
        res = await dbAny.execute(fallbackSql, params);
        rows = res.rows ?? [];
      } else {
        throw err;
      }
    }

    // Normalize results into a map keyed by "YYYY-MM-DD"
    const countsMap = new Map<string, number>();
    for (const r of rows) {
      const dateStr =
        r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date);
      countsMap.set(dateStr, Number(r.count ?? 0));
    }

    // Build continuous list of dates between start and end inclusive
    const labels: string[] = [];
    const data: number[] = [];
    const keys: string[] = [];
    const details: Array<{ date: string; count: number; label: string }> = [];

    for (
      let cur = new Date(start);
      cur <= end;
      cur.setDate(cur.getDate() + 1)
    ) {
      const key = cur.toISOString().split('T')[0];
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(cur);

      const count = countsMap.get(key) ?? 0;

      keys.push(key);
      labels.push(label);
      data.push(count);
      details.push({ date: key, count, label });
    }

    return {
      labels,
      data,
      keys,
      details,
      range: { start: start.toISOString(), end: end.toISOString() },
      raw: rows,
    };
  }

  /**
   * Return No Show appointments aggregated by date.
   */
  static async getNoShowAppointmentsByDate(
    clinicId: string,
    opts?: {
      days?: number;
      startDate?: string | Date;
      endDate?: string | Date;
    }
  ) {
    const days = opts?.days ?? 30;
    const now = new Date();
    const end = opts?.endDate ? new Date(opts.endDate) : now;
    end.setHours(23, 59, 59, 999);

    let start: Date;
    if (opts?.startDate) {
      start = new Date(opts.startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
    }

    let rows: Array<any> = [];
    try {
      rows = await database
        .select({
          date: sql`DATE(${AppointmentModel.appointmentDate})`,
          count: sql`COUNT(*)::int`,
        })
        .from(AppointmentModel)
        .where(
          and(
            eq(AppointmentModel.appointmentStatus, 'NoShow'),
            eq(AppointmentModel.clinicId, clinicId),
            gte(AppointmentModel.appointmentDate, start),
            lte(AppointmentModel.appointmentDate, end)
          )
        )
        .groupBy(sql`DATE(${AppointmentModel.appointmentDate})`)
        .orderBy(sql`DATE(${AppointmentModel.appointmentDate}) asc`);
    } catch (err) {
      const fallbackSql = `
          SELECT
            DATE(appointment_date) AS date,
            COUNT(*)::int AS count
          FROM appointments
          WHERE appointment_status = 'NoShow'
            AND clinic_id = $1
            AND appointment_date >= $2
            AND appointment_date <= $3
          GROUP BY DATE(appointment_date)
          ORDER BY DATE(appointment_date) ASC;
        `;
      const params = [clinicId, start.toISOString(), end.toISOString()];
      const dbAny = database as any;
      let res: any;
      if (typeof dbAny.query === 'function') {
        res = await dbAny.query(fallbackSql, params);
        rows = res.rows ?? [];
      } else if (typeof dbAny.execute === 'function') {
        res = await dbAny.execute(fallbackSql, params);
        rows = res.rows ?? [];
      } else {
        throw err;
      }
    }

    const countsMap = new Map<string, number>();
    for (const r of rows) {
      const dateStr =
        r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date);
      countsMap.set(dateStr, Number(r.count ?? 0));
    }

    const labels: string[] = [];
    const data: number[] = [];
    const keys: string[] = [];
    const details: Array<{ date: string; count: number; label: string }> = [];

    for (
      let cur = new Date(start);
      cur <= end;
      cur.setDate(cur.getDate() + 1)
    ) {
      const key = cur.toISOString().split('T')[0];
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(cur);

      const count = countsMap.get(key) ?? 0;
      keys.push(key);
      labels.push(label);
      data.push(count);
      details.push({ date: key, count, label });
    }

    return {
      labels,
      data,
      keys,
      details,
      range: { start: start.toISOString(), end: end.toISOString() },
      raw: rows,
    };
  }

  /**
   * Return completed appointments aggregated by month using Drizzle.
   * - clinicId: required
   * - opts:
   *    - months: number of months back from now (default 12)
   *    - startDate, endDate: Date or ISO string to override range (inclusive)
   */
  static async getCompletedAppointmentsByMonth(
    clinicId: string,
    opts?: {
      months?: number;
      startDate?: string | Date;
      endDate?: string | Date;
    }
  ) {
    const months = opts?.months ?? 12;
    const now = new Date();
    let end = opts?.endDate ? new Date(opts.endDate) : startOfMonth(now);
    end = startOfMonth(end);
    let start: Date;
    if (opts?.startDate) {
      start = startOfMonth(new Date(opts.startDate));
    } else {
      start = addMonths(end, -(months - 1));
    }

    // Attempt native Drizzle query first (date_trunc via sql``).
    // If your Drizzle setup doesn't support running such sql expressions inside groupBy/orderBy,
    // the code falls back to raw SQL at the bottom.
    let rows: Array<any> = [];
    try {
      rows = await database
        .select({
          month: sql`date_trunc('month', ${AppointmentModel.appointmentDate} AT TIME ZONE 'UTC')`,
          year: sql`EXTRACT(YEAR FROM date_trunc('month', ${AppointmentModel.appointmentDate} AT TIME ZONE 'UTC'))::int`,
          month_num: sql`EXTRACT(MONTH FROM date_trunc('month', ${AppointmentModel.appointmentDate} AT TIME ZONE 'UTC'))::int`,
          count: sql`COUNT(*)::int`,
        })
        .from(AppointmentModel)
        .where(
          and(
            eq(AppointmentModel.appointmentStatus, 'Completed'),
            eq(AppointmentModel.clinicId, clinicId),
            gte(AppointmentModel.appointmentDate, new Date(start)),
            lt(AppointmentModel.appointmentDate, addMonths(end, 1))
          )
        )
        .groupBy(
          sql`date_trunc('month', ${AppointmentModel.appointmentDate} AT TIME ZONE 'UTC')`
        )
        .orderBy(
          sql`date_trunc('month', ${AppointmentModel.appointmentDate} AT TIME ZONE 'UTC') asc`
        );
      // `rows` should be an array of objects with keys: month, year, month_num, count
    } catch (err) {
      // Fallback: if Drizzle SQL expression fails in your environment, use raw SQL
      const fallbackSql = `
        SELECT
          date_trunc('month', appointment_date AT TIME ZONE 'UTC') AS month,
          EXTRACT(YEAR FROM date_trunc('month', appointment_date AT TIME ZONE 'UTC'))::int AS year,
          EXTRACT(MONTH FROM date_trunc('month', appointment_date AT TIME ZONE 'UTC'))::int AS month_num,
          COUNT(*)::int AS count
        FROM appointments
        WHERE appointment_status = 'Completed'
          AND clinic_id = $1
          AND appointment_date >= $2
          AND appointment_date < ($3 + INTERVAL '1 month')
        GROUP BY month
        ORDER BY month ASC;
      `;
      const params = [clinicId, start.toISOString(), end.toISOString()];

      // run raw SQL using Drizzle's underlying driver if available
      const dbAny = database as any;
      let res: any;
      if (typeof dbAny.query === 'function') {
        res = await dbAny.query(fallbackSql, params);
        rows = res.rows;
      } else if (typeof dbAny.execute === 'function') {
        res = await dbAny.execute(fallbackSql, params);
        rows = res.rows ?? res;
      } else {
        // as a last resort, throw the original error to surface it
        throw err;
      }
    }

    // Normalize results into a map keyed by "YYYY-MM"
    const countsMap = new Map<string, number>();
    for (const r of rows) {
      const yr = Number(r.year);
      const mn = Number(r.month_num);
      const key = `${yr}-${String(mn).padStart(2, '0')}`;
      countsMap.set(key, Number(r.count ?? 0));
    }

    // Build continuous list of months between start and end inclusive
    const labels: string[] = [];
    const data: number[] = [];
    const keys: string[] = [];
    for (let cur = new Date(start); cur <= end; cur = addMonths(cur, 1)) {
      const key = monthKey(cur);
      keys.push(key);
      labels.push(formatLabel(cur));
      data.push(countsMap.get(key) ?? 0);
    }

    return {
      labels,
      data,
      keys,
      range: { start: start.toISOString(), end: end.toISOString() },
      raw: rows,
    };
  }

  /**
   * Example: extend your existing getDashboardData using Drizzle queries.
   * This uses Drizzle-native selects for the simple counts and the above timeseries method.
   */
  static async getDashboardData(clinicId: string, user: AuthUser, opts?: any) {
    return await database.transaction(async (tx) => {
      // Unify date parameters: prioritize startDate/endDate, fallback to dateRangeStartCount/dateRangeEndCount
      const startDateVal = opts.startDate || opts.dateRangeStartCount;
      const endDateVal = opts.endDate || opts.dateRangeEndCount;

      const appointmentConditions = [];
      const earningConditions = [];
      const patientConditions = []; // For new/total patients based on assignment/creation

      if (user.userType === 'Doctor') {
        appointmentConditions.push(eq(AppointmentModel.doctorId, user.id));
        earningConditions.push(
          eq(ClinicAppointmentPlainModel.doctorId, user.id)
        );
      }

      if (startDateVal) {
        const d = new Date(startDateVal);
        appointmentConditions.push(gte(AppointmentModel.createdAt, d));
        earningConditions.push(gte(ClinicAppointmentPlainModel.createdAt, d));
        patientConditions.push(gte(ClinicAssignModel.createdAt, d));
      }

      if (endDateVal) {
        const d = new Date(endDateVal);
        d.setHours(23, 59, 59, 999);
        appointmentConditions.push(lte(AppointmentModel.createdAt, d));
        earningConditions.push(lte(ClinicAppointmentPlainModel.createdAt, d));
        patientConditions.push(lte(ClinicAssignModel.createdAt, d));
      }

      // Parallelize independent count queries
      const [
        newPatientsRes,
        totalNewAppointmentsRes,
        totalNoShowAppointmentsRes,
      ] = await Promise.all([
        tx
          .select({ count: sql`COUNT(${UserModel.id})::int` })
          .from(UserModel)
          .innerJoin(
            ClinicAssignModel,
            eq(UserModel.id, ClinicAssignModel.userId)
          )
          .where(
            and(
              eq(UserModel.userStatus, 'New'),
              eq(UserModel.userType, 'Patient'),
              eq(ClinicAssignModel.clinicId, clinicId),
              ...patientConditions
            )
          ),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.appointmentStatus, 'Confirmed'),
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.appointmentStatus, 'NoShow'),
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
      ]);

      const newPatientsCount =
        (newPatientsRes &&
          newPatientsRes[0] &&
          Number((newPatientsRes[0] as any).count)) ||
        0;
      const totalAppointmentsCount =
        (totalNewAppointmentsRes &&
          totalNewAppointmentsRes[0] &&
          Number((totalNewAppointmentsRes[0] as any).count)) ||
        0;
      const totalNoShowCount =
        (totalNoShowAppointmentsRes &&
          totalNoShowAppointmentsRes[0] &&
          Number((totalNoShowAppointmentsRes[0] as any).count)) ||
        0;

      // completed appointments series (date-wise)
      // Ensure series respects the unified date range
      const series = await DashboardService.getCompletedAppointmentsByDate(
        clinicId,
        { ...opts, startDate: startDateVal, endDate: endDateVal }
      );

      // no show appointments series (date-wise)
      const noShowSeries = await DashboardService.getNoShowAppointmentsByDate(
        clinicId,
        { ...opts, startDate: startDateVal, endDate: endDateVal }
      );

      const upcomingAppointmentsRes = await tx
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          appointmentDate: AppointmentModel.appointmentDate,
          appointmentTime: AppointmentModel.appointmentTime,
          appointmentType: AppointmentModel.appointmentType,
          appointmentNotes: AppointmentClinicalModel.appointmentNotes,
          appointmentStatus: AppointmentModel.appointmentStatus,
        })
        .from(AppointmentModel)
        .innerJoin(UserModel, eq(AppointmentModel.patientId, UserModel.id))
        .leftJoin(
          AppointmentClinicalModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .where(
          and(
            eq(AppointmentModel.appointmentStatus, 'Upcoming'),
            eq(AppointmentModel.clinicId, clinicId),
            ...appointmentConditions
          )
        );
      // Parallelize the second batch of independent queries
      const [
        [totalPatientsCount],
        [totalAppointmentsRes],
        patientData,
        [totalPendingAppointments],
        [totalUpcomingAppointments],
        [totalConfirmedAppointments],
        [totalCancelledAppointments],
        totalApoinmentPatient,
        [totalErning],
      ] = await Promise.all([
        tx
          .select({ count: sql`COUNT(${UserModel.id})::int` })
          .from(UserModel)
          .innerJoin(
            ClinicAssignModel,
            eq(UserModel.id, ClinicAssignModel.userId)
          )
          .where(
            and(
              eq(ClinicAssignModel.clinicId, clinicId),
              eq(UserModel.userType, 'Patient'),
              ...patientConditions
            )
          ),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
        tx
          .select({
            id: UserModel.id,
            name: UserModel.name,
            email: UserModel.email,
            profileImage: UserProfileModel.profileImage,
            appoinmentId: AppointmentModel.id,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            appointmentType: AppointmentModel.appointmentType,
            appointmentStatus: AppointmentModel.appointmentStatus,
          })
          .from(AppointmentModel)
          .innerJoin(UserModel, eq(AppointmentModel.patientId, UserModel.id))
          .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
          .where(
            and(
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          )
          .orderBy(desc(AppointmentModel.appointmentDate))
          .limit(5),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.appointmentStatus, 'Pending'),
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.appointmentStatus, 'Upcoming'),
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.appointmentStatus, 'Confirmed'),
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.appointmentStatus, 'Cancelled'),
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
        tx
          .select({ count: sql`COUNT(${AppointmentModel.id})::int` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.clinicId, clinicId),
              ...appointmentConditions
            )
          ),
        tx
          .select({
            count: sql`SUM(${ClinicAppointmentPlainModel.amount})::int`,
          })
          .from(ClinicAppointmentPlainModel)
          .where(
            and(
              eq(ClinicAppointmentPlainModel.clinicId, clinicId),
              ...earningConditions
            )
          ),
      ]);

      // Symptom statistics
      const symptomConditions = [eq(ClinicSymptomModel.clinicId, clinicId)];

      if (startDateVal) {
        const normalizedStart =
          AppointmentService.normalizeToDateOnly(startDateVal);
        if (normalizedStart) {
          symptomConditions.push(
            gte(ClinicSymptomCountModel.date, normalizedStart)
          );
        }
      }

      if (endDateVal) {
        const normalizedEnd =
          AppointmentService.normalizeToDateOnly(endDateVal);
        if (normalizedEnd) {
          symptomConditions.push(
            lte(ClinicSymptomCountModel.date, normalizedEnd)
          );
        }
      }

      const symptomStats = await tx
        .select({
          symptomId: ClinicSymptomModel.id,
          symptomName: ClinicSymptomModel.name,
          count: sql`SUM(${ClinicSymptomCountModel.count})::int`,
        })
        .from(ClinicSymptomCountModel)
        .innerJoin(
          ClinicSymptomModel,
          eq(ClinicSymptomCountModel.symptomId, ClinicSymptomModel.id)
        )
        .where(and(...symptomConditions))
        .groupBy(ClinicSymptomModel.id, ClinicSymptomModel.name)
        .orderBy(desc(sql`SUM(${ClinicSymptomCountModel.count})`));

      return {
        appointment: {
          totalPendingAppointments,
          totalUpcomingAppointments,
          totalConfirmedAppointments,
          totalCancelledAppointments,
          totalNoShowCount,
          totalApoinmentPatient,
          totalErning,
        },
        newPatients: newPatientsCount,
        totalNewAppointments: totalAppointmentsCount,
        completedAppointmentsSeries: series,
        noShowAppointmentsSeries: noShowSeries,
        upcomingAppointmentsRes,
        totalPatientsCount: totalPatientsCount.count,
        totalAppointmentsCount: totalAppointmentsRes.count,
        patientData,
        symptomStats,
      };
    });
  }

  static async getDoctorDashboardData(
    clinicId: string,
    doctorId: string,
    opts: {
      startDate?: string;
      endDate?: string;
    }
  ) {
    // 1. Determine Date Ranges
    const today = new Date();
    // Default to current month if not provided
    const currentStart = opts.startDate
      ? new Date(opts.startDate)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const currentEnd = opts.endDate
      ? new Date(opts.endDate)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // If start/end provided via standard query params, prioritize them.
    // The user also mentioned dateRangestartCount/dateRangeEndCount, likely for specific counters.
    // For simplicity and consistency with the request "hikePersent ... calculate based on past X days",
    // we use one main range for the dashboard stats.

    // Ensure 23:59:59 for end date
    currentEnd.setHours(23, 59, 59, 999);
    currentStart.setHours(0, 0, 0, 0);

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    // Previous range: ending just before current start, same duration
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    // Helper to calculate percentage and format string
    const calculateHike = (current: number, previous: number) => {
      let percent = 0;
      if (previous === 0) {
        percent = current > 0 ? 100 : 0;
      } else {
        percent = ((current - previous) / previous) * 100;
      }
      const formattedPercent =
        percent > 0 ? `+${percent.toFixed(0)}` : percent.toFixed(0);
      return `${formattedPercent} (${previous})`; // Format: +12 (10)
    };

    // Helper to run count queries for a specific range
    const getStatsForRange = async (start: Date, end: Date) => {
      return await database.transaction(async (tx) => {
        // Earning
        const [earningRes] = await tx
          .select({
            total: sql`SUM(${ClinicAppointmentPlainModel.amount})::int`,
          })
          .from(ClinicAppointmentPlainModel)
          .where(
            and(
              eq(ClinicAppointmentPlainModel.clinicId, clinicId),
              eq(ClinicAppointmentPlainModel.doctorId, doctorId),
              between(ClinicAppointmentPlainModel.createdAt, start, end)
            )
          );
        // Appointments (Total, Confirmed, Pending, NoShow)
        const counts = await tx
          .select({
            status: AppointmentModel.appointmentStatus,
            count: sql`COUNT(*)::int`,
          })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.clinicId, clinicId),
              eq(AppointmentModel.doctorId, doctorId),
              between(AppointmentModel.appointmentDate, start, end)
            )
          )
          .groupBy(AppointmentModel.appointmentStatus);

        let totalAppoiment = 0;
        let totalConfirmedAppointments = 0;
        let totalPendigAppointments = 0;
        let totalNoShowAppointments = 0;

        counts.forEach((c) => {
          const cnt = Number(c.count);
          totalAppoiment += cnt;
          if (c.status === 'Confirmed') totalConfirmedAppointments += cnt;
          if (c.status === 'Pending') totalPendigAppointments += cnt;
          if (c.status === 'NoShow') totalNoShowAppointments += cnt;
        });

        // Unique Patients
        const [uniquePatients] = await tx
          .select({
            count: sql`COUNT(DISTINCT ${AppointmentModel.patientId})::int`,
          })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.clinicId, clinicId),
              eq(AppointmentModel.doctorId, doctorId),
              between(AppointmentModel.appointmentDate, start, end)
            )
          );

        return {
          earning: Number(earningRes?.total || 0),
          totalAppoiment,
          totalConfirmedAppointments,
          totalPendigAppointments,
          totalNoShowAppointments,
          totalApoinmentPatient: Number(uniquePatients?.count || 0),
        };
      });
    };

    const currentStats = await getStatsForRange(currentStart, currentEnd);
    const prevStats = await getStatsForRange(previousStart, previousEnd);

    // Appointment Stats (Daily counts for the current range)
    // Using existing getCompletedAppointmentsByDate logic but filtered for Doctor
    // Note: getCompletedAppointmentsByDate is filtering by 'Completed' status.
    // The requirement says "appoinmentStats", usually implies all or a specific subset.
    // The example shows simple date/count. Let's assume ALL appointments for the doctor for now.

    const dailyStatsRes = await database
      .select({
        date: sql`DATE(${AppointmentModel.appointmentDate})`,
        count: sql`COUNT(*)::int`,
        noShowCount: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'NoShow' THEN 1 END)::int`,
      })
      .from(AppointmentModel)
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          eq(AppointmentModel.doctorId, doctorId),
          between(AppointmentModel.appointmentDate, currentStart, currentEnd)
        )
      )
      .groupBy(sql`DATE(${AppointmentModel.appointmentDate})`)
      .orderBy(sql`DATE(${AppointmentModel.appointmentDate}) asc`);

    const appoinmentStats = dailyStatsRes.map((r) => ({
      date:
        r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date),
      count: Number(r.count),
      noShowCount: Number(r.noShowCount),
    }));

    // Fill in missing dates with 0
    const statsMap = new Map(
      appoinmentStats.map((s) => [
        s.date,
        { count: s.count, noShowCount: s.noShowCount },
      ])
    );
    const filledStats = [];
    for (
      let d = new Date(currentStart);
      d <= currentEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split('T')[0];
      const entry = statsMap.get(dateStr) || { count: 0, noShowCount: 0 };
      filledStats.push({
        date: dateStr,
        count: entry.count,
        noShowCount: entry.noShowCount,
      });
    }

    // Pending Appointments List
    const pendingAppointmentRows = await database
      .select({
        id: UserModel.id, // Patient ID? User example shows "id" separate from "appoinmentId"
        name: UserModel.name,
        profileImage: UserProfileModel.profileImage,
        gender: UserProfileModel.gender,
        age: UserProfileModel.age,
        mobile: UserModel.mobile,
        appoinmentId: AppointmentModel.id,
        appointmentDate: AppointmentModel.appointmentDate,
        appointmentTime: AppointmentModel.appointmentTime,
        appointmentType: AppointmentModel.appointmentType,
        appointmentNotes: AppointmentClinicalModel.appointmentNotes,
        commonSymptoms: AppointmentClinicalModel.commonSymptoms,
        clinicSymptomIds: AppointmentClinicalModel.clinicSymptomIds,
        tokenNo: AppointmentModel.tokenNo,
        payment: {
          paymentMode: AppointmentPaymentModel.paymentMode,
          paymentStatus: AppointmentPaymentModel.paymentStatus,
          price: AppointmentPaymentModel.price,
        },
      })
      .from(AppointmentModel)
      .innerJoin(UserModel, eq(AppointmentModel.patientId, UserModel.id))
      .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
      .leftJoin(
        AppointmentPaymentModel,
        eq(AppointmentModel.id, AppointmentPaymentModel.appointmentId)
      )
      .leftJoin(
        AppointmentClinicalModel,
        eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
      )
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          eq(AppointmentModel.doctorId, doctorId),
          eq(AppointmentModel.appointmentStatus, 'Pending'),
          between(AppointmentModel.appointmentDate, currentStart, currentEnd)
        )
      )
      .limit(10); // Logic for limit not specified, assuming reasonable limit

    const clinicSymptomIds = Array.from(
      new Set(
        pendingAppointmentRows.flatMap((appointment) =>
          Array.isArray(appointment.clinicSymptomIds)
            ? appointment.clinicSymptomIds
            : []
        )
      )
    );

    const clinicSymptoms =
      clinicSymptomIds.length > 0
        ? await database
            .select({
              id: ClinicSymptomModel.id,
              name: ClinicSymptomModel.name,
            })
            .from(ClinicSymptomModel)
            .where(inArray(ClinicSymptomModel.id, clinicSymptomIds))
        : [];

    const clinicSymptomNameById = new Map(
      clinicSymptoms.map((symptom) => [symptom.id, symptom.name])
    );

    const cleanText = (value?: string | null) => {
      const text = value?.trim();
      return text && text.length > 0 ? text : null;
    };

    const pendingAppointment = pendingAppointmentRows.map((appointment) => {
      const commonSymptoms = Array.isArray(appointment.commonSymptoms)
        ? appointment.commonSymptoms
        : [];
      const clinicSymptomNames = Array.isArray(appointment.clinicSymptomIds)
        ? appointment.clinicSymptomIds
            .map((symptomId) => clinicSymptomNameById.get(symptomId))
            .filter((symptom): symptom is string => Boolean(symptom))
        : [];
      const symptoms = cleanText(
        [...commonSymptoms, ...clinicSymptomNames].join(', ')
      );
      const reasonForVisit =
        cleanText(appointment.appointmentNotes) ??
        symptoms ??
        appointment.appointmentType;

      return {
        id: appointment.id,
        name: appointment.name,
        profileImage: appointment.profileImage,
        gender: appointment.gender,
        age: appointment.age,
        mobile: appointment.mobile,
        appoinmentId: appointment.appoinmentId,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        appointmentType: appointment.appointmentType,
        reasonForVisit,
        symptoms,
        tokenNo: appointment.tokenNo,
        payment: appointment.payment,
      };
    });

    return {
      status: {
        totalEarning: {
          amount: currentStats.earning,
          hikePersent: calculateHike(currentStats.earning, prevStats.earning),
        },
        totalAppoiment: {
          count: currentStats.totalAppoiment,
          hikePersent: calculateHike(
            currentStats.totalAppoiment,
            prevStats.totalAppoiment
          ),
        },
        totalConfirmedAppointments: {
          count: currentStats.totalConfirmedAppointments,
          hikePersent: calculateHike(
            currentStats.totalConfirmedAppointments,
            prevStats.totalConfirmedAppointments
          ),
        },
        totalPendigAppointments: {
          count: currentStats.totalPendigAppointments,
          hikePersent: calculateHike(
            currentStats.totalPendigAppointments,
            prevStats.totalPendigAppointments
          ),
        },
        totalNoShowAppointments: {
          count: currentStats.totalNoShowAppointments,
          hikePersent: calculateHike(
            currentStats.totalNoShowAppointments,
            prevStats.totalNoShowAppointments
          ),
        },
        totalApoinmentPatient: [{ count: currentStats.totalApoinmentPatient }],
        // Note: formatted as array object per requirement example
      },
      appoinmentStats: filledStats,
      pendingAppointment,
    };
  }

  static async getClinicDashboardData(
    clinicId: string,
    opts: {
      startDate?: string;
      endDate?: string;
    }
  ) {
    // 1. Determine Date Ranges
    const today = new Date();
    // Default to current month if not provided
    const currentStart = opts.startDate
      ? new Date(opts.startDate)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const currentEnd = opts.endDate
      ? new Date(opts.endDate)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Ensure 23:59:59 for end date
    currentEnd.setHours(23, 59, 59, 999);
    currentStart.setHours(0, 0, 0, 0);

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    // Previous range: ending just before current start, same duration
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    // Helper to calculate percentage and format string
    const calculateHike = (current: number, previous: number) => {
      let percent = 0;
      if (previous === 0) {
        percent = current > 0 ? 100 : 0;
      } else {
        percent = ((current - previous) / previous) * 100;
      }
      const formattedPercent =
        percent > 0 ? `+${percent.toFixed(0)}` : percent.toFixed(0);
      return `${formattedPercent} (${previous})`;
    };

    // Helper to run count queries for a specific range.
    // The three aggregate queries are independent, so we run them in parallel
    // instead of sequentially to reduce total dashboard latency.
    const getStatsForRange = async (start: Date, end: Date) => {
      // Earnings: actual paid revenue minus refunds, filtered by appointment date
      // (consistent with revenue-overview API). Excludes Cancelled/NoShow appointments.
      const earningQuery = database
        .select({
          total: sql`COALESCE(SUM(
            CASE 
              WHEN ${AppointmentPaymentModel.paymentStatus} = 'Paid' THEN ${AppointmentPaymentModel.price}::numeric
              WHEN ${AppointmentPaymentModel.paymentStatus} = 'Refunded' THEN 
                ${AppointmentPaymentModel.price}::numeric - COALESCE(${AppointmentPaymentModel.refundedAmount}::numeric, ${AppointmentPaymentModel.price}::numeric)
              ELSE 0
            END
          ), 0)::int`,
        })
        .from(AppointmentModel)
        .innerJoin(
          AppointmentPaymentModel,
          eq(AppointmentModel.id, AppointmentPaymentModel.appointmentId)
        )
        .where(
          and(
            eq(AppointmentModel.clinicId, clinicId),
            between(AppointmentModel.appointmentDate, start, end),
            sql`${AppointmentModel.appointmentStatus} NOT IN ('Cancelled', 'NoShow')`
          )
        );

      // Appointment counts + unique patients in a single pass over the same
      // filtered rows (was previously two separate scans of the same table).
      const countsQuery = database
        .select({
          total: sql`COUNT(*)::int`,
          pending: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Pending' THEN 1 END)::int`,
          noShow: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'NoShow' THEN 1 END)::int`,
          uniquePatients: sql`COUNT(DISTINCT ${AppointmentModel.patientId})::int`,
        })
        .from(AppointmentModel)
        .where(
          and(
            eq(AppointmentModel.clinicId, clinicId),
            between(AppointmentModel.appointmentDate, start, end)
          )
        );

      // Pending Payment amount (sum of price where payment status is 'Pending')
      const pendingPaymentQuery = database
        .select({
          amount: sql`COALESCE(SUM(${AppointmentPaymentModel.price}::int), 0)::int`,
        })
        .from(AppointmentModel)
        .innerJoin(
          AppointmentPaymentModel,
          eq(AppointmentModel.id, AppointmentPaymentModel.appointmentId)
        )
        .where(
          and(
            eq(AppointmentModel.clinicId, clinicId),
            eq(AppointmentPaymentModel.paymentStatus, 'Pending'),
            between(AppointmentModel.appointmentDate, start, end)
          )
        );

      const [[earningRes], [countsRes], [pendingPaymentRes]] =
        await Promise.all([earningQuery, countsQuery, pendingPaymentQuery]);

      return {
        earning: Number(earningRes?.total || 0),
        totalAppoiment: Number(countsRes?.total || 0),
        pendingAproval: Number(countsRes?.pending || 0),
        noShowCount: Number(countsRes?.noShow || 0),
        activePatent: Number(countsRes?.uniquePatients || 0),
        pendingPayment: Number(pendingPaymentRes?.amount || 0),
      };
    };

    // Current and previous ranges are independent — fetch them concurrently.
    const [currentStats, prevStats] = await Promise.all([
      getStatsForRange(currentStart, currentEnd),
      getStatsForRange(previousStart, previousEnd),
    ]);

    // appoimentStatus (Current Range)
    const statusCountsQuery = database
      .select({
        total: sql`COUNT(*)::int`,
        completed: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Completed' THEN 1 END)::int`,
        confirmed: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Confirmed' THEN 1 END)::int`,
        pending: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Pending' THEN 1 END)::int`,
        cancelled: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'Cancelled' THEN 1 END)::int`,
        noShow: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'NoShow' THEN 1 END)::int`,
      })
      .from(AppointmentModel)
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          between(AppointmentModel.appointmentDate, currentStart, currentEnd)
        )
      );

    // revenueOverview (Daily) - Joining Earnings + Appointment Counts
    // We can fetch daily earnings and daily appointment counts separately and merge.

    // Daily Appointments (by appointment date)
    const dailyAppointmentsQuery = database
      .select({
        date: sql`DATE(${AppointmentModel.appointmentDate})`,
        count: sql`COUNT(*)::int`,
        noShowCount: sql`COUNT(CASE WHEN ${AppointmentModel.appointmentStatus} = 'NoShow' THEN 1 END)::int`,
        uniquePatients: sql`COUNT(DISTINCT ${AppointmentModel.patientId})::int`,
      })
      .from(AppointmentModel)
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          between(AppointmentModel.appointmentDate, currentStart, currentEnd)
        )
      )
      .groupBy(sql`DATE(${AppointmentModel.appointmentDate})`);

    // Daily Earnings — use AppointmentPaymentModel (same source as revenue-overview)
    // for consistency. Filter by appointmentDate, exclude Cancelled/NoShow.
    const dailyEarningsQuery = database
      .select({
        date: sql`DATE(${AppointmentModel.appointmentDate})`,
        amount: sql`COALESCE(SUM(
          CASE 
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Paid' THEN ${AppointmentPaymentModel.price}::numeric
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Refunded' THEN 
              ${AppointmentPaymentModel.price}::numeric - COALESCE(${AppointmentPaymentModel.refundedAmount}::numeric, ${AppointmentPaymentModel.price}::numeric)
            ELSE 0
          END
        ), 0)::int`,
      })
      .from(AppointmentModel)
      .innerJoin(
        AppointmentPaymentModel,
        eq(AppointmentModel.id, AppointmentPaymentModel.appointmentId)
      )
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          between(AppointmentModel.appointmentDate, currentStart, currentEnd),
          sql`${AppointmentModel.appointmentStatus} NOT IN ('Cancelled', 'NoShow')`
        )
      )
      .groupBy(sql`DATE(${AppointmentModel.appointmentDate})`);

    // These three aggregates are independent — run them concurrently.
    const [[statusCounts], dailyAppointments, dailyEarnings] =
      await Promise.all([
        statusCountsQuery,
        dailyAppointmentsQuery,
        dailyEarningsQuery,
      ]);

    // Merging for Revenue Overview and Patent Overview
    const dayMap = new Map<
      string,
      {
        earning: number;
        apptCount: number;
        noShowCount: number;
        patientCount: number;
      }
    >();

    // Initial fill with 0
    for (
      let d = new Date(currentStart);
      d <= currentEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split('T')[0];
      dayMap.set(dateStr, {
        earning: 0,
        apptCount: 0,
        noShowCount: 0,
        patientCount: 0,
      });
    }

    dailyAppointments.forEach((r) => {
      const d =
        r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date);
      const ref = dayMap.get(d) || {
        earning: 0,
        apptCount: 0,
        noShowCount: 0,
        patientCount: 0,
      };
      ref.apptCount = Number(r.count);
      ref.noShowCount = Number(r.noShowCount);
      ref.patientCount = Number(r.uniquePatients);
      dayMap.set(d, ref);
    });

    dailyEarnings.forEach((r) => {
      const d =
        r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date);
      const ref = dayMap.get(d) || {
        earning: 0,
        apptCount: 0,
        noShowCount: 0,
        patientCount: 0,
      };
      ref.earning = Number(r.amount);
      dayMap.set(d, ref);
    });

    const revenueOverview = [];
    const patentOverview = [];
    const noShowOverview = [];

    // Keys must be sorted naturally by loop order
    for (const [date, stats] of dayMap.entries()) {
      revenueOverview.push({
        date,
        amount: stats.earning, // Request says "amount", implies currency value
        appoitmentCount: stats.apptCount,
      });
      patentOverview.push({
        date,
        // Unique patients seen that day (was incorrectly reporting appointment count)
        count: stats.patientCount,
      });
      noShowOverview.push({
        date,
        count: stats.noShowCount,
      });
    }

    // 5. Symptom Statistics
    const symptomConditions = [eq(ClinicSymptomModel.clinicId, clinicId)];

    const normalizedStart = AppointmentService.normalizeToDateOnly(
      currentStart.toISOString()
    );
    const normalizedEnd = AppointmentService.normalizeToDateOnly(
      currentEnd.toISOString()
    );

    if (normalizedStart) {
      symptomConditions.push(
        gte(ClinicSymptomCountModel.date, normalizedStart)
      );
    }
    if (normalizedEnd) {
      symptomConditions.push(lte(ClinicSymptomCountModel.date, normalizedEnd));
    }

    const symptomStats = await database
      .select({
        symptomId: ClinicSymptomModel.id,
        symptomName: ClinicSymptomModel.name,
        count: sql`SUM(${ClinicSymptomCountModel.count})::int`,
      })
      .from(ClinicSymptomCountModel)
      .innerJoin(
        ClinicSymptomModel,
        eq(ClinicSymptomCountModel.symptomId, ClinicSymptomModel.id)
      )
      .where(and(...symptomConditions))
      .groupBy(ClinicSymptomModel.id, ClinicSymptomModel.name)
      .orderBy(desc(sql`SUM(${ClinicSymptomCountModel.count})`));

    return {
      status: {
        totalEarning: {
          amount: currentStats.earning,
          hikePersent: calculateHike(currentStats.earning, prevStats.earning),
        },
        totalAppoiment: {
          count: currentStats.totalAppoiment,
          hikePersent: calculateHike(
            currentStats.totalAppoiment,
            prevStats.totalAppoiment
          ),
        },
        pendingAproval: {
          count: currentStats.pendingAproval,
          hikePersent: calculateHike(
            currentStats.pendingAproval,
            prevStats.pendingAproval
          ),
        },
        noShowCount: {
          count: currentStats.noShowCount,
          hikePersent: calculateHike(
            currentStats.noShowCount,
            prevStats.noShowCount
          ),
        },
        activePatent: {
          count: currentStats.activePatent,
          hikePersent: calculateHike(
            currentStats.activePatent,
            prevStats.activePatent
          ),
        },
        pendingPayment: {
          amount: currentStats.pendingPayment,
          hikePersent: calculateHike(
            currentStats.pendingPayment,
            prevStats.pendingPayment
          ),
        },
      },
      appoimentStatus: {
        completed: Number(statusCounts?.completed || 0),
        confirmed: Number(statusCounts?.confirmed || 0),
        pending: Number(statusCounts?.pending || 0),
        cancelled: Number(statusCounts?.cancelled || 0),
        noShow: Number(statusCounts?.noShow || 0),
        total: Number(statusCounts?.total || 0),
      },
      revenueOverview,
      patentOverview,
      noShowOverview,
      symptomStats,
    };
  }

  /**
   * Get Super Admin Dashboard Data
   * Returns system-wide analytics and metrics for Super Admin view.
   * Cached in Redis for 1 hour. Returns lastUpdatedAt indicating when data was queried from DB.
   */
  static async getSuperAdminDashboardData(opts?: {
    startDate?: string;
    endDate?: string;
  }) {
    const today = new Date();
    const currentStart = opts?.startDate
      ? new Date(opts.startDate)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const currentEnd = opts?.endDate
      ? new Date(opts.endDate)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);

    currentEnd.setHours(23, 59, 59, 999);
    currentStart.setHours(0, 0, 0, 0);

    // Cache key based on date range
    const cacheKey = `super_admin_dashboard:${currentStart.toISOString().split('T')[0]}:${currentEnd.toISOString().split('T')[0]}`;

    // Check Redis cache (1 hour TTL)
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    // Helper to calculate percentage and format string
    const calculateHike = (current: number, previous: number): string => {
      let percent = 0;
      if (previous === 0) {
        percent = current > 0 ? 100 : 0;
      } else {
        percent = ((current - previous) / previous) * 100;
      }
      if (percent > 0) return `+${percent.toFixed(1)}%`;
      if (percent < 0) return `${percent.toFixed(1)}%`;
      return '0%';
    };

    // Determine granularity for series data
    const daysDiff = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const granularity: 'day' | 'week' | 'month' =
      daysDiff <= 14 ? 'day' : daysDiff <= 90 ? 'day' : 'month';

    // Current week boundaries (Mon-Sun)
    const dayOfWeek = today.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisWeekStart = new Date(today);
    thisWeekStart.setUTCDate(today.getUTCDate() - diffToMonday);
    thisWeekStart.setUTCHours(0, 0, 0, 0);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setUTCDate(thisWeekStart.getUTCDate() + 6);
    thisWeekEnd.setUTCHours(23, 59, 59, 999);

    // Current month boundaries
    const thisMonthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
    );
    const thisMonthEnd = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)
    );
    thisMonthEnd.setUTCHours(23, 59, 59, 999);

    // Last month boundaries
    const lastMonthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
    );
    const lastMonthEnd = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)
    );
    lastMonthEnd.setUTCHours(23, 59, 59, 999);

    const result = await database.transaction(async (tx) => {
      // ─── 1. CLINICS ───────────────────────────────────────────────────────────
      const [totalClinicsRes] = await tx
        .select({ total: sql`COUNT(*)::int` })
        .from(ClinicModel);

      const [activeClinicsRes] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicModel)
        .where(eq(ClinicModel.status, 'Active'));

      const [inactiveClinicsRes] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicModel)
        .where(
          or(
            eq(ClinicModel.status, 'Inactive'),
            eq(ClinicModel.status, 'Blocked')
          )
        );

      // Monthly active clinics: clinics that had appointments this month
      const [monthlyActiveClinicsRes] = await tx
        .select({
          count: sql`COUNT(DISTINCT ${AppointmentModel.clinicId})::int`,
        })
        .from(AppointmentModel)
        .where(
          between(
            AppointmentModel.appointmentDate,
            thisMonthStart,
            thisMonthEnd
          )
        );

      // Clinics created in current vs previous period for hike
      const [currentPeriodClinics] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicModel)
        .where(between(ClinicModel.createdAt, currentStart, currentEnd));

      const [previousPeriodClinics] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicModel)
        .where(between(ClinicModel.createdAt, previousStart, previousEnd));

      // ─── 2. CONVERSION RATE ────────────────────────────────────────────────
      // Trial → Paid conversion: clinics that went from trial/free to a paid plan
      const [totalTrialEver] = await tx
        .select({
          count: sql`COUNT(DISTINCT ${ClinicSubscriptionModel.clinicId})::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          or(
            eq(ClinicSubscriptionModel.paymentStatus, 'pending'),
            sql`${ClinicSubscriptionModel.price}::numeric = 0`
          )
        );

      const [convertedToPaid] = await tx
        .select({
          count: sql`COUNT(DISTINCT ${ClinicSubscriptionModel.clinicId})::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            sql`${ClinicSubscriptionModel.price}::numeric > 0`
          )
        );

      const totalTrials = Number(totalTrialEver?.count || 0);
      const totalConverted = Number(convertedToPaid?.count || 0);
      const conversionRate =
        totalTrials > 0
          ? Number(((totalConverted / totalTrials) * 100).toFixed(1))
          : 0;

      // Previous period conversion rate for hike
      const [prevTrials] = await tx
        .select({
          count: sql`COUNT(DISTINCT ${ClinicSubscriptionModel.clinicId})::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            between(
              ClinicSubscriptionModel.createdAt,
              previousStart,
              previousEnd
            ),
            or(
              eq(ClinicSubscriptionModel.paymentStatus, 'pending'),
              sql`${ClinicSubscriptionModel.price}::numeric = 0`
            )
          )
        );

      const [prevConverted] = await tx
        .select({
          count: sql`COUNT(DISTINCT ${ClinicSubscriptionModel.clinicId})::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            between(
              ClinicSubscriptionModel.createdAt,
              previousStart,
              previousEnd
            ),
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            sql`${ClinicSubscriptionModel.price}::numeric > 0`
          )
        );

      const prevConversionRate =
        Number(prevTrials?.count || 0) > 0
          ? (Number(prevConverted?.count || 0) /
              Number(prevTrials?.count || 0)) *
            100
          : 0;

      // ─── 3. USERS ─────────────────────────────────────────────────────────────
      const [totalUsersRes] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(UserModel);

      // Monthly active users: users that had appointments this month
      const [monthlyActiveUsersRes] = await tx
        .select({
          count: sql`COUNT(DISTINCT ${AppointmentModel.patientId})::int`,
        })
        .from(AppointmentModel)
        .where(
          between(
            AppointmentModel.appointmentDate,
            thisMonthStart,
            thisMonthEnd
          )
        );

      // Users by role
      const usersByRole = await tx
        .select({
          userType: UserModel.userType,
          count: sql`COUNT(*)::int`,
        })
        .from(UserModel)
        .where(
          inArray(UserModel.userType, [
            'Super_Admin',
            'Admin',
            'Doctor',
            'Patient',
            'Receptionist',
          ])
        )
        .groupBy(UserModel.userType);

      const byRole: Record<string, number> = {};
      usersByRole.forEach((row) => {
        byRole[row.userType] = Number(row.count);
      });

      // Users created in current vs previous period for hike
      const [currentPeriodUsers] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(UserModel)
        .where(between(UserModel.createdAt, currentStart, currentEnd));

      const [previousPeriodUsers] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(UserModel)
        .where(between(UserModel.createdAt, previousStart, previousEnd));

      // ─── 4. SUBSCRIPTIONS ────────────────────────────────────────────────────
      // Active subscriptions with plan info
      const activeSubscriptions = await tx
        .select({
          clinicId: ClinicSubscriptionModel.clinicId,
          planId: ClinicSubscriptionModel.planId,
          planName: SubscriptionPlanModel.name,
          planPrice: SubscriptionPlanModel.price,
          providerSubscriptionId:
            ClinicSubscriptionModel.providerSubscriptionId,
          expiresAt: ClinicSubscriptionModel.expiresAt,
          active: ClinicSubscriptionModel.active,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          SubscriptionPlanModel,
          eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.active, true),
            or(
              isNull(ClinicSubscriptionModel.expiresAt),
              gt(ClinicSubscriptionModel.expiresAt, new Date())
            )
          )
        );

      const [totalSubsRes] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicSubscriptionModel);

      const [expiredSubsRes] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.active, true),
            lte(ClinicSubscriptionModel.expiresAt, new Date())
          )
        );

      const [cancelledSubsRes] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicSubscriptionModel)
        .where(eq(ClinicSubscriptionModel.active, false));

      let yearlyCount = 0;
      let trialCount = 0;
      const planCounts: Record<string, number> = {};

      activeSubscriptions.forEach((sub) => {
        // Count by plan
        const pName = sub.planName || 'Unknown';
        planCounts[pName] = (planCounts[pName] || 0) + 1;

        // Yearly check
        if (sub.providerSubscriptionId === 'pro-yearly') {
          yearlyCount++;
        }

        // Trial: free plan with expiry
        if ((!sub.planPrice || Number(sub.planPrice) === 0) && sub.expiresAt) {
          trialCount++;
        }
      });

      const byPlan = Object.entries(planCounts).map(([planName, count]) => ({
        planName,
        count,
      }));

      // Subscriptions hike: active subs in current vs previous period
      const [currentPeriodSubs] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.active, true),
            between(ClinicSubscriptionModel.createdAt, currentStart, currentEnd)
          )
        );

      const [previousPeriodSubs] = await tx
        .select({ count: sql`COUNT(*)::int` })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.active, true),
            between(
              ClinicSubscriptionModel.createdAt,
              previousStart,
              previousEnd
            )
          )
        );

      // ─── 5. REVENUE ────────────────────────────────────────────────────────
      // Revenue from subscription payments (ClinicSubscriptionModel.price)
      const [totalRevenueAllTime] = await tx
        .select({
          total: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(eq(ClinicSubscriptionModel.paymentStatus, 'success'));

      const [yearlyRevenueRes] = await tx
        .select({
          total: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            eq(ClinicSubscriptionModel.providerSubscriptionId, 'pro-yearly')
          )
        );

      const [currentPeriodRevenue] = await tx
        .select({
          total: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(ClinicSubscriptionModel.createdAt, currentStart, currentEnd)
          )
        );

      const [previousPeriodRevenue] = await tx
        .select({
          total: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(
              ClinicSubscriptionModel.createdAt,
              previousStart,
              previousEnd
            )
          )
        );

      // Daily revenue series for the selected range
      const revenueSeries = await tx
        .select({
          period: sql`DATE(${ClinicSubscriptionModel.createdAt})`,
          amount: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(ClinicSubscriptionModel.createdAt, currentStart, currentEnd)
          )
        )
        .groupBy(sql`DATE(${ClinicSubscriptionModel.createdAt})`)
        .orderBy(sql`DATE(${ClinicSubscriptionModel.createdAt})`);

      // Revenue by plan — this week
      const revenueByPlanThisWeek = await tx
        .select({
          planName: SubscriptionPlanModel.name,
          amount: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          SubscriptionPlanModel,
          eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(
              ClinicSubscriptionModel.createdAt,
              thisWeekStart,
              thisWeekEnd
            )
          )
        )
        .groupBy(SubscriptionPlanModel.name);

      // Revenue by plan — this month
      const revenueByPlanThisMonth = await tx
        .select({
          planName: SubscriptionPlanModel.name,
          amount: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          SubscriptionPlanModel,
          eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(
              ClinicSubscriptionModel.createdAt,
              thisMonthStart,
              thisMonthEnd
            )
          )
        )
        .groupBy(SubscriptionPlanModel.name);

      // Revenue analytics: this month, last month, all time
      const [thisMonthRevenue] = await tx
        .select({
          total: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(
              ClinicSubscriptionModel.createdAt,
              thisMonthStart,
              thisMonthEnd
            )
          )
        );

      const [lastMonthRevenue] = await tx
        .select({
          total: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(
              ClinicSubscriptionModel.createdAt,
              lastMonthStart,
              lastMonthEnd
            )
          )
        );

      // Month before last for growth calculations
      const monthBeforeLastStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1)
      );
      const monthBeforeLastEnd = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 0)
      );
      monthBeforeLastEnd.setUTCHours(23, 59, 59, 999);

      const [monthBeforeLastRevenue] = await tx
        .select({
          total: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(
              ClinicSubscriptionModel.createdAt,
              monthBeforeLastStart,
              monthBeforeLastEnd
            )
          )
        );

      // ─── 6. TOP CLINICS ────────────────────────────────────────────────────
      const topClinics = await tx
        .select({
          name: ClinicModel.clinicName,
          revenue: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          ClinicModel,
          eq(ClinicSubscriptionModel.clinicId, ClinicModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            between(ClinicSubscriptionModel.createdAt, currentStart, currentEnd)
          )
        )
        .groupBy(ClinicModel.id, ClinicModel.clinicName)
        .orderBy(desc(sql`SUM(${ClinicSubscriptionModel.price}::numeric)`))
        .limit(4);

      // Top clinics previous period for growth
      const topClinicNames = topClinics.map((c) => c.name);
      let topClinicsWithGrowth: Array<{
        name: string;
        revenue: number;
        growthPercent: number;
      }> = [];

      if (topClinics.length > 0) {
        const prevTopClinics = await tx
          .select({
            name: ClinicModel.clinicName,
            revenue: sql`COALESCE(SUM(${ClinicSubscriptionModel.price}::numeric), 0)::int`,
          })
          .from(ClinicSubscriptionModel)
          .innerJoin(
            ClinicModel,
            eq(ClinicSubscriptionModel.clinicId, ClinicModel.id)
          )
          .where(
            and(
              eq(ClinicSubscriptionModel.paymentStatus, 'success'),
              between(
                ClinicSubscriptionModel.createdAt,
                previousStart,
                previousEnd
              ),
              inArray(ClinicModel.clinicName, topClinicNames)
            )
          )
          .groupBy(ClinicModel.id, ClinicModel.clinicName);

        const prevRevenueMap = new Map(
          prevTopClinics.map((c) => [c.name, Number(c.revenue)])
        );

        topClinicsWithGrowth = topClinics.map((c) => {
          const currentRev = Number(c.revenue);
          const prevRev = prevRevenueMap.get(c.name) || 0;
          let growthPercent = 0;
          if (prevRev === 0) {
            growthPercent = currentRev > 0 ? 100 : 0;
          } else {
            growthPercent = Number(
              (((currentRev - prevRev) / prevRev) * 100).toFixed(1)
            );
          }
          return { name: c.name, revenue: currentRev, growthPercent };
        });
      }

      // ─── 7. REGISTRATION TRENDS ──────────────────────────────────────────────
      const clinicRegistrations = await tx
        .select({
          period: sql`DATE(${ClinicModel.createdAt})`,
          count: sql`COUNT(*)::int`,
        })
        .from(ClinicModel)
        .where(between(ClinicModel.createdAt, currentStart, currentEnd))
        .groupBy(sql`DATE(${ClinicModel.createdAt})`)
        .orderBy(sql`DATE(${ClinicModel.createdAt})`);

      // ─── 8. RECENT ACTIVITIES ───────────────────────────────────────────────
      // Fetch recent activities from the last 30 days, limited to 10
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clinic registrations (last 10)
      const recentClinicRegistrations = await tx
        .select({
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          createdAt: ClinicModel.createdAt,
        })
        .from(ClinicModel)
        .where(gte(ClinicModel.createdAt, thirtyDaysAgo))
        .orderBy(desc(ClinicModel.createdAt))
        .limit(10);

      // Payment successes (subscription payments, last 10)
      const recentPayments = await tx
        .select({
          id: ClinicSubscriptionModel.id,
          clinicId: ClinicSubscriptionModel.clinicId,
          clinicName: ClinicModel.clinicName,
          amount: ClinicSubscriptionModel.price,
          paymentStatus: ClinicSubscriptionModel.paymentStatus,
          createdAt: ClinicSubscriptionModel.createdAt,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          ClinicModel,
          eq(ClinicSubscriptionModel.clinicId, ClinicModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.paymentStatus, 'success'),
            gte(ClinicSubscriptionModel.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(ClinicSubscriptionModel.createdAt))
        .limit(10);

      // New subscriptions (last 10)
      const recentSubscriptions = await tx
        .select({
          id: ClinicSubscriptionModel.id,
          clinicId: ClinicSubscriptionModel.clinicId,
          clinicName: ClinicModel.clinicName,
          planName: SubscriptionPlanModel.name,
          createdAt: ClinicSubscriptionModel.createdAt,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          ClinicModel,
          eq(ClinicSubscriptionModel.clinicId, ClinicModel.id)
        )
        .innerJoin(
          SubscriptionPlanModel,
          eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.active, true),
            gte(ClinicSubscriptionModel.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(ClinicSubscriptionModel.createdAt))
        .limit(10);

      // Pending verifications (users awaiting email verification, last 10)
      const pendingVerifications = await tx
        .select({
          id: UserModel.id,
          userName: UserModel.name,
          userEmail: UserModel.email,
          createdAt: UserModel.createdAt,
        })
        .from(UserModel)
        .where(
          and(
            isNull(UserModel.emailVerifiedAt),
            gte(UserModel.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(UserModel.createdAt))
        .limit(10);

      // Combine all activities and sort by timestamp (newest first)
      // GUARANTEED: Always returns an array ([] if no activities, never null/undefined)
      const activities = [
        ...recentClinicRegistrations.map((clinic) => ({
          id: clinic.id,
          type: 'clinic_registered' as const,
          title: 'New Clinic Registered',
          description: `${clinic.clinicName} has registered`,
          timestamp:
            clinic.createdAt?.toISOString() || new Date().toISOString(),
          relatedId: clinic.id,
        })),
        ...recentPayments.map((payment) => ({
          id: payment.id,
          type: 'payment_received' as const,
          title: 'Payment Received',
          description: `Payment of ₹${Number(payment.amount || 0).toFixed(2)} from ${payment.clinicName}`,
          timestamp:
            payment.createdAt?.toISOString() || new Date().toISOString(),
          relatedId: payment.clinicId,
        })),
        ...recentSubscriptions.map((sub) => ({
          id: sub.id,
          type: 'subscription_created' as const,
          title: 'New Subscription',
          description: `${sub.clinicName} subscribed to ${sub.planName}`,
          timestamp: sub.createdAt?.toISOString() || new Date().toISOString(),
          relatedId: sub.clinicId,
        })),
        ...pendingVerifications.map((user) => ({
          id: user.id,
          type: 'verification_pending' as const,
          title: 'Verification Pending',
          description: `${user.userName} awaiting email verification`,
          timestamp: user.createdAt?.toISOString() || new Date().toISOString(),
          relatedId: user.id,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 10);

      // ─── FORMAT HELPERS ───────────────────────────────────────────────────────
      const formatSeries = (
        data: any[],
        startDate: Date,
        endDate: Date
      ): { labels: string[]; data: number[] } => {
        const labels: string[] = [];
        const values: number[] = [];
        const dataMap = new Map(
          data.map((item) => [
            new Date(item.period).toISOString().split('T')[0],
            Number(item.amount || item.count || 0),
          ])
        );

        if (granularity === 'month') {
          const current = new Date(startDate);
          while (current <= endDate) {
            const monthLabel = new Intl.DateTimeFormat('en-US', {
              month: 'short',
              timeZone: 'UTC',
            }).format(current);
            labels.push(monthLabel);
            const mStart = new Date(
              Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1)
            );
            const mEnd = new Date(
              Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)
            );
            let sum = 0;
            for (
              let d = new Date(mStart);
              d <= mEnd;
              d.setUTCDate(d.getUTCDate() + 1)
            ) {
              sum += dataMap.get(d.toISOString().split('T')[0]) || 0;
            }
            values.push(sum);
            current.setUTCMonth(current.getUTCMonth() + 1);
          }
        } else {
          const current = new Date(startDate);
          while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const label = new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
            }).format(current);
            labels.push(label);
            values.push(dataMap.get(dateStr) || 0);
            current.setDate(current.getDate() + 1);
          }
        }

        return { labels, data: values };
      };

      const formatRevenueByPlan = (
        data: Array<{ planName: string; amount: number }>
      ) => {
        const totalAmount = data.reduce(
          (sum, item) => sum + Number(item.amount),
          0
        );
        return data.map((item) => ({
          planName: item.planName,
          amount: Number(item.amount),
          percentage:
            totalAmount > 0
              ? Number(((Number(item.amount) / totalAmount) * 100).toFixed(1))
              : 0,
        }));
      };

      const calcGrowthPercent = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
      };

      // Calculate performance summary metrics
      const overallGrowth = calcGrowthPercent(
        Number(currentPeriodUsers?.count || 0) +
          Number(currentPeriodClinics?.count || 0) +
          Number(currentPeriodRevenue?.total || 0),
        Number(previousPeriodUsers?.count || 0) +
          Number(previousPeriodClinics?.count || 0) +
          Number(previousPeriodRevenue?.total || 0)
      );

      const revenueGrowth = calcGrowthPercent(
        Number(currentPeriodRevenue?.total || 0),
        Number(previousPeriodRevenue?.total || 0)
      );

      const clinicGrowth = calcGrowthPercent(
        Number(currentPeriodClinics?.count || 0),
        Number(previousPeriodClinics?.count || 0)
      );

      const subscriptionGrowth = calcGrowthPercent(
        Number(currentPeriodSubs?.count || 0),
        Number(previousPeriodSubs?.count || 0)
      );

      const userGrowth = calcGrowthPercent(
        Number(currentPeriodUsers?.count || 0),
        Number(previousPeriodUsers?.count || 0)
      );

      // Determine status labels based on growth metrics
      const getGrowthStatus = (growth: number): string => {
        if (growth > 20) return 'Excellent Growth';
        if (growth > 10) return 'Good Growth';
        if (growth > 0) return 'Moderate Growth';
        if (growth === 0) return 'Stable';
        return 'Needs Improvement';
      };

      const dailySeriesFormatted = formatSeries(
        revenueSeries,
        currentStart,
        currentEnd
      );
      const registrationTrendsFormatted = formatSeries(
        clinicRegistrations,
        currentStart,
        currentEnd
      );

      // ─── BUILD RESPONSE ───────────────────────────────────────────────────────
      return {
        clinics: {
          total: Number(totalClinicsRes?.total || 0),
          active: Number(activeClinicsRes?.count || 0),
          inactive: Number(inactiveClinicsRes?.count || 0),
          monthlyActive: Number(monthlyActiveClinicsRes?.count || 0),
          hikePersent: calculateHike(
            Number(currentPeriodClinics?.count || 0),
            Number(previousPeriodClinics?.count || 0)
          ),
        },
        conversionRate: {
          rate: conversionRate,
          hikePersent: calculateHike(conversionRate, prevConversionRate),
        },
        users: {
          total: Number(totalUsersRes?.count || 0),
          monthlyActive: Number(monthlyActiveUsersRes?.count || 0),
          byRole,
          hikePersent: calculateHike(
            Number(currentPeriodUsers?.count || 0),
            Number(previousPeriodUsers?.count || 0)
          ),
        },
        subscriptions: {
          active: activeSubscriptions.length,
          total: Number(totalSubsRes?.count || 0),
          yearly: yearlyCount,
          trial: trialCount,
          expired: Number(expiredSubsRes?.count || 0),
          cancelled: Number(cancelledSubsRes?.count || 0),
          byPlan,
          hikePersent: calculateHike(
            Number(currentPeriodSubs?.count || 0),
            Number(previousPeriodSubs?.count || 0)
          ),
        },
        revenue: {
          total: Number(totalRevenueAllTime?.total || 0),
          yearly: Number(yearlyRevenueRes?.total || 0),
          currentPeriod: Number(currentPeriodRevenue?.total || 0),
          hikePersent: calculateHike(
            Number(currentPeriodRevenue?.total || 0),
            Number(previousPeriodRevenue?.total || 0)
          ),
          dailySeries: dailySeriesFormatted,
          byPlan: {
            thisWeek: formatRevenueByPlan(revenueByPlanThisWeek as any),
            thisMonth: formatRevenueByPlan(revenueByPlanThisMonth as any),
          },
          analytics: {
            thisMonth: {
              amount: Number(thisMonthRevenue?.total || 0),
              growthPercent: calcGrowthPercent(
                Number(thisMonthRevenue?.total || 0),
                Number(lastMonthRevenue?.total || 0)
              ),
            },
            lastMonth: {
              amount: Number(lastMonthRevenue?.total || 0),
              growthPercent: calcGrowthPercent(
                Number(lastMonthRevenue?.total || 0),
                Number(monthBeforeLastRevenue?.total || 0)
              ),
            },
            allTime: {
              amount: Number(totalRevenueAllTime?.total || 0),
              growthPercent: calcGrowthPercent(
                Number(thisMonthRevenue?.total || 0),
                Number(lastMonthRevenue?.total || 0)
              ),
            },
          },
        },
        performanceSummary: {
          overallGrowth,
          overallStatus: getGrowthStatus(overallGrowth),
          revenueGrowth,
          revenueStatus: getGrowthStatus(revenueGrowth),
          clinicGrowth,
          clinicStatus: getGrowthStatus(clinicGrowth),
          subscriptionGrowth,
          subscriptionStatus: getGrowthStatus(subscriptionGrowth),
          userGrowth,
          userStatus: getGrowthStatus(userGrowth),
        },
        topClinics: topClinicsWithGrowth,
        registrationTrends: {
          clinics: registrationTrendsFormatted,
        },
        activities,
      };
    });

    // Cache result in Redis for 1 hour with lastUpdatedAt timestamp
    const responseWithTimestamp = {
      ...result,
      lastUpdatedAt: new Date().toISOString(),
    };
    await redisClient.setex(
      cacheKey,
      3600,
      JSON.stringify(responseWithTimestamp)
    );

    return responseWithTimestamp;
  }

  /**
   * Revenue Overview API
   * - Admin: returns clinic-wide revenue (or specific doctor if doctorId passed)
   * - Doctor: returns only their own revenue
   * - period: 'week' (default, full 7 days Mon-Sun) or 'month' (full current month)
   * - Revenue is calculated based on PAYMENT STATUS (Paid/Refunded), not appointment status.
   *   This ensures consistency: pre-paid appointments show revenue immediately,
   *   not only after the appointment is marked Completed.
   * - Cached in Redis for 2 minutes, invalidated on appointment update
   */
  static async getRevenueOverview(
    clinicId: string,
    user: AuthUser,
    opts?: { doctorId?: string; period?: 'week' | 'month' }
  ) {
    const isAdmin =
      user.userType === 'Admin' || user.userType === 'Super_Admin';

    // Determine target doctor
    let targetDoctorId: string | null = null;
    if (isAdmin && opts?.doctorId) {
      targetDoctorId = opts.doctorId;
    } else if (!isAdmin && user.userType === 'Doctor') {
      targetDoctorId = user.id;
    }

    const period = opts?.period || 'week';

    // Build cache key
    const cacheKey = targetDoctorId
      ? `revenue_overview:${clinicId}:doctor:${targetDoctorId}:${period}`
      : `revenue_overview:${clinicId}:all:${period}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Date ranges
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;

    if (period === 'month') {
      // Full current month: 1st to last day
      rangeStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      rangeEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
      );
    } else {
      // Full 7 days: Monday to Sunday of current week
      const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      rangeStart = new Date(now);
      rangeStart.setUTCDate(now.getUTCDate() - diffToMonday);
      rangeStart.setUTCHours(0, 0, 0, 0);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setUTCDate(rangeStart.getUTCDate() + 6);
    }
    rangeEnd.setUTCHours(23, 59, 59, 999);

    // Build where conditions — revenue recognized by payment status, not appointment status
    // This matches the admin dashboard totalEarning logic for consistency:
    // Paid = full price counted, Refunded = price minus refundedAmount
    const conditions: any[] = [
      eq(AppointmentModel.clinicId, clinicId),
      gte(AppointmentModel.appointmentDate, rangeStart),
      lte(AppointmentModel.appointmentDate, rangeEnd),
      or(
        eq(AppointmentPaymentModel.paymentStatus, 'Paid'),
        eq(AppointmentPaymentModel.paymentStatus, 'Refunded')
      ),
    ];
    if (targetDoctorId) {
      conditions.push(eq(AppointmentModel.doctorId, targetDoctorId));
    }

    // Exclude cancelled/noshow appointments from revenue
    conditions.push(
      sql`${AppointmentModel.appointmentStatus} NOT IN ('Cancelled', 'NoShow')`
    );

    // Query daily revenue with proper Paid/Refunded handling
    const rows = await database
      .select({
        date: sql<string>`DATE(${AppointmentModel.appointmentDate})`,
        amount: sql<string>`COALESCE(SUM(
          CASE 
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Paid' THEN ${AppointmentPaymentModel.price}::numeric
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Refunded' THEN 
              ${AppointmentPaymentModel.price}::numeric - COALESCE(${AppointmentPaymentModel.refundedAmount}::numeric, ${AppointmentPaymentModel.price}::numeric)
            ELSE 0
          END
        ), 0)`,
        refundedAmount: sql<string>`COALESCE(SUM(
          CASE 
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Refunded' THEN COALESCE(${AppointmentPaymentModel.refundedAmount}::numeric, 0)
            ELSE 0
          END
        ), 0)`,
      })
      .from(AppointmentModel)
      .innerJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .where(and(...conditions))
      .groupBy(sql`DATE(${AppointmentModel.appointmentDate})`)
      .orderBy(sql`DATE(${AppointmentModel.appointmentDate}) ASC`);

    // Query payment mode breakdown per day
    const modeRows = await database
      .select({
        date: sql<string>`DATE(${AppointmentModel.appointmentDate})`,
        paymentMode: AppointmentPaymentModel.paymentMode,
        modeAmount: sql<string>`COALESCE(SUM(
          CASE 
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Paid' THEN ${AppointmentPaymentModel.price}::numeric
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Refunded' THEN 
              ${AppointmentPaymentModel.price}::numeric - COALESCE(${AppointmentPaymentModel.refundedAmount}::numeric, ${AppointmentPaymentModel.price}::numeric)
            ELSE 0
          END
        ), 0)`,
      })
      .from(AppointmentModel)
      .innerJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .where(and(...conditions))
      .groupBy(
        sql`DATE(${AppointmentModel.appointmentDate})`,
        AppointmentPaymentModel.paymentMode
      )
      .orderBy(sql`DATE(${AppointmentModel.appointmentDate}) ASC`);

    // Build a map of date -> data
    const dataMap = new Map<
      string,
      {
        amount: number;
        refundedAmount: number;
        paymentModes: Record<string, number>;
      }
    >();
    for (const r of rows) {
      dataMap.set(String(r.date), {
        amount: parseFloat(r.amount || '0'),
        refundedAmount: parseFloat(r.refundedAmount || '0'),
        paymentModes: {},
      });
    }

    // Fill payment mode breakdown
    for (const r of modeRows) {
      const dateKey = String(r.date);
      const entry = dataMap.get(dateKey);
      if (entry && r.paymentMode) {
        entry.paymentModes[r.paymentMode] = parseFloat(r.modeAmount || '0');
      }
    }

    // Fill all dates in range
    const revenueOverview: Array<{
      date: string;
      amount: number;
      refundedAmount: number;
      paymentModes: Record<string, number>;
    }> = [];

    let totalRevenue = 0;
    let totalRefunded = 0;

    for (
      let cur = new Date(rangeStart);
      cur <= rangeEnd;
      cur.setUTCDate(cur.getUTCDate() + 1)
    ) {
      const key = cur.toISOString().split('T')[0];
      const entry = dataMap.get(key);
      const amount = entry?.amount || 0;
      const refundedAmount = entry?.refundedAmount || 0;
      const paymentModes = entry?.paymentModes || {};

      totalRevenue += amount;
      totalRefunded += refundedAmount;

      revenueOverview.push({
        date: key,
        amount,
        refundedAmount,
        paymentModes,
      });
    }

    // Pending payments in this range (appointments with payment status 'Pending')
    const pendingConditions: any[] = [
      eq(AppointmentModel.clinicId, clinicId),
      gte(AppointmentModel.appointmentDate, rangeStart),
      lte(AppointmentModel.appointmentDate, rangeEnd),
      eq(AppointmentPaymentModel.paymentStatus, 'Pending'),
      sql`${AppointmentModel.appointmentStatus} NOT IN ('Cancelled', 'NoShow')`,
    ];
    if (targetDoctorId) {
      pendingConditions.push(eq(AppointmentModel.doctorId, targetDoctorId));
    }

    const [pendingResult] = await database
      .select({
        pendingAmount: sql<string>`COALESCE(SUM(${AppointmentPaymentModel.price}::numeric), 0)`,
        pendingCount: sql<string>`COUNT(*)`,
      })
      .from(AppointmentModel)
      .innerJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .where(and(...pendingConditions));

    const pendingPayments = parseFloat(pendingResult?.pendingAmount || '0');
    const pendingPaymentCount = parseInt(
      pendingResult?.pendingCount || '0',
      10
    );

    // Today's revenue (subset of totalRevenue for today specifically)
    const todayKey = now.toISOString().split('T')[0];
    const todayEntry = dataMap.get(todayKey);
    const todayRevenue = todayEntry?.amount || 0;

    // Previous period revenue for comparison (same logic: payment-based)
    const periodDurationMs = rangeEnd.getTime() - rangeStart.getTime();
    const prevRangeEnd = new Date(rangeStart.getTime() - 1);
    prevRangeEnd.setUTCHours(23, 59, 59, 999);
    const prevRangeStart = new Date(prevRangeEnd.getTime() - periodDurationMs);
    prevRangeStart.setUTCHours(0, 0, 0, 0);

    const prevConditions: any[] = [
      eq(AppointmentModel.clinicId, clinicId),
      gte(AppointmentModel.appointmentDate, prevRangeStart),
      lte(AppointmentModel.appointmentDate, prevRangeEnd),
      or(
        eq(AppointmentPaymentModel.paymentStatus, 'Paid'),
        eq(AppointmentPaymentModel.paymentStatus, 'Refunded')
      ),
      sql`${AppointmentModel.appointmentStatus} NOT IN ('Cancelled', 'NoShow')`,
    ];
    if (targetDoctorId) {
      prevConditions.push(eq(AppointmentModel.doctorId, targetDoctorId));
    }

    const [prevResult] = await database
      .select({
        prevRevenue: sql<string>`COALESCE(SUM(
          CASE 
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Paid' THEN ${AppointmentPaymentModel.price}::numeric
            WHEN ${AppointmentPaymentModel.paymentStatus} = 'Refunded' THEN 
              ${AppointmentPaymentModel.price}::numeric - COALESCE(${AppointmentPaymentModel.refundedAmount}::numeric, ${AppointmentPaymentModel.price}::numeric)
            ELSE 0
          END
        ), 0)`,
      })
      .from(AppointmentModel)
      .innerJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .where(and(...prevConditions));

    const previousRevenue = parseFloat(prevResult?.prevRevenue || '0');

    // Calculate trend
    let trendPercent = 0;
    if (previousRevenue === 0) {
      trendPercent = totalRevenue > 0 ? 100 : 0;
    } else {
      trendPercent = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    }
    const trendDirection = trendPercent > 0 ? '↑' : trendPercent < 0 ? '↓' : '';
    const trend =
      trendPercent === 0
        ? '0%'
        : `${trendDirection} ${Math.abs(trendPercent).toFixed(1)}%`;

    const comparisonLabel =
      period === 'week' ? 'vs last 7 days' : 'vs last month';

    const result = {
      period,
      totalRevenue,
      totalRefunded,
      netRevenue: totalRevenue - totalRefunded,
      todayRevenue,
      pendingPayments,
      pendingPaymentCount,
      trend,
      previousRevenue,
      comparisonLabel,
      revenueOverview,
      meta: {
        clinicId,
        doctorId: targetDoctorId,
        rangeStart: rangeStart.toISOString().split('T')[0],
        rangeEnd: rangeEnd.toISOString().split('T')[0],
        generatedAt: now.toISOString(),
      },
    };

    // Cache for 2 minutes (120 seconds)
    await redisClient.setex(cacheKey, 120, JSON.stringify(result));

    return result;
  }

  /**
   * Invalidate revenue overview cache for a clinic (and optionally a specific doctor)
   */
  static async invalidateRevenueCache(
    clinicId: string,
    doctorId?: string | null
  ) {
    // Invalidate all period variants for clinic-wide
    await redisClient.del(`revenue_overview:${clinicId}:all:week`);
    await redisClient.del(`revenue_overview:${clinicId}:all:month`);
    // If doctor-specific, also invalidate that
    if (doctorId) {
      await redisClient.del(
        `revenue_overview:${clinicId}:doctor:${doctorId}:week`
      );
      await redisClient.del(
        `revenue_overview:${clinicId}:doctor:${doctorId}:month`
      );
    }
    // Also invalidate today overview
    await redisClient.del(`today_overview:${clinicId}:all`);
    if (doctorId) {
      await redisClient.del(`today_overview:${clinicId}:doctor:${doctorId}`);
    }
  }

  /**
   * Today's Overview API
   * Returns today's revenue + appointment stats (total, remaining, completed, pending)
   * + upcoming appointment details (id, date, time, patient name)
   * - Doctor: sees only their own data
   * - Admin with doctor permission (isAdminDoctorAccess): can pass doctorId
   * - Cached in Redis for 1 hour, invalidated on today's appointment status change
   */
  static async getTodayOverview(
    clinicId: string,
    user: AuthUser,
    opts?: { doctorId?: string }
  ) {
    // Determine target doctor
    let targetDoctorId: string;
    if (user.userType === 'Doctor') {
      targetDoctorId = user.id;
    } else if (
      (user.userType === 'Admin' || user.userType === 'Super_Admin') &&
      user.isAdminDoctorAccess
    ) {
      targetDoctorId = opts?.doctorId || user.id;
    } else if (user.userType === 'Admin' || user.userType === 'Super_Admin') {
      targetDoctorId = opts?.doctorId || user.id;
    } else {
      targetDoctorId = user.id;
    }

    // Cache key
    const cacheKey = `today_overview:${clinicId}:doctor:${targetDoctorId}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Today's date range
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const todayConditions = and(
      eq(AppointmentModel.clinicId, clinicId),
      eq(AppointmentModel.doctorId, targetDoctorId),
      gte(AppointmentModel.appointmentDate, todayStart),
      lte(AppointmentModel.appointmentDate, todayEnd)
    );

    // Appointment stats for today
    const appointmentStats = await database
      .select({
        status: AppointmentModel.appointmentStatus,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(AppointmentModel)
      .where(todayConditions)
      .groupBy(AppointmentModel.appointmentStatus);

    let totalAppointments = 0;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;
    let noShow = 0;
    let confirmed = 0;

    for (const row of appointmentStats) {
      const cnt = Number(row.count);
      totalAppointments += cnt;
      if (row.status === 'Completed') completed = cnt;
      else if (row.status === 'Pending') pending = cnt;
      else if (row.status === 'Cancelled') cancelled = cnt;
      else if (row.status === 'NoShow') noShow = cnt;
      else if (row.status === 'Confirmed') confirmed = cnt;
    }

    // Remaining = total - completed - cancelled - noShow
    const remaining = totalAppointments - completed - cancelled - noShow;

    // Today's revenue (appointments with Paid payment status today, excluding Cancelled/NoShow)
    const todayRevenueConditions = and(
      eq(AppointmentModel.clinicId, clinicId),
      eq(AppointmentModel.doctorId, targetDoctorId),
      gte(AppointmentModel.appointmentDate, todayStart),
      lte(AppointmentModel.appointmentDate, todayEnd),
      eq(AppointmentPaymentModel.paymentStatus, 'Paid'),
      sql`${AppointmentModel.appointmentStatus} NOT IN ('Cancelled', 'NoShow')`
    );

    const [todayRevenueResult] = await database
      .select({
        revenue: sql<string>`COALESCE(SUM(${AppointmentPaymentModel.price}::numeric), 0)`,
        paidCount: sql<string>`COUNT(*)`,
      })
      .from(AppointmentModel)
      .innerJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .where(todayRevenueConditions);

    const todayRevenue = parseFloat(todayRevenueResult?.revenue || '0');
    const todayPaidAppointments = parseInt(
      todayRevenueResult?.paidCount || '0',
      10
    );

    // Today's pending payments
    const [todayPendingResult] = await database
      .select({
        pendingAmount: sql<string>`COALESCE(SUM(${AppointmentPaymentModel.price}::numeric), 0)`,
        pendingCount: sql<string>`COUNT(*)`,
      })
      .from(AppointmentModel)
      .innerJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          eq(AppointmentModel.doctorId, targetDoctorId),
          gte(AppointmentModel.appointmentDate, todayStart),
          lte(AppointmentModel.appointmentDate, todayEnd),
          eq(AppointmentPaymentModel.paymentStatus, 'Pending'),
          sql`${AppointmentModel.appointmentStatus} NOT IN ('Cancelled', 'NoShow')`
        )
      );

    const todayPendingPayments = parseFloat(
      todayPendingResult?.pendingAmount || '0'
    );
    const todayPendingCount = parseInt(
      todayPendingResult?.pendingCount || '0',
      10
    );

    // Today's appointments: all appointments for today with full details
    const todaysAppointments = await database
      .select({
        id: AppointmentModel.id,
        appointmentDate: AppointmentModel.appointmentDate,
        appointmentTime: AppointmentModel.appointmentTime,
        appointmentType: AppointmentModel.appointmentType,
        appointmentStatus: AppointmentModel.appointmentStatus,
        tokenNo: AppointmentModel.tokenNo,
        patientId: AppointmentModel.patientId,
        patientName: UserModel.name,
        patientGender: UserProfileModel.gender,
        patientAge: UserProfileModel.age,
        patientProfileImage: UserProfileModel.profileImage,
        paymentStatus: AppointmentPaymentModel.paymentStatus,
        commonSymptoms: AppointmentClinicalModel.commonSymptoms,
      })
      .from(AppointmentModel)
      .innerJoin(UserModel, eq(UserModel.id, AppointmentModel.patientId))
      .leftJoin(
        UserProfileModel,
        eq(UserProfileModel.userId, AppointmentModel.patientId)
      )
      .leftJoin(
        AppointmentPaymentModel,
        eq(AppointmentPaymentModel.appointmentId, AppointmentModel.id)
      )
      .leftJoin(
        AppointmentClinicalModel,
        eq(AppointmentClinicalModel.appointmentId, AppointmentModel.id)
      )
      .where(
        and(
          eq(AppointmentModel.clinicId, clinicId),
          eq(AppointmentModel.doctorId, targetDoctorId),
          gte(AppointmentModel.appointmentDate, todayStart),
          lte(AppointmentModel.appointmentDate, todayEnd)
        )
      )
      .orderBy(sql`${AppointmentModel.appointmentTime} ASC`);

    // Symptom counts for current week (Mon-Sun), cached separately for 1 week
    const symptomCacheKey = `symptom_counts_week:${clinicId}`;
    let symptomCounts: Record<string, number> = {};

    const cachedSymptoms = await redisClient.get(symptomCacheKey);
    if (cachedSymptoms) {
      symptomCounts = JSON.parse(cachedSymptoms);
    } else {
      // This week: Monday to Sunday
      const weekDay = now.getUTCDay();
      const diffMon = weekDay === 0 ? 6 : weekDay - 1;
      const weekStart = new Date(now);
      weekStart.setUTCDate(now.getUTCDate() - diffMon);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const symptomRows = await database
        .select({
          symptomName: ClinicSymptomModel.name,
          count: sql<number>`SUM(${ClinicSymptomCountModel.count})::int`,
        })
        .from(ClinicSymptomCountModel)
        .innerJoin(
          ClinicSymptomModel,
          eq(ClinicSymptomCountModel.symptomId, ClinicSymptomModel.id)
        )
        .where(
          and(
            eq(ClinicSymptomModel.clinicId, clinicId),
            gte(ClinicSymptomCountModel.date, weekStartStr),
            lte(ClinicSymptomCountModel.date, weekEndStr)
          )
        )
        .groupBy(ClinicSymptomModel.id, ClinicSymptomModel.name)
        .orderBy(desc(sql`SUM(${ClinicSymptomCountModel.count})`));

      for (const row of symptomRows) {
        symptomCounts[row.symptomName] = Number(row.count || 0);
      }

      // Cache symptom counts for 1 week (604800 seconds)
      await redisClient.setex(
        symptomCacheKey,
        604800,
        JSON.stringify(symptomCounts)
      );
    }

    // Patient Overview: New vs Returning patients (current 30 days vs previous 30 days)
    const patientCacheKey = targetDoctorId
      ? `patient_overview:${clinicId}:doctor:${targetDoctorId}`
      : `patient_overview:${clinicId}:all`;

    let patientOverview: {
      newPatients: { count: number; trend: string };
      returningPatients: { count: number; trend: string };
    };

    const cachedPatients = await redisClient.get(patientCacheKey);
    if (cachedPatients) {
      patientOverview = JSON.parse(cachedPatients);
    } else {
      // Current 30 days and previous 30 days
      const current30Start = new Date(now);
      current30Start.setUTCDate(now.getUTCDate() - 29);
      current30Start.setUTCHours(0, 0, 0, 0);
      const current30End = new Date(now);
      current30End.setUTCHours(23, 59, 59, 999);

      const prev30End = new Date(current30Start);
      prev30End.setUTCDate(prev30End.getUTCDate() - 1);
      prev30End.setUTCHours(23, 59, 59, 999);
      const prev30Start = new Date(prev30End);
      prev30Start.setUTCDate(prev30End.getUTCDate() - 29);
      prev30Start.setUTCHours(0, 0, 0, 0);

      // Helper: get new and returning patient counts for a date range
      const getPatientStats = async (start: Date, end: Date) => {
        const baseConditions: any[] = [
          eq(AppointmentModel.clinicId, clinicId),
          gte(AppointmentModel.appointmentDate, start),
          lte(AppointmentModel.appointmentDate, end),
        ];
        if (targetDoctorId) {
          baseConditions.push(eq(AppointmentModel.doctorId, targetDoctorId));
        }

        // All unique patients in this range
        const patientsInRange = await database
          .selectDistinct({ patientId: AppointmentModel.patientId })
          .from(AppointmentModel)
          .where(and(...baseConditions));

        const patientIds = patientsInRange.map((p) => p.patientId);
        if (patientIds.length === 0) {
          return { newPatients: 0, returningPatients: 0 };
        }

        // Find which of these patients had an appointment BEFORE this range
        const beforeConditions: any[] = [
          eq(AppointmentModel.clinicId, clinicId),
          lt(AppointmentModel.appointmentDate, start),
          inArray(AppointmentModel.patientId, patientIds),
        ];
        if (targetDoctorId) {
          beforeConditions.push(eq(AppointmentModel.doctorId, targetDoctorId));
        }

        const returningRows = await database
          .selectDistinct({ patientId: AppointmentModel.patientId })
          .from(AppointmentModel)
          .where(and(...beforeConditions));

        const returningCount = returningRows.length;
        const newCount = patientIds.length - returningCount;

        return { newPatients: newCount, returningPatients: returningCount };
      };

      const currentStats = await getPatientStats(current30Start, current30End);
      const prevStats = await getPatientStats(prev30Start, prev30End);

      // Calculate trend percentage
      const calcTrend = (current: number, previous: number): string => {
        if (previous === 0) {
          return current > 0 ? `↑ 100%` : `0%`;
        }
        const percent = Math.round(((current - previous) / previous) * 100);
        if (percent > 0) return `↑ ${percent}%`;
        if (percent < 0) return `↓ ${Math.abs(percent)}%`;
        return `0%`;
      };

      patientOverview = {
        newPatients: {
          count: currentStats.newPatients,
          trend: calcTrend(currentStats.newPatients, prevStats.newPatients),
        },
        returningPatients: {
          count: currentStats.returningPatients,
          trend: calcTrend(
            currentStats.returningPatients,
            prevStats.returningPatients
          ),
        },
      };

      // Cache for 6 hours (21600 seconds)
      await redisClient.setex(
        patientCacheKey,
        21600,
        JSON.stringify(patientOverview)
      );
    }

    const result = {
      date: todayStart.toISOString().split('T')[0],
      appointments: {
        total: totalAppointments,
        remaining,
        completed,
        pending,
        confirmed,
        cancelled,
        noShow,
      },
      revenue: {
        todayRevenue,
        todayPaidAppointments,
        todayPendingPayments,
        todayPendingCount,
      },
      todaysAppointments: todaysAppointments.map((a) => ({
        id: a.id,
        appointmentDate: a.appointmentDate,
        appointmentTime: a.appointmentTime,
        appointmentType: a.appointmentType,
        appointmentStatus: a.appointmentStatus,
        tokenNo: a.tokenNo,
        patientName: a.patientName,
        patientAge: a.patientAge,
        patientGender: a.patientGender,
        patientProfileImage: a.patientProfileImage,
        paymentStatus: a.paymentStatus || null,
        reason: a.commonSymptoms?.length ? a.commonSymptoms.join(', ') : null,
      })),
      symptomCounts: {
        period: 'this_week',
        data: symptomCounts,
      },
      patientOverview: {
        period: 'past_30_days',
        ...patientOverview,
      },
      meta: {
        clinicId,
        doctorId: targetDoctorId,
        generatedAt: now.toISOString(),
      },
    };

    // Cache for 2 minutes (120 seconds)
    await redisClient.setex(cacheKey, 120, JSON.stringify(result));

    return result;
  }
}
