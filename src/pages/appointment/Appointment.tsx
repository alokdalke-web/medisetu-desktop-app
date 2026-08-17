import { addToast } from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { addDays, getTodayLocal, parseYmdLocal, toYmd } from "../../utils/date.utils";

import AppointmentCalendarView from "./AppointmentCalendarView";
import AppointmentListView from "./AppointmentListView";
import AppointmentStatCards from "./components/toolbar/AppointmentStatCards";
import AppointmentToolbar from "./components/toolbar/AppointmentToolbar";
import NewAppointmentButton from "./components/toolbar/NewAppointmentButton";
import QueueStatusBar from "./components/toolbar/QueueStatusBar";

import { mapAppointmentFromApi } from "../../utils/appointment.mapper";
import { useAppointmentFilters } from "./hooks/useAppointmentFilters";
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
import PageHeader from "../../components/common/PageHeader";
import { appointmentListTips } from "../../constants/featureTips";
import SchedulingConflictsModal from "./components/modals/SchedulingConflictsModal";
import { FiAlertTriangle } from "react-icons/fi";

const Appointment: React.FC = () => {
  const navigate = useNavigate();
  const effectiveUserType = useEffectiveUserType();

  const isAdminOrReception = ["admin", "receptionist"].includes(
    String(effectiveUserType).toLowerCase(),
  );
  const isEffectivelyDoctor =
    String(effectiveUserType).toLowerCase() === "doctor";
  const showDraftIndicators =
    !String(effectiveUserType).toLowerCase().includes("reception");

  useAppointmentRealtimeSync();

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

  const {
    search, setSearch, debouncedSearch,
    tab, setTab,
    isStatusOpen, setIsStatusOpen, statusDropdownRef,
    page, setPage,
    rowsPerPage, setRowsPerPage,
    sortDir, toggleSort,
    view, setView,
  } = useAppointmentFilters();

  const {
    displayListStartDate, setDisplayListStartDate,
    displayListEndDate, setDisplayListEndDate,
    listStartDate, listEndDate,
  } = useAppointmentDateRange();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [showNewAppointmentHint, setShowNewAppointmentHint] = useState(true);
  const [queueDismissed, setQueueDismissed] = useState(false);
  // Mobile-only: collapse date-range + status behind a "Filters" button.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // [Electron] Scheduling conflict detection (local SQLite-backed)
  const [conflictCount, setConflictCount] = useState(0);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const fetchConflictCount = async () => {
    try {
      if ((window as any).ipcAPI) {
        const count = await (window as any).ipcAPI.appointment.getConflictCount();
        setConflictCount(count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch conflict count:", error);
    }
  };

  useEffect(() => {
    fetchConflictCount();
  }, []);

  const {
    calMode, setCalMode,
    selectedDateYmd, setSelectedDateYmd,
    calStartDate, calEndDate,
    displayCalStartDate, setDisplayCalStartDate,
    displayCalEndDate, setDisplayCalEndDate,
    currentWeekStart, weekDays, selectedDate, slotHeight,
    goPrevWeek, goNextWeek, goThisWeek,
    goPrevDay, goNextDay, goTodayDay, onJumpToDate,

    syncPatientsForAutoSelect,
  } = useAppointmentCalendar();

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

  const { dynamicHours, eventsByDay, allEventsByDay } = useCalendarEvents({
    patientsRawCal,
    weekDays,
    selectedDoctorId,
    doctorAvailability,
  });

  const mappedRows = useMemo(
    () => patientsRawList.map(mapAppointmentFromApi),
    [patientsRawList],
  );

  const appointmentStats = useAppointmentStats({
    view,
    rows: mappedRows,
    patientsRawCal,
    tabCounts,
    totalRecords,
    clinicAppointmentDetails,
  });

  // Preserve the backend's ordering (status-priority — active appointments
  // first, terminal ones last — then chronological within each tier; see
  // getAllClinicAppointments' ORDER BY). This used to re-sort by
  // future/past + raw time only, which silently discarded the status
  // ordering the backend now provides on every response.
  const sortedRows = mappedRows;

  // Queue engine only works for today — hide queue widgets when viewing other dates
  const todayYmd = useMemo(() => getTodayLocal(), []);
  const isViewingToday = view === "calendar"
    ? selectedDateYmd === todayYmd
    : listStartDate === todayYmd && listEndDate === todayYmd;

  const queueWaitDataMemo = useMemo(() => ({
    waitByAppointmentId: new Map(
      queueAppointments.map((a) => [a.appointmentId, a.estimatedWaitMinutes])
    ),
    hasData: hasQueueData && isViewingToday && !queueDismissed,
  }), [queueAppointments, hasQueueData, isViewingToday, queueDismissed]);

  useEffect(() => {
    if (view === "calendar") syncPatientsForAutoSelect(patientsRawCal);
  }, [patientsRawCal, view, syncPatientsForAutoSelect]);

  useEffect(() => {
    if (isEffectivelyDoctor && calMode !== "week") setCalMode("week");
  }, [isEffectivelyDoctor, calMode, setCalMode]);

  useEffect(() => {
    if (isAdminOrReception && view === "calendar" && !selectedDoctorId && doctorsList.length > 0) {
      setSelectedDoctorId(doctorsList[0].id);
    }
  }, [isAdminOrReception, view, selectedDoctorId, doctorsList]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages, setPage]);

  useEffect(() => {
    setPage(1);
  }, [tab, rowsPerPage, search, listStartDate, listEndDate, setPage]);

  useEffect(() => {
    if (!showNewAppointmentHint) return;
    const timer = window.setTimeout(() => setShowNewAppointmentHint(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showNewAppointmentHint]);

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

  return (
    <div className="w-full min-w-0 px-0 py-0">
      <BannerDisplay placement="APPOINTMENT_HEADER" className="mb-4" />
      <div id="tour-reception-appointments-overview" className="scroll-mt-6">
        <PageHeader
          title="All Appointments"
          description="View and manage all patient appointments"
          className="mb-5"
          titleExtra={
            <FeatureInfoTip
              title="Appointment Tips"
              tips={appointmentListTips}
              guideSection={isEffectivelyDoctor ? "doctor" : "appointments-guide"}
              linkLabel="Read full appointments guide"
            />
          }
          actions={
            <div className="flex items-center gap-3">
              {conflictCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConflictModalOpen(true)}
                  className="h-10 shrink-0 whitespace-nowrap bg-warning-50 px-4 flex items-center gap-2 text-[13px] font-semibold text-warning-700 shadow-sm border border-warning-200 hover:bg-warning-100 rounded-lg transition"
                >
                  <FiAlertTriangle size={16} />
                  <span className="bg-warning-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs px-1">
                    {conflictCount}
                  </span>
                  Conflicts
                </button>
              )}
              <NewAppointmentButton
                showHint={showNewAppointmentHint}
                onPress={() => navigate("/appointment/new")}
              />
            </div>
          }
        />

        <AppointmentStatCards stats={appointmentStats} isLoading={isLoading} />
      </div>

      <div id="tour-admin-appointments-page" className="mt-4 space-y-3 scroll-mt-6 sm:mt-5 sm:space-y-4">
        {isViewingToday && !queueDismissed && (hasQueueData || hasTimeToNextData) && (
          <QueueStatusBar
            hasTimeToNextData={hasTimeToNextData}
            timeToNextMinutes={timeToNextMinutes}
            hasQueueData={hasQueueData}
            queueCumulativeDelay={queueCumulativeDelay}
            onDismiss={() => setQueueDismissed(true)}
          />
        )}

        <AppointmentToolbar
          search={search}
          setSearch={setSearch}
          mobileFiltersOpen={mobileFiltersOpen}
          setMobileFiltersOpen={setMobileFiltersOpen}
          isLoading={isLoading}
          activeStart={activeStart}
          activeEnd={activeEnd}
          onApplyRange={onApplyRange}
          onShiftDateRange={shiftDateRangeByOneDay}
          statusDropdownRef={statusDropdownRef}
          isStatusOpen={isStatusOpen}
          setIsStatusOpen={setIsStatusOpen}
          tab={tab}
          setTab={setTab}
          statusLabel={statusLabel}
          view={view}
          onSelectList={() => setView("list")}
          onSelectCard={() => setView("card")}
          onSelectCalendar={() => {
            setView("calendar");
            if (isEffectivelyDoctor) setCalMode("week");
          }}
        />

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
              showDraftIndicators={showDraftIndicators}
            />
          )}
        </div>
      </div>

      <SchedulingConflictsModal
        isOpen={isConflictModalOpen}
        onOpenChange={setIsConflictModalOpen}
        onResolved={fetchConflictCount}
      />
    </div>
  );
};

export default Appointment;
