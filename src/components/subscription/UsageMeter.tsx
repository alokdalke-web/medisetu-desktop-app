import type { ReactNode } from "react";

export interface UsageStat {
  key: string;
  icon: ReactNode;
  label: string;
  /** Main display value, e.g. "1 / 1", "456 MB / 500 MB", "Last 3 Months". */
  value: string;
  status?: "reached" | "limited" | "ok";
  statusLabel?: string;
  /** When set (0–100), renders a progress bar instead of a status label. */
  progress?: number;
  progressLabel?: string;
}

const statusColor: Record<NonNullable<UsageStat["status"]>, string> = {
  reached: "text-danger-500",
  limited: "text-warning-500",
  ok: "text-success-600",
};

const UsageMeter = ({ stat }: { stat: UsageStat }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-default-500">
        <span className="text-base">{stat.icon}</span>
        <span className="text-xs font-medium">{stat.label}</span>
      </div>

      <p className="text-base font-semibold text-default-900">{stat.value}</p>

      {typeof stat.progress === "number" ? (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-default-200">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, stat.progress))}%` }}
            />
          </div>
          {stat.progressLabel && (
            <p className="text-[11px] text-default-400">{stat.progressLabel}</p>
          )}
        </div>
      ) : (
        stat.statusLabel && (
          <p
            className={`text-[11px] font-medium ${
              statusColor[stat.status ?? "ok"]
            }`}
          >
            {stat.statusLabel}
          </p>
        )
      )}
    </div>
  );
};

export default UsageMeter;
