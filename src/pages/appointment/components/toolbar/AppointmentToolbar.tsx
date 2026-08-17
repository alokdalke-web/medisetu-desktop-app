import React from "react";
import { FiChevronLeft, FiChevronRight, FiSliders } from "react-icons/fi";
import SearchField from "../../../../components/shared/SearchField";
import type { AppointmentToolbarProps } from "../../../../types/appointment";
import DashboardDateRangePicker from "../../../dashboard/DashboardDateRangePicker";
import StatusFilterDropdown from "./StatusFilterDropdown";
import ViewToggle from "./ViewToggle";

const AppointmentToolbar: React.FC<AppointmentToolbarProps> = ({
  search,
  setSearch,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  isLoading,
  activeStart,
  activeEnd,
  onApplyRange,
  onShiftDateRange,
  statusDropdownRef,
  isStatusOpen,
  setIsStatusOpen,
  tab,
  setTab,
  statusLabel,
  view,
  onSelectList,
  onSelectCard,
  onSelectCalendar,
}) => (
  <div className="flex flex-col gap-2 sm:gap-3 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      {/* Search + mobile Filters toggle (date/status collapse behind this < lg) */}
      <div className="flex w-full items-center gap-2 lg:contents">
        <div className="w-full lg:w-[320px]">
          <SearchField
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search patient, doctor or mobile number..."
            className="w-full"
            classNames={{
              inputWrapper:
                "h-10 rounded-lg border border-line bg-surface px-3 shadow-sm " +
                "data-[hover=true]:border-primary/40 data-[focus=true]:border-primary",
              input:
                "text-[14px] text-text placeholder:text-[14px] placeholder:text-text-subtle",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          aria-expanded={mobileFiltersOpen}
          aria-label="Toggle filters"
          className={[
            "flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold shadow-sm lg:hidden",
            mobileFiltersOpen
              ? "border-primary/40 text-primary"
              : "text-text-muted hover:border-primary/40 hover:text-primary",
          ].join(" ")}
        >
          <FiSliders className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Date range + status — collapsed behind the mobile Filters button;
          inline (unchanged) from lg up. Hidden entirely on mobile (< sm),
          only reachable via the Filters toggle from sm up. flex-row +
          flex-wrap from the base breakpoint (not flex-col until lg) so that
          once a filter gets a fixed width at `sm`, it can sit alongside
          others instead of forcing its own row all the way to lg — see
          UI_REMEDIATION_LOG.md #26. */}
      <div
        className={[
          mobileFiltersOpen ? "flex" : "hidden",
          "w-full flex-row flex-wrap items-center gap-2 sm:gap-3",
          "lg:flex lg:w-auto",
        ].join(" ")}
      >
        {/* Date range navigation */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onShiftDateRange("prev")}
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface",
              "text-text-muted shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
            title="Previous date"
            aria-label="Previous date"
          >
            <FiChevronLeft size={16} />
          </button>

          <div className="flex min-w-0 flex-1 items-center sm:flex-none [&>div]:!w-full sm:[&>div]:!w-auto [&_button]:!h-10 [&_button]:!rounded-lg [&_button]:!border-line [&_button]:!px-3 [&_button]:!shadow-sm [&_button_span]:!text-[13px]">
            <DashboardDateRangePicker
              startYmd={activeStart}
              endYmd={activeEnd}
              isFetching={isLoading}
              onApply={(s, e) => onApplyRange(s, e)}
            />
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onShiftDateRange("next")}
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface",
              "text-text-muted shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
            title="Next date"
            aria-label="Next date"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        <StatusFilterDropdown
          tab={tab}
          setTab={setTab}
          isOpen={isStatusOpen}
          setIsOpen={setIsStatusOpen}
          dropdownRef={statusDropdownRef}
          statusLabel={statusLabel}
        />
      </div>
    </div>

    {/* Right side: view toggles (New Appointment moved to the page header,
        matching PageHeader.actions — see UI_REMEDIATION_LOG.md #20) */}
    <div className="hidden flex-wrap items-center justify-end gap-3 sm:flex sm:flex-nowrap xl:justify-end">
      <ViewToggle
        view={view}
        onSelectList={onSelectList}
        onSelectCard={onSelectCard}
        onSelectCalendar={onSelectCalendar}
      />
    </div>
  </div>
);

export default AppointmentToolbar;
