import { addToast, Button, cn, Select, SelectItem } from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiVideo,
} from "react-icons/fi";
import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
} from "../../redux/api/doctorApi";
import { OnboardingInput } from "./OnboardingInput";
import { OnboardingStepSkeleton } from "./OnboardingStepSkeleton";
import { FaCheck } from "react-icons/fa";

type DoctorAvailabilityStepProps = {
  onNext: () => void;
  onComplete?: () => void;
  onBack: () => void;
};

type Shift = { startTime: string; endTime: string };
type ConsultMode = "time" | "token";

type AvailabilityFormValues = {
  selectedDays: string[];
  consultMode: ConsultMode;
  shifts: Shift[];
  applyToAll: boolean;
  slotMinutes: string;
  bufferTime: string;
  maxPatients: string;
};

const DAYS = [
  { label: "Mon", value: "Monday" },
  { label: "Tue", value: "Tuesday" },
  { label: "Wed", value: "Wednesday" },
  { label: "Thu", value: "Thursday" },
  { label: "Fri", value: "Friday" },
  { label: "Sat", value: "Saturday" },
  { label: "Sun", value: "Sunday" },
];

const DEFAULT_SELECTED_DAYS = DAYS.slice(0, 5).map((d) => d.value);
const DEFAULT_START_TIME = "09:00:00";
const DEFAULT_END_TIME = "18:00:00";
const DEFAULT_SLOT_MINUTES = "30";
const DEFAULT_SHIFTS = [
  { startTime: "09:00:00", endTime: "13:00:00" },
  { startTime: "14:00:00", endTime: "18:00:00" },
];

const extractMaxPatients = (notes?: any) => {
  const s = String(notes || "");
  const m = s.match(/Max Patients:\s*(\d+)/i);
  return m?.[1] || "";
};

function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const s = String(t).trim();
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2]);
    const ap = m12[3].toUpperCase();
    if (hh === 12) hh = 0;
    if (ap === "PM") hh += 12;
    return hh * 60 + mm;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);
  return null;
}

function formatMinutesTo24h(total: number) {
  const D = 24 * 60;
  const n = ((total % D) + D) % D;
  const hh = Math.floor(n / 60);
  const mm = n % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

function formatMinutesTo12h(total: number) {
  const D = 24 * 60;
  const n = ((total % D) + D) % D;
  const h24 = Math.floor(n / 60);
  const mm = n % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
}

function normalizeTimeLabel(v?: string | null): string {
  if (!v) return "";
  if (typeof v === "string" && /^\d{2}:\d{2}:\d{2}$/.test(v)) {
    const parts = v.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  }
  const m = parseTimeToMinutes(v);
  if (m === null) return String(v);
  return formatMinutesTo12h(m);
}

function splitTimeParts(v?: string | null): { hour: string; minute: string; period: string } {
  const normalized = normalizeTimeLabel(v);
  const match = normalized.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: "", minute: "", period: "" };
  return { hour: match[1], minute: match[2], period: match[3].toUpperCase() };
}

function buildTimeFromParts(hour?: string, minute?: string, period?: string): string {
  if (!hour || !minute || !period) return "";
  return `${hour}:${minute} ${period}`;
}

function convert12hTo24h(value: string) {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) return "";
  return formatMinutesTo24h(minutes);
}

const TIME_STEP_MINUTES = 15;
const ALL_TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += TIME_STEP_MINUTES) out.push(formatMinutesTo12h(m));
  return out;
})();

type TimeOptionPart = { full: string; hour: string; minute: string; period: string };

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function getAllowedTimeParts(minTime?: string | null, maxTime?: string | null): TimeOptionPart[] {
  const minMinutes = parseTimeToMinutes(minTime);
  const maxMinutes = parseTimeToMinutes(maxTime);
  return ALL_TIME_OPTIONS.filter((time) => {
    const minutes = parseTimeToMinutes(time);
    if (minutes === null) return false;
    if (minMinutes !== null && minutes <= minMinutes) return false;
    if (maxMinutes !== null && minutes >= maxMinutes) return false;
    return true;
  }).map((time) => {
    const parts = splitTimeParts(time);
    return { full: time, hour: parts.hour, minute: parts.minute, period: parts.period };
  });
}

