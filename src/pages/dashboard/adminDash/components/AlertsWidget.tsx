import { FiCalendar } from "react-icons/fi";
import { LuBell } from "react-icons/lu";
import type { AlertsWidgetProps } from "../../../../types/adminDash";

/**
 * The widget's colour follows its state: an alarm-red panel is reserved for an
 * actual missed appointment. In the all-clear state the shell stays neutral, so
 * "no missed appointments" doesn't read as a warning.
 */
const AlertsWidget = ({ noShowCount, onViewNoShow }: AlertsWidgetProps) => {
  const hasAlerts = noShowCount > 0;

  return (
  <div
    className={`rounded-2xl p-4 flex flex-col gap-4 border ${
      hasAlerts
        ? "bg-[#fef0f0] border-[rgba(0,0,0,0.05)] dark:bg-[#221114] dark:border-[#5b1d22]"
        : "bg-surface border-line"
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`h-9 w-9 rounded-full flex items-center justify-center ${
          hasAlerts
            ? "bg-[#fecaca] dark:bg-[#3a171b]"
            : "bg-[#e6fbf7] dark:bg-[#16352f]"
        }`}
      >
        <LuBell
          className={`h-5 w-5 ${
            hasAlerts
              ? "text-[#e5484d] dark:text-[#ff9a9d]"
              : "text-primary dark:text-[#9be7dc]"
          }`}
        />
      </div>
      <span className="text-[16px] font-semibold text-text">
        Alerts
      </span>
    </div>
    <div className="flex flex-col gap-1">
      {hasAlerts && (
        <div
          role="button"
          tabIndex={0}
          onClick={onViewNoShow}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onViewNoShow?.();
            }
          }}
          aria-label={`View ${noShowCount} missed appointment${noShowCount > 1 ? "s" : ""}`}
          className="bg-surface border border-[rgba(207,207,207,0.2)] rounded-xl p-3 flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-[#5b1d22] dark:hover:bg-surface-muted"
        >
          <div className="h-9 w-9 rounded-full bg-[#fff7e6] flex items-center justify-center shrink-0 dark:bg-[#332716]">
            <FiCalendar className="h-4 w-4 text-[#e89b00]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13px] font-semibold text-text">
              {noShowCount} Missed Appointment{noShowCount > 1 ? "s" : ""}
            </span>
            <span className="text-[12px] font-medium text-text-muted">
              Today
            </span>
          </div>
        </div>
      )}
      {!hasAlerts && (
        <div className="bg-surface-muted border border-line rounded-xl p-3 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-[#dcfce7] flex items-center justify-center shrink-0 dark:bg-[#16352f]">
            <FiCalendar className="h-4 w-4 text-[#166534]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13px] font-semibold text-text">
              No missed appointments
            </span>
            <span className="text-[12px] font-medium text-text-muted">
              All patients showed up today
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default AlertsWidget;
