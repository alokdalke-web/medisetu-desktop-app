import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { VisitingDayCalendarProps } from "../../../types/prescription";
import { CALENDAR_DAY_LABELS } from "./constants";
import { addMonths, startOfDay, startOfMonth, toDateKey } from "./helpers";

/**
 * Inline month picker for visiting days.
 *
 * Replaces a centre modal that opened *on top of* the clinical-details drawer —
 * a second stacked overlay for picking a date. Worse, it closed on every pick,
 * so recording three visiting days meant three open/pick/close cycles. Inline
 * and multi-select, choosing several dates is now three clicks total and the
 * doctor never loses sight of the rest of the section.
 */
const VisitingDayCalendar: React.FC<VisitingDayCalendarProps> = ({
  isLocked,
  visitingDays,
  addVisitingDay,
  removeVisitingDay,
}) => {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const days = React.useMemo(() => {
    const firstDay = startOfMonth(month);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [month]);

  // A past month holds nothing selectable, so stepping into one is a dead end.
  const canGoBack = startOfMonth(month) > startOfMonth(today);

  return (
    <div className="rounded-xl border border-line bg-surface p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((prev) => addMonths(prev, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-surface-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-40 lg:h-8 lg:w-8"
        >
          <FiChevronLeft size={16} />
        </button>

        <div aria-live="polite" className="text-[13px] font-semibold text-text">
          {month.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </div>

        <button
          type="button"
          onClick={() => setMonth((prev) => addMonths(prev, 1))}
          aria-label="Next month"
          className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-surface-muted hover:text-text lg:h-8 lg:w-8"
        >
          <FiChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {CALENDAR_DAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-text-subtle"
          >
            {label.slice(0, 1)}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = toDateKey(day);
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const isPast = startOfDay(day) < today;
          const isToday = startOfDay(day).getTime() === today.getTime();
          const isSelected = visitingDays.includes(dateKey);
          const isDisabled = isLocked || isPast || !isCurrentMonth;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              onClick={() => {
                if (isDisabled) return;
                // Toggling in place: picking a wrong date used to mean closing
                // the modal and hunting for the chip to remove it.
                if (isSelected) removeVisitingDay(dateKey);
                else addVisitingDay(dateKey);
              }}
              className={[
                "grid h-8 place-items-center rounded-lg text-[12px] font-medium transition",
                !isCurrentMonth || isPast
                  ? "cursor-not-allowed text-text-subtle/50"
                  : isSelected
                    ? "bg-primary font-semibold text-white"
                    : "text-text hover:bg-primary/10 hover:text-primary",
                isToday && !isSelected
                  ? "ring-1 ring-inset ring-primary/40"
                  : "",
              ].join(" ")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VisitingDayCalendar;
