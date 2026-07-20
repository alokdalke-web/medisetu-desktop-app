
import { Select, SelectItem, Tooltip } from "@heroui/react";
import React, { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiMaximize2,
  FiMinimize2,
  FiUser
} from "react-icons/fi";

/* ---------------- Types ---------------- */

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  doctorName: string;
  doctorSpeciality?: string | null;
  doctorId?: string;

  avatarUrl?: string | null;
  patientMobile?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  appointmentNotes?: string | null;

  // ✅ optional fields for better UI
  appointmentType?: string | null;
  tokenNo?: number | null;
};

type Break = {
  breakType?: string | null;
  startTime: string;
  endTime: string;
  status?: boolean;
};

export type AvailabilitySlot = {
  date?: string;
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
  breaks?: Break[];
  aivblityBreak?: Break[];
  doctorId?: string;
};

export interface AppointmentCalendarViewProps {
  goPrevWeek: () => void;
  goNextWeek: () => void;

  goThisWeek?: () => void;
  currentWeekStart: Date;
  weekDays: Date[];

  hours: number[];
  minHour: number;
  slotHeight: number;

  eventsByDay: { date: string; items: CalEvent[] }[];
  currentTimeLine: { top: number; dayIdx: number } | null;

  handleSlotClick: (date: string, hour: number, minute: number) => void;
  handleDoctorSlotClick: (
    date: string,
    hour: number,
    minute: number,
    doctorId: string,
  ) => void;

  goToDetails: (id: string) => void;

  doctorAvailability?: AvailabilitySlot[];

  mode?: "week" | "day";
  onToggleMode?: (m: "week" | "day") => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;

  isAdminOrReception: boolean;
  doctors: { id: string; name: string; email?: string | null }[];
  selectedDoctorId?: string | null;
  onDoctorClick: (doctorId: string) => void;

  selectedDate: Date;
  onJumpToDate: (d: Date) => void;
  onTodayDay: () => void;

  // All events for day view (unfiltered by doctor)
  allEventsByDay?: { date: string; items: CalEvent[] }[];
}

/* ---------------- Helpers ---------------- */

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const formatDateLong = (d: Date) =>
  d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatTime12 = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatTimeShort = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const cap = (s?: string) => {
  const x = (s || "").trim();
  return x ? x.charAt(0).toUpperCase() + x.slice(1).toLowerCase() : "";
};

const formatPhone = (s?: string | null) => {
  if (!s) return "";
  const digits = String(s).replace(/\D/g, "");
  if (digits.length === 10)
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91"))
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return s;
};

type StatusKey =
  | "completed"
  | "cancelled"
  | "pending"
  | "confirmed"
  | "unknown";

const statusTokens = (statusRaw: string) => {
  const s = (statusRaw || "").trim().toLowerCase();

  let key: StatusKey = "unknown";
  if (["completed", "active", "done"].includes(s)) key = "completed";
  else if (["confirmed", "confirm"].includes(s)) key = "confirmed";
  else if (["pending", "new", "waiting"].includes(s)) key = "pending";
  else if (
    ["cancelled", "canceled", "inactive", "blocked", "expired"].includes(s)
  )
    key = "cancelled";

  const map: Record<StatusKey, { fg: string; bg: string }> = {
    completed: {
      fg: "rgb(14 165 233)", // sky-500
      bg: "rgb(240 249 255)", // sky-50
    },
    cancelled: {
      fg: "rgb(239 68 68)", // red-500
      bg: "rgb(254 242 242)", // red-50
    },
    pending: {
      fg: "rgb(249 115 22)", // orange-500
      bg: "rgb(255 247 237)", // orange-50
    },
    confirmed: {
      fg: "rgb(16 185 129)", // emerald-500
      bg: "rgb(236 253 245)", // emerald-50
    },
    unknown: {
      fg: "rgb(100 116 139)", // slate-500
      bg: "rgb(241 245 249)", // slate-100
    },
  };

  return map[key];
};

const statusVarStyle = (statusRaw: string) =>
  ({
    ["--st-fg" as any]: statusTokens(statusRaw).fg,
    ["--st-bg" as any]: statusTokens(statusRaw).bg,
  }) as React.CSSProperties;

