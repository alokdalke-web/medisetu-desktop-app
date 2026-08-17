import { FiCreditCard } from "react-icons/fi";
import type { CollectionsWidgetProps } from "../../../../types/adminDash";
import ArrowUpRight from "../../components/ArrowUpRight";

/**
 * Collections breakdown for the rail.
 *
 * Every figure comes from the `summary` block of
 * GET /appointments/payment-transactions — the same response that drives the
 * Payments History page's KPI cards. Sourcing both screens from one summary is
 * deliberate: an earlier version derived these from /dashboard/revenue-overview
 * instead, which counts by appointment date and can be scoped to a single
 * doctor, so the two pages disagreed for the same range. Reusing the summary
 * makes that class of mismatch impossible rather than merely fixed.
 *
 * `totalCredit` is the sum of `modes` by construction (the backend builds
 * `paymentModeSummary.credit` from the same filtered transactions), so the
 * headline can never disagree with the rows beneath it.
 */

const formatINR = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

const CollectionsWidget = ({
  periodLabel,
  totalCredit,
  modes,
  refunded,
  netAmount,
  pendingAmount,
  transactionCount,
  onViewPayments,
}: CollectionsWidgetProps) => {
  const hasBreakdown = modes.some((m) => m.amount > 0);

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-sm dark:shadow-none p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-full bg-[#e6fbf7] flex items-center justify-center dark:bg-[#16352f]">
            <FiCreditCard className="h-[18px] w-[18px] text-primary dark:text-[#9be7dc]" />
          </div>
          <span className="text-[16px] font-semibold text-text truncate">
            Collections
          </span>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-text-muted">
          {periodLabel}
        </span>
      </div>

      <div>
        <p className="text-[12px] text-text-muted">
          Total Credit
          <span className="text-text-subtle">
            {" "}
            · {transactionCount} txn{transactionCount === 1 ? "" : "s"}
          </span>
        </p>
        <p className="text-[22px] font-semibold leading-7 text-text">
          {formatINR(totalCredit)}
        </p>
      </div>

      {hasBreakdown ? (
        <div className="flex flex-col gap-3">
          {/* Stacked share bar */}
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="img"
            aria-label={modes
              .filter((m) => m.amount > 0)
              .map((m) => `${m.label} ${m.percent}%`)
              .join(", ")}
          >
            {modes
              .filter((m) => m.amount > 0)
              .map((m) => (
                <span
                  key={m.label}
                  style={{ width: `${m.percent}%`, background: m.color }}
                />
              ))}
          </div>

          <div className="flex flex-col gap-2">
            {modes
              .filter((m) => m.amount > 0)
              .map((m) => (
                <div key={m.label} className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: m.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-text-muted">
                    {m.label}
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-text">
                    {formatINR(m.amount)}{" "}
                    <span className="text-[10px] font-normal text-text-subtle">
                      ({m.percent}%)
                    </span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-text-subtle">
          No transactions in this period yet.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <p className="text-[11px] font-medium text-text-muted">Refunded</p>
          <p className="truncate text-[13px] font-semibold text-text">
            {formatINR(refunded)}
          </p>
        </div>
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <p className="text-[11px] font-medium text-text-muted">Net</p>
          <p className="truncate text-[13px] font-semibold text-text">
            {formatINR(netAmount)}
          </p>
        </div>
        {pendingAmount > 0 && (
          <div className="col-span-2 rounded-lg bg-surface-muted px-3 py-2">
            {/* Flagged as a subset so it never reads as extra revenue. */}
            <p className="text-[11px] font-medium text-text-muted">
              Uncollected (included above)
            </p>
            <p className="truncate text-[13px] font-semibold text-text">
              {formatINR(pendingAmount)}
            </p>
          </div>
        )}
      </div>

      {onViewPayments && (
        <button
          type="button"
          onClick={onViewPayments}
          className="flex cursor-pointer items-center justify-center gap-2 border-t border-line pt-3 text-[13px] font-medium text-primary transition-all duration-200 hover:gap-3 hover:opacity-80 dark:text-[#9be7dc]"
        >
          View Payments
          <ArrowUpRight className="text-primary dark:text-[#9be7dc]" />
        </button>
      )}
    </div>
  );
};

export default CollectionsWidget;