function getFirstAllowedTime(minTime?: string | null, maxTime?: string | null): string {
  const first = getAllowedTimeParts(minTime, maxTime)[0];
  return first ? convert12hTo24h(first.full) : "";
}

function getFirstMatchingAllowedTime(
  allowedTimeParts: TimeOptionPart[],
  preferred: { hour?: string; minute?: string; period?: string }
): string {
  const exact = allowedTimeParts.find(
    (i) => (!preferred.period || i.period === preferred.period) &&
            (!preferred.hour || i.hour === preferred.hour) &&
            (!preferred.minute || i.minute === preferred.minute)
  );
  if (exact) return exact.full;
  const sph = allowedTimeParts.find(
    (i) => (!preferred.period || i.period === preferred.period) &&
            (!preferred.hour || i.hour === preferred.hour)
  );
  if (sph) return sph.full;
  const sp = allowedTimeParts.find((i) => !preferred.period || i.period === preferred.period);
  if (sp) return sp.full;
  return allowedTimeParts[0]?.full || "";
}

function breaksToShifts(startTime: string, endTime: string, breaks: any[]): Shift[] {
  if (!startTime || !endTime) return [];
  const shifts: Shift[] = [];
  let currentStart = startTime;
  const sortedBreaks = [...breaks].sort((a, b) => (parseTimeToMinutes(a.startTime) || 0) - (parseTimeToMinutes(b.startTime) || 0));
  for (const breakItem of sortedBreaks) {
    if (breakItem.startTime && breakItem.endTime) {
      shifts.push({ startTime: currentStart, endTime: breakItem.startTime });
      currentStart = breakItem.endTime;
    }
  }
  shifts.push({ startTime: currentStart, endTime });
  return shifts.filter((shift) => {
    const startMin = parseTimeToMinutes(shift.startTime);
    const endMin = parseTimeToMinutes(shift.endTime);
    return startMin !== null && endMin !== null && endMin > startMin;
  });
}

function shiftsToBreaks(shifts: Shift[]): any[] {
  if (shifts.length <= 1) return [];
  const breaks: any[] = [];
  for (let i = 0; i < shifts.length - 1; i++) {
    breaks.push({
      breakType: `GAP${i + 1}`,
      startTime: shifts[i].endTime,
      endTime: shifts[i + 1].startTime,
      status: true,
      notes: "",
    });
  }
  return breaks;
}

