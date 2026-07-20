// src/pages/dashboard/CustomDateRangePicker.tsx
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Props = {
  startYmd: string;
  endYmd: string;
  onApply: (startYmd: string, endYmd: string) => void;
  onCancel: () => void;
};

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(ymd: string): Date {
  const [y, m, d] = (ymd || "").split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(day: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const t = day.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return t >= s && t <= e;
}

function isRangeStart(day: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const earlier = start.getTime() <= end.getTime() ? start : end;
  return isSameDay(day, earlier);
}

function isRangeEnd(day: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const later = start.getTime() >= end.getTime() ? start : end;
  return isSameDay(day, later);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type CalendarMonthProps = {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onDayClick: (d: Date) => void;
  hoverDate: Date | null;
  onDayHover: (d: Date | null) => void;
  selecting: boolean;
};

function CalendarMonth({ year, month, onPrev, onNext, rangeStart, rangeEnd, onDayClick, hoverDate, onDayHover, selecting }: CalendarMonthProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthName = new Date(year, month).toLocaleString("en-US", { month: "long", year: "numeric" });

  // Build weeks grid
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) currentWeek.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Effective end for hover preview
  const effectiveEnd = selecting && hoverDate ? hoverDate : rangeEnd;

  return (
    <div className="flex flex-col gap-2 w-[252px]">
      {/* Header: prev + month name + next */}
      <div className="flex items-center justify-between h-8">
        <button type="button" onClick={onPrev} className="h-8 w-8 rounded-lg border border-[#dce0e5] flex items-center justify-center hover:bg-slate-50 transition dark:border-[#273244] dark:hover:bg-[#151e31]">
          <FiChevronLeft className="h-4 w-4 text-[#14181f] dark:text-white" />
        </button>
        <span className="text-[14px] font-medium text-[#14181f] dark:text-white">{monthName}</span>
        <button type="button" onClick={onNext} className="h-8 w-8 rounded-lg border border-[#dce0e5] flex items-center justify-center hover:bg-slate-50 transition dark:border-[#273244] dark:hover:bg-[#151e31]">
          <FiChevronRight className="h-4 w-4 text-[#14181f] dark:text-white" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="flex items-center">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="flex-1 h-9 flex items-center justify-center text-[14px] text-[#677294] dark:text-slate-400">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex items-center">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="flex-1 h-9" />;
              }

              const inRange = isInRange(day, rangeStart, effectiveEnd);
              const isStart = isRangeStart(day, rangeStart, effectiveEnd);
              const isEnd = isRangeEnd(day, rangeStart, effectiveEnd);
              const isSingle = isStart && isEnd;

              let cellBg = "";
              let cellText = "text-[#14181f] dark:text-slate-200";
              let cellRounding = "rounded-lg";

              if (isSingle) {
                cellBg = "bg-[#0a6c74]";
                cellText = "text-white";
                cellRounding = "rounded-lg";
              } else if (isStart) {
                cellBg = "bg-[#0a6c74]";
                cellText = "text-white";
                cellRounding = "rounded-l-lg rounded-r-none";
              } else if (isEnd) {
                cellBg = "bg-[#0a6c74]";
                cellText = "text-white";
                cellRounding = "rounded-r-lg rounded-l-none";
              } else if (inRange) {
                cellBg = "bg-[#e8f6f4] dark:bg-[#1a3a35]";
                cellRounding = "rounded-none";
              }

              return (
                <div
                  key={di}
                  className={`flex-1 h-9 flex items-center justify-center cursor-pointer transition-colors ${cellBg} ${cellRounding}`}
                  onClick={() => onDayClick(day)}
                  onMouseEnter={() => onDayHover(day)}
                  onMouseLeave={() => onDayHover(null)}
                >
                  <span className={`text-[15px] font-medium ${cellText}`}>
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomDateRangePicker({ startYmd, endYmd, onApply, onCancel }: Props) {
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = parseYMD(startYmd);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [rightMonth, setRightMonth] = useState(() => {
    const d = parseYMD(startYmd);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });

  const [rangeStart, setRangeStart] = useState<Date | null>(() => parseYMD(startYmd));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => parseYMD(endYmd));
  const [selecting, setSelecting] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  const handleDayClick = (day: Date) => {
    if (!selecting) {
      setRangeStart(day);
      setRangeEnd(null);
      setSelecting(true);
    } else {
      setRangeEnd(day);
      setSelecting(false);
    }
  };

  const handleDone = () => {
    if (rangeStart && rangeEnd) {
      const s = rangeStart.getTime() <= rangeEnd.getTime() ? rangeStart : rangeEnd;
      const e = rangeStart.getTime() >= rangeEnd.getTime() ? rangeStart : rangeEnd;
      onApply(toYMD(s), toYMD(e));
    } else if (rangeStart) {
      onApply(toYMD(rangeStart), toYMD(rangeStart));
    }
  };

  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const anchorRef = useRef<HTMLSpanElement>(null);

  // Position the popover below the date tabs container
  const updatePosition = () => {
    if (anchorRef.current) {
      const parent = anchorRef.current.closest("[data-datepicker-anchor]") || anchorRef.current.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const popoverWidth = 548;
        let left = rect.left;
        if (left + popoverWidth > window.innerWidth - 16) {
          left = window.innerWidth - popoverWidth - 16;
        }
        if (left < 8) left = 8;
        setPopoverStyle({
          position: "fixed",
          top: rect.bottom + 4,
          left,
          zIndex: 9999,
        });
      }
    }
  };

  useEffect(() => {
    updatePosition();
    // Update position on scroll/resize
    const scrollContainer = anchorRef.current?.closest("[class*='overflow']");
    const handleUpdate = () => updatePosition();
    window.addEventListener("resize", handleUpdate);
    scrollContainer?.addEventListener("scroll", handleUpdate);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      scrollContainer?.removeEventListener("scroll", handleUpdate);
    };
  }, []);

  const popoverContent = (
    <div
      ref={popoverRef}
      className="bg-white border border-[rgba(47,174,142,0.1)] rounded-lg p-4 shadow-[0px_4px_6px_rgba(0,0,0,0.08)] flex flex-col gap-2 max-h-[85vh] overflow-y-auto dark:bg-[#111726] dark:border-[#273244] dark:shadow-none"
      style={popoverStyle}
    >
      {/* Two calendars side by side */}
      <div className="flex gap-4 items-start">
        <CalendarMonth
          year={leftMonth.year}
          month={leftMonth.month}
          onPrev={() => {
            const d = new Date(leftMonth.year, leftMonth.month - 1, 1);
            setLeftMonth({ year: d.getFullYear(), month: d.getMonth() });
          }}
          onNext={() => {
            const d = new Date(leftMonth.year, leftMonth.month + 1, 1);
            setLeftMonth({ year: d.getFullYear(), month: d.getMonth() });
            // Also advance right if needed
            if (d.getTime() >= new Date(rightMonth.year, rightMonth.month, 1).getTime()) {
              const r = new Date(d.getFullYear(), d.getMonth() + 1, 1);
              setRightMonth({ year: r.getFullYear(), month: r.getMonth() });
            }
          }}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onDayClick={handleDayClick}
          hoverDate={hoverDate}
          onDayHover={setHoverDate}
          selecting={selecting}
        />

        {/* Vertical divider */}
        <div className="w-px bg-[#dce0e5] self-stretch dark:bg-[#273244]" />

        <CalendarMonth
          year={rightMonth.year}
          month={rightMonth.month}
          onPrev={() => {
            const d = new Date(rightMonth.year, rightMonth.month - 1, 1);
            setRightMonth({ year: d.getFullYear(), month: d.getMonth() });
            // Also move left back if needed
            if (d.getTime() <= new Date(leftMonth.year, leftMonth.month, 1).getTime()) {
              const l = new Date(d.getFullYear(), d.getMonth() - 1, 1);
              setLeftMonth({ year: l.getFullYear(), month: l.getMonth() });
            }
          }}
          onNext={() => {
            const d = new Date(rightMonth.year, rightMonth.month + 1, 1);
            setRightMonth({ year: d.getFullYear(), month: d.getMonth() });
          }}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onDayClick={handleDayClick}
          hoverDate={hoverDate}
          onDayHover={setHoverDate}
          selecting={selecting}
        />
      </div>

      {/* Footer: Cancel + Done */}
      <div className="border-t border-[#dce0e5] pt-3 flex items-center justify-end gap-1.5 dark:border-[#273244]">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-lg border border-[#dce0e5] bg-white text-[15px] font-medium text-[#14181f] hover:bg-slate-50 transition dark:bg-[#111726] dark:border-[#273244] dark:text-white dark:hover:bg-[#151e31]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="h-8 px-3 rounded-lg bg-[#0a6c74] text-[15px] font-medium text-white hover:bg-[#085a61] transition"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} className="hidden" />
      {createPortal(popoverContent, document.body)}
    </>
  );
}
