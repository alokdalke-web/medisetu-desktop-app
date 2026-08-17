import type { PaymentBadgeProps } from "../../../../types/receptionistDash";

// Alpha-based chip backgrounds (not raw -50 steps) so no dark: pairing is
// needed — see UI_PLAYBOOK.md item 12.
const PaymentBadge = ({ payment, paymentMethod }: PaymentBadgeProps) => {
  const status = String(payment ?? "").trim().toLowerCase();
  const method = String(paymentMethod ?? "").trim();
  const methodLabel = method
    ? method === "Pay Later"
      ? "Pay on Visit"
      : method.charAt(0).toUpperCase() + method.slice(1)
    : "—";

  let chipClasses = "bg-surface-muted text-text-muted";
  let chipLabel = payment ?? "—";

  if (status === "paid" || status === "already paid") {
    chipClasses = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    chipLabel = "Paid";
  } else if (status === "pending" || status === "unpaid") {
    chipClasses = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    chipLabel = status === "unpaid" ? "Unpaid" : "Pending";
  } else if (status === "refunded") {
    chipClasses = "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    chipLabel = "Refunded";
  }

  return (
    <div className="min-w-0">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${chipClasses}`}
      >
        {chipLabel}
      </span>
      <p className="mt-0.5 text-[11px] font-medium text-text-muted truncate">
        {methodLabel}
      </p>
    </div>
  );
};

export default PaymentBadge;
