import { TbActivityHeartbeat } from "react-icons/tb";
import type { ClinicPulseWidgetProps } from "../../../../types/adminDash";
import ArrowUpRight from "../../components/ArrowUpRight";

/**
 * Today's operational rates for the rail.
 *
 * Completion / no-show / cancellation are derived from the counts in
 * /dashboard/today-overview (`appointments`) and the paid-vs-unpaid split from
 * its `revenue` block — all already fetched by AdminDash, so this adds no
 * request. Percentages are computed against today's total, and the raw counts
 * are printed beside each bar so a small denominator can't mislead.
 */
const ClinicPulseWidget = ({
  totalToday,
  rates,
  paidCount,
  unpaidCount,
  onViewAppointments,
}: ClinicPulseWidgetProps) => (
  <div className="bg-surface border border-line rounded-2xl shadow-sm dark:shadow-none p-4 flex flex-col gap-4">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[#e6fbf7] flex items-center justify-center dark:bg-[#16352f]">
          <TbActivityHeartbeat className="h-[18px] w-[18px] text-primary dark:text-[#9be7dc]" />
        </div>
        <span className="text-[16px] font-semibold text-text truncate">
          Today's Pulse
        </span>
      </div>
      <span className="shrink-0 text-[11px] font-medium text-text-muted">
        {totalToday} appt{totalToday === 1 ? "" : "s"}
      </span>
    </div>

    {totalToday === 0 ? (
      <p className="text-[12px] text-text-subtle">
        No appointments today yet — rates appear once the day starts.
      </p>
    ) : (
      <>
        <div className="flex flex-col gap-3">
          {rates.map((rate) => (
            <div key={rate.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[12px] text-text-muted">
                  {rate.label}
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-text">
                  {rate.percent}%{" "}
                  <span className="text-[10px] font-normal text-text-subtle">
                    ({rate.detail})
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, rate.percent))}%`,
                    background: rate.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface-muted px-3 py-2">
            <p className="text-[11px] font-medium text-text-muted">Paid</p>
            <p className="text-[13px] font-semibold text-text">{paidCount}</p>
          </div>
          <div className="rounded-lg bg-surface-muted px-3 py-2">
            <p className="text-[11px] font-medium text-text-muted">Awaiting</p>
            <p className="text-[13px] font-semibold text-text">{unpaidCount}</p>
          </div>
        </div>
      </>
    )}

    {onViewAppointments && (
      <button
        type="button"
        onClick={onViewAppointments}
        className="flex cursor-pointer items-center justify-center gap-2 border-t border-line pt-3 text-[13px] font-medium text-primary transition-all duration-200 hover:gap-3 hover:opacity-80 dark:text-[#9be7dc]"
      >
        View Appointments
        <ArrowUpRight className="text-primary dark:text-[#9be7dc]" />
      </button>
    )}
  </div>
);

export default ClinicPulseWidget;
