// src/pages/appointment/Appointment.tsx
import { addToast } from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiList,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router";
import AppButton from "../../components/shared/AppButton";
import SearchField from "../../components/shared/SearchField";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { addDays, parseYmdLocal, toYmd } from "../../utils/date.utils";

import bxCalendar from "../../../public/assets/icons/bx_calendar.png";
import AppointmentCalendarView from "./AppointmentCalendarView";
import AppointmentListView from "./AppointmentListView";

import { mapAppointmentFromApi } from "../../utils/appointment.mapper";
import { formatDurationLabel } from "./new-appointment/helpers/dateTimeHelpers";
import { useAppointmentFilters, STATUS_TABS } from "./hooks/useAppointmentFilters";
import { useAppointmentRealtimeSync } from "./hooks/useAppointmentRealtimeSync";
import { useAppointmentDateRange } from "./hooks/useAppointmentDateRange";
import { useAppointmentQueries } from "./hooks/useAppointmentQueries";
import { isNetworkError } from "../../utils/getApiErrorText";
import { useCalendarEvents } from "./hooks/useCalendarEvents";
import { useAppointmentStats } from "./hooks/useAppointmentStats";
import { useAppointmentCalendar } from "./hooks/useAppointmentCalendar";
import BannerDisplay from "../../components/banners/BannerDisplay";
import { useClinicQueueRealtime } from "../../hooks/useClinicQueueRealtime";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";

import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { appointmentListTips } from "../../constants/featureTips";

// ─── Presentational sub-components ───────────────────────────────────────────

const IconBtn: React.FC<{
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "grid h-10 w-10 place-items-center rounded-lg border text-[17px] shadow-sm transition",
      active
        ? "border-primary bg-primary/10 text-primary dark:text-white"
        : "border-gray-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
    ].join(" ")}
  >
    {children}
  </button>
);

