/**
 * useAppointmentQueries.ts
 *
 * Centralises all RTK Query calls for the Appointment page:
 * - List / card view query
 * - Calendar view query
 * - Clinic appointment details (stat cards)
 * - Doctor availability (day + range)
 * - All-doctors list (admin / receptionist)
 *
 * Returns typed, ready-to-use data so the main component stays free of
 * query-argument construction and raw-response normalisation.
 */

import { useMemo } from "react";
import {
  useGetClinicAppointmentDetailsQuery,
  useGetClinicAppointmentsQuery,
} from "../../../redux/api/appointmentApi";
import {
  useGetDoctorAvailabilityOnDateQuery,
  useGetDoctorAvailabilityRangeQuery,
  useGetDoctorByIdQuery,
  useGetDoctorQuery,
} from "../../../redux/api/doctorApi";
import type {
  DoctorAvailabilityOnDate,
  DoctorAvailabilityRangeItem,
} from "../../../redux/api/doctorApi";
import { useGetAllUsersQuery } from "../../../redux/api/usersApi";
import { useGetUserQuery } from "../../../redux/api/authApi";
import type { ApiPatient } from "../../../utils/appointment.mapper";
import type { ViewMode } from "./useAppointmentFilters";
import type { CalMode } from "./useAppointmentCalendar";
import type { AvailabilitySlot } from "../AppointmentCalendarView";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorListItem {
  id: string;
  name: string;
  email: string | null;
}

// ─── Args ─────────────────────────────────────────────────────────────────────

interface UseAppointmentQueriesArgs {
  view: ViewMode;
  calMode: CalMode;
  tab: string;
  debouncedSearch: string;
  page: number;
  rowsPerPage: number;
  listStartDate: string;
  listEndDate: string;
  calStartDate: string;
  calEndDate: string;
  selectedDateYmd: string;
  selectedDoctorId: string | null;
  isAdminOrReception: boolean;
  isEffectivelyDoctor: boolean;
}

// ─── Return ───────────────────────────────────────────────────────────────────

export interface UseAppointmentQueriesReturn {
  // List / card
  patientsRawList: ApiPatient[];
  listLoading: boolean;
  listFetching: boolean;
  listIsError: boolean;
  listError: unknown;

  // Calendar
  patientsRawCal: ApiPatient[];
  calLoading: boolean;
  calFetching: boolean;
  calIsError: boolean;
  calError: unknown;

  // Pagination
  pagination: { totalRecords: number; totalPages: number; pageSize: number; currentPage: number };
  totalRecords: number;
  totalPages: number;

  // Tab counts
  tabCounts: Record<string, number>;

  // Clinic details (stat cards)
  clinicAppointmentDetails: Record<string, unknown> | null;

  // Doctor availability
  doctorAvailability: AvailabilitySlot[];

  // Doctors list (admin / reception)
  doctorsList: DoctorListItem[];

