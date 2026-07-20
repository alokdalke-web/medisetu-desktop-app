/**
 * TimeToNextWidget.tsx
 *
 * Displays contextual information about the next patient:
 * - timeToNextMinutes > 0  → "Next patient in ~X min"
 * - timeToNextMinutes === 0 → "Next patient ready" (overdue or doctor free)
 * - timeToNextMinutes === null → "No more appointments today"
 */

import React from "react";
import { FiClock, FiCheckCircle, FiSunset } from "react-icons/fi";
import { formatDurationLabel } from "../../pages/appointment/new-appointment/helpers/dateTimeHelpers";

interface TimeToNextWidgetProps {
  timeToNextMinutes: number | null;
  hasData: boolean;
}

const TimeToNextWidget: React.FC<TimeToNextWidgetProps> = ({
  timeToNextMinutes,
  hasData,
}) => {
  if (!hasData) return null;

  // Case: No more appointments today
  if (timeToNextMinutes === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <FiSunset size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Next Patient
          </p>
          <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">
            Done for today
          </p>
        </div>
      </div>
    );
  }

  // Case: Patient ready (0 min = overdue or doctor is free)
  if (timeToNextMinutes === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-900/20">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
          <FiCheckCircle size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            Next Patient
          </p>
          <p className="text-[14px] font-bold text-emerald-700 dark:text-emerald-300">
            Ready now
          </p>
        </div>
      </div>
    );
  }

  // Case: Normal countdown
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
        <FiClock size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
          Next Patient
        </p>
        <p className="text-[15px] font-bold text-slate-900 dark:text-white">
          in ~{formatDurationLabel(timeToNextMinutes)}
        </p>
      </div>
    </div>
  );
};

export default TimeToNextWidget;
