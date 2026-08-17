import React from "react";

const StatCard: React.FC<{
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  iconClassName: string;
  detailClassName: string;
}> = ({ label, value, detail, icon, iconClassName, detailClassName }) => (
  // `grow shrink-0 basis-*` instead of a fixed width — see the same note in
  // pages/appointment/components/toolbar/StatCard.tsx: cards share the full row
  // width whenever they fit, and overflow into the swipe strip when they don't.
  <div className="shrink-0 grow basis-[200px] snap-start rounded-lg border border-line bg-surface px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:shadow-none sm:basis-[200px] sm:px-5 sm:py-4">
    {/* Mobile: compact horizontal pill (icon + value/label inline) — see
        UI_REMEDIATION_LOG.md #18 for why the stacked layout isn't just
        shrunk in place. */}
    <div className="flex items-center gap-3 sm:hidden">
      <div className={["grid h-10 w-10 shrink-0 place-items-center rounded-full text-[18px]", iconClassName].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium leading-snug text-text-muted">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-[19px] font-bold leading-none text-text">{value}</p>
          <p className={["truncate text-[11px] leading-snug", detailClassName].join(" ")}>{detail}</p>
        </div>
      </div>
    </div>

    {/* sm and up: icon-left layout. */}
    <div className="hidden items-center gap-4 sm:flex">
      <div className={["grid h-12 w-12 shrink-0 place-items-center rounded-full", iconClassName].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-text-muted">{label}</p>
        <p className="mt-0.5 text-[24px] font-bold leading-none text-text">{value}</p>
        <p className={["mt-1 line-clamp-1 text-[12px]", detailClassName].join(" ")}>{detail}</p>
      </div>
    </div>
  </div>
);

export default StatCard;
