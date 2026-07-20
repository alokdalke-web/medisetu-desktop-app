import React from "react";
import { Button } from "@heroui/react";
import { FiCalendar, FiFilter, FiDownload } from "react-icons/fi";

interface FilterBarProps {
  dateRange?: string;
  compareWith?: string;
  department?: string;
  onDateRangeChange?: (value: string) => void;
  onCompareWithChange?: (value: string) => void;
  onDepartmentChange?: (value: string) => void;
  onApplyFilters?: () => void;
  onExport?: () => void;
  showExport?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  dateRange = "May 12, 2025 - May 18, 2025",
  compareWith = "May 5, 2025 - May 11, 2025",
  department = "All Departments",
  onDateRangeChange,
  onCompareWithChange,
  onDepartmentChange,
  onApplyFilters,
  onExport,
  showExport = true,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Date Range
          </label>
          <div className="relative">
            <input
              type="text"
              value={dateRange}
              onChange={(e) => onDateRangeChange?.(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Select date range"
            />
            <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Compare With
          </label>
          <div className="relative">
            <input
              type="text"
              value={compareWith}
              onChange={(e) => onCompareWithChange?.(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Select comparison period"
            />
            <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => onDepartmentChange?.(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          >
            <option value="All Departments">All Departments</option>
            <option value="General Physician">General Physician</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            color="primary"
            className="bg-primary text-white px-6"
            startContent={<FiFilter className="text-lg" />}
            onClick={onApplyFilters}
          >
            Apply Filters
          </Button>
          {showExport && (
            <Button
              variant="bordered"
              className="border-slate-300"
              startContent={<FiDownload className="text-lg" />}
              onClick={onExport}
            >
              Export
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
