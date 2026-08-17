import React from "react";
import type { AppointmentRow } from "../../../../types/appointment";
import { getPaymentModeMeta } from "../../helpers/appointmentListFormatters";

// Combines what used to be two separate columns ("Payment Mode" showing an
// icon + mode label, "Payment Status" showing a status chip that then
// repeated the same mode text again, e.g. "Paid" + "₹1000 via Cash" right
// next to a "Cash" mode cell). One column: icon + mode label on top, a
// single status chip (with amount, but no repeated mode name) below.
const PaymentCell: React.FC<{ row: AppointmentRow }> = ({ row }) => {
  const modeLabel =
    row.paymentMethod === "Pay Later" ? "Pay on Visit" : row.paymentMethod || "—";
  const meta = getPaymentModeMeta(modeLabel);
  const Icon = meta.icon;

  const paymentStatus = String(row.paymentStatus || "").trim().toLowerCase();
  const isPayOnVisit =
    row.paymentMethod === "Pay Later" || row.paymentMethod === "Pay on Visit";

  let statusChip: React.ReactNode = null;

  if (row.paymentMethod === "Not Required") {
    statusChip = (
      <span className="inline-flex rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text">
        Free consultation
      </span>
    );
  } else if (row.paymentStatus === "Refunded") {
    statusChip = (
      <span className="inline-flex rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
        Refunded ₹{row.refundedAmount || 0}
      </span>
    );
  } else if (row.paymentStatus === "Paid" || row.paymentStatus === "Already Paid") {
    statusChip = (
      <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
        Paid ₹{row.servicePrice || 0}
      </span>
    );
  } else if (row.paymentStatus === "Covered") {
    statusChip = (
      <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
        Covered
      </span>
    );
  } else if (paymentStatus === "pending" || (isPayOnVisit && !row.paymentStatus)) {
    statusChip = (
      <span className="inline-flex rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
        Pending
      </span>
    );
  } else if (row.paymentStatus === "Unpaid") {
    statusChip = (
      <span className="inline-flex rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
        Unpaid
      </span>
    );
  } else if (row.paymentStatus) {
    statusChip = (
      <span className="text-[11px] font-medium text-text-muted">
        {row.paymentStatus}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={[
          "grid h-8 w-8 shrink-0 place-items-center rounded-full",
          meta.iconClassName,
        ].join(" ")}
      >
        <Icon className="text-[15px]" />
      </span>

      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-text">
          {modeLabel}
        </p>
        {statusChip && <div className="mt-0.5">{statusChip}</div>}
      </div>
    </div>
  );
};

export default PaymentCell;
