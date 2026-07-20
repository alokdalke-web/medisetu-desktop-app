import React from "react";
import { Switch } from "@heroui/react";

import type { DayRange } from "../types";

type CalendarCell = {
  iso: string;
  dayNum: number;
  isAllowed: boolean;
  isToday: boolean;
} | null;

type CalendarMonthSection = {
  monthKey: string;
  monthLabel: string;
  weeks: CalendarCell[][];
};

type AppointmentDateSectionProps = {
  dateFieldRef: React.RefObject<HTMLDivElement | null>;
  isTokenMode: boolean;
  showAllTokens: boolean;
  setShowAllTokens: React.Dispatch<React.SetStateAction<boolean>>;
  dayRange: DayRange;
  setDayRange: React.Dispatch<React.SetStateAction<DayRange>>;
  rangeEndLabel: string;
  rangeHintText: string;
  calendarMonthSections: CalendarMonthSection[];
  dateParam: string;
  handlePickPill: (iso: string) => void;
  children: React.ReactNode;
};

const AppointmentDateSection: React.FC<AppointmentDateSectionProps> = ({
  dateFieldRef,
  isTokenMode,
  showAllTokens,
  setShowAllTokens,
  dayRange,
  setDayRange,
  rangeEndLabel,
  rangeHintText,
  calendarMonthSections,
  dateParam,
  handlePickPill,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4 dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
          Date &amp; Time
        </h2>
        <div className="flex items-center gap-3">
          {isTokenMode && (
            <Switch
              size="sm"
              isSelected={!showAllTokens}
              onValueChange={(v) => setShowAllTokens(!v)}
              classNames={{
                base: "flex-row-reverse items-center gap-2",
                label: "text-[12px] font-medium text-slate-700 dark:text-slate-300",
              }}
            >
              Automatic Token Selection
            </Switch>
          )}
        </div>
      </div>

      {/* Date range info + selector */}
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-[#273244] dark:bg-[#0f1728] sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
          Booking window:{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">next {dayRange} days</span>
          {" "}(till <span className="font-semibold text-slate-700 dark:text-slate-200">{rangeEndLabel}</span>)
          {rangeHintText && <span className="ml-1 text-slate-400 dark:text-slate-500">&mdash; {rangeHintText}</span>}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {[7, 15, 30].map((n) => {
            const active = dayRange === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setDayRange(n as DayRange)}
                className={[
                  "rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary",
                  active
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 dark:border-[#273244] dark:bg-[#111726] dark:text-slate-300 dark:hover:border-primary/40",
                ].join(" ")}
              >
                {n}d
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Calendar (left) */}
        <div
          ref={dateFieldRef}
          className="min-w-0 rounded-xl border border-slate-100 bg-white p-3 sm:p-4 dark:border-[#273244] dark:bg-[#0f1728]"
        >
          <div className="flex items-center justify-between">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">
                Select Date
              </h3>
              <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap dark:text-slate-400">
                Next {dayRange} days
              </p>
            </div>
          </div>

          <div
            className={[
              "mt-0",
              dayRange === 30
                ? "max-h-[430px] overflow-y-auto overflow-x-hidden pr-1"
                : "",
            ].join(" ")}
          >
            {calendarMonthSections.map((month) => (
              <div key={month.monthKey} className="mb-5 last:mb-0 ">
                {/* Month title */}
                <div className="mb-2  text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  {month.monthLabel}
                </div>

                {/* Weekday header */}
                <div className="mb-1 grid grid-cols-7 gap-1.5 ">
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                    <div
                      key={`${month.monthKey}-${d}`}
                      className="h-7 flex items-center justify-center text-[11px] font-medium text-slate-400"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  {month.weeks.map((week, wi) => (
                    <div
                      key={`${month.monthKey}-w-${wi}`}
                      className="grid grid-cols-7 gap-1.5"
                    >
                      {week.map((cell, ci) => {
                        if (!cell) {
                          return (
                            <div
                              key={`${month.monthKey}-w-${wi}-c-${ci}`}
                              className="h-9 rounded-lg bg-slate-50/60 dark:bg-[#1a2b3c]/40"
                            />
                          );
                        }
                        const isActive = dateParam === cell.iso;

                        return (
                          <button
                            key={cell.iso}
                            type="button"
                            onClick={() => {
                              if (!cell.isAllowed) return;
                              handlePickPill(cell.iso);
                            }}
                            disabled={!cell.isAllowed}
                            className={[
                              "relative flex h-9 items-center justify-center rounded-lg transition",
                              cell.isAllowed
                                ? isActive
                                  ? "bg-teal-600 shadow-sm"
                                  : "bg-white hover:bg-slate-50 dark:bg-[#111726] dark:hover:bg-[#1a2b3c]"
                                : "bg-slate-50 text-slate-300 cursor-not-allowed dark:bg-[#111726] dark:text-slate-600",
                            ].join(" ")}
                            title={cell.iso}
                          >
                            <span
                              className={[
                                "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold",
                                isActive
                                  ? "text-white"
                                  : cell.isAllowed
                                    ? "text-slate-700 dark:text-slate-200"
                                    : "text-slate-300 dark:text-slate-600",
                              ].join(" ")}
                            >
                              {cell.dayNum}
                            </span>

                            {/* today dot */}
                            {cell.isToday && !isActive && cell.isAllowed && (
                              <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-teal-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
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
