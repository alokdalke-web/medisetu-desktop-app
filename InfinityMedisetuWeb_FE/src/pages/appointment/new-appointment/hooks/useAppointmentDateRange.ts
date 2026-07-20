import { parseDate } from "@internationalized/date";
import React from "react";
import type {
  UseFormClearErrors,
  UseFormSetValue,
} from "react-hook-form";

import {
  formatIsoForUi,
  getLocalDateISO,
  toApiDate,
} from "../helpers/dateTimeHelpers";
import type { DayRange, NewAppointmentForm } from "../types";

type FocusField = (
  ref: React.RefObject<HTMLDivElement | null>,
  selector?: string,
  delay?: number,
) => void;

type UseAppointmentDateRangeParams = {
  appointmentDate: any;
  restoredDayRange?: DayRange;
  todayIso: string;
  setValue: UseFormSetValue<NewAppointmentForm>;
  clearErrors: UseFormClearErrors<NewAppointmentForm>;
  focusField: FocusField;
  slotFieldRef: React.RefObject<HTMLDivElement | null>;
};

const useAppointmentDateRange = ({
  appointmentDate,
  restoredDayRange,
  todayIso,
  setValue,
  clearErrors,
  focusField,
  slotFieldRef,
}: UseAppointmentDateRangeParams) => {
  const todayDateValue = React.useMemo(() => parseDate(todayIso), [todayIso]);

  const [dayRange, setDayRange] = React.useState<DayRange>(
    () => restoredDayRange ?? 30,
  );

  const maxAllowedIso = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayRange - 1);
    return getLocalDateISO(d);
  }, [dayRange]);

  const rangeEndLabel = React.useMemo(
    () => formatIsoForUi(maxAllowedIso),
    [maxAllowedIso],
  );

  const rangeHintText = React.useMemo(() => {
    if (dayRange === 7) {
      return "Want a later date? Change range to Next 15 days or Next 30 days.";
    }
    if (dayRange === 15) {
      return "Want a later date? Change range to Next 30 days.";
    }
    return "You are viewing the maximum booking range (Next 30 days).";
  }, [dayRange]);

  const dateParam = React.useMemo(
    () => toApiDate(appointmentDate),
    [appointmentDate],
  );

  React.useEffect(() => {
    if (!dateParam) return;

    if (dateParam < todayIso) {
      setValue("appointmentDate", parseDate(todayIso), {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("appointmentTime");
      return;
    }

    if (dateParam > maxAllowedIso) {
      setValue("appointmentDate", parseDate(maxAllowedIso), {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("appointmentTime");
    }
  }, [dateParam, todayIso, maxAllowedIso, setValue, clearErrors]);

  const dayPills = React.useMemo(() => {
    const list: { iso: string; dayLabel: string; dateLabel: string }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0); // Reset to midnight local time

    for (let i = 0; i < dayRange; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);

      const iso = getLocalDateISO(d);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      const dateLabel = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      list.push({ iso, dayLabel, dateLabel });
    }

    return list;
  }, [dayRange]);

  const calendarMonthSections = React.useMemo(() => {
    const allowedSet = new Set(dayPills.map((d) => d.iso));

    // month keys from allowed dates only (e.g. 2026-02, 2026-03)
    const monthKeys = Array.from(
      new Set(dayPills.map((d) => d.iso.slice(0, 7))),
    );

    return monthKeys.map((monthKey) => {
      const [y, m] = monthKey.split("-").map(Number); // m = 1..12
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);

      const monthLabel = first.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      // Monday-first offset (Mon=0 ... Sun=6)
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

        const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          iso,
          dayNum: day,
          isAllowed: allowedSet.has(iso),
          // isToday: iso === todayIso,
          isToday: iso === getLocalDateISO(),
        };
      });

      // Split into weeks and keep only those weeks that contain at least one allowed date
      const weeks: (typeof fullCells)[] = [];
      for (let i = 0; i < fullCells.length; i += 7) {
        const week = fullCells.slice(i, i + 7);
        const hasAllowed = week.some((c) => c?.isAllowed);
        if (hasAllowed) weeks.push(week);
      }

      return {
        monthKey,
        monthLabel,
        weeks,
      };
    });
  }, [dayPills]);

  const handlePickPill = (iso: string) => {
    const parsed = parseDate(iso);
    setValue("appointmentDate", parsed, {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("appointmentTime");

    focusField(slotFieldRef, "button:not([disabled])");
  };

  return {
    todayIso,
    todayDateValue,
    dayRange,
    setDayRange,
    maxAllowedIso,
    rangeEndLabel,
    rangeHintText,
    dateParam,
    dayPills,
    calendarMonthSections,
    handlePickPill,
  };
};

export default useAppointmentDateRange;