const StatCard: React.FC<{
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  iconClassName: string;
  detailClassName: string;
}> = ({ label, value, detail, icon, iconClassName, detailClassName }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:px-5">
    <div className="flex items-center gap-4">
      <div className={["grid h-12 w-12 shrink-0 place-items-center rounded-full", iconClassName].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-500 dark:text-white">{label}</p>
        <p className="mt-0.5 text-[24px] font-bold leading-none text-slate-900 dark:text-white">{value}</p>
        <p className={["mt-1 truncate text-[12px]", detailClassName].join(" ")}>{detail}</p>
      </div>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const Appointment: React.FC = () => {
  const navigate = useNavigate();
  const effectiveUserType = useEffectiveUserType();

  const isAdminOrReception = ["admin", "receptionist"].includes(
    String(effectiveUserType).toLowerCase(),
  );
  const isEffectivelyDoctor =
    String(effectiveUserType).toLowerCase() === "doctor";

  // ── Realtime sync + clock tick ─────────────────────────────────────────────
  const { now } = useAppointmentRealtimeSync();

  // ── Real-time queue updates (clinic room) ─────────────────────────────────
  const { data: clinicDataForQueue } = useGetAllClinicsQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const clinicId = (clinicDataForQueue as any)?.clinic?.id;

  // Resolve doctorId for queue REST API:
  // - Doctor: their own userId
  // - Admin/Reception: the userId from the clinic profile (primary doctor)
  const authUser = useSelector((state: { auth: { user: any } }) => state.auth.user);
  const queueDoctorId = isEffectivelyDoctor
    ? authUser?.id
    : (clinicDataForQueue as any)?.clinic?.userId ?? authUser?.id;

  const {
    queueAppointments,
    cumulativeDelay: queueCumulativeDelay,
    timeToNextMinutes,
    hasQueueData,
    hasTimeToNextData,
  } = useClinicQueueRealtime({ clinicId, doctorId: queueDoctorId });

  // ── Filter state (search, tab, pagination, sort, view mode) ───────────────
  const {
    search, setSearch, debouncedSearch,
    tab, setTab,
    isStatusOpen, setIsStatusOpen, statusDropdownRef,
    page, setPage,
    rowsPerPage, setRowsPerPage,
    sortDir, toggleSort,
    view, setView,
  } = useAppointmentFilters();

  // ── List/card date range ───────────────────────────────────────────────────
  const {
    displayListStartDate, setDisplayListStartDate,
    displayListEndDate, setDisplayListEndDate,
    listStartDate, listEndDate,
  } = useAppointmentDateRange();

  // ── Doctor selection (calendar) ────────────────────────────────────────────
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [showNewAppointmentHint, setShowNewAppointmentHint] = useState(true);
  const [queueDismissed, setQueueDismissed] = useState(false);

  // ── Calendar state (dates, navigation, week days, time-line) ──────────────
  // dynamicHours is derived from queries; we pass a stable default here and
  // the calendar hook recalculates currentTimeLine whenever it changes.
  const {
    calMode, setCalMode,
    selectedDateYmd, setSelectedDateYmd,
    calStartDate, calEndDate,
    displayCalStartDate, setDisplayCalStartDate,
    displayCalEndDate, setDisplayCalEndDate,
    currentWeekStart, weekDays, selectedDate, slotHeight,
    goPrevWeek, goNextWeek, goThisWeek,
    goPrevDay, goNextDay, goTodayDay, onJumpToDate,
    currentTimeLine,
    syncPatientsForAutoSelect,
  } = useAppointmentCalendar(now);

  // ── Queries (list, calendar, availability, doctors) ───────────────────────
  const {
    patientsRawList,
    listLoading, listFetching, listIsError, listError,
    patientsRawCal,
    calLoading, calFetching, calIsError, calError,
    totalRecords, totalPages,
    tabCounts,
    clinicAppointmentDetails,
    doctorAvailability,
    doctorsList,
    doctorData,
  } = useAppointmentQueries({
    view,
    calMode,
    tab,
    debouncedSearch,
    page,
    rowsPerPage,
    listStartDate,
    listEndDate,
    calStartDate,
    calEndDate,
    selectedDateYmd,
    selectedDoctorId,
    isAdminOrReception,
    isEffectivelyDoctor,
  });

  // ── Calendar events (derived from patientsRawCal) ─────────────────────────
  const { dynamicHours, eventsByDay, allEventsByDay } = useCalendarEvents({
    patientsRawCal,
    weekDays,
    selectedDoctorId,
    doctorAvailability,
  });

  // ── Mapped rows (shared by stats + sorted list) ───────────────────────────
  const mappedRows = useMemo(
    () => patientsRawList.map(mapAppointmentFromApi),
    [patientsRawList],
  );

  // ── Appointment stats (stat cards) ────────────────────────────────────────
  const appointmentStats = useAppointmentStats({
    view,
    rows: mappedRows,
    patientsRawCal,
    tabCounts,
    totalRecords,
    clinicAppointmentDetails,
  });

  const sortedRows = useMemo(() => {
    const nowMs = Date.now();

    return patientsRawList
      .map((patient, idx) => {
        const mapped = mappedRows[idx];
        const apptDate = patient.appointment?.appointmentDate ?? "";
        const apptTime = patient.appointment?.appointmentTime ?? "";
        const isPlaceholder = apptTime === "23:59" || apptTime === "23:59:00";
        const isoStr =
          apptDate && apptTime && !isPlaceholder
            ? `${apptDate.slice(0, 10)}T${apptTime.slice(0, 5)}:00`
            : apptDate
              ? apptDate.slice(0, 10)
              : "";
        const dt = isoStr ? new Date(isoStr).getTime() : 0;
        return { ...mapped, dateTime: dt };
      })
      .sort((a, b) => {
        const aFuture = a.dateTime >= nowMs;
        const bFuture = b.dateTime >= nowMs;
        if (aFuture && !bFuture) return -1;
        if (!aFuture && bFuture) return 1;
        return a.dateTime - b.dateTime;
      });
  }, [patientsRawList, mappedRows]);

  // Queue engine only works for today — hide queue widgets when viewing other dates
  const todayYmd = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const isViewingToday = view === "calendar"
    ? selectedDateYmd === todayYmd
    : listStartDate === todayYmd && listEndDate === todayYmd;

  // ── Memoized queue wait data (prevents new Map on every render) ────────────
  const queueWaitDataMemo = useMemo(() => ({
    waitByAppointmentId: new Map(
      queueAppointments.map((a) => [a.appointmentId, a.estimatedWaitMinutes])
    ),
    hasData: hasQueueData && isViewingToday && !queueDismissed,
  }), [queueAppointments, hasQueueData, isViewingToday, queueDismissed]);

  // ── Sync auto-select date when calendar patients load ─────────────────────
  useEffect(() => {
    if (view === "calendar") syncPatientsForAutoSelect(patientsRawCal);
  }, [patientsRawCal, view, syncPatientsForAutoSelect]);

  // ── Force doctor to week mode ──────────────────────────────────────────────
  useEffect(() => {
    if (isEffectivelyDoctor && calMode !== "week") setCalMode("week");
  }, [isEffectivelyDoctor, calMode, setCalMode]);

  // ── Auto-select first doctor in calendar (admin/reception) ────────────────
  useEffect(() => {
    if (isAdminOrReception && view === "calendar" && !selectedDoctorId && doctorsList.length > 0) {
      setSelectedDoctorId(doctorsList[0].id);
    }
  }, [isAdminOrReception, view, selectedDoctorId, doctorsList]);

  // ── Reset page when filters change ────────────────────────────────────────
  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages, setPage]);

  useEffect(() => {
    setPage(1);
  }, [tab, rowsPerPage, search, listStartDate, listEndDate]);

  // ── New appointment hint auto-hide ────────────────────────────────────────
  useEffect(() => {
    if (!showNewAppointmentHint) return;
    const timer = window.setTimeout(() => setShowNewAppointmentHint(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showNewAppointmentHint]);

  // ── Keyboard shortcut: "A" → new appointment ──────────────────────────────
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable ||
        !!el.closest('input, textarea, select, [contenteditable="true"]')
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      if (String(e.key).toLowerCase() === "a") {
        e.preventDefault();
        navigate("/appointment/new");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // ── Error toast ───────────────────────────────────────────────────────────
  useEffect(() => {
    const isError = view === "calendar" ? calIsError : listIsError;
    const error = view === "calendar" ? calError : listError;
    if (isError && !isNetworkError(error)) {
      addToast({
        title: "Failed to load appointments",
        description:
          (error as { data?: { message?: string } })?.data?.message ??
          (error as { error?: string })?.error ??
          "Something went wrong",
        color: "danger",
        variant: "flat",
      });
    }
  }, [listIsError, listError, calIsError, calError, view]);

  // ── Derived UI state ──────────────────────────────────────────────────────
  const isLoading = view === "calendar"
    ? calLoading || calFetching
    : listLoading || listFetching;

  // Show skeleton only on true initial load (no data yet), not on tab switch / refetch
  const showListSkeleton = listLoading && sortedRows.length === 0;

  const activeStart = view === "calendar" ? displayCalStartDate : displayListStartDate;
  const activeEnd = view === "calendar" ? displayCalEndDate : displayListEndDate;

  const statusLabel = (key: string): string => {
    const count = tabCounts?.[key.toLowerCase()];
    const base = key === "all" ? "Status - All" : `Status - ${String(key)}`;
    return typeof count === "number" ? `${base} (${count})` : base;
  };

  const onApplyRange = (startYmd: string, endYmd: string) => {
    if (!startYmd || !endYmd) return;

    if (view === "calendar") {
      setDisplayCalStartDate(startYmd);
      setDisplayCalEndDate(endYmd);
      setSelectedDateYmd(startYmd);
      return;
    }

    setDisplayListStartDate(startYmd);
    setDisplayListEndDate(endYmd);
  };

  const shiftDateRangeByOneDay = (direction: "prev" | "next") => {
    const shift = direction === "prev" ? -1 : 1;

    if (view === "calendar") {
      const baseDate =
        calMode === "day"
          ? parseYmdLocal(selectedDateYmd)
          : parseYmdLocal(displayCalStartDate);

      const nextDate = addDays(baseDate, shift);
      const nextYmd = toYmd(nextDate);

      setSelectedDateYmd(nextYmd);
      setDisplayCalStartDate(nextYmd);
      setDisplayCalEndDate(nextYmd);
      return;
    }

    const nextDate = addDays(parseYmdLocal(displayListStartDate), shift);
    const nextYmd = toYmd(nextDate);
    setDisplayListStartDate(nextYmd);
    setDisplayListEndDate(nextYmd);
  };

  const handleSlotClick = (date: string, hour: number, minute: number) => {
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const doctorId =
      selectedDoctorId ||
      (doctorData as { result?: { id?: string; _id?: string } })?.result?.id ||
      (doctorData as { result?: { _id?: string } })?.result?._id ||
      "";
    navigate(`/appointment/new?date=${date}&time=${time}${doctorId ? `&doctorId=${doctorId}` : ""}`);
  };

  const handleDoctorSlotClick = (
    date: string,
    hour: number,
    minute: number,
    doctorId: string,
  ) => {
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const resolvedDoctorId = doctorId || selectedDoctorId || "";
    navigate(`/appointment/new?date=${date}&time=${time}${resolvedDoctorId ? `&doctorId=${resolvedDoctorId}` : ""}`);
  };

  const goToDetails = (appointmentId: string) => {
    if (!appointmentId) return;
    navigate(`/appointment/${encodeURIComponent(appointmentId)}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* Page header */}
      {/* ── APPOINTMENT_HEADER Banner ── */}
      <BannerDisplay placement="APPOINTMENT_HEADER" className="mb-4" />
      <div id="tour-reception-appointments-overview" className="scroll-mt-6">
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              All Appointments
            </h2>
            <FeatureInfoTip
              title="Appointment Tips"
              tips={appointmentListTips}
              guideSection={isEffectivelyDoctor ? "doctor" : "appointments-guide"}
              linkLabel="Read full appointments guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
            View and manage all patient appointments
          </p>
        </div>

        {/* Stat cards */}
        <div
          className={[
            "stats-scroll",
            isLoading ? "opacity-75 transition-opacity" : "",
          ].join(" ")}
        >
          {appointmentStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>

      <div id="tour-admin-appointments-page" className="mt-5 space-y-4 scroll-mt-6">
        {/* Real-time queue indicators — status bar style */}
        {isViewingToday && !queueDismissed && (hasQueueData || hasTimeToNextData) && (
          <div className="flex items-center justify-between border-l-4 border-primary bg-slate-50/50 py-2 pl-3 pr-2 dark:bg-[#111726]/30">
            <div className="flex min-w-0 flex-1 items-center gap-6">
              {hasTimeToNextData && (
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Next</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                      {timeToNextMinutes === 0
                        ? "Now"
                        : timeToNextMinutes != null
                          ? formatDurationLabel(timeToNextMinutes)
                          : "—"}
                    </span>
                  </div>
                </div>
              )}

              {hasQueueData && (
                <div className="flex items-center gap-2">
                  <div className={[
                    "flex h-6 w-6 items-center justify-center rounded",
                    queueCumulativeDelay > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
                  ].join(" ")}>
                    {queueCumulativeDelay > 0 ? (
                      <svg className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {queueCumulativeDelay > 0 ? "Delay" : "Status"}
                    </span>
                    <span className={[
                      "text-[14px] font-bold",
                      queueCumulativeDelay > 0 ? "text-orange-700 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-400"
                    ].join(" ")}>
                      {queueCumulativeDelay > 0 ? `+${formatDurationLabel(queueCumulativeDelay)}` : "On time"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setQueueDismissed(true)}
              className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
              title="Dismiss"
              aria-label="Dismiss queue status"
            >
              <FiX size={13} />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {/* Search */}
          <div className="w-full lg:w-[320px]">
            <SearchField
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search patient, doctor or mobile number..."
              className="w-full"
              classNames={{
                inputWrapper:
                  "h-11 rounded-lg border border-slate-200 bg-white px-3 shadow-sm " +
                  "data-[hover=true]:border-slate-300 data-[focus=true]:border-primary " +
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                input:
                  "text-[14px] text-slate-700 placeholder:text-[14px] placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
              }}
            />
          </div>

          {/* Date range navigation */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => shiftDateRangeByOneDay("prev")}
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white",
                "text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                "dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31] dark:hover:text-white",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
              title="Previous date"
              aria-label="Previous date"
            >
              <FiChevronLeft size={16} />
            </button>

            <div className="flex min-w-0 flex-1 items-center sm:flex-none [&>div]:!w-full sm:[&>div]:!w-auto [&_button]:!h-10 [&_button]:!rounded-lg [&_button]:!border-slate-200 [&_button]:!px-3 [&_button]:!shadow-sm [&_button_span]:!text-[13px]">
              <DashboardDateRangePicker
                startYmd={activeStart}
                endYmd={activeEnd}
                isFetching={isLoading}
                onApply={(s, e) => onApplyRange(s, e)}
              />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => shiftDateRangeByOneDay("next")}
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white",
                "text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                "dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31] dark:hover:text-white",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
              title="Next date"
              aria-label="Next date"
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          {/* Status filter dropdown */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[190px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsStatusOpen(false); }}
              aria-expanded={isStatusOpen}
              aria-label="Appointment status filter"
              className={[
                "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white",
                "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
                "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                "outline-none transition",
                "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              ].join(" ")}
            >
              <span className="truncate text-left">{statusLabel(tab)}</span>
              <FiChevronDown
                className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 dark:text-white ${isStatusOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isStatusOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {STATUS_TABS.map((statusKey) => {
                  const isActive = tab === statusKey;
                  return (
                    <button
                      key={statusKey}
                      type="button"
                      onClick={() => { setTab(statusKey); setIsStatusOpen(false); }}
                      className={[
                        "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                        isActive
                          ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                          : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                      ].join(" ")}
                    >
                      <span className="line-clamp-2">{statusLabel(statusKey)}</span>
                      {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side: view toggles + new appointment */}
        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:justify-end">
          <div className="hidden items-center gap-2 sm:flex">
            <IconBtn active={view === "list"} onClick={() => setView("list")}>
              <FiList />
            </IconBtn>
            <IconBtn active={view === "card"} onClick={() => setView("card")}>
              <FiGrid />
            </IconBtn>
            <IconBtn
              active={view === "calendar"}
              onClick={() => {
                setView("calendar");
                if (isEffectivelyDoctor) setCalMode("week");
              }}
            >
              <img
                src={bxCalendar}
                alt="Calendar"
                className="h-[18px] w-[18px] object-contain"
                draggable={false}
              />
            </IconBtn>
          </div>

          <div id="tour-add-appointment-btn" className="relative shrink-0">
            <div
              className={[
                "pointer-events-none absolute bottom-full right-0 z-20 mb-3 hidden lg:block transition-all duration-500",
                showNewAppointmentHint ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              ].join(" ")}
            >
              <div className="hidden whitespace-nowrap rounded-full border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-50 px-4 py-2 text-[12px] font-medium text-slate-800 shadow-[0_8px_24px_rgba(20,184,166,0.18)] ring-1 ring-teal-100 dark:border-[#2fae8e]/70 dark:bg-[#111726] dark:bg-none dark:text-white dark:shadow-[0_14px_32px_rgba(0,0,0,0.45)] dark:ring-[#2fae8e]/20">
                Press{" "}
                <span className="mx-1 inline-flex min-w-[22px] items-center justify-center rounded-md bg-teal-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  A
                </span>{" "}
                for New Appointment
              </div>
              <div className="absolute right-5 top-full h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-teal-200 bg-white dark:border-[#2fae8e]/70 dark:bg-[#111726]" />
            </div>

            <AppButton
              text="+ New Appointment"
              className="h-10 shrink-0 whitespace-nowrap bg-primary px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover"
              onPress={() => navigate("/appointment/new")}
            />
          </div>
        </div>
        </div>

        {/* Body */}
        <div>
          {view === "calendar" ? (
            <AppointmentCalendarView
              goPrevWeek={goPrevWeek}
              goNextWeek={goNextWeek}
              goThisWeek={goThisWeek}
              currentWeekStart={currentWeekStart}
              weekDays={weekDays}
              hours={dynamicHours.hours}
              minHour={dynamicHours.minHour}
              slotHeight={slotHeight}
              eventsByDay={eventsByDay}
              currentTimeLine={currentTimeLine}
              handleSlotClick={handleSlotClick}
              goToDetails={goToDetails}
              doctorAvailability={doctorAvailability}
              mode={calMode}
              isAdminOrReception={isAdminOrReception}
              doctors={doctorsList}
              selectedDate={selectedDate}
              onPrevDay={goPrevDay}
              onNextDay={goNextDay}
              onTodayDay={goTodayDay}
              onJumpToDate={onJumpToDate}
              onToggleMode={(mode: "week" | "day") => {
                if (isEffectivelyDoctor && mode === "day") return;
                setCalMode(mode);
              }}
              onDoctorClick={(doctorId: string) => {
                setSelectedDoctorId(doctorId || null);
                if (doctorId) setCalMode("week");
              }}
              handleDoctorSlotClick={handleDoctorSlotClick}
              selectedDoctorId={selectedDoctorId}
              allEventsByDay={allEventsByDay}
            />
          ) : (
            <AppointmentListView
              layout={view}
              showSkeleton={showListSkeleton}
              isRefreshing={listFetching && sortedRows.length > 0}
              rows={sortedRows}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              goToDetails={goToDetails}
              sortDir={sortDir}
              onSortStatus={toggleSort}
              queueWaitData={queueWaitDataMemo}
              noShowPolicyActive={(clinicDataForQueue as any)?.noShowPolicyActive ?? false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Appointment;
