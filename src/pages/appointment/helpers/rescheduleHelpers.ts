import {
  calcDurationMinutes,
  extractTimeLabel,
  toApiDate,
} from "../new-appointment/helpers/dateTimeHelpers";
import { formatTimeTo12Hour as sharedFormatTimeTo12Hour } from "../new-appointment/helpers/appointmentSummaryHelpers";
import type {
  RescheduleFormValues,
  Slot,
  SlotStatus,
  TimeSlot,
  TokenSlot,
} from "../../../types/appointment";

// Normalize time "H:mm" | "HH:mm" | ISO -> "HH:mm" for the submit payload
export const fmtTime = (t: any): string => extractTimeLabel(t);

// Combine date + time -> ISO string "YYYY-MM-DDTHH:mm:00.sssZ"
export const buildAppointmentDateTimeIso = (date: any, time: any): string => {
  const dateStr = toApiDate(date);
  const timeStr = fmtTime(time);
  if (!dateStr || !timeStr) return "";
  const local = `${dateStr}T${timeStr}:00`;
  return new Date(local).toISOString();
};

export const normalizeStatus = (raw: any): SlotStatus => {
  const s = String(raw ?? "available").toLowerCase();
  if (s.includes("book")) return "booked";
  if (s.includes("reserv")) return "reserved";
  if (s.includes("break")) return "break";
  return "available";
};

/**
 * Reschedule-specific slot normalizer — a deliberate near-duplicate of
 * `new-appointment/helpers/slotHelpers.ts`'s `normalizeSlotsFromApi`, kept
 * separate because it carries extra fields (`appointmentId`/`appointmentStatus`/
 * `patientId`/`source`/`shift1`/`shift2`) the reschedule form needs to detect
 * "this slot is the appointment's own current booking" that the New Appointment
 * flow has no use for. See `src/types/appointment/reschedule.ts`.
 */
