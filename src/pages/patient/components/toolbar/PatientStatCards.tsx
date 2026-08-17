import React from "react";
import type { PatientStatCardsProps } from "../../../../types/patient";
import StatCard from "./StatCard";

// Horizontally-scrollable swipe strip at every width below `xl`, then a
// single-row 5-column grid from `xl` (1280px) up — kept identical to
// AppointmentStatCards.tsx by design (same 5-card constraint). See
// UI_REMEDIATION_LOG.md #1 and #24 for why an intermediate grid step
// (2 or 3 columns) was tried and rejected: 5 items can't divide evenly, so
// any multi-row grid before there's room for all 5 in one row either orphans
// a lone card or stacks unevenly across a wide range of tablet/laptop widths.
// A thin scrollbar that's invisible at rest and only fades in on hover/active
// scroll — same pattern as the table's horizontal scroll — so a partially
// cut-off trailing card is a discoverable "scroll for more" affordance on
// desktop/mouse without a scrollbar sitting there permanently. See
// UI_REMEDIATION_LOG.md #28.
const PatientStatCards: React.FC<PatientStatCardsProps> = ({ stats, isLoading }) => (
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

export default PatientStatCards;
