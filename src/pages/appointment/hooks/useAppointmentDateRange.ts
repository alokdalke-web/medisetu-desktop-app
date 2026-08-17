/**
 * useAppointmentDateRange.ts
 *
 * Manages the list/card view date range state with debounced query sync.
 * Keeps date-range logic out of the main component.
 * Supports URL search params: ?date=YYYY-MM-DD or ?startDate=...&endDate=...
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { getTodayIST } from "../../../utils/date.utils";

export interface UseAppointmentDateRangeReturn {
  displayListStartDate: string;
  displayListEndDate: string;
  setDisplayListStartDate: (ymd: string) => void;
  setDisplayListEndDate: (ymd: string) => void;
  listStartDate: string;
  listEndDate: string;
  setListStartDate: (ymd: string) => void;
  setListEndDate: (ymd: string) => void;
}

function getInitialDate(searchParams: URLSearchParams): { start: string; end: string } {
  const urlDate = searchParams.get("date");
  const urlStartDate = searchParams.get("startDate");
  const urlEndDate = searchParams.get("endDate");

  const start = urlDate || urlStartDate || getTodayIST();
  const end = urlDate || urlEndDate || getTodayIST();
  return { start, end };
}

export const useAppointmentDateRange = (): UseAppointmentDateRangeReturn => {
  const [searchParams] = useSearchParams();
  const { start: initialStart, end: initialEnd } = getInitialDate(searchParams);

  const [displayListStartDate, setDisplayListStartDate] = useState<string>(initialStart);
  const [displayListEndDate, setDisplayListEndDate] = useState<string>(initialEnd);
  const [listStartDate, setListStartDate] = useState<string>(initialStart);
  const [listEndDate, setListEndDate] = useState<string>(initialEnd);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevParamsRef = useRef<string>("");

  // Clean up stale localStorage date keys on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("appointmentListStartDate");
    localStorage.removeItem("appointmentListEndDate");
    localStorage.removeItem("appointmentCalStartDate");
    localStorage.removeItem("appointmentCalEndDate");
  }, []);

  // Sync dates from URL params when they change (e.g., navigating from dashboard)
  useEffect(() => {
    const urlDate = searchParams.get("date");
    const urlStartDate = searchParams.get("startDate");
    const urlEndDate = searchParams.get("endDate");

    const paramsKey = `${urlDate || ""}|${urlStartDate || ""}|${urlEndDate || ""}`;
    if (paramsKey === prevParamsRef.current) return;
    prevParamsRef.current = paramsKey;

    // Only override state if URL params are explicitly provided
    if (urlDate || urlStartDate || urlEndDate) {
      const start = urlDate || urlStartDate || getTodayIST();
      const end = urlDate || urlEndDate || getTodayIST();
      setDisplayListStartDate(start);
      setDisplayListEndDate(end);
      setListStartDate(start);
      setListEndDate(end);
    }
  }, [searchParams]);

  // Debounce display dates → query dates
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setListStartDate(displayListStartDate);
      setListEndDate(displayListEndDate);
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [displayListStartDate, displayListEndDate]);

  return {
    displayListStartDate,
    displayListEndDate,
    setDisplayListStartDate,
    setDisplayListEndDate,
    listStartDate,
    listEndDate,
    setListStartDate,
    setListEndDate,
  };
};
