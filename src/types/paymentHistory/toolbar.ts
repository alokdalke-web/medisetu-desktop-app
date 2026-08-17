import type { ReactNode, RefObject } from "react";
import type { TabKey } from "./list";

export interface StatCardData {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  iconClassName: string;
  detailClassName: string;
}

export interface PaymentStatCardsProps {
  stats: StatCardData[];
  isLoading: boolean;
}

export type FilterOption = { value: string; label: string };

export interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  allLabel?: string;
  widthClass?: string;
}

export interface TypeFilterDropdownProps {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: RefObject<HTMLDivElement | null>;
  counts: Record<TabKey, number>;
}

export interface PaymentToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isLoading: boolean;
  startDate: string;
  endDate: string;
  onApplyRange: (s: string, e: string) => void;
  onShiftDate: (direction: "prev" | "next") => void;
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  isTypeOpen: boolean;
  setIsTypeOpen: (open: boolean) => void;
  typeDropdownRef: RefObject<HTMLDivElement | null>;
  counts: Record<TabKey, number>;
  statusOptions: FilterOption[];
  paymentStatusFilter: string | null;
  setPaymentStatusFilter: (v: string | null) => void;
  modeOptions: FilterOption[];
  paymentModeFilter: string | null;
  setPaymentModeFilter: (v: string | null) => void;
  isDoctorUser: boolean;
  doctorOptions: FilterOption[];
  doctorFilter: string | null;
  setDoctorFilter: (v: string | null) => void;
}
