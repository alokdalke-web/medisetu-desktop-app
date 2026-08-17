/**
 * useCalendarEvents.ts
 *
 * Builds the CalEvent list from raw API patients, groups them by day,
 * and computes the dynamic visible hour range from doctor availability.
 *
 * Extracted from Appointment.tsx to keep calendar-specific derivation
 * separate from the main component's state orchestration.
 */

import { useMemo } from "react";
import { toYmd } from "../../../utils/date.utils";
import { parseTimeTo24h } from "../../../utils/date.utils";
import type { ApiPatient } from "../../../utils/appointment.mapper";
import type { AvailabilitySlot } from "../AppointmentCalendarView";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  doctorName: string;
  doctorId?: string;
  avatarUrl?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  patientMobile?: string | null;
  appointmentNotes?: string | null;
  appointmentType?: string | null;
  tokenNo?: number | null;
  doctorSpeciality?: string | null;
}

interface DayEvents {
  date: string;
  items: CalEvent[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const parseLocalYmd = (
  dateStr?: string | null,
): { y: number; m: number; d: number; ymd: string } | null => {
  const raw = (dateStr ?? "").trim();
  const ymdPart = raw.includes("T") ? raw.slice(0, 10) : raw;
  const [y, m, d] = ymdPart.split("-").map(Number);
  if (!y || !m || !d) return null;
  return {
    y,
    m,
    d,
    ymd: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  };
};

const isUsableTime = (timeStr?: string | null): boolean => {
  const t = (timeStr ?? "").trim();
  if (!t) return false;
  if (t === "23:59" || t === "23:59:00") return false; // backend placeholder
  return /^\d{2}:\d{2}(:\d{2})?$/.test(t);
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseCalendarEventsArgs {
  patientsRawCal: ApiPatient[];
  weekDays: Date[];
  selectedDoctorId: string | null;
  doctorAvailability: AvailabilitySlot[];
}

interface UseCalendarEventsReturn {
  dynamicHours: { hours: number[]; minHour: number; maxHour: number };
  calEvents: CalEvent[];
  calEventsFiltered: CalEvent[];
  eventsByDay: DayEvents[];
  allEventsByDay: DayEvents[];
}

export const useCalendarEvents = ({
  patientsRawCal,
  weekDays,
  selectedDoctorId,
  doctorAvailability,
}: UseCalendarEventsArgs): UseCalendarEventsReturn => {
  // ── Dynamic visible hour range ─────────────────────────────────────────────
  const dynamicHours = useMemo(() => {
    let minH = 8;
    let maxH = 20;

    if (doctorAvailability.length > 0) {
      let foundStart = 24;
      let foundEnd = 0;
      let hasAvailable = false;

      for (const day of doctorAvailability) {
        if (day.isAvailable && day.startTime && day.endTime) {
          hasAvailable = true;
          const start = parseTimeTo24h(day.startTime);
          const end = parseTimeTo24h(day.endTime);
          if (start.h < foundStart) foundStart = start.h;
          if (end.h > foundEnd) foundEnd = end.h;
        }
      }

      if (hasAvailable) {
        minH = Math.max(0, foundStart - 1);
        maxH = Math.min(24, foundEnd + 1);
      }
    }

    const hours: number[] = [];
    for (let i = minH; i < maxH; i++) hours.push(i);

    return { hours, minHour: minH, maxHour: maxH };
  }, [doctorAvailability]);

  // ── Build CalEvent list ────────────────────────────────────────────────────
  const calEvents = useMemo(() => {
    const events: CalEvent[] = [];

    // Group patients by date for stable token-based slot assignment
    const byDate = new Map<string, ApiPatient[]>();

    for (const patient of patientsRawCal) {
      const parsed = parseLocalYmd(patient?.appointment?.appointmentDate);
      if (!parsed) continue;

      if (!byDate.has(parsed.ymd)) byDate.set(parsed.ymd, []);
      byDate.get(parsed.ymd)!.push(patient);
    }

    for (const [, patients] of byDate.entries()) {
      // Stable sort: token → name → id
      const sorted = [...patients].sort((a, b) => {
        const tokenA = a?.appointment?.tokenNo ?? 9999;
        const tokenB = b?.appointment?.tokenNo ?? 9999;
        if (tokenA !== tokenB) return tokenA - tokenB;

        const nameA = (a?.name ?? "").toLowerCase();
        const nameB = (b?.name ?? "").toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);

        return String(a?.appointment?.id ?? "").localeCompare(
          String(b?.appointment?.id ?? ""),
        );
      });

      const tokenSeen = new Map<number, number>();

      for (let idx = 0; idx < sorted.length; idx++) {
        const patient = sorted[idx];
        const appt = patient?.appointment;
        if (!appt) continue;

        const id = String(appt.id ?? "").trim();
        if (!id) continue;

        const parsed = parseLocalYmd(appt.appointmentDate);
        if (!parsed) continue;

        let start: Date;
        let end: Date;

        const rawTime = (appt.appointmentTime ?? "").trim();

        if (isUsableTime(rawTime)) {
          const { h, m } = parseTimeTo24h(rawTime);
          start = new Date(parsed.y, parsed.m - 1, parsed.d, h, m, 0, 0);
          end = new Date(start.getTime() + 30 * 60 * 1000);
        } else {
          // Fallback: derive slot position from token number
          const token = Math.max(1, Number(appt.tokenNo ?? idx + 1));
          const dupIndex = tokenSeen.get(token) ?? 0;
          tokenSeen.set(token, dupIndex + 1);

          const slotIndex = token - 1 + dupIndex;
          const totalMins = dynamicHours.minHour * 60 + slotIndex * 30;
          const h = Math.floor(totalMins / 60);
          const m = totalMins % 60;

          start = new Date(parsed.y, parsed.m - 1, parsed.d, h, m, 0, 0);
          end = new Date(start.getTime() + 30 * 60 * 1000);
        }

        const status = (appt.appointmentStatus ?? "Pending").trim();
        const doctorName =
          patient?.doctor?.name?.trim() ||
          patient?.doctor?.email?.trim() ||
          "—";
        const doctorId =
          String(
            (patient?.doctor as { id?: string; _id?: string })?.id ??
              (patient?.doctor as { id?: string; _id?: string })?._id ??
              "",
          ).trim() || undefined;

        events.push({
          id,
          title: patient?.name ?? "Unknown",
          start,
          end,
          status,
          doctorName,
          doctorId,
          avatarUrl: patient?.profileImage ?? null,
          patientAge: patient?.age ?? null,
          patientGender: patient?.gender ?? "-",
          patientMobile: patient?.mobile ?? null,
          appointmentNotes: null,
          appointmentType: appt?.appointmentType ?? "Consultation",
          tokenNo: appt?.tokenNo ?? null,
          doctorSpeciality: patient?.doctor?.speciality ?? null,
        });
      }
    }

    return events;
  }, [patientsRawCal, dynamicHours.minHour]);

  // ── Filter by selected doctor ──────────────────────────────────────────────
  const calEventsFiltered = useMemo(
    () =>
      selectedDoctorId
        ? calEvents.filter((ev) => ev.doctorId === selectedDoctorId)
        : calEvents,
    [calEvents, selectedDoctorId],
  );

  // ── Group filtered events by week day ─────────────────────────────────────
  const eventsByDay = useMemo(() => {
    const dayMap: DayEvents[] = weekDays.map((d) => ({
      date: toYmd(d),
      items: [],
    }));

    for (const ev of calEventsFiltered) {
      const key = toYmd(ev.start);
      const idx = dayMap.findIndex((entry) => entry.date === key);
      if (idx >= 0) dayMap[idx].items.push(ev);
    }

    for (const day of dayMap) {
      day.items.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    return dayMap;
  }, [calEventsFiltered, weekDays]);

  // ── Group ALL events by week day (unfiltered, for day-view all-doctors) ───
  const allEventsByDay = useMemo(() => {
    const dayMap: DayEvents[] = weekDays.map((d) => ({
      date: toYmd(d),
      items: [],
    }));

    for (const ev of calEvents) {
      const key = toYmd(ev.start);
      const idx = dayMap.findIndex((entry) => entry.date === key);
      if (idx >= 0) dayMap[idx].items.push(ev);
    }

    for (const day of dayMap) {
      day.items.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    return dayMap;
  }, [calEvents, weekDays]);

  return {
    dynamicHours,
    calEvents,
    calEventsFiltered,
    eventsByDay,
    allEventsByDay,
  };
};
