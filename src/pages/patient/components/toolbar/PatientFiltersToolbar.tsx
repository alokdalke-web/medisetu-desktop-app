import { Button, Select, SelectItem } from "@heroui/react";
import React from "react";
import { FiRefreshCw, FiSliders } from "react-icons/fi";
import SearchField from "../../../../components/shared/SearchField";
import { DateRangeInput } from "../../../../components/reports/ReportFilterBar";
import type { PatientFiltersToolbarProps } from "../../../../types/patient";

// Mirrors AppointmentToolbar's mobile pattern (UI_REMEDIATION_LOG.md #7): keep
// only search + a "Filters" toggle visible on mobile, collapse the rest
// (gender/status/date/age/reset) behind it, and stay fully inline from `lg` up.
const PatientFiltersToolbar: React.FC<PatientFiltersToolbarProps> = ({
  query,
  onQueryChange,
  onQueryClear,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  gender,
  setGender,
  status,
  setStatus,
  statusOptions,
  dateRange,
  onDateRangeChange,
  minAge,
  setMinAge,
  maxAge,
  setMaxAge,
  hasActiveFilters,
  onResetFilters,
}) => (
  <div className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
    {/* Search + mobile Filters toggle */}
    <div className="flex w-full items-center gap-2 lg:contents">
      <div className="w-full lg:w-[320px]">
        <SearchField
          value={query}
          onChange={onQueryChange}
          onClear={onQueryClear}
          placeholder="Search by name, mobile, or address..."
          classNames={{
            inputWrapper:
              "h-11 rounded-lg border border-line bg-surface px-3 shadow-sm " +
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
          "flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold shadow-sm lg:hidden",
          mobileFiltersOpen
            ? "border-primary/40 text-primary"
            : "text-text-muted hover:border-primary/40 hover:text-primary",
        ].join(" ")}
      >
        <FiSliders className="h-4 w-4" />
        Filters
      </button>
    </div>

    {/* Gender/status/date/age/reset — collapsed behind the mobile Filters
        button; inline (unchanged) from lg up. flex-row + flex-wrap from the
        base breakpoint (not flex-col until lg) so filters that get a fixed
        width at `sm` can sit alongside each other instead of forcing their
        own row all the way to lg — see UI_REMEDIATION_LOG.md #26. */}
    <div
      className={[
        mobileFiltersOpen ? "flex" : "hidden",
        "w-full flex-row flex-wrap items-center gap-3",
        "lg:flex lg:w-auto",
      ].join(" ")}
    >
      {/* Gender */}
      <div className="w-full sm:w-[160px]">
        <Select
          aria-label="Gender"
          placeholder="All Genders"
          selectedKeys={gender ? new Set([gender]) : new Set()}
          onSelectionChange={(keys) => {
            const key = Array.from(keys as Set<string>)[0] ?? "";
            setGender(key);
          }}
          size="md"
          radius="sm"
          classNames={{
            trigger:
              "h-11 rounded-lg border border-line bg-surface px-3 shadow-sm data-[hover=true]:border-primary/40",
            value: "text-[14px] text-text",
            popoverContent: "bg-surface",
          }}
          variant="bordered"
        >
          <SelectItem key="Male" textValue="Male">Male</SelectItem>
          <SelectItem key="Female" textValue="Female">Female</SelectItem>
          <SelectItem key="Other" textValue="Other">Other</SelectItem>
        </Select>
      </div>

      {/* Status */}
      <div className="w-full sm:w-[160px]">
        <Select
          aria-label="Status"
          placeholder="All Statuses"
          selectedKeys={status ? new Set([status]) : new Set()}
          onSelectionChange={(keys) => {
            const key = Array.from(keys as Set<string>)[0] ?? "";
            setStatus(key);
          }}
          size="md"
          radius="sm"
          classNames={{
            trigger:
              "h-11 rounded-lg border border-line bg-surface px-3 shadow-sm data-[hover=true]:border-primary/40",
            value: "text-[14px] text-text",
            popoverContent: "bg-surface",
          }}
          variant="bordered"
        >
          {statusOptions.map((s) => (
            <SelectItem key={s} textValue={s}>{s}</SelectItem>
          ))}
        </Select>
      </div>

      {/* Date Range */}
      <div className="w-full sm:w-[240px]">
        <DateRangeInput value={dateRange} onChange={onDateRangeChange} />
      </div>

      {/* Age Range */}
      <div className="flex w-full items-center gap-2 sm:w-[200px]">
        <input
          type="number"
          min="0"
          placeholder="Min Age"
          aria-label="Minimum age"
          value={minAge ?? ""}
          onChange={(e) => setMinAge(e.target.value ? Number(e.target.value) : undefined)}
          className="h-11 w-1/2 rounded-lg border border-line bg-surface px-3 text-[14px] text-text shadow-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-sm text-text-subtle">-</span>
        <input
          type="number"
          min="0"
          placeholder="Max Age"
          aria-label="Maximum age"
          value={maxAge ?? ""}
          onChange={(e) => setMaxAge(e.target.value ? Number(e.target.value) : undefined)}
          className="h-11 w-1/2 rounded-lg border border-line bg-surface px-3 text-[14px] text-text shadow-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <Button
          variant="light"
          onPress={onResetFilters}
          startContent={<FiRefreshCw className="text-[13px]" />}
          className="h-11 text-[13px] font-medium text-text-muted hover:bg-surface-muted"
        >
          Clear
        </Button>
      )}
    </div>
  </div>
);

export default PatientFiltersToolbar;
