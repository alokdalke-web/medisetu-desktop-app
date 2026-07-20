/**
 * QueueStatusIcon.tsx
 *
 * A reusable icon component for the Est. Wait column in the appointment queue.
 * Shows contextual icons with tooltip on hover for all queue states.
 */

import React, { useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { formatDurationLabel } from "../../pages/appointment/new-appointment/helpers/dateTimeHelpers";

type QueueIconVariant =
  | "completed"
  | "in-progress"
  | "on-time"
  | "delayed"
  | "cancelled"
  | "no-data";

interface QueueStatusIconProps {
  variant: QueueIconVariant;
  /** Wait time in minutes (only for "delayed" variant) */
  waitMinutes?: number;
}

const CONFIG: Record<
  QueueIconVariant,
  {
    icon: React.ReactNode;
    tooltip: string;
    bg: string;
    hoverBg: string;
  }
> = {
  completed: {
    icon: <FiCheckCircle size={15} />,
    tooltip: "Completed",
    bg: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40",
  },
  "in-progress": {
    icon: (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
      </span>
    ),
    tooltip: "In consultation",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/40",
  },
  "on-time": {
    icon: <FiClock size={15} />,
    tooltip: "On time",
    bg: "text-teal-500 bg-teal-50 dark:bg-teal-900/20",
    hoverBg: "hover:bg-teal-100 dark:hover:bg-teal-900/40",
  },
  delayed: {
    icon: <FiAlertTriangle size={15} />,
    tooltip: "Delayed",
    bg: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    hoverBg: "hover:bg-amber-100 dark:hover:bg-amber-900/40",
  },
  cancelled: {
    icon: <FiXCircle size={15} />,
    tooltip: "Cancelled",
    bg: "text-slate-400 bg-slate-50 dark:bg-slate-800/40 dark:text-slate-500",
    hoverBg: "hover:bg-slate-100 dark:hover:bg-slate-700/40",
  },
  "no-data": {
    icon: <span className="text-[11px] font-medium text-slate-300 dark:text-slate-600">—</span>,
    tooltip: "No queue data",
    bg: "bg-transparent",
    hoverBg: "",
  },
};

const QueueStatusIcon: React.FC<QueueStatusIconProps> = ({
  variant,
  waitMinutes,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = CONFIG[variant];

  const tooltipText =
    variant === "delayed" && waitMinutes
      ? `~${formatDurationLabel(waitMinutes)} wait`
      : config.tooltip;

  // "delayed" variant shows the time badge instead of just an icon
  if (variant === "delayed" && waitMinutes) {
    return (
      <div
        className="relative inline-flex"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-150",
            config.bg,
            config.hoverBg,
          ].join(" ")}
        >
          <FiAlertTriangle size={12} />
          ~{formatDurationLabel(waitMinutes)}
        </span>

        {showTooltip && (
          <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-slate-200 dark:text-slate-800">
            {tooltipText}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-200" />
          </span>
        )}
      </div>
    );
  }

  // No data — just render the dash without hover effects
  if (variant === "no-data") {
    return <>{config.icon}</>;
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={[
          "grid h-8 w-8 place-items-center rounded-full transition-colors duration-150 cursor-default",
          config.bg,
          config.hoverBg,
        ].join(" ")}
      >
        {config.icon}
      </span>

      {showTooltip && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-slate-200 dark:text-slate-800">
          {tooltipText}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-200" />
        </span>
      )}
    </div>
  );
};

export default QueueStatusIcon;