  // Raw doctor data (for slot-click navigation)
  doctorData: unknown;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAppointmentQueries = ({
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
}: UseAppointmentQueriesArgs): UseAppointmentQueriesReturn => {
  const { data: user } = useGetUserQuery();
  const { data: doctorData } = useGetDoctorQuery();

  // ── List / card query args ─────────────────────────────────────────────────
  const listQueryArgs = useMemo(() => {
    const args: Record<string, unknown> = {
      pageNumber: page,
      pageSize: rowsPerPage,
    };

    if (isEffectivelyDoctor) {
      const userId =
        (user as { result?: { id?: string }; id?: string })?.result?.id ??
        (user as { id?: string })?.id;
      if (userId) args.doctorId = userId;
    }

    if (tab !== "all") args.appointmentStatus = tab;
    if (debouncedSearch.trim()) args.search = debouncedSearch.trim();
    if (listStartDate) args.startDate = listStartDate;
    if (listEndDate) args.endDate = listEndDate;

    return args;
  }, [page, rowsPerPage, tab, debouncedSearch, listStartDate, listEndDate, user, isEffectivelyDoctor]);

  const {
    data: listData,
    isFetching: listFetching,
    isLoading: listLoading,
    isError: listIsError,
    error: listError,
  } = useGetClinicAppointmentsQuery(listQueryArgs, {
    skip: view === "calendar",
    refetchOnMountOrArgChange: true,
  });

  // ── Calendar query args ────────────────────────────────────────────────────
  const calQueryArgs = useMemo(() => {
    const args: Record<string, unknown> = { pageNumber: 1, pageSize: 500 };

    if (calMode === "day") {
      args.startDate = selectedDateYmd;
      args.endDate = selectedDateYmd;
    } else {
      args.startDate = calStartDate;
      args.endDate = calEndDate;
    }

    if (isEffectivelyDoctor) {
      const userId =
        (user as { result?: { id?: string }; id?: string })?.result?.id ??
        (user as { id?: string })?.id;
      if (userId) args.doctorId = userId;
    }

    if (tab !== "all") args.appointmentStatus = tab;
    if (debouncedSearch.trim()) args.search = debouncedSearch.trim();

    return args;
  }, [calStartDate, calEndDate, calMode, selectedDateYmd, user, isEffectivelyDoctor, tab, debouncedSearch]);

  const {
    data: calData,
    isFetching: calFetching,
    isLoading: calLoading,
    isError: calIsError,
    error: calError,
  } = useGetClinicAppointmentsQuery(calQueryArgs, {
    skip: view !== "calendar",
    refetchOnMountOrArgChange: true,
  });

  // ── Clinic appointment details ─────────────────────────────────────────────
  const appointmentDetailsDate =
    view === "calendar" ? selectedDateYmd : listStartDate;

  const { data: clinicAppointmentDetailsData } =
    useGetClinicAppointmentDetailsQuery(
      { date: appointmentDetailsDate },
      { skip: !appointmentDetailsDate, refetchOnMountOrArgChange: true },
    );

  // ── Doctor availability ────────────────────────────────────────────────────
  const { data: selectedDoctorData } = useGetDoctorByIdQuery(
    selectedDoctorId ?? "",
    { skip: !selectedDoctorId || view !== "calendar" },
  );

  const { data: availabilityOnDate } = useGetDoctorAvailabilityOnDateQuery(
    { date: selectedDateYmd },
    { skip: view !== "calendar" },
  );

  const doctorResultId =
    (doctorData as { result?: { id?: string } })?.result?.id ?? "";

  const { data: availabilityRange } = useGetDoctorAvailabilityRangeQuery(
    {
      doctorId: selectedDoctorId || doctorResultId,
      startDate: calStartDate,
      endDate: calEndDate,
    },
    {
      skip:
        view !== "calendar" ||
        calMode !== "week" ||
        (!selectedDoctorId && !doctorResultId) ||
        !calStartDate ||
        !calEndDate,
    },
  );

  // ── All doctors list (admin / reception) ──────────────────────────────────
  const { data: allDoctorsData } = useGetAllUsersQuery(
    { page: 1, pageSize: 200, userType: "Doctor" },
    { skip: !isAdminOrReception || view !== "calendar" },
  );

  // ── Derived: patients arrays ───────────────────────────────────────────────

  // Cast through unknown once here — all downstream access is safe via the
  // typed helper below. This avoids repeated unsafe casts throughout the hook.
  const listDataLoose = listData as unknown as Record<string, unknown> | undefined;
  const calDataLoose = calData as unknown as Record<string, unknown> | undefined;

  const extractPatients = (
    loose: Record<string, unknown> | undefined,
  ): ApiPatient[] => {
    const result =
      (loose?.result as { patients?: ApiPatient[] } | undefined)?.patients ??
      (loose?.patients as ApiPatient[] | undefined) ??
      (Array.isArray(loose) ? (loose as unknown as ApiPatient[]) : []);
    return Array.isArray(result) ? result : [];
  };

  const patientsRawList: ApiPatient[] = useMemo(
    () => extractPatients(listDataLoose),
    [listData], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const patientsRawCal: ApiPatient[] = useMemo(
    () => extractPatients(calDataLoose),
    [calData], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Derived: pagination ────────────────────────────────────────────────────
  const pagination = useMemo(() => {
    // Prefer the typed path first (AllAppointmentsResponse.result.pagination)
    const typedPagination = listData?.result?.pagination;
    if (typedPagination) return typedPagination;

    // Fallback for non-standard response shapes
    const res = listDataLoose?.result as Record<string, number> | undefined;
    if (!res || typeof res !== "object") {
      return { totalRecords: 0, totalPages: 0, pageSize: rowsPerPage, currentPage: page };
    }

    return {
      totalRecords: res.totalRecords ?? res.totalCount ?? res.total ?? 0,
      totalPages:   res.totalPages  ?? res.total_pages ?? 0,
      pageSize:     res.pageSize    ?? res.limit       ?? rowsPerPage,
      currentPage:  res.currentPage ?? res.page        ?? page,
    };
  }, [listData, rowsPerPage, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRecords = Number(pagination.totalRecords ?? 0);
  const totalPages =
    Number(pagination.totalPages ?? 0) ||
    Math.ceil(totalRecords / Math.max(1, rowsPerPage)) ||
    1;

  // ── Derived: tab counts ────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    // Use the loose cast — these fields (statusCounts, pendingCount, etc.) are
    // not in the typed interface but may be present in the actual API response.
    const source: Record<string, unknown> =
      view === "calendar"
        ? ((calDataLoose?.result as Record<string, unknown>) ?? calDataLoose ?? {})
        : ((listDataLoose?.result as Record<string, unknown>) ?? listDataLoose ?? {});

    const sourcePagination = source.pagination as Record<string, number> | undefined;
    const calTotal = Number(
      sourcePagination?.totalRecords ??
        source.totalRecords ??
        source.totalCount ??
        source.total ??
        patientsRawCal.length,
    );

    const total = view === "calendar" ? calTotal : totalRecords;
    const normalized: Record<string, number> = { all: total };

    const rawCounts =
      source.statusCounts ||
      source.status_counts ||
      source.countsByStatus ||
      source.countByStatus ||
      (source.stats as Record<string, unknown> | undefined)?.statusCounts ||
      (source.stats as Record<string, unknown> | undefined)?.status_counts ||
      null;

    if (rawCounts && typeof rawCounts === "object") {
      for (const [key, value] of Object.entries(rawCounts)) {
        if (typeof value === "number") normalized[String(key).toLowerCase()] = value;
      }
    }

    const src = source as Record<string, number>;
    const fallbacks: Record<string, number | undefined> = {
      pending:    src.pendingCount   ?? src.pending,
      confirmed:  src.confirmedCount ?? src.confirmed,
      completed:  src.completedCount ?? src.completed,
      cancelled:  src.cancelledCount ?? src.canceledCount ?? src.cancelled,
    };

    for (const [key, value] of Object.entries(fallbacks)) {
      if (typeof value === "number") normalized[key] = value;
    }

    return normalized;
  }, [view, listData, calData, totalRecords, patientsRawCal.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: doctor availability ───────────────────────────────────────────
  const doctorAvailability: AvailabilitySlot[] = useMemo(() => {
    // Day mode: availabilityOnDate has typed result (DoctorAvailabilityOnDate[])
    // The API also sends id/name/email on each item but they're not in the type,
    // so we cast through unknown once to access them safely.
    if (calMode === "day" && availabilityOnDate?.success) {
      const dayOfWeek = new Date(selectedDateYmd).toLocaleDateString("en-US", {
        weekday: "long",
      });
      return availabilityOnDate.result.map((doc: DoctorAvailabilityOnDate) => {
        const loose = doc as unknown as Record<string, unknown>;
        return {
          doctorId: String(loose.id ?? loose._id ?? ""),
          date: selectedDateYmd,
          isAvailable: true,
          dayOfWeek,
          startTime: doc.availability?.startTime ?? null,
          endTime:   doc.availability?.endTime   ?? null,
          breaks:    doc.availability?.breaks,
        };
      });
    }

    // Week mode: availabilityRange has typed result (DoctorAvailabilityRangeItem[])
    if (calMode === "week" && availabilityRange?.success) {
      return availabilityRange.result.map((item: DoctorAvailabilityRangeItem) => ({
        date:        item.date,
        dayOfWeek:   item.dayOfWeek ?? "",
        isAvailable: item.isAvailable,
        startTime:   item.availability?.startTime ?? null,
        endTime:     item.availability?.endTime   ?? null,
        breaks:      item.availability?.breaks,
        doctorId:    selectedDoctorId || doctorResultId,
      }));
    }

    // Fallback: use doctor profile availability (untyped shape from doctorApi)
    const base = selectedDoctorId
      ? (selectedDoctorData as unknown as { result?: Record<string, unknown> })?.result
      : (doctorData  as unknown as { result?: Record<string, unknown> })?.result;

    return (
      (base as { aivblity?: AvailabilitySlot[]; availability?: AvailabilitySlot[] } | undefined)
        ?.aivblity ??
      (base as { availability?: AvailabilitySlot[] } | undefined)?.availability ??
      []
    );
  }, [
    doctorData,
    selectedDoctorId,
    selectedDoctorData,
    availabilityOnDate,
    availabilityRange,
    calMode,
    selectedDateYmd,
    doctorResultId,
  ]);

  // ── Derived: doctors list ──────────────────────────────────────────────────
  const doctorsList: DoctorListItem[] = useMemo(() => {
    // Day-mode availability response includes doctor identity fields at runtime
    // even though the typed interface doesn't declare them — cast through unknown.
    if (view === "calendar" && availabilityOnDate?.success) {
      return availabilityOnDate.result.map((doc) => {
        const loose = doc as unknown as Record<string, unknown>;
        return {
          id:    String(loose.id ?? loose._id ?? "").trim(),
          name:  String(loose.name  ?? loose.email ?? "Doctor"),
          email: (loose.email as string) ?? null,
        };
      });
    }

    const rawUsers =
      (allDoctorsData as unknown as { users?: Array<Record<string, unknown>> })?.users ?? [];
    if (!Array.isArray(rawUsers)) return [];

    return rawUsers
      .map((user) => ({
        id:    String(user?.id ?? user?._id ?? "").trim(),
        name:  String(user?.name ?? user?.email ?? "Doctor"),
        email: (user?.email as string) ?? null,
      }))
      .filter((doc) => doc.id);
  }, [allDoctorsData, availabilityOnDate, view]);

  return {
    patientsRawList,
    listLoading,
    listFetching,
    listIsError,
    listError,
    patientsRawCal,
    calLoading,
    calFetching,
    calIsError,
    calError,
    pagination,
    totalRecords,
    totalPages,
    tabCounts,
    clinicAppointmentDetails:
      (clinicAppointmentDetailsData as { result?: Record<string, unknown> })?.result ?? null,
    doctorAvailability,
    doctorsList,
    doctorData,
  };
};
