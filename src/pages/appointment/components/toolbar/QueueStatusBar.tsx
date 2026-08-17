import React from "react";
import { FiX } from "react-icons/fi";
import type { QueueStatusBarProps } from "../../../../types/appointment";
import { formatDurationLabel } from "../../new-appointment/helpers/dateTimeHelpers";

// Real-time queue indicators — status bar style
const QueueStatusBar: React.FC<QueueStatusBarProps> = ({
  hasTimeToNextData,
  timeToNextMinutes,
  hasQueueData,
  queueCumulativeDelay,
  onDismiss,
}) => (
  <div className="flex items-center justify-between border-l-4 border-primary bg-surface-muted/50 py-2 pl-3 pr-2">
    <div className="flex min-w-0 flex-1 items-center gap-6">
      {hasTimeToNextData && (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Next</span>
            <span className="text-[14px] font-bold text-text">
              {timeToNextMinutes === 0
                ? "Now"
                : timeToNextMinutes != null
                  ? formatDurationLabel(timeToNextMinutes)
                  : "—"}
            </span>
          </div>
        </div>
      )}

      {hasQueueData && (
        <div className="flex items-center gap-2">
          <div className={[
            "flex h-6 w-6 items-center justify-center rounded",
            queueCumulativeDelay > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
          ].join(" ")}>
            {queueCumulativeDelay > 0 ? (
              <svg className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {queueCumulativeDelay > 0 ? "Delay" : "Status"}
            </span>
            <span className={[
              "text-[14px] font-bold",
              queueCumulativeDelay > 0 ? "text-orange-700 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-400"
            ].join(" ")}>
              {queueCumulativeDelay > 0 ? `+${formatDurationLabel(queueCumulativeDelay)}` : "On time"}
            </span>
          </div>
        </div>
      )}
    </div>

    <button
      type="button"
      onClick={onDismiss}
      className="ml-2 flex h-10 w-10 lg:h-6 lg:w-6 shrink-0 items-center justify-center text-text-subtle transition hover:text-text-muted"
      title="Dismiss"
      aria-label="Dismiss queue status"
    >
      <FiX size={13} />
    </button>
  </div>
);

export default QueueStatusBar;
