import { getLocalTimeZone, today } from "@internationalized/date";
import { DateRangePicker } from "@heroui/react";
import { I18nProvider } from "@react-aria/i18n";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiList,
  FiSearch,
  FiX,
} from "react-icons/fi";

import type {
  CategoryFilterKey,
  LabTestsView,
  StatusFilterKey,
} from "./types";

export type FilterDropdownOption<KeyType extends string> = {
  key: KeyType;
  label: string;
  count?: number;
};

type FilterDropdownProps<KeyType extends string> = {
  ariaLabel: string;
  prefix: string;
  options: FilterDropdownOption<KeyType>[];
  selectedKey: KeyType;
  onChange: (key: KeyType) => void;
};

type LabTestsFiltersProps = {
  tourNamespace: string;
  search: string;
  statusFilter: StatusFilterKey;
  statusFilterOptions: FilterDropdownOption<StatusFilterKey>[];
  categoryFilter: CategoryFilterKey;
  categoryFilterOptions: FilterDropdownOption<CategoryFilterKey>[];
  dateRangeValue: any;
  dateRangeControlLabel: string;
  view: LabTestsView;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (key: StatusFilterKey) => void;
  onCategoryFilterChange: (key: CategoryFilterKey) => void;
  onDateRangeChange: (value: any) => void;
  onViewChange: (view: LabTestsView) => void;
};

function FilterDropdown<KeyType extends string>({
  ariaLabel,
  prefix,
  options,
  selectedKey,
  onChange,
}: FilterDropdownProps<KeyType>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    options.find((option) => option.key === selectedKey) ?? options[0];
  const selectedCount =
    selectedOption?.count == null ? "" : ` (${selectedOption.count})`;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left text-[13px] font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/10 ${
          isOpen
            ? "border-primary/45 ring-2 ring-primary/10"
            : "border-slate-200"
        }`}
      >
        <span className="min-w-0 truncate">
          {prefix} - {selectedOption?.label ?? "All"}
          {selectedCount}
        </span>

        <FiChevronDown
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 sm:min-w-[220px]">
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {options.map((option) => {
              const isSelected = option.key === selectedKey;
              const count =
                option.count == null || option.key !== selectedKey
                  ? ""
                  : ` (${option.count})`;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onChange(option.key);
                    setIsOpen(false);
                  }}
                  className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                    isSelected
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">
                    {prefix} - {option.label}
                    {count}
                  </span>
                  {isSelected && <FiCheck className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-[18px] shadow-sm transition",
        active
          ? "border-black bg-[#e8f6f4] text-primary"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function LabTestsFilters({
  tourNamespace,
  search,
  statusFilter,
  statusFilterOptions,
  categoryFilter,
  categoryFilterOptions,
  dateRangeValue,
  dateRangeControlLabel,
  view,
  onSearchChange,
  onStatusFilterChange,
  onCategoryFilterChange,
  onDateRangeChange,
  onViewChange,
}: LabTestsFiltersProps) {
  const shiftDateRange = (dayOffset: number) => {
    const fallbackDate = today(getLocalTimeZone());
    const currentStart = dateRangeValue?.start ?? fallbackDate;
    const currentEnd =
      dateRangeValue?.end ?? dateRangeValue?.start ?? fallbackDate;

    onDateRangeChange({
      start: currentStart.add({ days: dayOffset }),
      end: currentEnd.add({ days: dayOffset }),
    });
  };

  return (
    <motion.section
      id={`${tourNamespace}-filters`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2"
    >
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
        <div className="grid w-full min-w-0 grid-cols-2 items-center gap-3 md:grid-cols-3 xl:flex-1">
          <div className="group relative col-span-2 flex min-w-0 w-full items-center md:col-span-1">
            <FiSearch className="pointer-events-none absolute left-3.5 text-[18px] text-slate-400 transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search patient, PID, doctor, or test name..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value.slice(0, 30))}
              maxLength={30}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-[14px] font-medium text-slate-700 outline-none shadow-sm transition hover:border-slate-300 placeholder:text-[14px] placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="absolute right-3 grid h-5 w-5 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
              >
                <FiX className="text-sm" />
              </button>
            )}
          </div>

          <div className="w-full">
            <FilterDropdown
              ariaLabel="Filter by status"
              prefix="Status"
              options={statusFilterOptions}
              selectedKey={statusFilter}
              onChange={onStatusFilterChange}
            />
          </div>

          <div className="w-full">
            <FilterDropdown
              ariaLabel="Filter by category"
              prefix="Category"
              options={categoryFilterOptions}
              selectedKey={categoryFilter}
              onChange={onCategoryFilterChange}
            />
          </div>
        </div>

        <div className="flex min-w-0 w-full items-center gap-2 xl:w-auto">
          <button
            type="button"
            aria-label="Move date range back one day"
            onClick={() => shiftDateRange(-1)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <FiChevronLeft className="text-base" />
          </button>

          <div className="relative min-w-0 flex-1 overflow-hidden xl:w-[260px] xl:flex-none">
            <I18nProvider locale="en-IN">
              <DateRangePicker
                aria-label="Filter requests by date range"
                value={dateRangeValue}
                onChange={onDateRangeChange}
                visibleMonths={2}
                selectorIcon={<FiCalendar className="text-slate-500" />}
                classNames={{
                  base: "min-w-0 w-full",
                  inputWrapper:
                    "h-11 min-h-11 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition-all hover:border-primary/30 data-[focus=true]:border-primary/45 data-[focus=true]:ring-2 data-[focus=true]:ring-primary/10",
                  input: "text-[13px] font-semibold text-transparent",
                  segment: "text-transparent",
                  separator: "text-transparent",
                }}
              />
            </I18nProvider>

            {dateRangeControlLabel && (
              <span className="pointer-events-none absolute inset-y-px left-px right-10 z-10 flex items-center justify-center overflow-hidden rounded-l-lg bg-white px-3 text-center text-[13px] font-semibold text-slate-700 dark:bg-[#111726] dark:text-white">
                <span className="min-w-0 truncate">{dateRangeControlLabel}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label="Move date range forward one day"
            onClick={() => shiftDateRange(1)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <FiChevronRight className="text-base" />
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <ViewToggleButton
              active={view === "list"}
              label="Show list view"
              onClick={() => onViewChange("list")}
            >
              <FiList />
            </ViewToggleButton>
            <ViewToggleButton
              active={view === "card"}
              label="Show card view"
              onClick={() => onViewChange("card")}
            >
              <FiGrid />
            </ViewToggleButton>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
