import React from "react";
import { FiList, FiGrid, FiChevronLeft, FiChevronRight, FiSliders } from "react-icons/fi";
import SearchField from "../../../../components/shared/SearchField";
import DashboardDateRangePicker from "../../../dashboard/DashboardDateRangePicker";
import type { NoShowToolbarProps } from "../../../../types/noshow";

// Same wrapper/date-nav/mobile-Filters-collapse shape as
// AppointmentToolbar/PaymentToolbar (see UI_CONVENTIONS.md §1) — even with
// only one collapsible control (date-nav), mobile should default to a
// single compact search+Filters row rather than every control permanently
// expanded, matching how every other list screen behaves on a phone. See
// UI_REMEDIATION_LOG.md #36/#37.
//
// Breakpoints intentionally lower than Appointment/Payment's lg/xl tiers:
// those toolbars are denser (search + date + a status dropdown + view
// toggle) and genuinely need that much width before going inline. This
// toolbar only has search + date-nav + a 2-button view toggle, which fits
// in one row well before lg.
const NoShowToolbar: React.FC<NoShowToolbarProps> = ({
  search,
  setSearch,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  startDate,
  endDate,
  isFetching,
  onApplyRange,
  onShiftDate,
  viewMode,
  setViewMode,
}) => (
  <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
    <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:flex-wrap md:items-center">
      {/* Search + mobile Filters toggle (date-nav collapses behind this < md) */}
      <div className="flex w-full items-center gap-2 md:contents">
        <div className="w-full md:w-[280px] lg:w-[320px]">
          <SearchField
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          aria-expanded={mobileFiltersOpen}
          aria-label="Toggle filters"
          className={[
            "flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold shadow-sm md:hidden",
            mobileFiltersOpen
              ? "border-primary/40 text-primary"
              : "text-text-muted hover:border-primary/40 hover:text-primary",
          ].join(" ")}
        >
          <FiSliders className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Date-nav — collapsed behind the mobile Filters button; inline
          (unchanged) from md up. */}
      <div
        className={[
          mobileFiltersOpen ? "flex" : "hidden",
          "w-full flex-row flex-wrap items-center gap-2",
          "md:flex md:w-auto",
        ].join(" ")}
      >
        <button
          type="button"
          disabled={isFetching}
          onClick={() => onShiftDate("prev")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-text-muted shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          title="Previous period"
          aria-label="Previous period"
        >
          <FiChevronLeft size={16} />
        </button>

        <div className="flex min-w-0 flex-1 items-center sm:flex-none [&>div]:!w-full sm:[&>div]:!w-auto [&_button]:!h-10 [&_button]:!rounded-lg [&_button]:!border-line [&_button]:!px-3 [&_button]:!shadow-sm [&_button_span]:!text-[13px]">
          <DashboardDateRangePicker
            startYmd={startDate}
            endYmd={endDate}
            isFetching={isFetching}
            onApply={onApplyRange}
          />
        </div>

        <button
          type="button"
          disabled={isFetching}
          onClick={() => onShiftDate("next")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-text-muted shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          title="Next period"
          aria-label="Next period"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>

    {/* Visible at every breakpoint, mirroring AppointmentToolbar's
        ViewToggle — the toggle itself decides the layout; mobile isn't
        force-locked to one view. See UI_REMEDIATION_LOG.md #38. */}
    <div className="hidden shrink-0 items-center gap-2 sm:flex">
      <button
        type="button"
        onClick={() => setViewMode("list")}
        aria-label="List view"
        aria-pressed={viewMode === "list"}
        className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-[17px] shadow-sm transition lg:h-8 lg:w-8",
          viewMode === "list"
            ? "border-primary bg-primary/10 text-primary"
            : "border-line bg-surface text-text-muted hover:bg-surface-muted",
        ].join(" ")}
      >
        <FiList />
      </button>

      <button
        type="button"
        onClick={() => setViewMode("grid")}
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
        className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-[17px] shadow-sm transition lg:h-8 lg:w-8",
          viewMode === "grid"
            ? "border-primary bg-primary/10 text-primary"
            : "border-line bg-surface text-text-muted hover:bg-surface-muted",
        ].join(" ")}
      >
        <FiGrid />
      </button>
    </div>
  </div>
);

export default NoShowToolbar;
