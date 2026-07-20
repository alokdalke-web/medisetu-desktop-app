/**
 * useAppointmentCalendar.ts
 *
 * Manages all calendar-specific state and derived data:
 * - Week / day navigation
 * - Calendar date range (calStartDate / calEndDate)
 * - Selected date
 * - Calendar mode (week | day)
 * - Week days array
 * - Current time-line position
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  getStoredYmd,
  toYmd,
  weekRangeFromDate,
} from "../../../utils/date.utils";
import { getTodayIST, parseYmdLocal, startOfWeekLocal } from "../../../utils/date";


export type CalMode = "week" | "day";

const SLOT_HEIGHT = 68;

// ─── Session-storage calendar range ──────────────────────────────────────────

const getInitialCalRange = (): { startYmd: string; endYmd: string } => {
  const storedStart = getStoredYmd("appointmentCalStartDate");
  const storedEnd = getStoredYmd("appointmentCalEndDate");

  if (storedStart && storedEnd) {
    return { startYmd: storedStart, endYmd: storedEnd };
  }

  const { start, end } = weekRangeFromDate(parseYmdLocal(getTodayIST()));
  return { startYmd: start, endYmd: end };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAppointmentCalendarReturn {
  // State
  calMode: CalMode;
  setCalMode: (mode: CalMode) => void;
  selectedDateYmd: string;
  setSelectedDateYmd: (ymd: string) => void;
  calStartDate: string;
  calEndDate: string;
  displayCalStartDate: string;
  displayCalEndDate: string;
  setDisplayCalStartDate: (ymd: string) => void;
  setDisplayCalEndDate: (ymd: string) => void;

  // Derived
  currentWeekStart: Date;
  weekDays: Date[];
  selectedDate: Date;
  slotHeight: number;

  // Navigation
  goPrevWeek: () => void;
  goNextWeek: () => void;
  goThisWeek: () => void;
  goPrevDay: () => void;
  goNextDay: () => void;
  goTodayDay: () => void;
  onJumpToDate: (date: Date) => void;
  setWeekRange: (weekStart: Date) => void;

  // Time-line
  currentTimeLine: { top: number; dayIdx: number } | null;

  // Utility: call after patientsRawCal loads to auto-select first date
  syncPatientsForAutoSelect: (
    patients: { appointment?: { appointmentDate?: string | null; appointmentTime?: string | null } | null }[],
  ) => void;
}

export const useAppointmentCalendar = (
  now: Date,
  dynamicHours: { minHour: number; maxHour: number } = { minHour: 8, maxHour: 20 },
): UseAppointmentCalendarReturn => {
  const calInit = getInitialCalRange();

  const [calMode, setCalMode] = useState<CalMode>(() => {
    const saved = localStorage.getItem("appointmentCalMode");
    return saved === "week" || saved === "day" ? saved : "week";
  });

  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(() => {
    const today = new Date();
    return toYmd(today);
  });

  const [displayCalStartDate, setDisplayCalStartDate] = useState<string>(
    () => calInit.startYmd,
  );
  const [displayCalEndDate, setDisplayCalEndDate] = useState<string>(
    () => calInit.endYmd,
  );
  const [calStartDate, setCalStartDate] = useState<string>(
    () => calInit.startYmd,
  );
  const [calEndDate, setCalEndDate] = useState<string>(() => calInit.endYmd);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist cal mode to localStorage
  useEffect(() => {
    localStorage.setItem("appointmentCalMode", calMode);
  }, [calMode]);

  // Debounce display dates → query dates
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setCalStartDate(displayCalStartDate);
      setCalEndDate(displayCalEndDate);
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [displayCalStartDate, displayCalEndDate]);

  // Auto-select first appointment date when it falls outside current range
  // This is called externally via syncPatientsForAutoSelect
  const syncPatientsForAutoSelect = (
    patients: { appointment?: { appointmentDate?: string | null; appointmentTime?: string | null } | null }[],
  ) => {
    if (!patients.length || !calStartDate || !calEndDate) return;
    if (selectedDateYmd >= calStartDate && selectedDateYmd <= calEndDate) return;

    const firstPatient = patients[0];
    const appt = firstPatient?.appointment;
    if (!appt) return;

    const dateStr = (appt.appointmentDate ?? "").trim();
    if (!dateStr) return;
    const ymd = dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
    if (ymd >= calStartDate && ymd <= calEndDate) {
      setSelectedDateYmd(ymd);
    }
  };

  // ─── Navigation helpers ──────────────────────────────────────────────────

  const setWeekRange = (weekStart: Date) => {
    const start = startOfWeekLocal(weekStart);
    const end = addDays(start, 6);
    const startYmd = toYmd(start);
    const endYmd = toYmd(end);

    setDisplayCalStartDate(startYmd);
    setDisplayCalEndDate(endYmd);
    setCalStartDate(startYmd);
    setCalEndDate(endYmd);
    setSelectedDateYmd(startYmd);
  };

  const currentWeekStart = useMemo(() => {
    const base = selectedDateYmd ? parseYmdLocal(selectedDateYmd) : new Date();
    return startOfWeekLocal(base);
  }, [selectedDateYmd]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart],
  );

  const selectedDate = useMemo(
    () => parseYmdLocal(selectedDateYmd),
    [selectedDateYmd],
  );

  const goPrevWeek = () => setWeekRange(addDays(currentWeekStart, -7));
  const goNextWeek = () => setWeekRange(addDays(currentWeekStart, 7));
  const goThisWeek = () => setWeekRange(new Date());

  const goPrevDay = () => {
    const prev = addDays(selectedDate, -1);
    const prevYmd = toYmd(prev);
    setSelectedDateYmd(prevYmd);
    const weekStart = toYmd(startOfWeekLocal(prev));
    if (weekStart !== calStartDate) setWeekRange(prev);
  };

  const goNextDay = () => {
    const next = addDays(selectedDate, 1);
    const nextYmd = toYmd(next);
    setSelectedDateYmd(nextYmd);
    const weekStart = toYmd(startOfWeekLocal(next));
    if (weekStart !== calStartDate) setWeekRange(next);
  };

  const goTodayDay = () => {
    const today = new Date();
    setSelectedDateYmd(toYmd(today));
    setWeekRange(today);
  };

  const onJumpToDate = (date: Date) => {
    setSelectedDateYmd(toYmd(date));
    setWeekRange(date);
  };

  // ─── Current time-line ───────────────────────────────────────────────────

  const currentTimeLine = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const { minHour, maxHour } = dynamicHours;

    if (h < minHour || h >= maxHour) return null;

    const minsFromStart = (h - minHour) * 60 + m;
    const top = (minsFromStart / 30) * SLOT_HEIGHT;
    const dateKey = toYmd(now);
    const dayIdx = weekDays.findIndex((d) => toYmd(d) === dateKey);

    if (dayIdx < 0) return null;
    return { top, dayIdx };
  }, [now, weekDays, dynamicHours]);

  return {
    calMode,
    setCalMode,
    selectedDateYmd,
    setSelectedDateYmd,
    calStartDate,
    calEndDate,
    displayCalStartDate,
    displayCalEndDate,
    setDisplayCalStartDate,
    setDisplayCalEndDate,
    currentWeekStart,
    weekDays,
    selectedDate,
    slotHeight: SLOT_HEIGHT,
    goPrevWeek,
    goNextWeek,
    goThisWeek,
    goPrevDay,
    goNextDay,
    goTodayDay,
    onJumpToDate,
    setWeekRange,
    currentTimeLine,
    syncPatientsForAutoSelect,
  };
};
