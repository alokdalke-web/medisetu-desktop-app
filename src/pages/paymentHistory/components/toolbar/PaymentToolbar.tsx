import React from "react";
import { FiChevronLeft, FiChevronRight, FiSliders } from "react-icons/fi";
import SearchField from "../../../../components/shared/SearchField";
import DashboardDateRangePicker from "../../../dashboard/DashboardDateRangePicker";
import type { PaymentToolbarProps } from "../../../../types/paymentHistory";
import FilterDropdown from "./FilterDropdown";
import TypeFilterDropdown from "./TypeFilterDropdown";

const PaymentToolbar: React.FC<PaymentToolbarProps> = ({
  search,
  setSearch,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  isLoading,
  startDate,
  endDate,
  onApplyRange,
  onShiftDate,
  tab,
  setTab,
  isTypeOpen,
  setIsTypeOpen,
  typeDropdownRef,
  counts,
  statusOptions,
  paymentStatusFilter,
  setPaymentStatusFilter,
  modeOptions,
  paymentModeFilter,
  setPaymentModeFilter,
  isDoctorUser,
  doctorOptions,
  doctorFilter,
  setDoctorFilter,
}) => (
  <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      {/* Search + mobile Filters toggle */}
      <div className="flex w-full items-center gap-2 lg:contents">
        {/* Search flexes instead of taking a fixed 320px: with five filter
            groups next to it a fixed width pushed the whole toolbar past the
            container and dropped the filters onto a second row on laptop/desktop
            widths. min/max keep it readable while letting it give up space. */}
        <div className="w-full lg:min-w-[200px] lg:max-w-[300px] lg:flex-1">
          <SearchField
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search by patient or doctor name..."
            className="w-full"
            classNames={{
              inputWrapper:
                "h-10 rounded-lg border border-line bg-surface px-3 shadow-sm " +
                "data-[hover=true]:border-primary/40 data-[focus=true]:border-primary",
              input: "text-[14px] text-text placeholder:text-[14px] placeholder:text-text-subtle",
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

      {/* Date range + Type/Status/Mode/Doctor — collapsed behind the mobile
          Filters button; inline (unchanged) from lg up.
          flex-row + flex-wrap from the base breakpoint (not flex-col until
          lg) so that once individual filters get a fixed width at `sm`
          (640px), they can actually sit 2-3 per row instead of one-per-row
          all the way to lg — see UI_REMEDIATION_LOG.md #26. Below `sm` each
          filter is still `w-full`, so it naturally wraps to its own row
          anyway; nothing changes for very narrow phones. */}
      <div
        className={[
          mobileFiltersOpen ? "flex" : "hidden",
          "w-full flex-row flex-wrap items-center gap-3",
          "lg:flex lg:w-auto lg:shrink-0 xl:flex-nowrap",
        ].join(" ")}
      >
        {/* Date range with prev/next arrows */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            disabled={isLoading}
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
              isFetching={isLoading}
              onApply={(s, e) => onApplyRange(s, e)}
            />
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onShiftDate("next")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-text-muted shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            title="Next period"
            aria-label="Next period"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        <TypeFilterDropdown
          tab={tab}
          setTab={setTab}
          isOpen={isTypeOpen}
          setIsOpen={setIsTypeOpen}
          dropdownRef={typeDropdownRef}
          counts={counts}
        />

        <FilterDropdown
          label="Status"
          allLabel="All"
          options={statusOptions}
          value={paymentStatusFilter}
          onChange={setPaymentStatusFilter}
          widthClass="w-full sm:w-[160px]"
        />

        <FilterDropdown
          label="Mode"
          allLabel="All"
          options={modeOptions}
          value={paymentModeFilter}
          onChange={setPaymentModeFilter}
          widthClass="w-full sm:w-[150px]"
        />

        {!isDoctorUser && (
          <FilterDropdown
            label="Doctor"
            allLabel="All doctors"
            options={doctorOptions}
            value={doctorFilter}
            onChange={setDoctorFilter}
            widthClass="w-full sm:w-[180px]"
          />
        )}
      </div>
    </div>
  </div>
);

export default PaymentToolbar;