export const normalizeSlotsFromApi = (resp: any, filterDate?: string): Slot[] => {
  if (!resp) return [];

  let src: any = resp;
  if (!Array.isArray(src)) {
    src = resp.result ?? resp.slots ?? resp.data ?? resp.availableSlots ?? [];
  }
  if (!Array.isArray(src)) return [];

  const isTokenResponse = src.some((x: any) => Array.isArray(x?.tokens));

  if (isTokenResponse) {
    const out: Slot[] = [];

    src.forEach((dayItem: any, dayIdx: number) => {
      const rawStart = dayItem?.start ?? dayItem?.startTime ?? dayItem?.from;
      if (!rawStart) return;

      const dayDateIso = String(rawStart).slice(0, 10).replace(/\//g, "-");
      if (filterDate && dayDateIso !== filterDate) return;

      const weekday = (() => {
        const d = new Date(`${dayDateIso}T00:00:00`);
        return isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("en-US", { weekday: "short" });
      })();

      const caid = String(dayItem?.clinicAvailabilityId ?? "");
      const shift1 = dayItem?.shift1;
      const shift2 = dayItem?.shift2;

      const tokens: any[] = Array.isArray(dayItem?.tokens)
        ? dayItem.tokens
        : [];
      tokens.forEach((t: any, idx: number) => {
        const tokenNo = Number(t?.tokenNo ?? t?.token ?? idx + 1);
        if (!Number.isFinite(tokenNo)) return;

        const st = normalizeStatus(t?.status ?? dayItem?.status ?? "available");

        out.push({
          kind: "token",
          id: `${caid || "ca"}-token-${tokenNo}-${dayIdx}-${idx}`,
          tokenNo,
          status: st,
          dateIso: dayDateIso,
          weekday,
          clinicAvailabilityId: caid || undefined,
          shift1,
          shift2,
        } as TokenSlot);
      });
    });

    return out;
  }

  return src
    .map((x: any, idx: number) => {
      const rawStart =
        x.startTime ?? x.start ?? x.fromTime ?? x.from ?? x.slotStart;
      const rawEnd = x.endTime ?? x.end ?? x.toTime ?? x.to ?? x.slotEnd;

      if (!rawStart || !rawEnd) return null;

      const startStr = String(rawStart);
      const slotDateIso = startStr.slice(0, 10).replace(/\//g, "-");
      if (filterDate && slotDateIso && slotDateIso !== filterDate) return null;

      const weekday = (() => {
        const d = new Date(startStr);
        return isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("en-US", { weekday: "short" });
      })();

      const startLabel = extractTimeLabel(rawStart);
      const endLabel = extractTimeLabel(rawEnd);
      if (!startLabel || !endLabel) return null;

      const durationMinutes = calcDurationMinutes(rawStart, rawEnd);

      const keyBase = String(
        x.id ??
          x.slotId ??
          x.breakId ??
          x.appointmentId ??
          x.clinicAvailabilityId ??
          "slot",
      );

      const uniqueId = `${keyBase}-${String(rawStart)}-${String(rawEnd)}-${idx}`;

      return {
        kind: "time",
        id: uniqueId,
        startTime: startLabel,
        endTime: endLabel,
        status: normalizeStatus(x.status ?? x.source),
        durationMinutes,
        dateIso: slotDateIso,
        weekday,
        appointmentId: x.appointmentId ? String(x.appointmentId) : undefined,
        appointmentStatus: x.appointmentStatus
          ? String(x.appointmentStatus)
          : undefined,
        patientId: x.patientId ? String(x.patientId) : undefined,
        source: x.source ? String(x.source) : undefined,
        shift1: x.shift1,
        shift2: x.shift2,
      } as TimeSlot;
    })
    .filter(Boolean) as Slot[];
};

/**
 * Also a deliberate near-duplicate of the shared `groupSlotsIntoMultipleShifts`
 * — this one additionally treats `source === "break"` as a break boundary
 * (the shared version only checks `status === "break"`), matching the extra
 * `source` field reschedule's slots carry.
 */
export const groupSlotsIntoMultipleShifts = (
  slots: Slot[],
  shiftLabelsFromApi: string[] = [],
): { shifts: TimeSlot[][]; shiftLabels: string[] } => {
  if (slots.length === 0 || slots[0].kind === "token") {
    return { shifts: [], shiftLabels: [] };
  }

  const timeSlots = slots.filter((s): s is TimeSlot => s.kind === "time");

  const isBreak = (s: TimeSlot) => s.status === "break" || s.source === "break";

  const breakIndices: number[] = [];
  timeSlots.forEach((slot, idx) => {
    if (isBreak(slot)) breakIndices.push(idx);
  });

  const resultShifts: TimeSlot[][] = [];
  let startIdx = 0;

  for (const breakIdx of breakIndices) {
    let breakEndIdx = breakIdx;

    while (breakEndIdx < timeSlots.length && isBreak(timeSlots[breakEndIdx])) {
      breakEndIdx++;
    }

    if (startIdx < breakIdx) {
      const shiftSlots = timeSlots.slice(startIdx, breakIdx);
      if (shiftSlots.length > 0) resultShifts.push(shiftSlots);
    }

    startIdx = breakEndIdx;
  }

  if (startIdx < timeSlots.length) {
    const remainingSlots = timeSlots.slice(startIdx);
    if (remainingSlots.length > 0) resultShifts.push(remainingSlots);
  }

  const shiftLabels =
    shiftLabelsFromApi.length === resultShifts.length
      ? shiftLabelsFromApi
      : resultShifts.map((shift, idx) => {
          const firstSlot = shift[0];
          const lastSlot = shift[shift.length - 1];

          if (firstSlot && lastSlot) {
            return `${sharedFormatTimeTo12Hour(firstSlot.startTime)} - ${sharedFormatTimeTo12Hour(
              lastSlot.endTime,
            )}`;
          }

          return `Shift ${idx + 1}`;
        });

  return {
    shifts: resultShifts,
    shiftLabels,
  };
};

/* ---------------- Reason field ---------------- */

export const COMMON_RESCHEDULE_REASONS = [
  "Patient requested reschedule",
  "Doctor unavailable",
  "Emergency / urgent work",
  "Timing conflict",
  "Travel / out of station",
  "Clinic delay / overbooked",
] as const;

export const MAX_REASON_WORDS = 100;
export const MAX_REASON_CHARS = 700;

export const getReasonWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean);

export const limitReasonText = (value: string) => {
  const words = getReasonWords(value);

  let limitedValue = value;

  if (words.length > MAX_REASON_WORDS) {
    limitedValue = words.slice(0, MAX_REASON_WORDS).join(" ");
  }

  if (limitedValue.length > MAX_REASON_CHARS) {
    limitedValue = limitedValue.slice(0, MAX_REASON_CHARS);
  }

  return limitedValue;
};

/* ---------------- Day-range calendar helpers ---------------- */

export const isoFromYMD = (y: number, m1: number, d: number) =>
  `${y}-${String(m1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const startOfLocalDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

export const diffDaysBetweenIso = (fromIso: string, toIso: string) => {
  const a = new Date(`${fromIso}T00:00:00`);
  const b = new Date(`${toIso}T00:00:00`);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
};

/* ---------------- Display formatters ---------------- */

export const initialsFromName = (name: string) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "—";
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
};

const emptyDisplayValues = new Set(["", "-", "—", "null", "undefined"]);

export const getDisplayText = (value: any) => {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();
  return emptyDisplayValues.has(text.toLowerCase()) ? "" : text;
};

export const getDisplayDate = (value: any) => {
  const text = getDisplayText(value);
  if (!text) return "";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getYearsText = (value: any) => {
  const text = getDisplayText(value);
  if (!text) return "";

  const years = Number(text);
  if (!Number.isFinite(years)) return text;

  return `${years} ${years === 1 ? "Year" : "Years"}`;
};

export const getAgeText = (value: any) => {
  const text = getDisplayText(value);
  return text ? `${text} Yrs` : "";
};

const normalizeSymptomLabel = (value: any): string => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value.name ??
        value.symptomName ??
        value.label ??
        value.title ??
        value.description ??
        "",
    ).trim();
  }

  return String(value).trim();
};

export const normalizeSymptoms = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const symptoms = raw.map(normalizeSymptomLabel).filter(Boolean);
    return Array.from(new Set(symptoms));
  }

  const s = String(raw).trim();
  if (!s) return [];
  const symptoms = s
    .split(/,|\|/g)
    .map((x) => x.trim())
    .filter(Boolean);
  return Array.from(new Set(symptoms));
};

export const isRescheduleState = (
  v: unknown,
): v is { appointmentId?: string; doctorId?: string } =>
  !!v && typeof v === "object";

/* Re-exported so callers only need one import source for the submit path */
export type { RescheduleFormValues };
