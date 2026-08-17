import type { RefObject } from "react";
import type { TabKey, ViewMode } from "../../pages/appointment/hooks/useAppointmentFilters";
import type { StatCardData } from "../../pages/appointment/hooks/useAppointmentStats";

export interface QueueStatusBarProps {
  hasTimeToNextData: boolean;
  timeToNextMinutes: number | null;
  hasQueueData: boolean;
  queueCumulativeDelay: number;
  onDismiss: () => void;
}

export interface AppointmentStatCardsProps {
  stats: StatCardData[];
  isLoading: boolean;
}

export interface ViewToggleProps {
  view: ViewMode;
  onSelectList: () => void;
  onSelectCard: () => void;
  onSelectCalendar: () => void;
}

export interface StatusFilterDropdownProps {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: RefObject<HTMLDivElement | null>;
  statusLabel: (key: string) => string;
}

export interface AppointmentToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isLoading: boolean;
  activeStart: string;
  activeEnd: string;
  onApplyRange: (startYmd: string, endYmd: string) => void;
  onShiftDateRange: (direction: "prev" | "next") => void;
  statusDropdownRef: RefObject<HTMLDivElement | null>;
  isStatusOpen: boolean;
  setIsStatusOpen: (open: boolean) => void;
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  statusLabel: (key: string) => string;
  view: ViewMode;
  onSelectList: () => void;
  onSelectCard: () => void;
  onSelectCalendar: () => void;
}
