import React, { useState, useCallback, useMemo } from "react";
import { Select, SelectItem, Button } from "@heroui/react";
import DashboardDateRangePicker from "../../pages/dashboard/DashboardDateRangePicker";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface ReportFilters {
  dateRange: DateRange;
  compareWith?: DateRange;
  selectedOptions: Record<string, string>;
}

export interface FilterField {
  id: string;
  label: string;
  type: "select" | "date-range";
  options?: FilterOption[];
  placeholder?: string;
  defaultValue?: string;
}

export interface ReportFilterBarProps {
  fields?: FilterField[];
  defaultDateRange?: DateRange;
  defaultCompareRange?: DateRange;
  showCompare?: boolean;
  onApply: (filters: ReportFilters) => void;
  onChange?: (filters: ReportFilters) => void;
  showApplyButton?: boolean;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { startDate: toYMD(start), endDate: toYMD(end) };
}

function getDefaultCompareRange(dateRange: DateRange): DateRange {
  const start = new Date(dateRange.startDate + "T00:00:00");
  const end = new Date(dateRange.endDate + "T00:00:00");
  const diff = end.getTime() - start.getTime();
  const compareEnd = new Date(start.getTime() - 86400000);
  const compareStart = new Date(compareEnd.getTime() - diff);
  return { startDate: toYMD(compareStart), endDate: toYMD(compareEnd) };
}

// ─── Date Range Picker Dropdown ──────────────────────────────────────────────

export interface DateRangeInputProps {
  label?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangeInput: React.FC<DateRangeInputProps> = ({
  label,
  value,
  onChange,
  className = "",
}) => {
  return (
    <div className={`relative w-full ${className} [&_button]:!w-full [&_button]:!h-11 [&_button]:!rounded-lg [&_button]:!border-slate-200 [&_button]:!px-3 [&_button]:!shadow-sm [&_button_span]:!text-[13px] dark:[&_button]:!bg-[#111726] dark:[&_button]:!border-[#273244] dark:[&_button]:!text-white`}>
      {label && (
        <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white/70">
          {label}
        </label>
      )}
      <DashboardDateRangePicker
        startYmd={value.startDate}
        endYmd={value.endDate}
        onApply={(s, e) => onChange({ startDate: s, endDate: e })}
      />
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  fields = [],
  defaultDateRange,
  defaultCompareRange,
  showCompare = true,
  onApply,
  onChange,
  showApplyButton = true,
  className = "",
}) => {
  const initialDateRange = useMemo(
    () => defaultDateRange ?? getDefaultDateRange(),
    [defaultDateRange]
  );

  const initialCompareRange = useMemo(
    () => defaultCompareRange ?? getDefaultCompareRange(initialDateRange),
    [defaultCompareRange, initialDateRange]
  );

  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [compareRange, setCompareRange] = useState<DateRange>(initialCompareRange);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.type === "select") {
        initial[f.id] = f.defaultValue ?? "";
      }
    });
    return initial;
  });

  const buildFilters = useCallback((): ReportFilters => {
    return {
      dateRange,
      compareWith: showCompare ? compareRange : undefined,
      selectedOptions,
    };
  }, [dateRange, compareRange, selectedOptions, showCompare]);

  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      setDateRange(range);
      setCompareRange(getDefaultCompareRange(range));
      if (onChange) {
        onChange({
          dateRange: range,
          compareWith: showCompare ? getDefaultCompareRange(range) : undefined,
          selectedOptions,
        });
      }
    },
    [onChange, selectedOptions, showCompare]
  );

  const handleCompareChange = useCallback(
    (range: DateRange) => {
      setCompareRange(range);
      if (onChange) {
        onChange({
          dateRange,
          compareWith: range,
          selectedOptions,
        });
      }
    },
    [onChange, dateRange, selectedOptions]
  );

  const handleSelectChange = useCallback(
    (fieldId: string, value: string) => {
      setSelectedOptions((prev) => {
        const next = { ...prev, [fieldId]: value };
        if (onChange) {
          onChange({
            dateRange,
            compareWith: showCompare ? compareRange : undefined,
            selectedOptions: next,
          });
        }
        return next;
      });
    },
    [onChange, dateRange, compareRange, showCompare]
  );

  const handleApply = () => {
    onApply(buildFilters());
  };

  const totalFields = 1 + (showCompare ? 1 : 0) + fields.filter((f) => f.type === "select").length;
  const gridCols =
    totalFields <= 2
      ? "md:grid-cols-2"
      : totalFields <= 3
      ? "md:grid-cols-3"
      : "md:grid-cols-4";

  return (
    <div
      className={`bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 dark:bg-[#111726] dark:border-[#273244] ${className}`}
    >
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {/* Date Range */}
        <DateRangeInput
          label="Date Range"
          value={dateRange}
          onChange={handleDateRangeChange}
        />

        {/* Compare With */}
        {showCompare && (
          <DateRangeInput
            label="Compare With"
            value={compareRange}
            onChange={handleCompareChange}
          />
        )}

        {/* Dynamic select fields using HeroUI Select */}
        {fields
          .filter((f) => f.type === "select")
          .map((field) => (
            <div key={field.id}>
              <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white/70">
                {field.label}
              </label>
              <Select
                aria-label={field.label}
                placeholder={field.placeholder ?? `Select ${field.label}`}
                selectedKeys={
                  selectedOptions[field.id]
                    ? new Set([selectedOptions[field.id]])
                    : new Set<string>()
                }
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0] ?? "";
                  // If "all" is selected, clear the filter
                  handleSelectChange(field.id, key === "__all__" ? "" : key);
                }}
                size="sm"
                radius="lg"
                classNames={{
                  trigger:
                    "h-10 border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                  value: "text-[13px] text-[#100e1c] dark:text-white",
                  popoverContent: "dark:bg-[#111726]",
                }}
                variant="bordered"
              >
                {[
                  <SelectItem key="__all__" textValue={field.placeholder ?? `All ${field.label}`}>
                    {field.placeholder ?? `All ${field.label}`}
                  </SelectItem>,
                  ...(field.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} textValue={opt.label}>
                      {opt.label}
                    </SelectItem>
                  )),
                ]}
              </Select>
            </div>
          ))}
      </div>

      {showApplyButton && (
        <div className="mt-4 flex justify-end">
          <Button
            color="primary"
            className="bg-[#0a6c74] text-white px-6 text-[13px] font-medium"
            radius="lg"
            onPress={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReportFilterBar;
