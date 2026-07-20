/**
 * appointment.mapper.ts
 * API types, domain types, and the mapping function that converts raw API
 * responses into the normalised Row shape used throughout the appointment UI.
 */

import { formatDate, formatTime } from "./index";

// ─── API shapes (relaxed – mirrors what the backend actually sends) ────────────

export interface ApiAppointment {
  id?: string | number | null;
  appointmentStatus?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  appointmentDurationMinutes?: number | null;
  appointmentType?: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  refundMode?: string | null;
  refundedAmount?: number | null;
  service?: string[] | null;
  refundNotes?: string | null;
  tokenNo?: number | null;
  bookingSource?: string | null;
}

export interface ApiDoctor {
  id?: string | number | null;
  _id?: string | number | null;
  name?: string | null;
  email?: string | null;
  qualification?: string | null;
  speciality?: string | null;
}

export interface ApiPatient {
  id?: string | number | null;
  name?: string | null;
  profileImage?: string | null;
  age?: number | null;
  gender?: string | null;
  mobile?: string | null;
  appointment?: ApiAppointment | null;
  doctor?: ApiDoctor | null;
  /** Some API responses embed service pricing at the patient level */
  service?: { servicePrice?: number | null } | null;
}

// ─── Normalised domain row ─────────────────────────────────────────────────────

export interface AppointmentRow {
  /** Raw UUID / ObjectId from the API */
  rawId: string;
  /** Display-friendly short ID, e.g. "App#abc123" */
  id: string;
  name: string;
  avatar: string | null;
  age: number | null;
  gender: "Male" | "Female" | "-";
  mobile: string | null;
  /** Formatted display date, e.g. "01 January 2025" */
  date: string;
  /** Formatted display time, e.g. "10:30 AM" */
  time: string;
  appointmentDurationMinutes: number | null;
  tokenNo: number | null;
  type: string;
  doctorName: string;
  status: string;
  /** True when a pending/confirmed appointment is in the past */
  isExpired: boolean;
  paymentMethod: string | null;
  paymentStatus: string | null;
  refundMode: string | null;
  refundedAmount: number | null;
  service: string[] | null;
  servicePrice: number | null;
  refundNotes: string | null;
  qualification: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  bookingSource?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Produces a short display ID from a raw appointment UUID. */
export const buildDisplayId = (rawId: string): string =>
  rawId ? `App#${rawId.slice(0, 6)}` : "—";

/**
 * Converts a backend appointment date + time into a JS Date.
 *
 * Rules:
 * - Ignores the backend placeholder time "23:59" / "23:59:00".
 * - Falls back to a date-only Date when no usable time is present.
 * - Returns null when the date string is missing or unparseable.
 */
export const buildAppointmentDateTime = (
  appointment: ApiAppointment | null | undefined,
): Date | null => {
  if (!appointment) return null;

  const dateStr = (appointment.appointmentDate ?? "").trim();
  const timeStr = (appointment.appointmentTime ?? "").trim();

  const isPlaceholderTime = timeStr === "23:59" || timeStr === "23:59:00";
  const hasUsableTime =
    timeStr &&
    /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr) &&
    !isPlaceholderTime;

  if (dateStr && hasUsableTime) {
    const ymd = dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
    const hhmm = timeStr.slice(0, 5);
    const parsed = new Date(`${ymd}T${hhmm}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (dateStr) {
    const ymd = dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  return null;
};

// ─── Normalise gender string ───────────────────────────────────────────────────

const normaliseGender = (raw: string | null | undefined): AppointmentRow["gender"] => {
  const lower = (raw ?? "").toString().toLowerCase();
  if (lower === "male" || lower === "m") return "Male";
  if (lower === "female" || lower === "f") return "Female";
  return "-";
};

// ─── Normalise payment fields ──────────────────────────────────────────────────

const normalisePayment = (
  appointment: ApiAppointment | null,
): Pick<AppointmentRow, "paymentMethod" | "paymentStatus" | "refundMode" | "refundedAmount" | "refundNotes"> => {
  const rawMethod = String(appointment?.paymentMethod ?? "").trim();
  const rawStatus = String(appointment?.paymentStatus ?? "").trim();

  const paymentMethod = rawMethod || "Covered";
  const isPayLater = paymentMethod.toLowerCase() === "pay later";
  const isRefunded = rawStatus === "Refunded";

  const paymentStatus =
    rawStatus === "Already Paid"
      ? "Covered"
      : rawStatus || (isPayLater ? null : "Covered");

  return {
    paymentMethod,
    paymentStatus,
    refundMode: isRefunded ? (appointment?.refundMode ?? null) : null,
    refundedAmount: isRefunded ? (appointment?.refundedAmount ?? null) : null,
    refundNotes: isRefunded ? (appointment?.refundNotes ?? null) : null,
  };
};

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * Maps a raw API patient record into a normalised AppointmentRow.
 * All display formatting and business rules are applied here so that
 * UI components receive clean, typed data.
 */
export const mapAppointmentFromApi = (patient: ApiPatient): AppointmentRow => {
  const appointment = patient?.appointment ?? null;
  const rawId = String(appointment?.id ?? "").trim();

  const statusText = (appointment?.appointmentStatus ?? "—").trim();
  const doctorName =
    patient?.doctor?.name?.trim() ||
    patient?.doctor?.email?.trim() ||
    "—";

  const appointmentDateTime = buildAppointmentDateTime(appointment);
  const now = new Date();

  const statusLower = statusText.toLowerCase();
  const canExpire = statusLower === "pending" || statusLower === "confirmed";
  const isExpired =
    canExpire &&
    !!appointmentDateTime &&
    appointmentDateTime.getTime() < now.getTime();

  const rawDuration = appointment?.appointmentDurationMinutes;
  const appointmentDurationMinutes =
    rawDuration != null && !isNaN(Number(rawDuration))
      ? Number(rawDuration)
      : null;

  return {
    rawId,
    id: buildDisplayId(rawId),
    name: patient?.name ?? "Unknown",
    avatar: patient?.profileImage ?? null,
    age: typeof patient?.age === "number" ? patient.age : null,
    gender: normaliseGender(patient?.gender),
    mobile: patient?.mobile ?? null,
    date: formatDate(appointment?.appointmentDate ?? ""),
    time: formatTime(appointment?.appointmentTime ?? ""),
    appointmentDate: appointment?.appointmentDate ?? null,
    appointmentTime: appointment?.appointmentTime ?? null,
    appointmentDurationMinutes,
    tokenNo: appointment?.tokenNo ?? null,
    type: appointment?.appointmentType ?? "—",
    service: appointment?.service ?? null,
    servicePrice: patient?.service?.servicePrice ?? null,
    qualification: patient?.doctor?.qualification ?? null,
    doctorName,
    status: statusText,
    isExpired,
    bookingSource: appointment?.bookingSource ?? null,
    ...normalisePayment(appointment),
  };
};
