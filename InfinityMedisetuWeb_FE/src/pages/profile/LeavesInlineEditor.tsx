import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";

import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";
import type { DateAvailabilityItem } from "./ClinicAvailability";

/* ---------------- Helpers ---------------- */

function normalizeDateOnly(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toPrettyDate(yyyyMmDd: string) {
  if (!yyyyMmDd) return "—";
  const d = new Date(yyyyMmDd + "T00:00:00");
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function formatDateForInput(yyyyMmDd: string) {
  const date = parseDateOnly(yyyyMmDd);
  if (!date) return "";
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function parseDateOnly(v?: string): Date | null {
  const safe = normalizeDateOnly(v || "");
  if (!safe) return null;

  const match = safe.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(monthDate: Date) {
  const startOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const startDay = startOfMonth.getDay(); // 0 = Sun
  const gridStart = new Date(
    startOfMonth.getFullYear(),
    startOfMonth.getMonth(),
    1 - startDay,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

/** Backend-friendly: "09:00 AM" -> "09:00AM" */
function toApiTime(v: string) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

const MINUTE_OPTIONS = ["00", "15", "30", "45"];

const MERIDIEM_OPTIONS = ["AM", "PM"] as const;

function getTimeParts(v?: string) {
  const safe = toApiTime(v || "09:00AM");
  const match = safe.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);

  if (!match) {
    return {
      hour: "09",
      minute: "00",
      meridiem: "AM" as "AM" | "PM",
    };
  }

  const parsedMinute = String(Number(match[2])).padStart(2, "0");
  const safeMinute = MINUTE_OPTIONS.includes(parsedMinute) ? parsedMinute : "00";

  return {
    hour: String(Number(match[1])).padStart(2, "0"),
    minute: safeMinute,
    meridiem: match[3] as "AM" | "PM",
  };
}

function buildTimeValue(
  hour: string,
  minute: string,
  meridiem: "AM" | "PM",
) {
  return `${hour}:${minute}${meridiem}`;
}

function getFirstSelectedKey(keys: any, fallback: string) {
  if (!keys || keys === "all") return fallback;
  const first = Array.from(keys as Set<React.Key>)[0];
  return first ? String(first) : fallback;
}

function timeToMinutes(v: string): number | null {
  const s = toApiTime(v);
  if (!s) return null;

  const m12 = s.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2]);
    const ap = m12[3];
    if (hh === 12) hh = 0;
    if (ap === "PM") hh += 12;
    return hh * 60 + mm;
  }

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

  return null;
}

function minutesToTime(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 45));
  const hour24 = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  const meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return `${pad2(hour12)}:${pad2(minute)}${meridiem}`;
}

function getSuggestedEndTime(fromTime: string): string {
  const fromMinutes = timeToMinutes(fromTime);
  if (fromMinutes === null) return "10:00AM";

  const nextHour = fromMinutes + 60;
  return minutesToTime(Math.min(nextHour, 23 * 60 + 45));
}

function ensureEndTimeAfterStart(fromTime: string, toTime?: string): string {
  const fromMinutes = timeToMinutes(fromTime);
  const toMinutes = timeToMinutes(toTime || "");

  if (fromMinutes === null) return toTime || "05:00PM";
  if (toMinutes === null || toMinutes <= fromMinutes) {
    return getSuggestedEndTime(fromTime);
  }

  return toTime || getSuggestedEndTime(fromTime);
}

/** RTK Query success-but-parse-error handling (e.g. 204 No Content) */
function isSuccessButParseError(e: any) {
  const status = e?.status;
  const original = e?.originalStatus;

  return (
    status === "PARSING_ERROR" &&
    typeof original === "number" &&
    original >= 200 &&
    original < 300
  );
}

/* ---------------- Types ---------------- */

type ExceptionType = "FULL_DAY_LEAVE" | "CUSTOM_WORKING_HOURS";

type LeaveForm = {
  originalDate?: string;
  date: string;
  exceptionType: ExceptionType;
  fromTime: string;
  toTime: string;
  slotMinutes: number;
  stepMinutes: number;
};

type FormValues = {
  leaves: LeaveForm[];
};

type Props = {
  initialDateItem: DateAvailabilityItem | null;
  allDateAvailability: DateAvailabilityItem[];
  onCancel: () => void;
  onSaved: () => void;
};

type TimeSelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  title?: string;
};

const EXCEPTION_OPTIONS: { key: ExceptionType; label: string }[] = [
  { key: "FULL_DAY_LEAVE", label: "Full Day Leave" },
  { key: "CUSTOM_WORKING_HOURS", label: "Custom Working Hours" },
];

const timeSelectClassNames = {
  trigger:
    "h-11 min-h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-none data-[hover=true]:border-slate-400",
  value: "text-sm font-medium text-slate-900",
  selectorIcon: "text-slate-500",
  popoverContent: "rounded-2xl",
};

const TimeSelectField: React.FC<TimeSelectFieldProps> = ({
  label,
  value,
  onChange,
}) => {
  const { hour, minute, meridiem } = getTimeParts(value);

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={`${label} hour`}
          selectedKeys={new Set([hour])}
          disallowEmptySelection
          variant="bordered"
          radius="full"
          className="w-[88px]"
          classNames={timeSelectClassNames}
          listboxProps={{
            itemClasses: {
              base: "rounded-xl",
              selectedIcon: "text-slate-700",
            },
          }}
          onSelectionChange={(keys) => {
            const nextHour = getFirstSelectedKey(keys, hour);
            onChange(buildTimeValue(nextHour, minute, meridiem));
          }}
        >
          {HOUR_OPTIONS.map((item) => (
            <SelectItem key={item}>{item}</SelectItem>
          ))}
        </Select>

        <Select
          aria-label={`${label} minute`}
          selectedKeys={new Set([minute])}
          disallowEmptySelection
          variant="bordered"
          radius="full"
          className="w-[88px]"
          classNames={timeSelectClassNames}
          listboxProps={{
            itemClasses: {
              base: "rounded-xl",
              selectedIcon: "text-slate-700",
            },
          }}
          onSelectionChange={(keys) => {
            const nextMinute = getFirstSelectedKey(keys, minute);
            onChange(buildTimeValue(hour, nextMinute, meridiem));
          }}
        >
          {MINUTE_OPTIONS.map((item) => (
            <SelectItem key={item}>{item}</SelectItem>
          ))}
        </Select>

        <Select
          aria-label={`${label} meridiem`}
          selectedKeys={new Set([meridiem])}
          disallowEmptySelection
          variant="bordered"
          radius="full"
          className="w-[96px]"
          classNames={timeSelectClassNames}
          listboxProps={{
            itemClasses: {
              base: "rounded-xl",
              selectedIcon: "text-slate-700",
            },
          }}
          onSelectionChange={(keys) => {
            const nextMeridiem = getFirstSelectedKey(
              keys,
              meridiem,
            ) as "AM" | "PM";

            onChange(buildTimeValue(hour, minute, nextMeridiem));
          }}
        >
          {MERIDIEM_OPTIONS.map((item) => (
            <SelectItem key={item}>{item}</SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  title = "Select Date",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateOnly(value), [value]);
  const [viewMonth, setViewMonth] = useState<Date>(
    selectedDate || new Date(),
  );

  useEffect(() => {
    if (isOpen) {
      setViewMonth(selectedDate || new Date());
    }
  }, [isOpen, value, selectedDate]);

  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPastDate = (date: Date): boolean => {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  return (
    <>
      <Input
        label={label}
        labelPlacement="outside"
        variant="bordered"
        size="sm"
        placeholder="dd-mm-yyyy"
        value={formatDateForInput(value)}
        isReadOnly
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        classNames={{
          inputWrapper: "cursor-pointer",
          input: "cursor-pointer",
        }}
        endContent={
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="flex items-center text-slate-500 transition-colors hover:text-slate-700"
            aria-label="Open calendar"
          >
            <FiCalendar className="h-4 w-4" />
          </button>
        }
      />

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="center"
        size="md"
        hideCloseButton
      >
        <ModalContent className="overflow-hidden rounded-[28px] p-0">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <span className="text-[26px] font-semibold text-slate-900">
                  {title}
                </span>

                <Button
                  isIconOnly
                  variant="light"
                  className="h-12 w-12 min-w-12 rounded-full border border-slate-200 bg-white text-slate-500"
                  onPress={onClose}
                >
                  <FiX className="h-5 w-5" />
                </Button>
              </ModalHeader>

              <ModalBody className="px-6 py-6">
                <div className="rounded-[28px] border border-slate-200 p-5">
                  <div className="mb-6 flex items-center justify-between">
                    <Button
                      isIconOnly
                      variant="light"
                      className="h-12 w-12 min-w-12 rounded-full border border-slate-200 bg-white text-slate-600"
                      onPress={() =>
                        setViewMonth((prev) => addMonths(prev, -1))
                      }
                    >
                      <FiChevronLeft className="h-5 w-5" />
                    </Button>

                    <div className="text-lg font-semibold text-slate-900">
                      {getMonthLabel(viewMonth)}
                    </div>

                    <Button
                      isIconOnly
                      variant="light"
                      className="h-12 w-12 min-w-12 rounded-full border border-slate-200 bg-white text-slate-600"
                      onPress={() =>
                        setViewMonth((prev) => addMonths(prev, 1))
                      }
                    >
                      <FiChevronRight className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-y-3 text-center">
                    {DAY_LABELS.map((day) => (
                      <div
                        key={day}
                        className="pb-2 text-sm font-semibold text-slate-400"
                      >
                        {day}
                      </div>
                    ))}

                    {calendarDays.map((day) => {
                      const isCurrentMonth =
                        day.getMonth() === viewMonth.getMonth();
                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, today);
                      const isPast = isPastDate(day);
                      const isDisabled = isPast;

                      return (
                        <div
                          key={day.toISOString()}
                          className="flex items-center justify-center"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onChange(formatDateOnly(day));
                              onClose();
                            }}
                            disabled={isDisabled}
                            className={[
                              "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-all",
                              isDisabled
                                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                : isSelected
                                  ? "bg-slate-900 text-white shadow-sm"
                                  : isCurrentMonth
                                    ? "text-slate-700 hover:bg-slate-100"
                                    : "text-slate-300 hover:bg-slate-50",
                              !isSelected && !isDisabled && isToday
                                ? "border border-emerald-300 text-emerald-700"
                                : "",
                            ].join(" ")}
                          >
                            {day.getDate()}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                {!!value && (
                  <Button
                    variant="light"
                    className="rounded-full text-slate-600"
                    onPress={() => {
                      onChange("");
                      onClose();
                    }}
                  >
                    Clear
                  </Button>
                )}

                <Button
                  variant="bordered"
                  className="rounded-lg border-slate-300 px-6"
                  onPress={onClose}
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

/* ---------------- Component ---------------- */

const LeavesInlineEditor: React.FC<Props> = ({
  initialDateItem,
  allDateAvailability,
  onCancel,
  onSaved,
}) => {
  const [updateDoctor, { isLoading }] = useUpdateDoctorMutation();
  const [removedDates, setRemovedDates] = useState<string[]>([]);

  const defaults = useMemo<FormValues>(() => {
    if (initialDateItem) {
      const hasSlots =
        Array.isArray(initialDateItem.timeSlots) &&
        initialDateItem.timeSlots.length > 0;

      const exceptionType: ExceptionType =
        !initialDateItem.isAvailable || !hasSlots
          ? "FULL_DAY_LEAVE"
          : "CUSTOM_WORKING_HOURS";

      const first = hasSlots ? initialDateItem.timeSlots[0] : null;
      const defaultFrom = toApiTime(first?.startTime || "09:00AM");
      const defaultTo = ensureEndTimeAfterStart(
        defaultFrom,
        toApiTime(first?.endTime || "05:00PM"),
      );

      return {
        leaves: [
          {
            originalDate: normalizeDateOnly(initialDateItem.date),
            date: normalizeDateOnly(initialDateItem.date),
            exceptionType,
            fromTime: defaultFrom,
            toTime: defaultTo,
            slotMinutes: initialDateItem.slotMinutes || 30,
            stepMinutes: 0,
          },
        ],
      };
    }

    return {
      leaves: [
        {
          originalDate: "",
          date: "",
          exceptionType: "FULL_DAY_LEAVE",
          fromTime: "09:00AM",
          toTime: "05:00PM",
          slotMinutes: 30,
          stepMinutes: 0,
        },
      ],
    };
  }, [initialDateItem]);

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>(
    {
      defaultValues: defaults,
    },
  );

  const { fields } = useFieldArray({
    control,
    name: "leaves",
    keyName: "fieldId",
  });

  useEffect(() => {
    reset(defaults);
    setRemovedDates([]);
  }, [defaults, reset]);

  const leavesWatch = watch("leaves");

  const onSubmit = async (values: FormValues) => {
    if (isLoading) return;

    try {
      const leaves = (values.leaves || [])
        .map((l) => ({
          ...l,
          originalDate: normalizeDateOnly(l.originalDate),
          date: normalizeDateOnly(l.date),
          fromTime: toApiTime(l.fromTime),
          toTime: toApiTime(l.toTime),
          slotMinutes: l.slotMinutes || 30,
          stepMinutes: 0,
        }))
        .filter((l) => !!l.date);

      if (!leaves.length && removedDates.length === 0) {
        addToast({
          title: "Nothing to save",
          description: "Please add at least one leave or make a change.",
          color: "warning",
        });
        return;
      }

      for (const l of leaves) {
        if (l.exceptionType === "CUSTOM_WORKING_HOURS") {
          if (!l.fromTime || !l.toTime) {
            addToast({
              title: "Missing time",
              description: "Please select From and To time.",
              color: "warning",
            });
            return;
          }

          const a = timeToMinutes(l.fromTime);
          const b = timeToMinutes(l.toTime);

          if (a === null || b === null || b <= a) {
            addToast({
              title: "Invalid time",
              description: "To time must be after From time.",
              color: "warning",
            });
            return;
          }
        }
      }

      const replaceTargets = new Set<string>(removedDates);

      for (const l of leaves) {
        if (l.originalDate) replaceTargets.add(l.originalDate);
        if (l.date) replaceTargets.add(l.date);
      }

      const existing = Array.isArray(allDateAvailability)
        ? allDateAvailability
        : [];

      const kept = existing
        .map((d) => ({
          date: normalizeDateOnly(d.date),
          isAvailable: Boolean(d.isAvailable),
          notes: d.notes ?? "",
          slotMinutes: Number(d.slotMinutes) || 30,
          stepMinutes: Number(d.stepMinutes) || 0,
          timeSlots: Array.isArray(d.timeSlots) ? d.timeSlots : [],
        }))
        .filter((d) => !replaceTargets.has(d.date));

      const editedMap = new Map<string, any>();

      for (const l of leaves) {
        const date = normalizeDateOnly(l.date);
        if (!date) continue;

        if (l.exceptionType === "FULL_DAY_LEAVE") {
          editedMap.set(date, {
            date,
            isAvailable: false,
            notes: "Full Day Leave",
            slotMinutes: 30,
            stepMinutes: 0,
            timeSlots: [],
          });
        } else {
          editedMap.set(date, {
            date,
            isAvailable: true,
            notes: "Custom Working Hours",
            slotMinutes: l.slotMinutes || 30,
            stepMinutes: 0,
            timeSlots: [
              {
                startTime: l.fromTime,
                endTime: l.toTime,
                isAvailable: true,
                notes: "",
              },
            ],
          });
        }
      }

      const nextList = [...kept, ...Array.from(editedMap.values())].sort(
        (a, b) => String(a.date).localeCompare(String(b.date)),
      );

      const payload = {
        dateAvailability: nextList.map((d) => ({
          date: d.date,
          isAvailable: Boolean(d.isAvailable),
          notes: d.notes ?? "",
          slotMinutes: Number(d.slotMinutes) || 30,
          stepMinutes: Number(d.stepMinutes) || 0,
          timeSlots: Array.isArray(d.timeSlots)
            ? d.timeSlots.map((ts: any) => ({
              id: ts?.id,
              startTime: toApiTime(ts.startTime),
              endTime: toApiTime(ts.endTime),
              isAvailable:
                typeof ts.isAvailable === "boolean" ? ts.isAvailable : true,
              notes: ts.notes ?? "",
            }))
            : [],
        })),
      };

      try {
        await updateDoctor(payload as any).unwrap();
      } catch (e: any) {
        if (!isSuccessButParseError(e)) {
          return;
        }
      }

      addToast({
        title: "Saved",
        description: "Leaves updated successfully.",
        color: "success",
      });

      try {
        onSaved();
      } catch (err) {
        console.warn("onSaved threw:", err);
      }
    } catch (err) {
      console.error("Unexpected error while saving leaves:", err);
      addToast({
        title: "Save failed",
        description: "Something went wrong on the page. Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between" />

      {fields.map((f, idx) => {
        const current = leavesWatch?.[idx];
        const isFullDay = current?.exceptionType === "FULL_DAY_LEAVE";

        return (
          <div
            key={f.fieldId}
            className="rounded-2xl border border-slate-200 bg-white"
          >
            <div className="flex items-start justify-between px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl text-emerald-700">
                  <FiCalendar className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {current?.date ? toPrettyDate(current.date) : "Select Date"}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-md px-2 py-0.5 font-semibold ${isFullDay
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                        }`}
                    >
                      {isFullDay ? "FULL DAY LEAVE" : "CUSTOM WORKING HOURS"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-4">
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-6">
                  <Controller
                    control={control}
                    name={`leaves.${idx}.exceptionType` as const}
                    render={({ field }) => {
                      const currentValue = field.value || "FULL_DAY_LEAVE";

                      return (
                        <Select
                          label="Exception Type"
                          labelPlacement="outside"
                          selectedKeys={new Set([currentValue])}
                          onSelectionChange={(keys) => {
                            const v = getFirstSelectedKey(
                              keys,
                              currentValue,
                            ) as ExceptionType;

                            if (!v || v === currentValue) return;

                            setValue(`leaves.${idx}.exceptionType`, v, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });

                            if (v === "FULL_DAY_LEAVE") {
                              setValue(`leaves.${idx}.fromTime`, "09:00AM", {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                              setValue(`leaves.${idx}.toTime`, "05:00PM", {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                              setValue(`leaves.${idx}.slotMinutes`, 30, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                            } else {
                              const currentFrom =
                                leavesWatch?.[idx]?.fromTime || "09:00AM";
                              const currentTo =
                                leavesWatch?.[idx]?.toTime || "05:00PM";

                              setValue(
                                `leaves.${idx}.toTime`,
                                ensureEndTimeAfterStart(currentFrom, currentTo),
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                },
                              );
                            }
                          }}
                          variant="bordered"
                          size="sm"
                          disallowEmptySelection
                        >
                          {EXCEPTION_OPTIONS.map((option) => {
                            const isSelectedOption = option.key === currentValue;

                            return (
                              <SelectItem
                                key={option.key}
                                className={isSelectedOption ? "hidden" : ""}
                              >
                                {option.label}
                              </SelectItem>
                            );
                          })}
                        </Select>
                      );
                    }}
                  />
                </div>

                <div className="md:col-span-6">
                  <Controller
                    control={control}
                    name={`leaves.${idx}.date` as const}
                    render={({ field }) => (
                      <DatePickerField
                        label="Date"
                        title="Select Date"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {!isFullDay && (
                  <>
                    <div className="md:col-span-6">
                      <Controller
                        control={control}
                        name={`leaves.${idx}.fromTime` as const}
                        render={({ field }) => (
                          <TimeSelectField
                            label="From"
                            value={field.value || "09:00AM"}
                            onChange={(nextFrom) => {
                              field.onChange(nextFrom);

                              const currentTo =
                                leavesWatch?.[idx]?.toTime || "05:00PM";
                              const fixedTo = ensureEndTimeAfterStart(
                                nextFrom,
                                currentTo,
                              );

                              if (fixedTo !== currentTo) {
                                setValue(`leaves.${idx}.toTime`, fixedTo, {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                });
                              }
                            }}
                          />
                        )}
                      />
                    </div>

                    <div className="md:col-span-6">
                      <Controller
                        control={control}
                        name={`leaves.${idx}.toTime` as const}
                        render={({ field }) => (
                          <TimeSelectField
                            label="To"
                            value={field.value || "05:00PM"}
                            onChange={(nextTo) => {
                              const currentFrom =
                                leavesWatch?.[idx]?.fromTime || "09:00AM";
                              const fixedTo = ensureEndTimeAfterStart(
                                currentFrom,
                                nextTo,
                              );
                              field.onChange(fixedTo);
                            }}
                          />
                        )}
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-12 flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="bordered"
                    className="rounded-full"
                    onPress={onCancel}
                    disabled={isLoading}
                  >
                    Cancel Changes
                  </Button>

                  <Button
                    size="sm"
                    className="rounded-full bg-emerald-700 text-white"
                    type="submit"
                    isLoading={isLoading}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </form>
  );
};

export default LeavesInlineEditor;