import type { ChangeEvent } from "react";
import type { DateRange } from "../../components/reports/ReportFilterBar";

export interface PatientFiltersToolbarProps {
  query: string;
  onQueryChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onQueryClear: () => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  gender: string;
  setGender: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  statusOptions: string[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  minAge: number | undefined;
  setMinAge: (v: number | undefined) => void;
  maxAge: number | undefined;
  setMaxAge: (v: number | undefined) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}
