// src/pages/appointment/Reschedule.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router";
import {
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiChevronRight,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import {
  useForm,
  useWatch,
  type FieldValues,
  type Control,
} from "react-hook-form";
import { addToast } from "@heroui/react";
import { parseDate } from "@internationalized/date";

// Shared fields
import TextareaField from "../../components/shared/TextareaField";

// Shared appointment components (same as NewAppointment)
import AppointmentDateSection from "./new-appointment/components/AppointmentDateSection";
import AppointmentSlotSection from "./new-appointment/components/AppointmentSlotSection";
import {
  formatDurationLabel as sharedFormatDurationLabel,
  addMinutesToTime,
  formatIsoForUi,
  pad2 as sharedPad2,
} from "./new-appointment/helpers/dateTimeHelpers";
import {
  formatTimeTo12Hour as sharedFormatTimeTo12Hour,
} from "./new-appointment/helpers/appointmentSummaryHelpers";
import type { Slot as SharedSlot, TimeSlot as SharedTimeSlot, TokenSlot as SharedTokenSlot, DayRange as SharedDayRange } from "./new-appointment/types";

// ---- APIs ----
import {
  useGetAppointmentByIdQuery,
  useUpdateAppointmentMutation,
  useGetDoctorAvailableSlotsQuery,
} from "../../redux/api/appointmentApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";

/* ---------------- Date / Time Helpers ---------------- */

// Date -> "YYYY/MM/DD"
const fmtDateYMDslash = (d: any): string => {
  if (!d) return "";
  if (typeof d === "object" && "year" in d && "month" in d && "day" in d) {
    const yyyy = (d as any).year;
    const mm = String((d as any).month).padStart(2, "0");
    const dd = String((d as any).day).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  if (d instanceof Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  if (typeof d === "string")
    return d.includes("/") ? d : d.replaceAll("-", "/");
  return "";
};

// For API: "YYYY-MM-DD"
const toApiDate = (d: any): string => {
  const s = fmtDateYMDslash(d);
  return s ? s.replaceAll("/", "-") : "";
};

// Normalize time "H:mm" | "HH:mm" | ISO -> "HH:mm"
const fmtTime = (t: any): string => {
  if (!t) return "";
  if (typeof t === "string") {
    const s = t.trim();
    let m = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(s);
    if (m) {
      const hh = String(parseInt(m[1], 10)).padStart(2, "0");
      return `${hh}:${m[2]}`;
    }
    m = /^\d{4}-\d{2}-\d{2}[T ](\d{2}):([0-5]\d)/.exec(s);
    if (m) return `${m[1]}:${m[2]}`;
  }
  return "";
};

const COMMON_RESCHEDULE_REASONS = [
  "Patient requested reschedule",
  "Doctor unavailable",
  "Emergency / urgent work",
  "Timing conflict",
  "Travel / out of station",
  "Clinic delay / overbooked",
] as const;

const MAX_REASON_WORDS = 100;
const MAX_REASON_CHARS = 700;

const getReasonWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean);

const limitReasonText = (value: string) => {
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

// Combine date + time -> ISO string "YYYY-MM-DDTHH:mm:00.sssZ"
const buildAppointmentDateTimeIso = (date: any, time: any): string => {
  const dateStr = toApiDate(date);
  const timeStr = fmtTime(time);
  if (!dateStr || !timeStr) return "";
  const local = `${dateStr}T${timeStr}:00`;
  return new Date(local).toISOString();
};

// Extract "HH:mm" from ISO or "HH:mm"
const extractTimeLabel = (value: any): string => {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const isoMatch = /^\d{4}-\d{2}-\d{2}T(\d{2}):([0-5]\d)/.exec(s);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;
  const hmMatch = /^([0-2]?\d):([0-5]\d)$/.exec(s);
  if (hmMatch) {
    const hh = String(parseInt(hmMatch[1], 10)).padStart(2, "0");
    return `${hh}:${hmMatch[2]}`;
  }
  return s;
};

// Diff in minutes using Date
const calcDurationMinutes = (rawStart: any, rawEnd: any): number => {
  if (!rawStart || !rawEnd) return 0;
  const sd = new Date(String(rawStart));
  const ed = new Date(String(rawEnd));
  if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
    const diff = (ed.getTime() - sd.getTime()) / 60000;
    return diff > 0 ? Math.round(diff) : 0;
  }
  return 0;
};

/* ---------------- Slot helpers ---------------- */

type SlotStatus = "available" | "reserved" | "booked" | "break";

type TimeSlot = {
  kind: "time";
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: SlotStatus;
  durationMinutes: number;
  dateIso: string; // "YYYY-MM-DD"
  weekday: string; // "Mon" | ...
  appointmentId?: string;
  appointmentStatus?: string;
  patientId?: string;
  source?: string;
  shift1?: string;
  shift2?: string;
};

type TokenSlot = {
  kind: "token";
  id: string;
  tokenNo: number;
  status: SlotStatus;
  dateIso: string;
  weekday: string;
  clinicAvailabilityId?: string;
  shift1?: string;
  shift2?: string;
};

type Slot = TimeSlot | TokenSlot;

const normalizeStatus = (raw: any): SlotStatus => {
  const s = String(raw ?? "available").toLowerCase();
  if (s.includes("book")) return "booked";
  if (s.includes("reserv")) return "reserved";
  if (s.includes("break")) return "break";
  return "available";
};

const groupSlotsIntoMultipleShifts = (
  slots: Slot[],
  shiftLabelsFromApi: string[] = [],
): { shifts: TimeSlot[][]; shiftLabels: string[] } => {
  if (slots.length === 0 || slots[0].kind === "token") {
    return { shifts: [], shiftLabels: [] };
  }

  const timeSlots = slots.filter((s): s is TimeSlot => s.kind === "time");

  const breakIndices: number[] = [];

  timeSlots.forEach((slot, idx) => {
    if (slot.status === "break" || slot.source === "break") {
      breakIndices.push(idx);
    }
  });

  const resultShifts: TimeSlot[][] = [];
  let startIdx = 0;

  for (const breakIdx of breakIndices) {
    let breakEndIdx = breakIdx;

    while (
      breakEndIdx < timeSlots.length &&
      (timeSlots[breakEndIdx].status === "break" ||
        timeSlots[breakEndIdx].source === "break")
    ) {
      breakEndIdx++;
    }

    if (startIdx < breakIdx) {
      const shiftSlots = timeSlots.slice(startIdx, breakIdx);
      if (shiftSlots.length > 0) {
        resultShifts.push(shiftSlots);
      }
    }

    startIdx = breakEndIdx;
  }

  if (startIdx < timeSlots.length) {
    const remainingSlots = timeSlots.slice(startIdx);
    if (remainingSlots.length > 0) {
      resultShifts.push(remainingSlots);
    }
  }

  const shiftLabels =
    shiftLabelsFromApi.length === resultShifts.length
      ? shiftLabelsFromApi
      : resultShifts.map((shift, idx) => {
          const firstSlot = shift[0];
          const lastSlot = shift[shift.length - 1];

          if (firstSlot && lastSlot) {
            return `${formatTimeTo12Hour(firstSlot.startTime)} - ${formatTimeTo12Hour(
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

const formatTimeTo12Hour = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const normalizeSlotsFromApi = (resp: any, filterDate?: string): Slot[] => {
  if (!resp) return [];

  let src: any = resp;
  if (!Array.isArray(src)) {
    src = resp.result ?? resp.slots ?? resp.data ?? resp.availableSlots ?? [];
  }
  if (!Array.isArray(src)) return [];

  // Check if it's token-based response
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

  // Time-based slots
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

/* ---------------- Types ---------------- */

type RescheduleLocationState = { appointmentId?: string; doctorId?: string };
const isRescheduleState = (v: unknown): v is RescheduleLocationState =>
  !!v && typeof v === "object";

type FormValues = {
  appointmentDate: any;
  appointmentTime: string | null;
  reason?: string | null;
};

/* ---------------- UI helpers ---------------- */

type DayRange = 7 | 15 | 30;

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoFromYMD = (y: number, m1: number, d: number) =>
  `${y}-${pad2(m1)}-${pad2(d)}`;

const startOfLocalDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const diffDaysBetweenIso = (fromIso: string, toIso: string) => {
  const a = new Date(`${fromIso}T00:00:00`);
  const b = new Date(`${toIso}T00:00:00`);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
};

const initialsFromName = (name: string) => {
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

const getDisplayText = (value: any) => {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();
  return emptyDisplayValues.has(text.toLowerCase()) ? "" : text;
};

const getDisplayDate = (value: any) => {
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

const getYearsText = (value: any) => {
  const text = getDisplayText(value);
  if (!text) return "";

  const years = Number(text);
  if (!Number.isFinite(years)) return text;

  return `${years} ${years === 1 ? "Year" : "Years"}`;
};

const getAgeText = (value: any) => {
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

const normalizeSymptoms = (raw: any): string[] => {
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

/* ---------------- Component ---------------- */

const Reschedule: React.FC = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();

  const state = isRescheduleState(location.state) ? location.state : undefined;
  const doctorIdFromState = state?.doctorId;

  /* ---- Current logged-in user (doctor fallback) ---- */
  const { data: meResp } = useGetUserQuery();
  const me = (meResp as any)?.result ?? meResp ?? null;
  const { data: clinicResp } = useGetAllClinicsQuery();
  const doctorIdFromUser =
    me && String(me.userType ?? me.role ?? "").toLowerCase() === "doctor"
      ? String(me.id ?? me._id ?? "")
      : "";

  /* ---------------- Fetch current appointment ---------------- */
  const { data, isFetching, isError, error } = useGetAppointmentByIdQuery(id, {
    skip: !id,
  });
  const [updateAppointment, { isLoading: isUpdating }] =
    useUpdateAppointmentMutation();

  const rawResult = (data as any)?.result ?? {};
  const patient =
    rawResult?.patient ?? rawResult?.patientDetails ?? rawResult ?? {};
  const a =
    rawResult?.appointment ??
    patient?.appointment ??
    rawResult?.appointmentDetails ??
    patient?.appointmentDetails ??
    rawResult ??
    {};

  const patientName = patient?.name ?? patient?.fullName ?? "";
  // const patientEmail = patient?.email ?? "";
  const patientMobile = getDisplayText(patient?.mobile ?? patient?.phone);
  const altMobile = getDisplayText(
    patient?.alternateMobile ?? patient?.alternatePhone ?? patient?.altMobile,
  );
  const patientGender = getDisplayText(patient?.gender);
  const patientAge = getAgeText(patient?.age ?? patient?.patientAge);
  const patientDob = getDisplayDate(patient?.dob);
  const patientAddress = getDisplayText(patient?.address);

  const appointmentStatus = a?.appointmentStatus ?? a?.status ?? "";
  // const apptIdLabel = a?.appointmentId ?? a?.id ?? id;

  const doctorIdFromAppointment: string = String(
    a?.doctorId ?? a?.doctor?.id ?? a?.doctor?._id ?? "",
  ).trim();

  const doctorId: string =
    doctorIdFromState || doctorIdFromAppointment || doctorIdFromUser || "";

  /* ---------- default date (appointment date OR today) ---------- */
  const currentDateIso =
    (a?.appointmentDate ? String(a.appointmentDate).slice(0, 10) : "") ||
    new Date().toISOString().slice(0, 10);

  const defaultDateValue = parseDate(currentDateIso);

  /* ---------------- Form ---------------- */
  const { control, handleSubmit, setValue, getValues, formState } =
    useForm<FormValues>({
      defaultValues: {
        appointmentDate: defaultDateValue,
        appointmentTime: null,
        reason: "",
      },
    });

  // const countWords = (value: string) => {
  //   return getReasonWords(value).length;
  // };
  // Pre-fill form from API when data arrives
  useEffect(() => {
    if (a?.appointmentDate) {
      const iso = String(a.appointmentDate).slice(0, 10);
      setValue("appointmentDate", parseDate(iso), { shouldValidate: false });
    }

    if (a?.appointmentTime) {
      setValue("appointmentTime", extractTimeLabel(a.appointmentTime), {
        shouldValidate: false,
      });
    }

    const existing = (getValues("reason") ?? "").toString().trim();
    const apiReason =
      a?.reasionForReSchedule ??
      a?.reasonForReschedule ??
      a?.rescheduleReason ??
      a?.reason ??
      "";

    if (!existing && apiReason) {
      setValue("reason", String(apiReason), { shouldValidate: false });
    }
  }, [
    a?.appointmentDate,
    a?.appointmentTime,
    a?.reasionForReSchedule,
    a?.reasonForReschedule,
    a?.rescheduleReason,
    a?.reason,
    setValue,
    getValues,
  ]);

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;
  const appointmentDate = useWatch({ control, name: "appointmentDate" });
  const reasonValue = useWatch({ control, name: "reason" });

  useEffect(() => {
    const currentReason = String(reasonValue ?? "");
    const limitedReason = limitReasonText(currentReason);

    if (currentReason !== limitedReason) {
      setValue("reason", limitedReason, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [reasonValue, setValue]);
  const dateParam = useMemo(
    () => toApiDate(appointmentDate),
    [appointmentDate],
  );

  /* ---------- Day range (7 / 15 / 30) ---------- */
  const [dayRange, setDayRange] = useState<DayRange>(7);

  const todayIso = useMemo(() => {
    const t = startOfLocalDay();
    return isoFromYMD(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }, []);

  const rangeEndIso = useMemo(() => {
    const t = startOfLocalDay();
    const end = addDays(t, dayRange - 1); // inclusive
    return isoFromYMD(end.getFullYear(), end.getMonth() + 1, end.getDate());
  }, [dayRange]);

  const rangeEndLabel = useMemo(() => {
    const d = new Date(`${rangeEndIso}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [rangeEndIso]);

  const rangeHintText = useMemo(() => {
    if (dayRange === 7) {
      return "Want a later date? Change range to Next 15 days or Next 30 days.";
    }
    if (dayRange === 15) {
      return "Want a later date? Change range to Next 30 days.";
    }
    return "You are viewing the maximum booking range (Next 30 days).";
  }, [dayRange]);

  // Auto-expand if current selected date is outside 7-day range
  useEffect(() => {
    if (!dateParam || dateParam < todayIso) return;
    const diff = diffDaysBetweenIso(todayIso, dateParam);

    if (diff <= 6) return;
    if (diff <= 14) {
      setDayRange((prev) => (prev < 15 ? 15 : prev));
      return;
    }
    if (diff <= 29) {
      setDayRange((prev) => (prev < 30 ? 30 : prev));
      return;
    }

    setDayRange(30);
    setValue("appointmentDate", parseDate(todayIso), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [dateParam, todayIso, setValue]);

  // If user reduces range and selected date becomes invalid, snap to today
  useEffect(() => {
    if (!dateParam) return;
    if (dateParam > rangeEndIso || dateParam < todayIso) {
      setValue("appointmentDate", parseDate(todayIso), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [dateParam, rangeEndIso, todayIso, setValue]);

  /* =========================
     ✅ Calendar UI (match New Appointment)
     ========================= */

  // Allowed iso list: today .. today+(dayRange-1)
  const dayPills = useMemo(() => {
    const list: { iso: string }[] = [];
    const base = startOfLocalDay();
    for (let i = 0; i < dayRange; i++) {
      const d = addDays(base, i);
      list.push({
        iso: isoFromYMD(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      });
    }
    return list;
  }, [dayRange]);

  const calendarMonthSections = useMemo(() => {
    const allowedSet = new Set(dayPills.map((d) => d.iso));
    const monthKeys = Array.from(
      new Set(dayPills.map((d) => d.iso.slice(0, 7))),
    );

    return monthKeys.map((monthKey) => {
      const [y, m] = monthKey.split("-").map(Number);
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);

      const monthLabel = first.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const firstOffset = (first.getDay() + 6) % 7;
      const totalDays = last.getDate();
      const totalCells = Math.ceil((firstOffset + totalDays) / 7) * 7;

      const fullCells: Array<{
        iso: string;
        dayNum: number;
        isAllowed: boolean;
        isToday: boolean;
      } | null> = Array.from({ length: totalCells }, (_, idx) => {
        const day = idx - firstOffset + 1;
        if (day < 1 || day > totalDays) return null;

        const iso = `${y}-${pad2(m)}-${pad2(day)}`;
        return {
          iso,
          dayNum: day,
          isAllowed: allowedSet.has(iso),
          isToday: iso === todayIso,
        };
      });

      const weeks: (typeof fullCells)[] = [];
      for (let i = 0; i < fullCells.length; i += 7) {
        const week = fullCells.slice(i, i + 7);
        const hasAllowed = week.some((c) => c?.isAllowed);
        if (hasAllowed) weeks.push(week);
      }

      return { monthKey, monthLabel, weeks };
    });
  }, [dayPills, todayIso]);

  const handlePickDateIso = (iso: string) => {
    if (!iso) return;
    if (iso < todayIso || iso > rangeEndIso) return;

    setValue("appointmentDate", parseDate(iso), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  /* ---------- SLOTS ---------- */
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  // const [preselectDone, setPreselectDone] = useState(false);
  const [activeShiftTab, setActiveShiftTab] = useState(0);

  useEffect(() => {
    setSelectedSlot(null);
    setValue("appointmentTime", null, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [dateParam, setValue]);

  const {
    data: slotsResp,
    isFetching: isSlotsLoading,
    isError: isSlotsError,
    error: slotsError,
  } = useGetDoctorAvailableSlotsQuery(
    {
      date: dateParam,
      doctorId: doctorId || "",
      time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }),
    },
    {
      skip: !dateParam || !doctorId,
    },
  );
  const slots: Slot[] = useMemo(
    () => normalizeSlotsFromApi(slotsResp, dateParam),
    [slotsResp, dateParam],
  );

  useEffect(() => {
    setActiveShiftTab(0);
  }, [dateParam, doctorId]);
  const isTokenMode = useMemo(
    () => slots.some((s) => s.kind === "token"),
    [slots],
  );

  const shiftUiData = useMemo(() => {
    const timeSlots = slots
      .filter((s): s is TimeSlot => s.kind === "time")
      .filter((s) => s.status !== "break" && s.source !== "break");

    if (timeSlots.length === 0) {
      return {
        shifts: [] as TimeSlot[][],
        shiftLabels: [] as string[],
        hasMultipleShifts: false,
        activeShiftSlots: [] as TimeSlot[],
      };
    }

    const apiResponse = (slotsResp as any)?.result?.[0];

    const shiftLabelsFromApi =
      Array.isArray(apiResponse?.shifts) && apiResponse.shifts.length
        ? apiResponse.shifts
        : [timeSlots[0]?.shift1, timeSlots[0]?.shift2].filter(Boolean);

    const { shifts, shiftLabels } = groupSlotsIntoMultipleShifts(
      slots,
      shiftLabelsFromApi,
    );

    const safeActiveIndex =
      activeShiftTab >= 0 && activeShiftTab < shifts.length
        ? activeShiftTab
        : 0;

    return {
      shifts,
      shiftLabels,
      hasMultipleShifts: shifts.length > 1,
      activeShiftSlots: shifts[safeActiveIndex] || [],
    };
  }, [slots, slotsResp, activeShiftTab]);

  // useEffect(() => {
  //   if (preselectDone) return;
  //   if (!slots.length || !a?.appointmentTime || !dateParam) return;

  //   const target = extractTimeLabel(a.appointmentTime);

  //   if (isTokenMode) {
  //     // For token mode, match by token number
  //     const tokenMatch = slots.find(
  //       (s) => s.kind === "token" && String((s as TokenSlot).tokenNo) === target
  //     );
  //     if (tokenMatch) {
  //       setSelectedSlot(tokenMatch);
  //       setValue("appointmentTime", target, {
  //         shouldDirty: false,
  //         shouldValidate: true,
  //       });
  //       setPreselectDone(true);
  //     }
  //   } else {
  //     // For time mode, match by start time
  //     const match = slots.find((s): s is TimeSlot =>
  //       s.kind === "time" && (s as TimeSlot).startTime === target
  //     );
  //     if (match) {
  //       setSelectedSlot(match);
  //       setValue("appointmentTime", match.startTime, {
  //         shouldDirty: false,
  //         shouldValidate: true,
  //       });
  //       setPreselectDone(true);
  //     }
  //   }
  // }, [slots, a?.appointmentTime, dateParam, preselectDone, setValue, isTokenMode]);

  const handleSelectSlot = (slot: Slot) => {
    // const isOwnReserved =
    //   slot.status === "reserved" &&
    //   slot.kind === "time" &&
    //   String((slot as TimeSlot).appointmentId || "") === String(id);

    const canPick = slot.status === "available";
    if (!canPick) return;

    setSelectedSlot(slot);
    setValue(
      "appointmentTime",
      slot.kind === "token"
        ? String((slot as TokenSlot).tokenNo)
        : (slot as TimeSlot).startTime,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  };

  /* ---------- Submit ---------- */
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (!doctorId) {
        addToast({
          title: "Doctor not found",
          description:
            "No doctor associated with this appointment. Slots cannot be loaded.",
          color: "warning",
          variant: "flat",
        });
        return;
      }

      if (!values.appointmentDate) {
        addToast({
          title: "Pick a date",
          description: "Please choose the reschedule date.",
          color: "warning",
          variant: "flat",
        });
        return;
      }

      if (!values.appointmentTime || !selectedSlot) {
        addToast({
          title: "Pick a slot",
          description: "Please select an available slot.",
          color: "warning",
          variant: "flat",
        });
        return;
      }

      const dateStr = toApiDate(values.appointmentDate);

      const isTokenBooking = selectedSlot?.kind === "token";

      const timeStr = isTokenBooking
        ? "23:59"
        : fmtTime(values.appointmentTime);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        addToast({
          title: "Invalid date",
          description: "Use YYYY-MM-DD.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      const appointmentDateIso = buildAppointmentDateTimeIso(
        values.appointmentDate,
        isTokenBooking ? "23:59" : values.appointmentTime,
      );

      if (!appointmentDateIso) {
        addToast({
          title: "Invalid datetime",
          description: "Could not build appointment datetime.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      const payload: any = {
        appointmentDate: appointmentDateIso,
        appointmentTime: timeStr,
        reasionForReSchedule: (values.reason ?? "").toString().trim() || null,
      };

      // Add tokenNo if it's a token appointment
      if (selectedSlot.kind === "token") {
        payload.tokenNo = (selectedSlot as TokenSlot).tokenNo;
      }

      await updateAppointment({
        appointmentId: id,
        data: payload,
      }).unwrap();

      addToast({
        title: "Rescheduled",
        description: "Appointment updated successfully.",
        color: "success",
        variant: "flat",
      });

      navigate(`/appointment/${id}`);
    } catch (e: any) {
      addToast({
        title: "Failed to reschedule",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    }
  });

  /* ---------- Error toast for slots ---------- */
  useEffect(() => {
    if (isSlotsError) {
      addToast({
        title: "Load slots failed",
        description:
          (slotsError as any)?.data?.message ||
          (slotsError as any)?.message ||
          "Failed to fetch available slots.",
        color: "danger",
        variant: "flat",
      });
    }
  }, [isSlotsError, slotsError]);

  /* ---------- Derived display ---------- */
  const avatarText = initialsFromName(patientName);
  const symptoms = normalizeSymptoms(
    a?.symptoms ??
      rawResult?.symptoms ??
      patient?.symptoms ??
      a?.chiefComplaints,
  );
  const hasSymptoms = symptoms.length > 0;

  const currentApptDateLabel = useMemo(() => {
    if (!a?.appointmentDate) return "—";
    const d = new Date(String(a.appointmentDate));
    if (isNaN(d.getTime())) return String(a.appointmentDate);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  }, [a?.appointmentDate]);

  const currentStartTime = a?.appointmentTime
    ? extractTimeLabel(a.appointmentTime)
    : "";

  const currentAppointmentRows = [
    {
      label: "Date & Slot",
      value: `${currentApptDateLabel}${
        currentStartTime
          ? ` - ${a?.tokenNo ? `Token ${a.tokenNo}` : currentStartTime}`
          : ""
      }`,
    },
    { label: "Contact", value: patientMobile },
    { label: "Age", value: patientAge },
    { label: "Gender", value: patientGender },
    { label: "DOB", value: patientDob },
    { label: "Address", value: patientAddress },
    { label: "Alternate Contact", value: altMobile },
  ].filter((row) => row.value);

  const doctorProfile = useMemo(() => {
    const fromAppointment = rawResult?.doctor ?? a?.doctor ?? patient?.doctor;
    const fromClinic =
      (clinicResp as any)?.profile ??
      (clinicResp as any)?.result?.profile ??
      (clinicResp as any)?.data?.profile;
    const clinicDoctorId = getDisplayText(fromClinic?.id ?? fromClinic?._id);
    const shouldUseClinicProfile =
      !doctorId || !clinicDoctorId || clinicDoctorId === doctorId;

    return {
      ...(fromAppointment ?? {}),
      ...(shouldUseClinicProfile ? (fromClinic ?? {}) : {}),
    };
  }, [a?.doctor, clinicResp, doctorId, patient?.doctor, rawResult?.doctor]);

  const doctorName = getDisplayText(doctorProfile?.name);
  const doctorSpeciality = getDisplayText(doctorProfile?.speciality);
  const doctorProfileImage = getDisplayText(doctorProfile?.profileImage);

  const doctorInfoRows = [
    {
      label: "Email",
      value: getDisplayText(doctorProfile?.email),
      icon: <FiMail className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "Mobile",
      value: getDisplayText(doctorProfile?.mobile),
      icon: <FiPhone className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "Gender",
      value: getDisplayText(doctorProfile?.gender),
      icon: <FiUser className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "Age",
      value: getAgeText(doctorProfile?.age),
      icon: <FiUser className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "DOB",
      value: getDisplayDate(doctorProfile?.dob),
      icon: <FiCalendar className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "Qualification",
      value: getDisplayText(doctorProfile?.qualification),
      icon: <FiAward className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "Experience",
      value: getYearsText(doctorProfile?.yearsOfExperience),
      icon: <FiBriefcase className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "Address",
      value: getDisplayText(doctorProfile?.address),
      icon: <FiMapPin className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "City",
      value: getDisplayText(doctorProfile?.city),
      icon: <FiMapPin className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "State",
      value: getDisplayText(doctorProfile?.state),
      icon: <FiMapPin className="h-4 w-4 text-teal-700" aria-hidden />,
    },
    {
      label: "Zip Code",
      value: getDisplayText(doctorProfile?.zipCode),
      icon: <FiMapPin className="h-4 w-4 text-teal-700" aria-hidden />,
    },
  ].filter((row) => row.value);

  const hasDoctorDetails =
    Boolean(doctorName) ||
    Boolean(doctorSpeciality) ||
    Boolean(doctorProfileImage) ||
    doctorInfoRows.length > 0;

  // const selectedLabel =
  //   selectedSlot && dateParam
  //     ? selectedSlot.kind === "token"
  //       ? `${dateParam} Token ${(selectedSlot as TokenSlot).tokenNo}`
  //       : `${dateParam} ${(selectedSlot as TimeSlot).startTime} - ${(selectedSlot as TimeSlot).endTime}`
  //     : "";

  return (
    <div className="p-0">
      {/* Page title + breadcrumbs */}
      <div className="mb-6">
        <h1 className="text-[22px] sm:text-[26px] font-semibold text-slate-900 dark:text-white">
          Reschedule Appointment
        </h1>

        <nav
          className="mt-2 flex flex-wrap items-center gap-2 text-[13px] sm:text-[14px] text-slate-600 dark:text-slate-400"
          aria-label="Breadcrumb"
        >
          <Link
            to="/appointment"
            className="hover:text-slate-900 hover:underline underline-offset-4 dark:hover:text-white"
          >
            Appointment
          </Link>

          <FiChevronRight className="opacity-60" aria-hidden />

          {id ? (
            <Link
              to={`/appointment/${id}`}
              className="hover:text-slate-900 hover:underline underline-offset-4 dark:hover:text-white"
            >
              Appointment Details
            </Link>
          ) : (
            <span className="text-slate-500 dark:text-slate-500">Appointment Details</span>
          )}

          <FiChevronRight className="opacity-60" aria-hidden />

          <span className="font-semibold text-teal-700 dark:text-teal-400" aria-current="page">
            Reschedule Appointment
          </span>
        </nav>
      </div>

      {/* Loading / Error */}
      {isFetching && (
        <div className="mb-3 text-sm text-slate-500 dark:text-slate-400">Loading appointment…</div>
      )}
      {isError && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">
          {(error as any)?.data?.message ||
            (error as any)?.error ||
            "Failed to load appointment."}
        </div>
      )}

      {/* Two-column layout: Form + Summary */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: Main form */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none"
        >
        {/* Top cards */}
        <div className="grid items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-12 mb-4">
          {/* Current Appointment */}
          <section
            className={[
              "flex h-full flex-col rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-[#273244] dark:bg-[#0f1728]",
              hasDoctorDetails
                ? "lg:col-span-1 xl:col-span-6"
                : "lg:col-span-2 xl:col-span-12",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 dark:bg-[#1a2b3c] dark:text-slate-300">
                  {avatarText}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{patientName || "—"}</p>
                </div>
              </div>
              {appointmentStatus ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  {appointmentStatus}
                </span>
              ) : null}
            </div>

            {/* Meta fields — compact grid */}
            <div className="mt-2.5 grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
              {currentAppointmentRows.map((row) => (
                <div key={row.label} className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{row.label}</p>
                  <p className="mt-0.5 break-words text-[11px] font-semibold text-slate-800 dark:text-white">{row.value}</p>
                </div>
              ))}
            </div>

            {hasSymptoms && (
              <div className="mt-2 flex flex-wrap gap-1">
                {symptoms.slice(0, 6).map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-[#1a2b3c] dark:text-slate-300">{s}</span>
                ))}
                {symptoms.length > 6 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-[#1a2b3c] dark:text-slate-500">+{symptoms.length - 6}</span>
                )}
              </div>
            )}
          </section>

          {hasDoctorDetails && (
            <section className="rounded-xl border border-slate-100 bg-white px-4 py-3 lg:col-span-1 xl:col-span-6 dark:border-[#273244] dark:bg-[#0f1728]">
              <div className="flex min-w-0 items-center gap-2.5">
                {doctorProfileImage ? (
                  <img
                    src={doctorProfileImage}
                    alt={doctorName ? `Dr. ${doctorName}` : "Doctor"}
                    className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-[#273244]"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {doctorName ? doctorName.charAt(0).toUpperCase() : "D"}
                  </div>
                )}
                <div className="min-w-0">
                  {doctorName && <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">Dr. {doctorName}</p>}
                  {doctorSpeciality && <p className="truncate text-[11px] font-semibold text-teal-700 dark:text-teal-400">{doctorSpeciality}</p>}
                </div>              </div>

              {doctorInfoRows.length > 0 && (
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {doctorInfoRows.slice(0, 6).map((row) => (
                    <div key={row.label} className="min-w-0 flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50/50 px-2 py-1.5 dark:border-[#273244] dark:bg-[#111726]">
                      <span className="shrink-0 text-teal-600 dark:text-teal-400">{row.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{row.label}</p>
                        <p className="truncate text-[11px] font-semibold text-slate-800 dark:text-white">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Date & Slot — uses same shared components as New Appointment */}
        <AppointmentDateSection
          dateFieldRef={{ current: null }}
          isTokenMode={isTokenMode}
          showAllTokens={true}
          setShowAllTokens={() => {}}
          dayRange={dayRange}
          setDayRange={setDayRange as React.Dispatch<React.SetStateAction<SharedDayRange>>}
          rangeEndLabel={rangeEndLabel}
          rangeHintText={rangeHintText}
          calendarMonthSections={calendarMonthSections}
          dateParam={dateParam}
          handlePickPill={handlePickDateIso}
        >
          <AppointmentSlotSection
            slotFieldRef={{ current: null }}
            selectedSlot={selectedSlot as SharedSlot | null}
            customDurationMinutes={null}
            setCustomDurationMinutes={() => {}}
            activeShiftTab={activeShiftTab}
            setActiveShiftTab={setActiveShiftTab}
            isSlotsLoading={isSlotsLoading}
            isSlotsError={isSlotsError}
            isExpired={false}
            isTokenMode={isTokenMode}
            showAllTokens={true}
            setShowAllTokens={() => {}}
            tokenSlotsToRender={(slots.filter((s) => s.kind === "token") as unknown as SharedTokenSlot[])}
            shouldManualPickToken={false}
            shiftUiData={{
              shifts: shiftUiData.shifts as unknown as SharedTimeSlot[][],
              shiftLabels: shiftUiData.shiftLabels,
              hasMultipleShifts: shiftUiData.hasMultipleShifts,
              activeShiftSlots: shiftUiData.activeShiftSlots as unknown as SharedTimeSlot[],
            }}
            slots={slots as unknown as SharedSlot[]}
            dateParam={dateParam}
            doctorId={doctorId}
            patientName={patientName}
            doctorName={doctorName}
            formErrors={{}}
            handleSelectSlot={handleSelectSlot as (slot: SharedSlot) => void}
            shouldLockSlotsForToday={false}
            formatDurationLabel={sharedFormatDurationLabel}
            addMinutesToTime={addMinutesToTime}
            formatIsoForUi={formatIsoForUi}
            formatTimeTo12Hour={sharedFormatTimeTo12Hour}
            pad2={sharedPad2}
            jiggleKey=""
          />
        </AppointmentDateSection>

        {/* Reason */}
        <section className="mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3 dark:border-[#273244] dark:bg-[#0f1728]">
          {/* Header row with label + clear */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
              Reason <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            </p>
            {reasonValue && (
              <button
                type="button"
                onClick={() => setValue("reason", "", { shouldDirty: true, shouldValidate: false })}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick reason chips */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_RESCHEDULE_REASONS.map((r) => {
              const active = String(reasonValue ?? "").trim() === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setValue("reason", r, { shouldDirty: true, shouldValidate: true })}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    active
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#111726] dark:text-slate-400 dark:hover:bg-[#1a2535]",
                  ].join(" ")}
                >
                  {active && <span className="text-[9px]">✓</span>}
                  {r}
                </button>
              );
            })}
          </div>

          {/* Textarea — compact, no extra label */}
          <div className="[&_textarea]:break-words [&_textarea]:whitespace-pre-wrap [&_textarea]:leading-5 [&_textarea]:overflow-y-auto [&_textarea]:resize-none [&_textarea]:text-[13px] [&_textarea]:min-h-[48px] [&_textarea]:max-h-[72px] [&_label]:hidden">
            <TextareaField
              control={rhfControl}
              name="reason"
              label=""
              isOptional={false}
              placeholder="Or type a custom reason…"
            />
          </div>
        </section>

        {/* Mobile spacer to account for fixed footer */}
        <div className="h-28 lg:hidden" />
      </form>

        {/* Fixed footer on mobile — outside form, always at bottom of viewport */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden dark:border-[#273244] dark:bg-[#111726] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isUpdating || formState.isSubmitting || !selectedSlot}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 text-[14px] font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            {isUpdating || formState.isSubmitting
              ? "Rescheduling..."
              : "Confirm Reschedule"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isUpdating || formState.isSubmitting}
            className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-70 dark:border-[#273244] dark:text-slate-400 dark:hover:bg-[#1a2535]"
          >
            Cancel
          </button>
        </div>

        {/* Right: Reschedule Summary Panel — compact, no scroll */}
        <aside className="hidden lg:flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sticky top-6 self-start">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-[#273244]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-[#1a3a35] dark:text-[#9be7dc]">
              <FiCalendar className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
              Reschedule Summary
            </h2>
          </div>

          {/* Compact body — no overflow/scroll */}
          <div className="divide-y divide-slate-100 dark:divide-[#273244]">
            {/* Patient */}
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {avatarText}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">{patientName || "—"}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-300">
                  {[patientAge, patientGender].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            {/* Doctor & Appointment Info */}
            <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Doctor</p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-800 dark:text-white">{doctorName ? `Dr. ${doctorName}` : "—"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Status</p>
                <p className="mt-0.5 text-[12px] font-semibold text-amber-600 dark:text-amber-300">{appointmentStatus || "—"}</p>
              </div>
              {patientMobile && (
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Contact</p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-800 dark:text-white">{patientMobile}</p>
                </div>
              )}
              {doctorSpeciality && (
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Speciality</p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-800 dark:text-white">{doctorSpeciality}</p>
                </div>
              )}
            </div>

            {/* Symptoms (if any) */}
            {hasSymptoms && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Symptoms</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {symptoms.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">{s}</span>
                  ))}
                  {symptoms.length > 4 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/50 dark:text-slate-300">+{symptoms.length - 4}</span>
                  )}
                </div>
              </div>
            )}

            {/* Current → New comparison */}
            <div className="px-4 py-3 space-y-2">
              {/* Current */}
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-500" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Current</p>
                  <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 line-through decoration-slate-300 dark:decoration-slate-500">
                    {currentApptDateLabel}{currentStartTime ? ` · ${currentStartTime}` : ""}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <svg className="h-4 w-4 text-teal-500 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              </div>

              {/* New */}
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500 dark:bg-teal-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-300">New</p>
                  {dateParam ? (
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                      {new Date(`${dateParam}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {selectedSlot ? (
                        <span className="ml-1 text-teal-700 dark:text-teal-300">
                          · {selectedSlot.kind === "token"
                            ? `Token ${(selectedSlot as TokenSlot).tokenNo}`
                            : `${formatTimeTo12Hour((selectedSlot as TimeSlot).startTime)} – ${formatTimeTo12Hour((selectedSlot as TimeSlot).endTime)}`}
                        </span>
                      ) : (
                        <span className="ml-1 text-slate-400 dark:text-slate-500">· Select slot</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[13px] text-slate-400 dark:text-slate-500">Select date & slot</p>
                  )}
                </div>
              </div>
            </div>

            {/* Reason (if filled) */}
            {reasonValue && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Reason</p>
                <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">{reasonValue}</p>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="space-y-2 border-t border-slate-100 px-4 py-3 dark:border-[#273244]">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isUpdating || formState.isSubmitting || !selectedSlot}
              className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              {isUpdating || formState.isSubmitting ? "Rescheduling…" : "Confirm Reschedule"}
              {!isUpdating && !formState.isSubmitting && <FiChevronRight className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isUpdating || formState.isSubmitting}
              className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-70 dark:border-[#273244] dark:text-slate-400 dark:hover:bg-[#1a2535]"
            >
              Cancel
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Reschedule;
