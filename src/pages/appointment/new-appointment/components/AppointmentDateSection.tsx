import React from "react";
import { Switch, Select, SelectItem } from "@heroui/react";
import { FiEdit3 } from "react-icons/fi";

import type { DayRange } from "../types";
import type {
  AppointmentDateSectionProps,
  CalendarCell,
} from "../../../../types/appointment";

const AppointmentDateSection: React.FC<AppointmentDateSectionProps> = ({
  dateFieldRef,
  isTokenMode,
  showAllTokens,
  setShowAllTokens,
  dayRange,
  setDayRange,
  rangeEndLabel,
  calendarMonthSections,
  dateParam,
  handlePickPill,
  onOpenCustomSlot,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4 dark:shadow-none">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[15px] font-bold text-text">
          Date &amp; Time
        </h2>
        <div className="flex items-center gap-3">
          {onOpenCustomSlot && (
            <button
              type="button"
              onClick={onOpenCustomSlot}
              className="cursor-pointer inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12px] font-semibold text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
            >
              <FiEdit3 className="h-3.5 w-3.5" />
              Custom Slot
            </button>
          )}

          {isTokenMode && (
            <Switch
              size="sm"
              isSelected={!showAllTokens}
              onValueChange={(v) => setShowAllTokens(!v)}
              classNames={{
                base: "flex-row-reverse items-center gap-2",
                label: "text-[12px] font-medium text-text",
              }}
            >
              Automatic Token Selection
            </Switch>
          )}
        </div>
      </div>

      {/* Date range info + selector */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 dark:bg-[#0f1728]">
        <p className="min-w-0 flex-1 truncate text-[12px] text-text-muted">
          Booking windows: <span className="font-semibold text-text">{dayRange}d</span>
          <span className="text-text-subtle"> · till {rangeEndLabel}</span>
        </p>
        <Select
          aria-label="Select booking range"
          size="sm"
          variant="flat"
          radius="lg"
          selectedKeys={new Set([String(dayRange)])}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val !== undefined) setDayRange(Number(val) as DayRange);
          }}
          disallowEmptySelection
          classNames={{
            base: "w-[110px] shrink-0",
            trigger:
              "cursor-pointer !h-8 !min-h-8 !rounded-lg border border-line bg-surface px-2.5 shadow-sm " +
              "data-[hover=true]:border-primary/40 data-[focus=true]:border-primary",
            value: "text-[12px] font-semibold text-text",
            listboxWrapper: "max-h-64",
            popoverContent: "rounded-xl border border-line shadow-xl dark:bg-[#111726]",
            selectorIcon: "text-text-muted",
          }}
        >
          {[7, 15, 30].map((n) => (
            <SelectItem key={String(n)} textValue={`${n} Days`}>
              <span className="text-[13px] font-medium text-text">{n} Days</span>
            </SelectItem>
          ))}
        </Select>
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Calendar (left) */}
        <div
          ref={dateFieldRef}
          className="min-w-0 rounded-xl border border-line bg-surface p-3 sm:p-4"
        >
          <div className="flex items-center justify-between">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-text">
                Select Date
              </h3>
              <p className="text-[11px] font-medium text-text-muted whitespace-nowrap">
                Next {dayRange} days
              </p>
            </div>
          </div>

          {/* Compact horizontal strip of only bookable dates — used whenever calendar and
              slots are stacked in a single column (below `lg`, matching the breakpoint
              where the two-column layout kicks in below), not just on phone-width screens.
              The full month grid below is reserved for when there's room for two columns. */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-on-hover lg:hidden" role="listbox" aria-label="Select date">
            {calendarMonthSections
              .flatMap((month) => month.weeks.flatMap((week) => week))
              .filter((cell): cell is NonNullable<CalendarCell> => !!cell && cell.isAllowed)
              .map((cell) => {
                const isActive = dateParam === cell.iso;
                const weekday = new Date(`${cell.iso}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                });
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    role="option"
                    onClick={() => handlePickPill(cell.iso)}
                    aria-selected={isActive}
                    aria-label={cell.iso}
                    className={[
                      "flex min-w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 transition",
                      isActive
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-line bg-surface text-text hover:border-primary/30 hover:bg-primary/5",
                    ].join(" ")}
                  >
                    <span className={["text-[10px] font-medium uppercase", isActive ? "text-white/80" : "text-text-muted"].join(" ")}>
                      {weekday}
                    </span>
                    <span className="text-[15px] font-bold leading-none">{cell.dayNum}</span>
                    {cell.isToday && !isActive && (
                      <span className="h-1 w-1 rounded-full bg-teal-600" />
                    )}
                  </button>
                );
              })}
          </div>

          <div
            className={[
              "mt-0 hidden lg:block",
              dayRange === 30
                ? "max-h-[430px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-on-hover"
                : "",
            ].join(" ")}
          >
            {calendarMonthSections.map((month) => (
              <div key={month.monthKey} className="mb-5 last:mb-0 ">
                {/* Month title + weekday header — sticky so it stays visible while
                    scrolling a long (30-day) range instead of scrolling out of view */}
                <div className="sticky top-0 z-10 -mx-1 bg-surface px-1 pb-1 pt-0.5">
                  <div className="mb-2 text-[13px] font-semibold text-text">
                    {month.monthLabel}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                      <div
                        key={`${month.monthKey}-${d}`}
                        className="h-7 flex items-center justify-center text-[11px] font-medium text-text-muted"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  {month.weeks.map((week, wi) => {
                    // A week with no bookable date in it at all (e.g. entirely before
                    // today, or entirely past the end of the booking window) adds a
                    // full blank row for nothing — skip rendering it.
                    const hasAnyBookableDate = week.some((cell) => cell?.isAllowed);
                    if (!hasAnyBookableDate) return null;

                    return (
                      <div
                        key={`${month.monthKey}-w-${wi}`}
                        className="grid grid-cols-7 gap-1.5"
                      >
                        {week.map((cell, ci) => {
                          // Blank padding cell (month doesn't start/end on Monday) and
                          // out-of-range dates render the same way — neither is clickable,
                          // so neither should draw attention with a visible number.
                          if (!cell || !cell.isAllowed) {
                            return (
                              <div
                                key={cell?.iso ?? `${month.monthKey}-w-${wi}-c-${ci}`}
                                className="h-9 rounded-lg bg-slate-50/60 dark:bg-[#1a2b3c]/40"
                                title={cell ? "Outside the selected booking window" : undefined}
                              />
                            );
                          }
                          const isActive = dateParam === cell.iso;

                          return (
                            <button
                              key={cell.iso}
                              type="button"
                              onClick={() => handlePickPill(cell.iso)}
                              className={[
                                "relative flex h-9 items-center justify-center rounded-lg border border-transparent transition-all duration-150",
                                isActive
                                  ? "bg-teal-600 shadow-sm"
                                  : "bg-surface hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm dark:hover:bg-[#1a2b3c]",
                              ].join(" ")}
                              title={cell.iso}
                              aria-pressed={isActive}
                              aria-label={cell.iso}
                            >
                              <span
                                className={[
                                  "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold",
                                  isActive ? "text-white" : "text-text",
                                ].join(" ")}
                              >
                                {cell.dayNum}
                              </span>

                              {/* today dot */}
                              {cell.isToday && !isActive && (
                                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-teal-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
};

export default AppointmentDateSection;
