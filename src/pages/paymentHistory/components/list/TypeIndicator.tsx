import React from "react";
import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";
import { entryTypeLabel, isDebitEntry } from "../../helpers/paymentHistoryFormatters";

// Directional Type indicator (money in vs money out). Rendered as an
// arrow + text — deliberately NOT a filled pill — so it reads clearly
// differently from the solid payment-Status chip sitting next to it.
const TypeIndicator: React.FC<{ entryType: string }> = ({ entryType }) => {
  const debit = isDebitEntry(entryType);
  const label = entryTypeLabel(entryType);
  if (label === "—") return <span className="text-text-subtle">—</span>;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-[13px] font-semibold",
        debit ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-5 w-5 place-items-center rounded-full",
          debit
            ? "bg-red-50 dark:bg-red-500/10"
            : "bg-emerald-50 dark:bg-emerald-500/10",
        ].join(" ")}
      >
        {debit ? (
          <FiArrowUpRight className="h-3 w-3" aria-hidden />
        ) : (
          <FiArrowDownLeft className="h-3 w-3" aria-hidden />
        )}
      </span>
      {label}
    </span>
  );
};

export default TypeIndicator;
