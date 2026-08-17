export type NoShowViewMode = "grid" | "list";

export interface NoShowToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (updater: boolean | ((prev: boolean) => boolean)) => void;
  startDate: string;
  endDate: string;
  isFetching: boolean;
  onApplyRange: (start: string, end: string) => void;
  onShiftDate: (direction: "prev" | "next") => void;
  viewMode: NoShowViewMode;
  setViewMode: (mode: NoShowViewMode) => void;
}
