import type { ReceptionStatCardProps } from "../../../../types/receptionistDash";

// Reception-specific stat tile: same card bones as the shared StatCard (so the
// app reads as one system) but no decorative sparkline — reception is a "right
// now" screen with no trend series behind it. Instead each tile carries a live
// detail line and acts as a shortcut to the thing it summarizes.
const ReceptionStatCard = ({
  icon,
  label,
  value,
  bgColor,
  detail,
  progressPct,
  onClick,
  disabled = false,
  lockedTitle,
}: ReceptionStatCardProps) => {
  const clickable = !!onClick;
  const Tag = clickable ? "button" : "div";

  return (
    <Tag
      {...(clickable
        ? {
            type: "button" as const,
            onClick,
            disabled,
            title: disabled ? lockedTitle : undefined,
            "aria-label": `${label}: ${value}`,
          }
        : {})}
      className={[
        "flex min-w-0 flex-1 flex-col justify-between gap-2 rounded-[14px] border border-line bg-surface px-3.5 py-3 text-left shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-none",
        clickable
          ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
          : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bgColor}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-[12px] font-medium leading-4 text-text-muted">
            {label}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[20px] font-semibold leading-6 text-text">
            {value}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        {detail ? (
          <p className="truncate text-[11px] font-medium text-text-subtle">
            {detail}
          </p>
        ) : (
          <div className="h-4" />
        )}
        {progressPct != null && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
        )}
      </div>
    </Tag>
  );
};

export default ReceptionStatCard;