/* ─── TimeSelectField ─── */
const TimeSelectField = ({
  label, value, onChange, isDisabled = false, minTime, maxTime,
}: {
  label: string; value?: string; onChange: (v: string) => void;
  isDisabled?: boolean; minTime?: string | null; maxTime?: string | null;
}) => {
  const parsedValue = useMemo(() => splitTimeParts(value), [value]);
  const [hour, setHour] = useState(parsedValue.hour);
  const [minute, setMinute] = useState(parsedValue.minute);
  const [period, setPeriod] = useState(parsedValue.period);

  useEffect(() => { setHour(parsedValue.hour); setMinute(parsedValue.minute); setPeriod(parsedValue.period); }, [parsedValue.hour, parsedValue.minute, parsedValue.period]);

  const allowedTimeParts = useMemo(() => getAllowedTimeParts(minTime, maxTime), [minTime, maxTime]);
  const availablePeriods = useMemo(() => uniqueValues(allowedTimeParts.map((i) => i.period)), [allowedTimeParts]);
  const availableHours = useMemo(() => uniqueValues(allowedTimeParts.filter((i) => !period || i.period === period).map((i) => i.hour)), [allowedTimeParts, period]);
  const availableMinutes = useMemo(() => uniqueValues(allowedTimeParts.filter((i) => (!hour || i.hour === hour) && (!period || i.period === period)).map((i) => i.minute)), [allowedTimeParts, hour, period]);

  useEffect(() => { if (hour && !availableHours.includes(hour)) setHour(""); }, [hour, availableHours]);
  useEffect(() => { if (minute && !availableMinutes.includes(minute)) setMinute(""); }, [minute, availableMinutes]);
  useEffect(() => { if (period && !availablePeriods.includes(period)) setPeriod(""); }, [period, availablePeriods]);

  const updateParts = (nextHour: string, nextMinute: string, nextPeriod: string) => {
    const nextTime = buildTimeFromParts(nextHour, nextMinute, nextPeriod);
    if (nextTime && allowedTimeParts.some((i) => i.full === nextTime)) {
      setHour(nextHour); setMinute(nextMinute); setPeriod(nextPeriod);
      onChange(convert12hTo24h(nextTime)); return;
    }
    const fallbackTime = getFirstMatchingAllowedTime(allowedTimeParts, { hour: nextHour || undefined, minute: nextMinute || undefined, period: nextPeriod || undefined });
    if (!fallbackTime) { setHour(nextHour); setMinute(nextMinute); setPeriod(nextPeriod); return; }
    const fp = splitTimeParts(fallbackTime);
    setHour(fp.hour); setMinute(fp.minute); setPeriod(fp.period);
    onChange(convert12hTo24h(fallbackTime));
  };

  const triggerCls =
    "h-9 min-h-0 rounded-lg border-slate-200 bg-white shadow-none data-[hover=true]:border-primary/50 data-[open=true]:border-primary dark:border-slate-700 dark:bg-slate-900";
  const valueCls = "text-[13px] font-semibold text-slate-700 dark:text-slate-200";

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">{label}</div>
      <div className="flex items-center gap-2">
        <Select aria-label={`${label} hour`} placeholder="HH" variant="bordered" size="sm" isDisabled={isDisabled}
          selectedKeys={hour && availableHours.includes(hour) ? [hour] : undefined}
          onSelectionChange={(keys) => { if (keys === "all") return; const f = Array.from(keys)[0]; updateParts(f ? String(f) : "", minute, period); }}
          className="w-[82px]" classNames={{ trigger: triggerCls, value: valueCls, selectorIcon: "text-slate-400" }}>
          {availableHours.map((h) => <SelectItem key={h} textValue={h}>{h}</SelectItem>)}
        </Select>
        <span className="text-sm font-bold text-slate-400">:</span>
        <Select aria-label={`${label} minute`} placeholder="MM" variant="bordered" size="sm" isDisabled={isDisabled}
          selectedKeys={minute && availableMinutes.includes(minute) ? [minute] : undefined}
          onSelectionChange={(keys) => { if (keys === "all") return; const f = Array.from(keys)[0]; updateParts(hour, f ? String(f) : "", period); }}
          className="w-[82px]" classNames={{ trigger: triggerCls, value: valueCls, selectorIcon: "text-slate-400" }}>
          {availableMinutes.map((m) => <SelectItem key={m} textValue={m}>{m}</SelectItem>)}
        </Select>
        <Select aria-label={`${label} period`} placeholder="AM/PM" variant="bordered" size="sm" isDisabled={isDisabled}
          selectedKeys={period && availablePeriods.includes(period) ? [period] : undefined}
          onSelectionChange={(keys) => { if (keys === "all") return; const f = Array.from(keys)[0]; updateParts(hour, minute, f ? String(f) : ""); }}
          className="w-[88px]" classNames={{ trigger: triggerCls, value: valueCls, selectorIcon: "text-slate-400" }}>
          {availablePeriods.map((p) => <SelectItem key={p} textValue={p}>{p}</SelectItem>)}
        </Select>
      </div>
    </div>
  );
};

