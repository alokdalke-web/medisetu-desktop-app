import type { ReactNode } from "react";
import { TbReportAnalytics } from "react-icons/tb";
import type { SummaryBarProps } from "../../../../types/adminDash";
import ArrowUpRight from "../../components/ArrowUpRight";

/**
 * Today's-summary strip.
 *
 * The stats sit in a grid that reflows (2 → 3 → 5 columns) instead of being
 * scaled down to fit one row: the previous version dropped to 10px text and
 * 12px icons at `xl` to keep a single line on a 1280px laptop, which is the
 * most common screen this dashboard is used on. Type size is now constant at
 * every breakpoint and the layout does the adapting.
 *
 * Reflow is driven by the bar's own width (`@container`), not the viewport —
 * it renders inside the dashboard's left column, which is far narrower than
 * the window whenever the right rail is beside it.
 */

type StatProps = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

/**
 * Narrow widths give each stat its own `bg-surface` panel — the same
 * label-over-value treatment the appointment cards use for their payment
 * strip. Once the bar is wide enough to be a real strip the panels drop away
 * and the stats read as inline columns again.
 */
const Stat = ({ label, value, valueClassName = "text-text" }: StatProps) => (
  <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-surface px-3 py-2 @3xl/bar:rounded-none @3xl/bar:bg-transparent @3xl/bar:px-0 @3xl/bar:py-0">
    <span className="truncate text-[12px] text-text-muted">{label}</span>
    <span className={`truncate text-[14px] font-bold ${valueClassName}`}>
      {value}
    </span>
  </div>
);

const SummaryBar = ({
  nextApptTime,
  nextApptName,
  remaining,
  completed,
  pending,
  todayRevenue,
  onViewSchedule,
}: SummaryBarProps) => (
  // Outer element only establishes the container; the styled bar is the child,
  // because `@`-variants resolve against an ancestor container, never the
  // element that declares one.
  <div className="@container/bar">
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-muted px-4 py-4 @3xl/bar:flex-row @3xl/bar:items-center @3xl/bar:gap-5 @3xl/bar:px-5">
      {/* Left: title */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e6fbf7] dark:bg-[#16352f]">
          <TbReportAnalytics className="h-[18px] w-[18px] text-primary dark:text-[#9be7dc]" />
        </div>
        <span className="whitespace-nowrap text-[14px] font-semibold leading-tight text-text">
          Today's Summary
        </span>
      </div>

      <div className="hidden h-11 w-px shrink-0 bg-line @3xl/bar:block" />

      {/* Stats */}
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 @md/bar:grid-cols-3 @2xl/bar:grid-cols-5">
        <Stat
          label="Next Appointment"
          value={
            <>
              {nextApptTime ?? "—"}
              {nextApptName ? (
                <span className="ml-1 text-[12px] font-medium text-text-muted">
                  {nextApptName}
                </span>
              ) : null}
            </>
          }
        />
        <Stat label="Remaining" value={remaining ?? 0} />
        <Stat label="Completed" value={completed ?? 0} />
        <Stat label="Pending" value={pending ?? 0} />
        <Stat
          label="Today's Earning"
          value={`₹${todayRevenue != null ? todayRevenue.toLocaleString("en-IN") : "0"}`}
          valueClassName="text-[#01c2a8] dark:text-[#9be7dc]"
        />
      </div>

      <button
        type="button"
        onClick={onViewSchedule}
        className="mt-1 flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-primary px-4 py-2.5 text-[13px] font-medium text-primary transition-all duration-200 hover:gap-3 hover:bg-primary/5 @md/bar:w-auto @md/bar:self-start @3xl/bar:mt-0 @3xl/bar:self-auto dark:border-[#46beae]/50 dark:text-[#9be7dc] dark:hover:bg-secondarybtn"
      >
        View Full Schedule
        <ArrowUpRight className="text-primary dark:text-[#9be7dc]" />
      </button>
    </div>
  </div>
);

export default SummaryBar;
