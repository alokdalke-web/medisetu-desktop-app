import React from "react";

const StatCard: React.FC<{
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  iconClassName: string;
  detailClassName: string;
}> = ({ label, value, detail, icon, iconClassName, detailClassName }) => (
  // `grow shrink-0 basis-*` (not a fixed width) so the strip behaves the same at
  // every width: the cards share whatever room the row has when they all fit —
  // no dead space to the right on a 1100-1279px laptop, which `xl:grid-cols-5`
  // alone doesn't cover — and overflow into the scrollable strip when they
  // don't. `basis` is inert once the container becomes a grid at `xl`.
  <div className="shrink-0 grow basis-[168px] snap-start rounded-lg border border-line bg-surface p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:shadow-none sm:basis-[190px] sm:p-4">
    {/* Mobile: compact horizontal pill (icon + value/label inline) instead of
        the stacked desktop layout — the stacked version ran ~140px tall per
        card, eating too much vertical space before the list even starts. */}
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

    {/* sm and up: icon-left layout. Label uses line-clamp (wraps up to 2
        lines) instead of truncate — a card that's briefly narrower than the
        label should never silently cut text off with "…"; wrapping to a
        second line keeps it fully readable at any width. */}
    <div className="hidden items-center gap-3 sm:flex">
      <div className={["grid h-10 w-10 shrink-0 place-items-center rounded-full", iconClassName].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-text-muted">{label}</p>
        <p className="mt-0.5 text-[22px] font-bold leading-none text-text">{value}</p>
        <p className={["mt-1 line-clamp-1 text-[12px]", detailClassName].join(" ")}>{detail}</p>
      </div>
    </div>
  </div>
);

export default StatCard;