const parseYmdLocal = (ymdStr: string) => {
  const [y, m, d] = (ymdStr || "").split("-").map(Number);
  if (!y || !m || !d) return new Date(ymdStr);
  return new Date(y, m - 1, d);
};

const getInitials = (name: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "U";
};

const parseTimeTo24h = (timeStr: string) => {
  if (!timeStr) return { h: 0, m: 0 };
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) {
    const [h, m] = timeStr.split(":").map(Number);
    return { h: h || 0, m: m || 0 };
  }
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return { h, m };
};

/* ---------------- Component ---------------- */

const AppointmentCalendarView: React.FC<AppointmentCalendarViewProps> = ({
  goPrevWeek,
  goNextWeek,
  currentWeekStart,
  weekDays,
  hours,
  minHour,
  slotHeight,
  eventsByDay,
  currentTimeLine,
  handleSlotClick,
  handleDoctorSlotClick,
  goToDetails,
  doctorAvailability = [],
  mode,
  onPrevDay,
  onNextDay,
  isAdminOrReception,
  doctors,
  selectedDoctorId,
  onDoctorClick,
  selectedDate,
  onToggleMode,
  allEventsByDay,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const todayYmd = useMemo(() => toYmd(new Date()), []);
  const selectedYmd = useMemo(() => toYmd(selectedDate), [selectedDate]);

  const activeMode: "week" | "day" = mode === "day" ? "day" : "week";

  const prevHandler =
    activeMode === "day" ? onPrevDay || goPrevWeek : goPrevWeek;
  const nextHandler =
    activeMode === "day" ? onNextDay || goNextWeek : goNextWeek;

  const prevTitle = activeMode === "day" ? "Previous Day" : "Previous Week";
  const nextTitle = activeMode === "day" ? "Next Day" : "Next Week";

  const IconSquareBtn: React.FC<{
    onClick?: () => void;
    title?: string;
    children: React.ReactNode;
  }> = ({ onClick, title, children }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "h-8 w-8 rounded-md border border-slate-200 bg-white",
        "grid place-items-center text-slate-700",
        "hover:bg-slate-50 active:scale-[0.98]",
      ].join(" ")}
    >
      {children}
    </button>
  );

  /* -------- Grid sizes (Figma-like) -------- */
  const BP_MD = { timeCol: 88, dayMin: 120 };
  const BP_SM = { timeCol: 76, dayMin: 110 };

  const slotCount = hours.length * 2; // 30-min slots
  const gridHeight = slotCount * slotHeight;

  const gridColsWeekMd = `${BP_MD.timeCol}px repeat(7, minmax(${BP_MD.dayMin}px, 1fr))`;
  const gridColsWeekSm = `${BP_SM.timeCol}px repeat(7, minmax(${BP_SM.dayMin}px, 1fr))`;

  const stripedOverlay =
    "bg-[repeating-linear-gradient(135deg,rgba(15,23,42,0.02)_0,rgba(15,23,42,0.02)_8px,transparent_8px,transparent_16px)]";

  const getRowBorder = (i: number) =>
    i % 2 === 0
      ? "border-b border-slate-200"
      : "border-b border-dashed border-slate-200";

  const hasAvailability = doctorAvailability.length > 0;

  const getUnavailableBlocks = (date: Date, doctorId?: string | null) => {
    if (!hasAvailability) return [];

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;

    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

    let avail = doctorAvailability.find((a) => {
      const dateMatch = a.date === dateStr;
      const dayMatch = a.dayOfWeek.toLowerCase() === dayName.toLowerCase();
      const isMatch = a.date ? dateMatch : dayMatch;
      if (doctorId) return isMatch && a.doctorId === doctorId;
      return isMatch;
    });

    if (!avail && doctorId) {
      avail = doctorAvailability.find((a) => {
        const dateMatch = a.date === dateStr;
        const dayMatch = a.dayOfWeek.toLowerCase() === dayName.toLowerCase();
        return a.date ? dateMatch : dayMatch;
      });
    }

    const blocks: { top: number; height: number; label: string; time?: string }[] = [];

    const timeToTop = (timeStr: string) => {
      const { h, m } = parseTimeTo24h(timeStr);
      const totalMins = (h - minHour) * 60 + m;
      return (totalMins / 30) * slotHeight;
    };

    const formatTimeLabel = (timeStr: string) => {
      const { h, m } = parseTimeTo24h(timeStr);
      const suffix = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 || 12;
      return `${displayH}:${String(m).padStart(2, "0")} ${suffix}`;
    };

    const isAfter = (t1: string, t2: string) => {
      const p1 = parseTimeTo24h(t1);
      const p2 = parseTimeTo24h(t2);
      return p1.h * 60 + p1.m > p2.h * 60 + p2.m;
    };

    const isBefore = (t1: string, t2: string) => {
      const p1 = parseTimeTo24h(t1);
      const p2 = parseTimeTo24h(t2);
      return p1.h * 60 + p1.m < p2.h * 60 + p2.m;
    };

    if (!avail || !avail.isAvailable) {
      blocks.push({ top: 0, height: gridHeight, label: "CLOSED" });
      return blocks;
    }

    const gridStartStr = `${String(minHour).padStart(2, "0")}:00`;
    if (avail.startTime && isAfter(avail.startTime, gridStartStr)) {
      const h = timeToTop(avail.startTime);
      if (h > 0) {
        blocks.push({
          top: 0,
          height: h,
          label: "CLOSED",
          time: `Until ${formatTimeLabel(avail.startTime)}`,
        });
      }
    }

    const gridEndStr = `${String(minHour + hours.length).padStart(2, "0")}:00`;
    if (avail.endTime && isBefore(avail.endTime, gridEndStr)) {
      const top = timeToTop(avail.endTime);
      const h = gridHeight - top;
      if (h > 0) {
        blocks.push({
          top,
          height: h,
          label: "CLOSED",
          time: `From ${formatTimeLabel(avail.endTime)}`,
        });
      }
    }

    const breaks = avail.breaks || avail.aivblityBreak || [];
    breaks.forEach((b) => {
      if (b.startTime && b.endTime) {
        const top = timeToTop(b.startTime);
        const endTop = timeToTop(b.endTime);
        const h = endTop - top;
        if (h > 0) {
          blocks.push({
            top,
            height: h,
            label: (b.breakType || "BREAK").toUpperCase(),
            time: `${formatTimeLabel(b.startTime)} - ${formatTimeLabel(b.endTime)}`,
          });
        }
      }
    });

    return blocks;
  };

  const onEmptySlotClick = (dateStr: string, h: number, m: number) => {
    if (isAdminOrReception && selectedDoctorId) {
      handleDoctorSlotClick(dateStr, h, m, selectedDoctorId);
    } else {
      handleSlotClick(dateStr, h, m);
    }
  };

  const currentTimeLineForDay = useMemo(() => {
    if (!currentTimeLine) return null;
    const actualDay = weekDays[currentTimeLine.dayIdx]
      ? toYmd(weekDays[currentTimeLine.dayIdx])
      : "";
    if (actualDay !== selectedYmd) return null;
    return { top: currentTimeLine.top, dayIdx: 0 };
  }, [currentTimeLine, weekDays, selectedYmd]);

  const mobileLabel = useMemo(() => {
    if (activeMode === "day") return formatDateLong(selectedDate);
    return `Week of ${formatDateLong(currentWeekStart)}`;
  }, [activeMode, selectedDate, currentWeekStart]);

  const getEventLayout = (ev: CalEvent, colMinStart: Date, colMaxEnd: Date) => {
    const viewStartMs = Math.max(ev.start.getTime(), colMinStart.getTime());
    const viewEndMs = Math.min(ev.end.getTime(), colMaxEnd.getTime());
    const durationMins = Math.max(0, (viewEndMs - viewStartMs) / 60000);

    const topMins = (viewStartMs - colMinStart.getTime()) / 60000;

    const topPx = Math.round((topMins / 30) * slotHeight);
    const heightPx = Math.round((durationMins / 30) * slotHeight);

    const insetTop = 3;
    const insetBottom = 3;

    return {
      top: Math.max(0, topPx + insetTop),
      height: Math.max(28, heightPx - (insetTop + insetBottom)),
    };
  };

  const EventBubble = ({
    ev,
    top,
    height,
    onClick,
  }: {
    ev: CalEvent;
    top: number;
    height: number;
    onClick: (e: React.MouseEvent) => void;
  }) => {
    const stVars = statusVarStyle(ev.status);

    return (
      <Tooltip
        placement="right"
        offset={8}
        showArrow
        className="bg-transparent shadow-none border-none p-0"
        content={
          <div
            onClick={onClick}
            className="w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 p-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 grid place-items-center">
                  {ev.avatarUrl ? (
                    <img
                      src={ev.avatarUrl}
                      alt={ev.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[12px] font-bold text-slate-700">
                      {getInitials(ev.title)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-slate-900">
                    {ev.title}
                  </p>
                  {ev.patientMobile ? (
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {formatPhone(ev.patientMobile)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 ring-1 ring-emerald-100 grid place-items-center text-emerald-700">
                  <FiUser className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-slate-900">
                    {ev.doctorName || "Doctor"}
                  </p>
                  <p className="text-[12px] font-medium text-emerald-600">
                    {ev.doctorSpeciality || ev.appointmentType || "Consultation"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <FiClock className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[13px] font-semibold text-slate-900">
                    {formatDateLong(ev.start)}
                  </p>
                  <p className="text-[13px] text-slate-500">
                    {ev.tokenNo != null
                      ? `Token ${ev.tokenNo}`
                      : `${formatTime12(ev.start)} - ${formatTime12(ev.end)}`}
                  </p>
                </div>
              </div>

              <span
                style={stVars}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold bg-[var(--st-bg)] text-[var(--st-fg)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--st-fg)]" />
                {cap(ev.status)}
              </span>
            </div>
          </div>
        }
      >
        <div
          className={[
            "absolute left-1.5 right-1.5 z-20",
            "rounded-md border shadow-sm cursor-pointer",
            "px-1.5 py-1",
            "bg-[var(--st-bg)] border-[var(--st-fg)]",
            "border-l-[3px]",
          ].join(" ")}
          style={{
            ...stVars,
            top: `${top}px`,
            height: `${height}px`,
          }}
          onClick={onClick}
        >
          <div className="flex items-start gap-1.5 h-full">
            <div
              className=" h-8 w-8 rounded-full overflow-hidden bg-white ring-1 ring-[var(--st-fg)] grid place-items-center shrink-0"
              style={stVars}
            >
              {ev.avatarUrl ? (
                <img
                  src={ev.avatarUrl}
                  alt={ev.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold text-slate-700 leading-none">
                  {getInitials(ev.title)}
                </span>
              )}
            </div>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-[12px] font-semibold text-slate-900">
                {ev.title}
              </p>
              <p className="truncate text-[10px] font-semibold text-[var(--st-fg)]">
                {ev.tokenNo != null
                  ? `Token ${ev.tokenNo}`
                  : `${formatTimeShort(ev.start)} - ${formatTimeShort(ev.end)}`}
              </p>
            </div>
          </div>
        </div>
      </Tooltip>
    );
  };

  const TimeColumn = () => {
    return (
      <div className="border-r border-slate-200 bg-white sticky left-0 z-20">
        {Array.from({ length: slotCount }).map((_, i) => {
          const h = minHour + Math.floor(i / 2);
          const m = (i % 2) * 30;
          const tmp = new Date();
          tmp.setHours(h, m, 0, 0);

          const label = tmp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={i}
              className={[getRowBorder(i), "bg-white"].join(" ")}
              style={{ height: `${slotHeight}px` }}
            >
              <div className="h-full flex items-start justify-end pr-2 pt-1">
                <span className="text-[12px] font-medium text-slate-600">
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const DayColumn = ({
    dateKey,
    items,
    highlight,
    timelineTop,
    doctorIdForSlot,
  }: {
    dateKey: string;
    dayIdx?: number;
    items: CalEvent[];
    highlight: boolean;
    timelineTop?: number | null;
    doctorIdForSlot?: string;
  }) => {
    const dayDate = parseYmdLocal(dateKey);

    const colMinStart = parseYmdLocal(dateKey);
    colMinStart.setHours(minHour, 0, 0, 0);

    const colMaxEnd = new Date(colMinStart);
    colMaxEnd.setMinutes(colMaxEnd.getMinutes() + hours.length * 60);

    const blocked = getUnavailableBlocks(dayDate, doctorIdForSlot || selectedDoctorId);

    const hasEventInSlot = (slotStart: Date, slotEnd: Date) => {
      return (items || []).some((ev) => ev.start < slotEnd && ev.end > slotStart);
    };

    return (
      <div
        className={[
          "border-r border-slate-200 last:border-r-0 relative",
          highlight ? "bg-blue-50/30" : "bg-white",
        ].join(" ")}
      >
        <div className="relative" style={{ height: `${gridHeight}px` }}>
          {/* CLOSED / BREAK blocks */}
          {blocked.map((block, i) => (
            <div
              key={i}
              className={[
                "absolute left-0 right-0 z-10",
                "flex flex-col items-center justify-center text-center",
                "border-y border-slate-200/70 text-slate-600",
                stripedOverlay,
              ].join(" ")}
              style={{
                top: `${block.top}px`,
                height: `${block.height}px`,
              }}
            >
              <div className="text-[12px] font-bold tracking-wider">
                {block.label}
              </div>
              {block.time && (
                <div className="text-[10px] text-slate-500 font-medium">
                  {block.time}
                </div>
              )}
            </div>
          ))}

          {/* Slot backgrounds + click area */}
          {Array.from({ length: slotCount }).map((_, i) => {
            const h = minHour + Math.floor(i / 2);
            const m = (i % 2) * 30;

            const slotDate = new Date(dayDate);
            slotDate.setHours(h, m, 0, 0);

            const slotEnd = new Date(slotDate);
            slotEnd.setMinutes(slotEnd.getMinutes() + 30);

            const isPast = slotDate < new Date();
            const emptyLabel = isPast ? "Expired" : "No Appointment";

            const top = (((h - minHour) * 60 + m) / 30) * slotHeight;
            const isUnavailable = blocked.some(
              (b) => top >= b.top && top < b.top + b.height,
            );
            const isBusy = hasEventInSlot(slotDate, slotEnd);

            return (
              <div
                key={i}
                className={[
                  getRowBorder(i),
                  "relative",
                  isPast ? "bg-white/60" : "bg-white hover:bg-blue-50/30",
                ].join(" ")}
                style={{ height: `${slotHeight}px` }}
                onClick={() => {
                  if (isPast || isUnavailable) return;
                  if (doctorIdForSlot) {
                    handleDoctorSlotClick(dateKey, h, m, doctorIdForSlot);
                  } else {
                    onEmptySlotClick(dateKey, h, m);
                  }
                }}
              >
                {!isUnavailable && !isBusy && (
                  <span
                    className={[
                      "pointer-events-none absolute inset-0 flex items-center justify-center select-none",
                      "text-[12px] font-medium",
                      isPast ? "text-slate-300" : "text-slate-400",
                    ].join(" ")}
                  >
                    {emptyLabel}
                  </span>
                )}
              </div>
            );
          })}

          {/* Current time line */}
          {typeof timelineTop === "number" && (
            <div
              className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
              style={{ top: `${timelineTop}px` }}
            >
              <div className="h-2 w-2 rounded-full bg-red-500 -ml-1 shadow-sm" />
              <div className="h-[2px] flex-1 bg-red-500 shadow-sm" />
            </div>
          )}

          {/* Events */}
          {[...items]
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map((ev) => {
              const { top, height } = getEventLayout(ev, colMinStart, colMaxEnd);
              if (height <= 0) return null;

              return (
                <EventBubble
                  key={ev.id}
                  ev={ev}
                  top={top}
                  height={height}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToDetails(ev.id);
                  }}
                />
              );
            })}
        </div>
      </div>
    );
  };

  const WeekHeader = ({ bp }: { bp: "md" | "sm" }) => {
    const tpl = bp === "md" ? gridColsWeekMd : gridColsWeekSm;

    return (
      <div
        className="grid border-b border-slate-200 sticky top-0 z-30 bg-white shadow-sm pt-1"
        style={{ gridTemplateColumns: tpl }}
      >
        <div className="border-r border-slate-200 bg-white" />

        {weekDays.map((d) => {
          const ymd = toYmd(d);
          const isToday = ymd === todayYmd;

          const dayText = d.toLocaleDateString(undefined, { weekday: "short" });
          const dateText = d.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
          });

          return (
            <div
              key={d.toISOString()}
              className={[
                "border-r border-slate-200 last:border-r-0 px-2 py-1.5 text-center",
                isToday ? "bg-blue-50/70" : "bg-slate-50/60",
              ].join(" ")}
            >
              <p
                className={[
                  "text-[12px] font-semibold leading-4",
                  isToday ? "text-blue-600" : "text-slate-700",
                ].join(" ")}
              >
                {dayText}
              </p>

              <p
                className={[
                  "text-[10px] font-medium leading-4",
                  isToday ? "text-blue-600" : "text-slate-500",
                ].join(" ")}
              >
                {dateText}
                {isToday ? " (Today)" : ""}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const WeekGrid = ({ bp }: { bp: "md" | "sm" }) => {
    const tpl = bp === "md" ? gridColsWeekMd : gridColsWeekSm;

    return (
      <>
        <WeekHeader bp={bp} />
        <div className="grid relative -mt-1" style={{ gridTemplateColumns: tpl, contain: 'layout' }}>
          <TimeColumn />
          {eventsByDay.map((col, dayIdx) => {
            const isToday = col.date === todayYmd;
            const tl =
              currentTimeLine && currentTimeLine.dayIdx === dayIdx
                ? currentTimeLine.top
                : null;

            return (
              <DayColumn
                key={col.date}
                dateKey={col.date}
                dayIdx={dayIdx}
                items={col.items || []}
                highlight={isToday}
                timelineTop={tl ?? undefined}
              />
            );
          })}
        </div>
      </>
    );
  };

  // Day view showing all doctors as columns
  const AllDoctorsDayGrid = ({ bp }: { bp: "md" | "sm" }) => {
    const doctorColWidth = bp === "md" ? 140 : 100;
    const timeColWidth = bp === "md" ? BP_MD.timeCol : BP_SM.timeCol;
    const doctorCount = doctors.length || 1;
    const tpl = `${timeColWidth}px repeat(${doctorCount}, minmax(${doctorColWidth}px, 1fr))`;

    // Get all events for the selected day
    const allDayCol = useMemo(() => {
      const found = allEventsByDay?.find((c) => c.date === selectedYmd);
      return found || { date: selectedYmd, items: [] as CalEvent[] };
    }, [allEventsByDay, selectedYmd]);

    // Group events by doctor
    const eventsByDoctor = useMemo(() => {
      const map = new Map<string, CalEvent[]>();
      doctors.forEach((doc) => map.set(doc.id, []));
      // Also track events for doctors not in the list
      const unassigned: CalEvent[] = [];

      allDayCol.items.forEach((ev) => {
        if (ev.doctorId && map.has(ev.doctorId)) {
          map.get(ev.doctorId)!.push(ev);
        } else if (ev.doctorId) {
          // Doctor exists but not in our doctors list - add them
          if (!map.has(ev.doctorId)) {
            map.set(ev.doctorId, [ev]);
          } else {
            map.get(ev.doctorId)!.push(ev);
          }
        } else {
          unassigned.push(ev);
        }
      });

      return map;
    }, [allDayCol.items, doctors]);

    return (
      <>
        {/* Header with doctor names - STICKY */}
        <div
          className="grid border-b border-slate-200 sticky top-0 z-30 bg-white shadow-sm pt-1"
          style={{ gridTemplateColumns: tpl }}
        >
          <div className="border-r border-slate-200 bg-white" />
          {doctors.map((doc) => {
            const isToday = selectedYmd === todayYmd;
            return (
              <div
                key={doc.id}
                className={[
                  "border-r border-slate-200 last:border-r-0 px-2 py-2 text-center",
                  isToday ? "bg-blue-50/70" : "bg-slate-50/60",
                ].join(" ")}
              >
                <p className="text-[11px] font-semibold text-slate-700 truncate">
                  {doc.name}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid body with time column and doctor columns */}
        <div className="grid relative -mt-1" style={{ gridTemplateColumns: tpl, contain: 'layout' }}>
          <TimeColumn />
          {doctors.map((doc) => {
            const docEvents = eventsByDoctor.get(doc.id) || [];
            const isToday = selectedYmd === todayYmd;

            return (
              <DayColumn
                key={doc.id}
                dateKey={selectedYmd}
                dayIdx={0}
                items={docEvents}
                highlight={isToday}
                timelineTop={currentTimeLineForDay?.top}
                doctorIdForSlot={doc.id}
              />
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div
      className={[
        "rounded-xl bg-white shadow-sm overflow-hidden border border-slate-200",
        isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : "",
      ].join(" ")}
    >
      {/* Header (Desktop) */}
      <div className="hidden md:flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <IconSquareBtn onClick={prevHandler} title={prevTitle}>
            <FiChevronLeft className="h-4 w-4" />
          </IconSquareBtn>
          <IconSquareBtn onClick={nextHandler} title={nextTitle}>
            <FiChevronRight className="h-4 w-4" />
          </IconSquareBtn>
          {/* 
          {activeMode === "week" ? (
            <button
              type="button"
              onClick={() => goThisWeek?.()}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              This week
            </button>
          ) : (
            <button
              type="button"
              onClick={onTodayDay}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Today
            </button>
          )} */}

          {onToggleMode && (
            <div className="ml-2 flex items-center rounded-md border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => onToggleMode("week")}
                className={`h-7 px-2 rounded text-[11px] font-semibold ${activeMode === "week"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => onToggleMode("day")}
                className={`h-7 px-2 rounded text-[11px] font-semibold ${activeMode === "day"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                Day
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Doctor dropdown only shown in week mode */}
          {isAdminOrReception && doctors.length > 0 && activeMode === "week" && (
            <div className="w-[170px]">
              <Select
                aria-label="Select Doctor"
                placeholder="Select doctor"
                selectedKeys={new Set(selectedDoctorId ? [selectedDoctorId] : [])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  if (key) onDoctorClick(key);
                }}
                size="sm"
                classNames={{
                  trigger:
                    "bg-white border border-slate-200 shadow-none min-h-[32px] h-8 rounded-md",
                  value: "text-xs text-slate-700",
                }}
              >
                {doctors.map((doc) => (
                  <SelectItem key={doc.id} textValue={doc.name}>
                    {doc.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          <IconSquareBtn
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <FiMinimize2 className="h-4 w-4" />
            ) : (
              <FiMaximize2 className="h-4 w-4" />
            )}
          </IconSquareBtn>
        </div>
      </div>

      {/* Header (Mobile) */}
      <div className="md:hidden border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconSquareBtn onClick={prevHandler} title={prevTitle}>
              <FiChevronLeft className="h-4 w-4" />
            </IconSquareBtn>
            <IconSquareBtn onClick={nextHandler} title={nextTitle}>
              <FiChevronRight className="h-4 w-4" />
            </IconSquareBtn>
          </div>

          <IconSquareBtn
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <FiMinimize2 className="h-4 w-4" />
            ) : (
              <FiMaximize2 className="h-4 w-4" />
            )}
          </IconSquareBtn>
        </div>

        <div className="mt-2">
          <p className="truncate text-[12px] font-semibold text-slate-900">
            {mobileLabel}
          </p>
        </div>

        {/* Doctor dropdown only shown in week mode */}
        {isAdminOrReception && doctors.length > 0 && activeMode === "week" && (
          <div className="mt-2">
            <Select
              aria-label="Select Doctor"
              placeholder="Select doctor"
              selectedKeys={new Set(selectedDoctorId ? [selectedDoctorId] : [])}
              onSelectionChange={(keys) => {
                const key = Array.from(keys as Set<string>)[0];
                if (key) onDoctorClick(key);
              }}
              size="sm"
              classNames={{
                trigger:
                  "bg-white border border-slate-200 shadow-none min-h-[36px] h-9 rounded-lg",
                value: "text-sm text-slate-700",
              }}
            >
              {doctors.map((doc) => (
                <SelectItem key={doc.id} textValue={doc.name}>
                  {doc.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={[
          "overflow-x-auto overflow-y-auto bg-white relative",
          isFullscreen ? "h-[calc(100vh-44px)]" : "h-[70vh] md:h-[76vh]",
        ].join(" ")}
      >
        {activeMode === "week" && (
          <>
            <div className="hidden md:block">
              <div className="min-w-[980px]">
                <WeekGrid bp="md" />
              </div>
            </div>

            <div className="md:hidden">
              <div className="min-w-[860px]">
                <WeekGrid bp="sm" />
              </div>
            </div>
          </>
        )}

        {activeMode === "day" && (
          <>
            <div className="hidden md:block">
              <div className="min-w-[720px]">
                <AllDoctorsDayGrid bp="md" />
              </div>
            </div>

            <div className="md:hidden">
              <div className="min-w-[520px]">
                <AllDoctorsDayGrid bp="sm" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AppointmentCalendarView;
