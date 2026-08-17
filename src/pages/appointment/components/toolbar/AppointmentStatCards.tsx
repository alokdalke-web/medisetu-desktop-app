import React from "react";
import type { AppointmentStatCardsProps } from "../../../../types/appointment";
import StatCard from "./StatCard";

// Horizontally-scrollable swipe strip at every width below `xl`, then a
// single-row 5-column grid from `xl` (1280px) up. 5 items can't divide
// evenly into 2, 3, or 4 columns without either an orphan or an uneven
// stacked row (3+2, 4+1) — an intermediate grid step was tried and rejected
// (see UI_REMEDIATION_LOG.md #24) because it looked broken across the whole
// 640-1279px range (tablets, small laptops), not just at one width. Staying
// a single-row strip until there's room for all 5 in one row avoids the
// problem entirely instead of picking a "least bad" uneven grid.
// A thin scrollbar that's invisible at rest and only fades in on hover/active
// scroll — same pattern as the table's horizontal scroll — so a partially
// cut-off trailing card is a discoverable "scroll for more" affordance on
// desktop/mouse without a scrollbar sitting there permanently. See
// UI_REMEDIATION_LOG.md #28.
const AppointmentStatCards: React.FC<AppointmentStatCardsProps> = ({ stats, isLoading }) => (
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

export default AppointmentStatCards;
