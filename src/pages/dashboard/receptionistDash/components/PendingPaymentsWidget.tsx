import { FiCheckCircle } from "react-icons/fi";
import type { PendingPaymentsWidgetProps } from "../../../../types/receptionistDash";
import { fmtINR, initials } from "../helpers/receptionistDashFormatters";

const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:-translate-y-0";

// Actionable worklist: who still owes money today, so the front desk can
// collect before the patient leaves. Replaces a two-value donut that only
// repeated the stat tiles.
const PendingPaymentsWidget = ({
  appointments,
  isApprovalPending,
  lockedTitle,
  navigateWhenApproved,
}: PendingPaymentsWidgetProps) => {
  const unpaid = appointments.filter((a) => {
    const p = (a.payment ?? "").toLowerCase();
    return p === "pending" || p === "unpaid";
  });

  return (
    <div className="bg-surface border border-line rounded-[16px] p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-text">
          Collect Payments
        </h3>
        <span className="text-[12px] font-medium text-text-muted">
          {unpaid.length} due
        </span>
      </div>

      {unpaid.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <FiCheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-[12px] font-medium text-text-muted">
            All caught up — no payments due today.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {unpaid.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                disabled={isApprovalPending}
                title={lockedTitle ?? `Open ${a.name}'s appointment`}
                onClick={() => navigateWhenApproved(`/appointment/${a.id}`)}
                className={`cursor-pointer w-full rounded-xl border border-line px-3 py-2.5 text-left hover:bg-surface-muted transition flex items-center gap-2.5 min-w-0 ${disabledNavClass}`}
              >
                <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                  {initials(a.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text truncate">
                    {a.name}
                  </p>
                  <p className="text-[11px] font-medium text-text-muted truncate">
                    {a.tokenNo != null ? `Token #${a.tokenNo}` : a.doctorName}
                  </p>
                </div>
                <span className="text-[13px] font-semibold text-text shrink-0">
                  {a.amount != null ? fmtINR(a.amount) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PendingPaymentsWidget;
