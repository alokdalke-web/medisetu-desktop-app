import React from "react";
import { FiClock } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicWorkingHoursProps } from "../../../types/profile/clinicDetailsSections";

const ClinicWorkingHours: React.FC<ClinicWorkingHoursProps> = ({
  workingHours,
}) => {
  if (!workingHours || workingHours.week.length === 0) return null;

  // Matches the backend's weekday naming (en-US long form).
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const todayIntervals = workingHours.today?.intervals ?? [];
  const todaySummary =
    todayIntervals.length > 0
      ? `Today ${todayIntervals
          .map((i) => `${i.startTime} – ${i.endTime}`)
          .join(", ")}`
      : "Closed today";

  return (
    <SectionCard
      title="Working Hours"
      description={todaySummary}
      icon={<FiClock className="h-4 w-4" />}
      action={
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            workingHours.isOpenNow
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              workingHours.isOpenNow ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {workingHours.isOpenNow ? "Open now" : "Closed now"}
        </span>
      }
    >
      <ul className="space-y-1">
        {workingHours.week.map((day) => {
          const isToday = day.dayOfWeek === todayName;
          return (
            <li
              key={day.dayOfWeek}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] ${
                isToday ? "bg-primary/5 ring-1 ring-primary/20" : ""
              }`}
            >
              <span className="flex items-center gap-2 whitespace-nowrap font-medium text-text">
                {day.dayOfWeek}
                {isToday && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Today
                  </span>
                )}
              </span>
              {day.intervals.length > 0 ? (
                <span className="flex flex-col items-end gap-0.5 text-right tabular-nums text-text-muted">
                  {day.intervals.map((interval) => (
                    <span
                      key={`${interval.startTime}-${interval.endTime}`}
                      className="whitespace-nowrap"
                    >
                      {interval.startTime} – {interval.endTime}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="whitespace-nowrap text-text-subtle">
                  Closed
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
};

export default ClinicWorkingHours;
