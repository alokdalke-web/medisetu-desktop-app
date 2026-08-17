import React from "react";
import type { PaymentStatCardsProps } from "../../../../types/paymentHistory";
import StatCard from "./StatCard";

// Horizontally-scrollable swipe strip at every width below `xl`, then a
// single-row 4-column grid from `xl` (1280px) up — same standing default as
// AppointmentStatCards/PatientStatCards (see UI_CONVENTIONS.md §9,
// UI_REMEDIATION_LOG.md #1/#24), kept for consistency even though 4 divides
// evenly and wouldn't strictly need it.
// A thin scrollbar that's invisible at rest and only fades in on hover/active
// scroll — same pattern as the table's horizontal scroll — so a partially
// cut-off trailing card is a discoverable "scroll for more" affordance on
// desktop/mouse without a scrollbar sitting there permanently. See
// UI_REMEDIATION_LOG.md #28.
const PaymentStatCards: React.FC<PaymentStatCardsProps> = ({ stats, isLoading }) => (
  <div
    className={[
      "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2",
      "[scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#9ca3af_transparent] active:[scrollbar-color:#9ca3af_transparent]",
      "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400",
      "xl:grid xl:snap-none xl:grid-cols-5 xl:overflow-visible xl:pb-0",
      isLoading ? "opacity-75 transition-opacity" : "",
    ].join(" ")}
  >
    {stats.map((stat) => (
      <StatCard key={stat.label} {...stat} />
    ))}
  </div>
);

export default PaymentStatCards;
