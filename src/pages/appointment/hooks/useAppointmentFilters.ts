/**
 * useAppointmentFilters.ts
 * Manages all filter state: search, status tab, pagination, sort, and view mode.
 * Supports URL search params: ?status=Pending|Confirmed|Completed|Cancelled
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import useDebounce from "../../../hooks/useDebounce";

export type TabKey = string;
export type PageSize = 6 | 10 | 15;
export type ViewMode = "list" | "card" | "calendar";

const MOBILE_BREAKPOINT = "(max-width: 639px)";

const getDefaultView = (): ViewMode =>
  typeof window !== "undefined" && window.matchMedia(MOBILE_BREAKPOINT).matches
    ? "card"
    : "list";

export const STATUS_TABS: TabKey[] = [
  "all",
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

export interface AppointmentFilters {
  // Search
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;

  // Status tab
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  isStatusOpen: boolean;
  setIsStatusOpen: (open: boolean) => void;
  statusDropdownRef: React.RefObject<HTMLDivElement | null>;

  // Pagination
  page: number;
  setPage: (page: number) => void;
  rowsPerPage: PageSize;
  setRowsPerPage: (size: PageSize) => void;

  // Sort
  sortDir: "asc" | "desc" | null;
  toggleSort: () => void;

  // View mode
  view: ViewMode;
  setView: (mode: ViewMode) => void;
}

export const useAppointmentFilters = (): AppointmentFilters => {
  const [searchParams] = useSearchParams();

  // Read initial status from URL if present
  const urlStatus = searchParams.get("status");
  const initialTab: TabKey =
    urlStatus && STATUS_TABS.includes(urlStatus) ? urlStatus : "all";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<PageSize>(10);

  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const toggleSort = () =>
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));

  const [view, setViewState] = useState<ViewMode>(() => getDefaultView());
  // Once the user explicitly picks a view we stop auto-forcing it on resize,
  // so their choice (e.g. the scrollable table on a phone) is respected.
  const userChoseViewRef = useRef(false);

  const setView = useCallback((mode: ViewMode) => {
    userChoseViewRef.current = true;
    setViewState(mode);
  }, []);

  // Pick a sensible default per breakpoint (card on phones, table on desktop),
  // but never override a view the user has explicitly selected.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const syncView = () => {
      if (userChoseViewRef.current) return;
      setViewState(mediaQuery.matches ? "card" : "list");
    };

    mediaQuery.addEventListener("change", syncView);
    return () => mediaQuery.removeEventListener("change", syncView);
  }, []);

  // Close status dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [tab, rowsPerPage, search]);

  return {
    search,
    setSearch,
    debouncedSearch,
    tab,
    setTab,
    isStatusOpen,
    setIsStatusOpen,
    statusDropdownRef,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    sortDir,
    toggleSort,
    view,
    setView,
  };
};
