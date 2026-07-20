import { Button, Spinner, Switch, addToast } from "@heroui/react";
import React, { useMemo, useRef, useState, type ComponentProps } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit2,
} from "react-icons/fi";
import { useNavigate } from "react-router";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";

import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
} from "../../redux/api/doctorApi";

import calendar from "/assets/icons/calendar.svg";
import Leave from "/assets/icons/Leave.svg";

import WeeklySlotInlineEditor from "../clinic/WeeklySlotInlineEditor";
import LeavesInlineEditor from "../profile/LeavesInlineEditor";
import LeavesList from "../profile/LeavesList";

type WeeklyEditorProps = ComponentProps<typeof WeeklySlotInlineEditor>;
type WeeklyEditorSlot = WeeklyEditorProps["slot"];
type WeeklyEditorDateAvailabilityItem =
  WeeklyEditorProps["allDateAvailability"][number];
type WeeklyEditorDateTimeSlot =
  WeeklyEditorDateAvailabilityItem["timeSlots"][number];

/* ---------------- Types ---------------- */

export type Break = {
  breakType?: string | null;
  startTime: string;
  endTime: string;
  status?: boolean;
  notes?: string | null;
};

export type AvailabilitySlot = {
  id?: string;
  dayOfWeek: WeeklyEditorSlot["dayOfWeek"];

  startTime: string | null;
  endTime: string | null;
  breaksStart?: string | null;
  breaksEnd?: string | null;
  isAvailable: boolean;
  notes?: string | null;

  slotMinutes?: number;
  stepMinutes?: number;

  aivblityBreak?: Break[];
  availabilityBreak?: Break[];
  breaks?: Break[];
};

export type DateTimeSlot = WeeklyEditorDateTimeSlot;
export type DateAvailabilityItem = WeeklyEditorDateAvailabilityItem;

/* ---------------- Helpers ---------------- */