/* ─── Main component ─── */
const DoctorAvailabilityStep: React.FC<DoctorAvailabilityStepProps> = ({
  onNext,
  onComplete,
  onBack,
}) => {
  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(undefined, {
    // ✅ OPTIMIZED: Prevent unnecessary refetching
    refetchOnMountOrArgChange: false,
  });
  const [updateDoctor, { isLoading: isSaving }] = useUpdateDoctorMutation();

  const { control, handleSubmit, reset, watch, setValue } =
    useForm<AvailabilityFormValues>({
      defaultValues: {
        selectedDays: DEFAULT_SELECTED_DAYS,
        consultMode: "time",
        shifts: DEFAULT_SHIFTS,
        applyToAll: true,
        slotMinutes: DEFAULT_SLOT_MINUTES,
        bufferTime: "0",
        maxPatients: "",
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "shifts" });

  useEffect(() => {
    const result: any = doctorData?.result;
    const availability = result?.availability ?? result?.aivblity ?? result?.aivblityList;
    if (!Array.isArray(availability) || availability.length === 0) return;
    const first = availability[0] ?? {};
    const activeDays = availability.filter((a: any) => Boolean(a?.isAvailable)).map((a: any) => a?.dayOfWeek).filter(Boolean);
    const breaks = first?.aivblityBreak ?? first?.availabilityBreak ?? first?.breaks ?? [];
    const shifts = breaksToShifts(first?.startTime || DEFAULT_START_TIME, first?.endTime || DEFAULT_END_TIME, breaks);
    const maxPatientsFromBackend = first?.noOfPatients !== undefined && first?.noOfPatients !== null ? String(first.noOfPatients) : "";
    const maxPatientsFromNotes = extractMaxPatients(first?.notes);
    const inferredMode: ConsultMode = maxPatientsFromBackend || maxPatientsFromNotes ? "token" : "time";
    const maxPatientsValue = maxPatientsFromBackend || maxPatientsFromNotes;
    reset({
      selectedDays: activeDays.length > 0 ? activeDays : DEFAULT_SELECTED_DAYS,
      consultMode: inferredMode,
      shifts: shifts.length > 0 ? shifts : [{ startTime: first?.startTime || DEFAULT_START_TIME, endTime: first?.endTime || DEFAULT_END_TIME }],
      applyToAll: true,
      slotMinutes: String(first?.slotMinutes ?? DEFAULT_SLOT_MINUTES),
      bufferTime: String(first?.stepMinutes ?? "0"),
      maxPatients: inferredMode === "token" ? maxPatientsValue : "",
    });
  }, [doctorData, reset]);

  const selectedDays = watch("selectedDays");
  const consultMode = watch("consultMode");
  const watchedShifts = watch("shifts");
  const workingDaysSelected =
    selectedDays.length === DEFAULT_SELECTED_DAYS.length &&
    DEFAULT_SELECTED_DAYS.every((day) => selectedDays.includes(day));

  useEffect(() => {
    if (!watchedShifts?.length) return;
    watchedShifts.forEach((shift, index) => {
      const previousShiftEnd = index > 0 ? watchedShifts[index - 1]?.endTime : undefined;
      const nextShiftStart = index < watchedShifts.length - 1 ? watchedShifts[index + 1]?.startTime : undefined;
      const startMin = parseTimeToMinutes(shift.startTime);
      const endMin = parseTimeToMinutes(shift.endTime);
      const prevEndMin = parseTimeToMinutes(previousShiftEnd);
      const nextStartMin = parseTimeToMinutes(nextShiftStart);
      const isStartInvalid = !shift.startTime || startMin === null || (prevEndMin !== null && startMin <= prevEndMin) || (nextStartMin !== null && startMin >= nextStartMin);
      if (isStartInvalid) {
        const fallbackStart = getFirstAllowedTime(previousShiftEnd, nextShiftStart);
        if (fallbackStart && fallbackStart !== shift.startTime) setValue(`shifts.${index}.startTime`, fallbackStart, { shouldDirty: true, shouldValidate: true });
        return;
      }
      const isEndInvalid = !shift.endTime || endMin === null || endMin <= startMin! || (nextStartMin !== null && endMin >= nextStartMin);
      if (isEndInvalid) {
        const fallbackEnd = getFirstAllowedTime(shift.startTime, nextShiftStart);
        if (fallbackEnd && fallbackEnd !== shift.endTime) setValue(`shifts.${index}.endTime`, fallbackEnd, { shouldDirty: true, shouldValidate: true });
      }
    });
  }, [watchedShifts, setValue]);

  const addNewShift = () => {
    const currentShifts = watch("shifts") || [];
    const lastShift = currentShifts[currentShifts.length - 1];
    const lastEndMinutes = parseTimeToMinutes(lastShift?.endTime);
    if (lastEndMinutes === null) { addToast({ title: "Invalid last shift", description: "Please set the last shift end time correctly first.", color: "warning" }); return; }
    const GAP = 30, DUR = 60, D = 24 * 60;
    const nextStart = lastEndMinutes + GAP;
    const nextEnd = nextStart + DUR;
    if (nextStart >= D || nextEnd > D) { addToast({ title: "Cannot add more shifts", description: "No valid time left in the same day for another shift.", color: "warning" }); return; }
    append({ startTime: formatMinutesTo24h(nextStart), endTime: formatMinutesTo24h(nextEnd) });
  };

  const removeShift = (index: number) => { if (fields.length > 1) remove(index); };

  const validateShifts = (shiftsList: Shift[]): string | null => {
    for (let i = 0; i < shiftsList.length; i++) {
      const start = parseTimeToMinutes(shiftsList[i].startTime);
      const end = parseTimeToMinutes(shiftsList[i].endTime);
      if (start === null || end === null) return `Shift ${i + 1}: Invalid time format`;
      if (end <= start) return `Shift ${i + 1}: End time must be after start time`;
      if (i > 0) {
        const prevEnd = parseTimeToMinutes(shiftsList[i - 1].endTime);
        if (prevEnd !== null && start <= prevEnd) return `Shift ${i + 1}: Start time must be after previous shift's end time`;
      }
    }
    return null;
  };

  const onSubmit = async (data: AvailabilityFormValues) => {
    try {
      if (!data.selectedDays || data.selectedDays.length === 0) { addToast({ title: "Select days", description: "Please select at least one available day.", color: "warning" }); return; }
      const shiftError = validateShifts(data.shifts);
      if (shiftError) { addToast({ title: "Invalid shifts", description: shiftError, color: "warning" }); return; }
      let tokenPatients: number | null = null;
      if (data.consultMode === "token") {
        const raw = String(data.maxPatients || "").trim();
        const n = Number(raw);
        if (!raw || !Number.isFinite(n) || n <= 0) { addToast({ title: "Max patients required", description: "Please enter a valid number of max patients / day.", color: "warning" }); return; }
        tokenPatients = Math.floor(n);
      }
      const safeSlot = Number(data.slotMinutes) || Number(DEFAULT_SLOT_MINUTES);
      const safeBuffer = 0;
      const allBreaks = shiftsToBreaks(data.shifts);
      const firstShift = data.shifts[0];
      const lastShift = data.shifts[data.shifts.length - 1];
      const normalizedBreaks = allBreaks.map((b) => ({ ...b, startTime: normalizeTimeLabel(b.startTime), endTime: normalizeTimeLabel(b.endTime) }));
      const availability = DAYS.map((day) => {
        const isAvail = data.selectedDays.includes(day.value);
        const isToken = data.consultMode === "token";
        return {
          dayOfWeek: day.value,
          isAvailable: isAvail,
          startTime: normalizeTimeLabel(firstShift?.startTime),
          endTime: normalizeTimeLabel(lastShift?.endTime),
          slotMinutes: safeSlot,
          stepMinutes: safeBuffer,
          notes: isToken ? (isAvail ? "Token-based OPD" : "") : "",
          ...(isToken && isAvail && tokenPatients ? { noOfPatients: tokenPatients } : {}),
          aivblityBreak: normalizedBreaks,
        };
      });
      const existingDateAvailability = Array.isArray((doctorData as any)?.result?.dateAvailability) ? (doctorData as any).result.dateAvailability : [];
      const res = await updateDoctor({ aivblity: availability, dateAvailability: existingDateAvailability } as any).unwrap();
      if (res?.success) { onComplete?.(); onNext(); }
      else addToast({ title: "Error", description: res?.message || "Failed to update availability", color: "danger" });
    } catch (error: any) {
      addToast({ title: "Error", description: error?.data?.message || "Failed to update availability", color: "danger" });
    }
  };

  if (isDoctorLoading) {
    return <OnboardingStepSkeleton variant="availability" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col font-outfit">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-8 pt-4 hide-scrollbar sm:px-6 sm:pb-9 sm:pt-5">
        <div className="flex flex-col gap-5 sm:gap-6">
      
      

      <section className="flex flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
          A. Available Days
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 lg:gap-3">
          {DAYS.map(({ label, value }) => {
            const isSelected = selectedDays.includes(value);
            return (
              <button key={value} type="button"
                onClick={() => {
                  const next = isSelected ? selectedDays.filter((d) => d !== value) : [...selectedDays, value];
                  setValue("selectedDays", next, { shouldDirty: true });
                }}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg border text-[13px] font-bold transition-all select-none",
                  isSelected
                    ? "border-primary bg-primary text-white shadow-sm shadow-primary/15"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/50 hover:text-primary"
                )}
              >
                {isSelected && (
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/90 text-primary">
                    <FaCheck className="h-2.5 w-2.5" />
                  </span>
                )}
                <span className="text-xs sm:text-sm font-bold leading-none">{label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {workingDaysSelected
            ? "All working days selected"
            : selectedDays.length === 7
              ? "All days selected"
              : selectedDays.length === 0
                ? "No days selected - pick at least one"
                : `${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""} selected`}
        </p>
      </section>

      <div className="h-px bg-slate-100" />

      {/* ── Appointment mode ── */}
      <section className="flex flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
          B. Appointment Mode
        </p>
        <Controller name="consultMode" control={control} render={({ field }) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { value: "token" as const, icon: FiVideo, label: "Tele-Visit / Video", sub: "Set and prefer tele-visits. Take engaged in sequence.", tone: "text-amber-500 bg-amber-50" },
              { value: "time"  as const, icon: FiCalendar, label: "Time Slots",   sub: "Fixed time slots per appointment. Patients book as specific time.", tone: "text-primary bg-[#eaf5f4]" },
            ]).map((opt) => (
              <button key={opt.value} type="button" onClick={() => field.onChange(opt.value)}
                className={cn(
                  "flex min-h-[86px] items-center gap-4 rounded-xl border p-4 text-left transition-all",
                  field.value === opt.value ? "border-primary bg-[#F0FAF9] dark:bg-primary/10 ring-1 ring-primary/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                )}>
                <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2", field.value === opt.value ? "border-primary" : "border-slate-300 dark:border-slate-600")}>
                  <span className={cn("h-2 w-2 rounded-full", field.value === opt.value ? "bg-primary" : "")} />
                </span>
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", opt.tone)}>
                  <opt.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{opt.label}</p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )} />
      </section>

      <div className="h-px bg-slate-100" />

      {/* ── Working shifts ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
              C. Working Shifts
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Set your daily shift schedule when appointment booking will be live.
            </p>
          </div>
          <button type="button" onClick={addNewShift}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:text-primary-hover transition-colors">
            <FiPlus className="h-4 w-4" /> Add Shift
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:gap-3">
          {fields.map((field, index) => {
            const previousShiftEnd = index > 0 ? watchedShifts?.[index - 1]?.endTime : undefined;
            const currentShiftStart = watchedShifts?.[index]?.startTime;
            const nextShiftStart = index < fields.length - 1 ? watchedShifts?.[index + 1]?.startTime : undefined;
            return (
              <div key={field.id} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[44px_minmax(0,1fr)_24px_minmax(0,1fr)_36px] sm:px-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-sm shadow-primary/20">{index + 1}</span>
                <div className="min-w-0">
                  <Controller control={control} name={`shifts.${index}.startTime` as const}
                    rules={{ required: "Start time required", validate: (value) => {
                      const startMin = parseTimeToMinutes(value);
                      if (startMin === null) return "Invalid time";
                      if (index > 0) { const prevEnd = parseTimeToMinutes(previousShiftEnd); if (prevEnd !== null && startMin <= prevEnd) return `Must start after Shift ${index} ends`; }
                      if (nextShiftStart) { const nextStartMin = parseTimeToMinutes(nextShiftStart); if (nextStartMin !== null && startMin >= nextStartMin) return `Must be before Shift ${index + 2} starts`; }
                      return true;
                    }}}
                    render={({ field: f }) => (
                      <TimeSelectField label="Start" value={f.value} minTime={previousShiftEnd} maxTime={nextShiftStart}
                        onChange={(v) => {
                          setValue(`shifts.${index}.startTime`, v, { shouldDirty: true, shouldValidate: true });
                          const updatedEnd = watch(`shifts.${index}.endTime`) as string | undefined;
                          const startMin = parseTimeToMinutes(v); const endMin = parseTimeToMinutes(updatedEnd);
                          if (startMin !== null && (endMin === null || endMin <= startMin)) {
                            const nextValidEnd = getFirstAllowedTime(v, nextShiftStart);
                            if (nextValidEnd) setValue(`shifts.${index}.endTime`, nextValidEnd, { shouldDirty: true, shouldValidate: true });
                          }
                        }} />
                    )} />
                </div>
                <FiArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 sm:block" />
                <div className="min-w-0">
                  <Controller control={control} name={`shifts.${index}.endTime` as const}
                    rules={{ required: "End time required", validate: (value) => {
                      const startMin = parseTimeToMinutes(currentShiftStart); const endMin = parseTimeToMinutes(value);
                      if (endMin === null) return "Invalid time";
                      if (startMin !== null && endMin <= startMin) return "End must be after start";
                      if (nextShiftStart) { const nextStartMin = parseTimeToMinutes(nextShiftStart); if (nextStartMin !== null && endMin >= nextStartMin) return `Must be before Shift ${index + 2} starts`; }
                      return true;
                    }}}
                    render={({ field: f }) => (
                      <TimeSelectField label="End" value={f.value} minTime={currentShiftStart} maxTime={nextShiftStart}
                        onChange={(v) => {
                          setValue(`shifts.${index}.endTime`, v, { shouldDirty: true, shouldValidate: true });
                          if (index < fields.length - 1) {
                            const nextStart = watch(`shifts.${index + 1}.startTime`) as string | undefined;
                            const nextEnd = watch(`shifts.${index + 1}.endTime`) as string | undefined;
                            const endMin = parseTimeToMinutes(v); const nextStartMin = parseTimeToMinutes(nextStart);
                            if (endMin !== null && nextStartMin !== null && nextStartMin <= endMin) {
                              const nextValidStart = getFirstAllowedTime(v, nextEnd);
                              if (nextValidStart) setValue(`shifts.${index + 1}.startTime`, nextValidStart, { shouldDirty: true, shouldValidate: true });
                            }
                          }
                        }} />
                    )} />
                </div>
                {fields.length > 1 && (
                  <button type="button" onClick={() => removeShift(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {consultMode === "token" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 pt-1">
            <div className="w-full sm:w-[240px]">
              <OnboardingInput
                control={control}
                name="maxPatients"
                label="Max Patients / Day"
                placeholder="e.g. 30"
                icon={<FiUsers className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
                type="tel"
                inputMode="numeric"
                isRequired
                rules={{
                  required: "Max patients per day is required",
                  validate: (value) => {
                    const n = Number(value);
                    if (!value || !Number.isFinite(n) || n <= 0) return "Enter a valid number greater than 0";
                    return true;
                  }
                }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 pb-2 leading-snug">Total patients across all shifts in a day.</p>
          </div>
        )}

        {consultMode === "time" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">Slot Duration</span>
            <Controller name="slotMinutes" control={control} render={({ field }) => (
              <div className="flex flex-wrap gap-3">
                {["15", "20", "30"].map((m) => (
                  <button key={m} type="button" onClick={() => field.onChange(m)}
                    className={cn("h-9 min-w-[92px] rounded-lg px-5 text-[13px] font-bold transition-all",
                      field.value === m ? "bg-primary text-white shadow-md shadow-primary/15" : "bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100")}>
                    {m} mins
                  </button>
                ))}
              </div>
            )} />
          </div>
        )}
      </section>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-5 py-2.5 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-3">
        <Button
          type="button"
          variant="bordered"
          radius="lg"
          className="h-10 sm:h-11 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          onPress={onBack}
          startContent={<FiArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>

        <Button
          type="submit"
          radius="lg"
          className="h-10 sm:h-11 bg-primary px-7 sm:px-8 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover"
          isLoading={isSaving}
          endContent={!isSaving && <FiArrowRight className="h-4 w-4" />}
        >
          Save & Continue
        </Button>
      </div>
    </form>
  );
};

export default DoctorAvailabilityStep;