function normalizeDateOnly(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toPrettyDate(yyyyMmDdOrIso: string) {
  const dOnly = normalizeDateOnly(yyyyMmDdOrIso);
  if (!dOnly) return "—";
  const d = new Date(dOnly + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dOnly;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ---------------- Leave History UI ---------------- */

const LeaveHistoryList = ({
  isLoading,
  items,
}: {
  isLoading: boolean;
  items: DateAvailabilityItem[];
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-[#334158] dark:bg-[#0f1728] dark:text-slate-200">
        <Spinner size="sm" />
        <span>Loading leave history…</span>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-[#334158] dark:bg-[#0f1728] dark:text-slate-200">
        No leave history found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const dateOnly = normalizeDateOnly(item.date);
        const slots = Array.isArray(item.timeSlots) ? item.timeSlots : [];
        const hasSlots = slots.length > 0;

        const isFullDay = !item.isAvailable || !hasSlots;

        // let rangeText = "09:00AM - 05:00PM";
        if (!isFullDay) {
          // rangeText = `${compactTime(start)} - ${compactTime(end)}`;
        }

        return (
          <div
            key={item.id || dateOnly}
            className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-[#334158] dark:bg-[#0f1728]"
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <div
                className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${
                  isFullDay
                    ? "bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30"
                }`}
              >
                <FiCalendar className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {toPrettyDate(dateOnly)}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold ${
                      isFullDay
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                    }`}
                  >
                    {isFullDay ? "FULL DAY LEAVE" : "PARTIAL LEAVE"}
                  </span>

                  {/* <span className="text-slate-500">{rangeText}</span> */}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function keyOf(s: AvailabilitySlot) {
  return s.id || s.dayOfWeek;
}

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

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

  return null;
}

function getScrollableParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement;

  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    const canScroll = parent.scrollHeight > parent.clientHeight;

    if (canScroll && /(auto|scroll|overlay)/.test(overflowY)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
}

function keepElementAnchored(
  element: HTMLElement | null,
  updateLayout: () => void,
) {
  if (!element) {
    updateLayout();
    return;
  }

  const scrollParent = getScrollableParent(element);
  const topBefore = element.getBoundingClientRect().top;

  updateLayout();

  requestAnimationFrame(() => {
    const topAfter = element.getBoundingClientRect().top;
    const delta = topAfter - topBefore;

    if (Math.abs(delta) < 1) return;

    if (scrollParent === window) {
      window.scrollBy(0, delta);
      return;
    }

    (scrollParent as HTMLElement).scrollTop += delta;
  });
}

function getShiftsForDisplay(slot: AvailabilitySlot) {
  const breaks = (slot as any)?.aivblityBreak?.length
    ? (slot as any).aivblityBreak
    : (slot as any)?.availabilityBreak?.length
      ? (slot as any).availabilityBreak
      : (slot as any)?.breaks || [];

  const startTime = slot.startTime || "09:00 AM";
  const endTime = slot.endTime || "05:00 PM";

  if (!breaks.length) {
    return [{ startTime, endTime }];
  }

  const shifts: { startTime: string; endTime: string }[] = [];
  let currentStart = startTime;

  const sortedBreaks = [...breaks].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.startTime) || 0;
    const bStart = parseTimeToMinutes(b.startTime) || 0;
    return aStart - bStart;
  });

  for (const breakItem of sortedBreaks) {
    if (
      breakItem.startTime &&
      breakItem.endTime &&
      breakItem.status !== false
    ) {
      shifts.push({
        startTime: currentStart,
        endTime: breakItem.startTime,
      });
      currentStart = breakItem.endTime;
    }
  }

  shifts.push({
    startTime: currentStart,
    endTime: endTime,
  });

  return shifts.filter((shift) => {
    const startMin = parseTimeToMinutes(shift.startTime);
    const endMin = parseTimeToMinutes(shift.endTime);
    return startMin !== null && endMin !== null && endMin > startMin;
  });
}

type DayRowProps = {
  slot: AvailabilitySlot;
  expandedKey: string | null;
  optimisticAvail: Record<string, boolean | undefined>;
  togglingKey: string | null;
  availability: AvailabilitySlot[];
  dateAvailability: DateAvailabilityItem[];
  onExpand: (key: string) => void;
  onToggleDay: (slot: AvailabilitySlot, next: boolean) => void;
  onSaved: WeeklyEditorProps["onSaved"];
  onCancel: () => void;
};

const DayRow = ({
  slot,
  expandedKey,
  optimisticAvail,
  togglingKey,
  availability,
  dateAvailability,
  onExpand,
  onToggleDay,
  onSaved,
  onCancel,
}: DayRowProps) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const k = keyOf(slot);
  const isExpanded = expandedKey === k;

  const selected =
    optimisticAvail[k] !== undefined ? optimisticAvail[k] : !!slot.isAvailable;

  const shifts = useMemo(() => getShiftsForDisplay(slot), [slot]);
  const hasMultipleShifts = shifts.length > 1;
  const totalHours = useMemo(() => {
    let total = 0;
    for (const shift of shifts) {
      const start = parseTimeToMinutes(shift.startTime);
      const end = parseTimeToMinutes(shift.endTime);
      if (start !== null && end !== null) {
        total += (end - start) / 60;
      }
    }
    return total;
  }, [shifts]);

  const formatTimeRange = (start: string, end: string) => {
    return `${start} - ${end}`;
  };

  const handleEdit = () => {
    keepElementAnchored(rowRef.current, () => onExpand(k));
  };

  return (
    <div
      ref={rowRef}
      className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 dark:bg-[#0f1728] ${
        isExpanded
          ? "border-emerald-200 shadow-sm dark:border-emerald-500/40"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm dark:border-[#334158] dark:hover:border-[#46556e]"
      }`}
    >
      <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${
                selected
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30"
                  : "bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600"
              }`}
            >
              <FiCalendar className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`truncate text-sm font-semibold ${
                    selected
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  {slot.dayOfWeek}
                </h3>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    selected
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  {selected ? "Available" : "Off day"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {totalHours > 0 && (
                  <div className="mt-1 text-center text-[10px] text-slate-800 dark:text-slate-100">
                    {totalHours.toFixed(1)} hours total
                  </div>
                )}
              </div>

              {selected && (
                <div className="mt-1.5 space-y-1">
                  {shifts.map((shift, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span className="text-slate-700 dark:text-white">
                        {idx < shifts.length && (
                          <span className="me-2 text-[10px] text-slate-400 dark:text-slate-300">
                            Shift {idx + 1} :
                          </span>
                        )}
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </span>
                    </div>
                  ))}

                  {hasMultipleShifts && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 dark:bg-amber-500/15">
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-200">
                        {shifts.length} shifts
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!selected && (
                <div className="mt-1 text-xs text-slate-400 dark:text-slate-300">
                  No appointments on this day
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {selected && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-[#334158] dark:bg-[#111a2c] dark:text-white dark:hover:bg-[#17233a] sm:text-sm"
            >
              <FiEdit2 className="h-3.5 w-3.5" />
              Edit
            </button>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-[#334158] dark:bg-[#111a2c]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-200">
              {selected ? "On" : "Off"}
            </span>
            <Switch
              size="sm"
              isSelected={selected}
              isDisabled={togglingKey === k}
              onValueChange={(v) => {
                onToggleDay(slot, v);
              }}
              aria-label={`${slot.dayOfWeek} availability`}
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-emerald-100 bg-slate-50/80 px-4 py-4 dark:border-[#334158] dark:bg-[#0b1220] sm:px-5">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Edit {slot.dayOfWeek} time slots
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Update availability for this day only.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-[#334158] dark:bg-[#111a2c] sm:p-4">
            <WeeklySlotInlineEditor
              slot={slot}
              allAvailability={availability}
              allDateAvailability={dateAvailability}
              onSaved={onSaved}
              onCancel={onCancel}
              hideHeader
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Component ---------------- */

const ClinicAvailability: React.FC = () => {
  const [updateDoctor] = useUpdateDoctorMutation();
  const navigate = useNavigate();

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [optimisticAvail, setOptimisticAvail] = useState<
    Record<string, boolean | undefined>
  >({});

  const [tab, setTab] = useState<"weekly" | "leaves" | "history">("weekly");

  const [showLeavesEditor, setShowLeavesEditor] = useState(false);
  const [selectedDate, setSelectedDate] = useState<DateAvailabilityItem | null>(
    null,
  );

  const [deletingLeaveKey, setDeletingLeaveKey] = useState<string | null>(null);
  console.log(setDeletingLeaveKey);

  const { data, isLoading, isFetching, isError, refetch } = useGetDoctorQuery();

  const rawAvailability: any[] = useMemo(
    () =>
      (data as any)?.result?.aivblity ??
      (data as any)?.result?.availability ??
      [],
    [data],
  );

  const rawDateAvailability: any[] = useMemo(
    () => (data as any)?.result?.dateAvailability ?? [],
    [data],
  );

  const availability: AvailabilitySlot[] = useMemo(() => {
    return rawAvailability.map((slot: any) => {
      const normalizedBreaks: Break[] =
        slot.aivblityBreak || slot.availabilityBreak || slot.breaks || [];

      return {
        id: slot.id,
        dayOfWeek: slot.dayOfWeek as WeeklyEditorSlot["dayOfWeek"],
        startTime: slot.startTime ?? null,
        endTime: slot.endTime ?? null,
        breaksStart: slot.breaksStart ?? null,
        breaksEnd: slot.breaksEnd ?? null,
        isAvailable: Boolean(slot.isAvailable),
        notes: slot.notes ?? "",

        slotMinutes:
          slot.slotMinutes !== undefined && slot.slotMinutes !== null
            ? Number(slot.slotMinutes)
            : 30,

        stepMinutes:
          slot.stepMinutes !== undefined && slot.stepMinutes !== null
            ? Number(slot.stepMinutes)
            : 15,

        aivblityBreak: normalizedBreaks,
        availabilityBreak: normalizedBreaks,
        breaks: normalizedBreaks,
      };
    });
  }, [rawAvailability]);

  const dateAvailability: DateAvailabilityItem[] = useMemo(() => {
    return rawDateAvailability.map((d: any) => {
      const rawSlots: any[] = Array.isArray(d?.timeSlots) ? d.timeSlots : [];

      return {
        id: d?.id,
        date: normalizeDateOnly(d?.date),
        isAvailable: Boolean(d?.isAvailable),
        notes: typeof d?.notes === "string" ? d.notes : "",
        slotMinutes:
          d?.slotMinutes !== undefined && d?.slotMinutes !== null
            ? Number(d.slotMinutes)
            : 30,
        stepMinutes:
          d?.stepMinutes !== undefined && d?.stepMinutes !== null
            ? Number(d.stepMinutes)
            : 15,
        timeSlots: rawSlots.map((ts: any) => ({
          id: ts?.id,
          startTime: ts?.startTime ?? "",
          endTime: ts?.endTime ?? "",
          isAvailable:
            typeof ts?.isAvailable === "boolean" ? ts.isAvailable : true,
          notes: typeof ts?.notes === "string" ? ts.notes : "",
        })),
      };
    });
  }, [rawDateAvailability]);

  const orderedAvailability = useMemo(() => {
    const order: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };
    return [...availability].sort(
      (a, b) => (order[a.dayOfWeek] ?? 99) - (order[b.dayOfWeek] ?? 99),
    );
  }, [availability]);

  const orderedLeaves = useMemo(() => {
    return [...dateAvailability].sort((a, b) => {
      const ad = a.date || "";
      const bd = b.date || "";
      return ad.localeCompare(bd);
    });
  }, [dateAvailability]);

  const buildPayload = (nextAvailability: AvailabilitySlot[]) => {
    const existingDateAvailability: DateAvailabilityItem[] = (
      Array.isArray(dateAvailability) ? dateAvailability : []
    ).map((d: any) => ({
      date: normalizeDateOnly(d.date),
      isAvailable: Boolean(d.isAvailable),
      notes: d.notes ?? "",
      slotMinutes: d.slotMinutes ?? 30,
      stepMinutes: d.stepMinutes ?? 15,
      timeSlots: Array.isArray(d.timeSlots)
        ? d.timeSlots.map((t: any) => ({
            id: t?.id,
            startTime: t.startTime ?? "",
            endTime: t.endTime ?? "",
            isAvailable:
              typeof t.isAvailable === "boolean" ? t.isAvailable : true,
            notes: t.notes ?? "",
          }))
        : [],
    }));

    return {
      aivblity: nextAvailability.map((a) => {
        const bArr: Break[] = (a as any)?.aivblityBreak?.length
          ? (a as any).aivblityBreak
          : (a as any)?.availabilityBreak?.length
            ? (a as any).availabilityBreak
            : (a as any)?.breaks || [];

        return {
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isAvailable: (a as any).isAvailable,
          notes: (a as any).notes ?? "",
          slotMinutes:
            typeof (a as any).slotMinutes === "number"
              ? (a as any).slotMinutes
              : 30,
          stepMinutes:
            typeof (a as any).stepMinutes === "number"
              ? (a as any).stepMinutes
              : 15,
          aivblityBreak: (bArr || []).map((b) => ({
            breakType: b.breakType || "Break",
            startTime: b.startTime,
            endTime: b.endTime,
            status: typeof b.status === "boolean" ? b.status : true,
            notes: b.notes ?? "",
          })),
        };
      }),

      dateAvailability: existingDateAvailability.map((d) => ({
        date: d.date,
        isAvailable: d.isAvailable,
        notes: d.notes ?? "",
        ...(d.isAvailable
          ? {
              slotMinutes: Number(d.slotMinutes) || 30,
              stepMinutes: Number(d.stepMinutes) || 15,
              timeSlots: (d.timeSlots || []).map((ts) => ({
                id: ts?.id,
                startTime: ts.startTime,
                endTime: ts.endTime,
                isAvailable: ts.isAvailable,
                notes: ts.notes ?? "",
              })),
            }
          : {}),
      })),
    } as const;
  };

  const handleToggleDay = async (slot: AvailabilitySlot, next: boolean) => {
    const k = keyOf(slot);

    try {
      setTogglingKey(k);
      setOptimisticAvail((p) => ({ ...p, [k]: next }));

      const nextAvailability = availability.map((a) => {
        const match =
          (slot?.id && a.id === slot.id) ||
          (!slot?.id && a.dayOfWeek === slot?.dayOfWeek);

        if (!match) return a;

        const start = a.startTime || "09:00 AM";
        const end = a.endTime || "05:00 PM";

        return {
          ...a,
          isAvailable: next,
          startTime: next ? start : a.startTime,
          endTime: next ? end : a.endTime,
        };
      });

      await updateDoctor(buildPayload(nextAvailability) as any).unwrap();

      addToast({
        title: "Updated",
        description: `${slot.dayOfWeek} is now ${next ? "Available" : "Off"}.`,
        color: "success",
      });

      if (!next && expandedKey === k) setExpandedKey(null);
      await refetch();
    } catch (e) {
      console.error(e);
      addToast({
        title: "Failed",
        description: "Could not update availability. Try again.",
        color: "danger",
      });
    } finally {
      setTogglingKey(null);
      setOptimisticAvail((p) => {
        const copy = { ...p };
        delete copy[k];
        return copy;
      });
    }
  };

  // const DayRow = ({ slot }: { slot: AvailabilitySlot }) => {
  //   const k = keyOf(slot);
  //   const isExpanded = expandedKey === k;

  //   const selected =
  //     optimisticAvail[k] !== undefined
  //       ? optimisticAvail[k]
  //       : !!slot.isAvailable;

  //   return (
  //     <div
  //       className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${
  //         isExpanded
  //           ? "border-emerald-200 shadow-sm"
  //           : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
  //       }`}
  //     >
  //       <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
  //         <div className="min-w-0 flex-1">
  //           <div className="flex items-start gap-3">
  //             <div
  //               className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${
  //                 selected
  //                   ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
  //                   : "bg-slate-50 text-slate-400 ring-slate-200"
  //               }`}
  //             >
  //               <FiCalendar className="h-4 w-4" />
  //             </div>

  //             <div className="min-w-0">
  //               <div className="flex flex-wrap items-center gap-2">
  //                 <h3
  //                   className={`truncate text-sm font-semibold ${
  //                     selected ? "text-slate-900" : "text-slate-500"
  //                   }`}
  //                 >
  //                   {slot.dayOfWeek}
  //                 </h3>

  //                 <span
  //                   className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
  //                     selected
  //                       ? "bg-emerald-50 text-emerald-700"
  //                       : "bg-slate-100 text-slate-500"
  //                   }`}
  //                 >
  //                   {selected ? "Available" : "Off day"}
  //                 </span>
  //               </div>
  //             </div>
  //           </div>
  //         </div>

  //         <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
  //           <button
  //             type="button"
  //             onClick={() => setExpandedKey(k)}
  //             className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
  //           >
  //             <FiEdit2 className="h-3.5 w-3.5" />
  //             {/* Edit day */}
  //           </button>

  //           <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
  //             <span className="text-[11px] font-medium text-slate-500">
  //               {selected ? "On" : "Off"}
  //             </span>
  //             <Switch
  //               size="sm"
  //               isSelected={selected}
  //               isDisabled={togglingKey === k}
  //               onValueChange={(v) => handleToggleDay(slot, v)}
  //               aria-label={`${slot.dayOfWeek} availability`}
  //             />
  //           </div>
  //         </div>
  //       </div>

  //       {isExpanded && (
  //         <div className="border-t border-emerald-100 bg-slate-50/80 px-4 py-4 sm:px-5">
  //           <div className="mb-3">
  //             <h4 className="text-sm font-semibold text-slate-900">
  //               Edit {slot.dayOfWeek} time slots
  //             </h4>
  //             <p className="text-xs text-slate-500">
  //               Update availability for this day only.
  //             </p>
  //           </div>

  //           <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
  //             <WeeklySlotInlineEditor
  //               slot={slot}
  //               allAvailability={availability}
  //               allDateAvailability={dateAvailability}
  //               onSaved={refetch}
  //               onCancel={() => setExpandedKey(null)}
  //               hideHeader
  //             />
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  const openAddLeaveInline = () => {
    setSelectedDate(null);
    setShowLeavesEditor(true);
  };

  const openEditLeaveInline = (item: DateAvailabilityItem) => {
    setSelectedDate(item);
    setShowLeavesEditor(true);
  };

  const closeLeaveInline = () => {
    setShowLeavesEditor(false);
    setSelectedDate(null);
  };

  const leavesBusy = isLoading || isFetching;

  const tabBtn = (isActive: boolean) =>
    `relative flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-xs sm:text-sm font-semibold transition ${
      isActive
        ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
    }`;

  const iconStyle = (isActive: boolean) =>
    `h-4 w-4 transition ${
      isActive
        ? "brightness-0 saturate-100 invert-[35%] sepia-[90%] saturate-[600%] hue-rotate-[120deg] dark:brightness-0 dark:invert"
        : "dark:brightness-0 dark:invert dark:opacity-80"
    }`;

  return (
    <>
      <ProfilePageHeader
        icon={<FiClock className="h-4 w-4" />}
        title="Doctor Availability"
        description="Set weekly consulting hours and manage custom day changes."
        actions={
          isFetching ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 dark:border-[#334158] dark:bg-[#0f1728] dark:text-slate-200">
              <Spinner size="sm" />
              Refreshing
            </div>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="overflow-x-auto border-b border-slate-200 px-4 dark:border-[#27344a]">
        <div className="flex min-w-max items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => {
              setTab("weekly");
              closeLeaveInline();
            }}
            className={tabBtn(tab === "weekly")}
          >
            <img
              src={calendar}
              alt="Weekly"
              className={iconStyle(tab === "weekly")}
            />
            Weekly Time Slots
          </button>

          <button
            type="button"
            onClick={() => setTab("leaves")}
            className={tabBtn(tab === "leaves")}
          >
            <img
              src={Leave}
              alt="Leaves"
              className={iconStyle(tab === "leaves")}
            />
            Leaves & Custom Hours
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {" "}
        {/* WEEKLY */}
        {tab === "weekly" && (
          <>
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-primary/10 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:via-[#0f1728] dark:to-primary/100/10">
              <div className="flex flex-col gap-3 p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30">
                    <FiCheckCircle className="h-3 w-3" />
                    Bulk update available
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                    Edit all weekly time slots in one place
                  </h3>
                </div>

                <Button
                  className="h-10 w-full rounded-xl bg-primary px-3 text-xs sm:w-auto sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  // startContent={<FiEdit2 className="h-4 w-4" />}
                  endContent={<FiArrowRight className="h-4 w-4" />}
                  onPress={() => navigate("/profile/availability/edit-all")}
                >
                  Edit All Weekly Slots
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {isLoading && (
                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-[#334158] dark:bg-[#0f1728] dark:text-slate-200">
                  <Spinner size="sm" />
                  <span>Loading availability…</span>
                </div>
              )}

              {!isLoading && orderedAvailability.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-[#334158] dark:bg-[#0f1728] dark:text-slate-200">
                  No availability configured yet.
                </div>
              )}

              {!isLoading &&
                orderedAvailability.map((slot) => (
                  <DayRow
                    key={keyOf(slot)}
                    slot={slot}
                    expandedKey={expandedKey}
                    optimisticAvail={optimisticAvail}
                    togglingKey={togglingKey}
                    availability={availability}
                    dateAvailability={dateAvailability}
                    onExpand={(key) => setExpandedKey(key)}
                    onToggleDay={handleToggleDay}
                    onSaved={refetch}
                    onCancel={() => setExpandedKey(null)}
                  />
                ))}
            </div>
          </>
        )}
        {/* LEAVES */}
        {tab === "leaves" && (
          <div className="space-y-4">
            {leavesBusy && !showLeavesEditor && (
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-[#334158] dark:bg-[#0f1728] dark:text-slate-200">
                <Spinner size="sm" />
                <span>Loading leaves…</span>
              </div>
            )}

            {!showLeavesEditor && !leavesBusy && (
              <LeavesList
                items={orderedLeaves}
                deletingKey={deletingLeaveKey}
                onAdd={openAddLeaveInline}
                onEdit={openEditLeaveInline}
              />
            )}

            {showLeavesEditor && (
              <LeavesInlineEditor
                initialDateItem={selectedDate}
                allDateAvailability={dateAvailability}
                onCancel={closeLeaveInline}
                onSaved={async () => {
                  await refetch();
                  closeLeaveInline();
                }}
              />
            )}
          </div>
        )}
        {/* HISTORY */}
        {tab === "history" && (
          <LeaveHistoryList isLoading={isLoading} items={orderedLeaves} />
        )}
        {isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            Failed to load availability.
          </div>
        )}
      </div>
    </>
  );
};

export default ClinicAvailability;
