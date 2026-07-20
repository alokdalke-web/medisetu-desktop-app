import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button, Pagination, addToast } from "@heroui/react";
import {
  FiEye,
  FiCalendar,
  FiClock,
  FiUser,
  FiAlertTriangle,
  FiShield,
  FiUserX,
  FiSettings,
  FiChevronDown,
  FiList,
  FiGrid,
} from "react-icons/fi";
import { FaUserMd, FaUserInjured, FaRupeeSign } from "react-icons/fa";
import dayjs from "dayjs";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import SearchField from "../../components/shared/SearchField";
import { useGetClinicNoShowAnalyticsQuery } from "../../redux/api/appointmentApi";
import useDebounce from "../../hooks/useDebounce";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { noShowTips } from "../../constants/featureTips";

/* ---------- Types ---------- */
type NoShowAction =
  | "warning"
  | "penalty"
  | "advance_required"
  | "blocked"
  | "no-show";

type NoShowRow = {
  id: string;
  patientName: string;
  patientMobile: string;
  doctorName: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentStatus: "no-show";
  latestAction: NoShowAction;
  reason?: string;
  markedBy?: string;
  markedAt?: string;
  totalNoShows: number;
  firstNoShowDate?: string;
  currentStatus: string;
  isBlocked: boolean;
};

/* ---------- Empty State ---------- */
const NoShowEmptyState: React.FC = () => {
  return (
    <div className="flex w-full items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-[460px] flex-col items-center">
        <img
          src={`${import.meta.env.BASE_URL}assets/images/noshow.svg`}
          alt="No No-Shows Found"
          className="h-auto w-full max-w-[420px] object-contain"
        />

        <h3 className="mt-5 text-center text-[18px] font-semibold text-slate-900 sm:text-[22px]">
          No No-Shows Found
        </h3>

        <p className="mt-2 max-w-[360px] text-center text-[13px] leading-[1.45] text-slate-500 sm:text-[14px]">
          All appointments were attended during the selected period.
        </p>
      </div>
    </div>
  );
};

/* ---------- Action Status Chip ---------- */
const ActionStatusChip: React.FC<{ action: NoShowAction }> = ({ action }) => {
  const getConfig = (value: NoShowAction) => {
    switch (value) {
      case "warning":
        return {
          bgColor: "bg-yellow-50",
          textColor: "text-yellow-700",
          borderColor: "border-yellow-200",
          label: "Warning Issued",
          icon: <FiAlertTriangle className="mr-1 text-yellow-600" />,
        };

      case "penalty":
        return {
          bgColor: "bg-orange-50",
          textColor: "text-orange-700",
          borderColor: "border-orange-200",
          label: "Penalty Applied",
          icon: <FaRupeeSign className="mr-1 text-orange-600" />,
        };

      case "advance_required":
        return {
          bgColor: "bg-primary/10",
          textColor: "text-blue-700",
          borderColor: "border-blue-200",
          label: "Advance Required",
          icon: <FiShield className="mr-1 text-blue-600" />,
        };

      case "blocked":
        return {
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          borderColor: "border-red-200",
          label: "Patient Blocked",
          icon: <FiUserX className="mr-1 text-red-600" />,
        };

      case "no-show":
      default:
        return {
          bgColor: "bg-slate-50",
          textColor: "text-gray-700",
          borderColor: "border-slate-200",
          label: "No-Show",
          icon: <FiAlertTriangle className="mr-1 text-gray-600" />,
        };
    }
  };

  const config = getConfig(action);

  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {config.icon}
      {config.label}
    </div>
  );
};

/* ---------- No-Show Count Badge ---------- */
const NoShowCountBadge: React.FC<{ count: number }> = ({ count }) => {
  const getColor = (value: number) => {
    if (value === 1) return "border-slate-200 bg-gray-100 text-gray-700";
    if (value === 2) return "border-yellow-200 bg-yellow-100 text-yellow-700";
    if (value === 3) return "border-orange-200 bg-orange-100 text-orange-700";
    return "border-red-200 bg-red-100 text-red-700";
  };

  return (
    <div
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getColor(
        count,
      )}`}
    >
      {count} No-Show{count > 1 ? "s" : ""}
    </div>
  );
};

/* ---------- Skeleton helpers ---------- */
const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

const NoShowTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-[13px] sm:text-[14px]">
      <thead className="bg-slate-50">
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="px-5 py-3 text-left text-[13px] font-semibold sm:px-6 sm:py-4 sm:text-[14px]">
            Patient
          </th>
          <th className="px-5 py-3 text-left font-medium sm:px-6 sm:py-4">
            Doctor
          </th>
          <th className="px-5 py-3 text-left font-medium sm:px-6 sm:py-4">
            Last Appointment
          </th>
          <th className="px-5 py-3 text-left font-medium sm:px-6 sm:py-4">
            Total No-Shows
          </th>
          <th className="px-5 py-3 text-left font-medium sm:px-6 sm:py-4">
            Last Action
          </th>
          <th className="w-[96px] px-5 py-3 text-center font-medium sm:px-6 sm:py-4">
            Action
          </th>
        </tr>
      </thead>

      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr
            key={i}
            className={i !== rows - 1 ? "border-b border-slate-100" : ""}
          >
            <td className="px-5 py-3 sm:px-6 sm:py-4">
              <Skel className="h-12 w-40" />
            </td>

            <td className="px-5 py-3 sm:px-6 sm:py-4">
              <Skel className="h-12 w-40" />
            </td>

            <td className="px-5 py-3 sm:px-6 sm:py-4">
              <Skel className="h-4 w-32" />
            </td>

            <td className="px-5 py-3 sm:px-6 sm:py-4">
              <Skel className="h-6 w-20 rounded-full" />
            </td>

            <td className="px-5 py-3 sm:px-6 sm:py-4">
              <Skel className="h-6 w-32 rounded-full" />
            </td>

            <td className="w-[96px] px-5 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-center gap-2">
                <Skel className="h-8 w-8 rounded-full sm:h-9 sm:w-9" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const NoShowCardsSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Skel className="h-5 w-32" />
            <Skel className="h-4 w-24" />
          </div>

          <Skel className="h-6 w-20 rounded-full" />
        </div>

        <div className="space-y-3">
          <Skel className="h-4 w-full" />
          <Skel className="h-4 w-3/4" />
          <Skel className="h-10 w-full rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Card Component ---------- */
const NoShowCard: React.FC<{
  r: NoShowRow;
  onViewHistory: (patientId: string) => void;
}> = ({ r, onViewHistory }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <FaUserInjured className="text-sm text-blue-600" />
          </div>

          <div>
            <div className="truncate text-[14px] font-semibold text-slate-900 sm:text-[15px]">
              {r.patientName}
            </div>

            <div className="text-[11px] text-slate-500 sm:text-xs">
              {r.patientMobile}
            </div>
          </div>
        </div>

        <NoShowCountBadge count={r.totalNoShows} />
      </div>

      <ActionStatusChip action={r.latestAction} />
    </div>

    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
        <FaUserMd className="text-xs text-green-600" />
      </div>

      <div className="truncate text-[13px] text-slate-700">
        Dr. {r.doctorName}
      </div>
    </div>

    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <FiCalendar className="text-sm text-slate-400" />
        <span className="text-[13px] text-slate-600">
          {dayjs(r.appointmentDate).format("MMM DD, YYYY")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <FiClock className="text-sm text-slate-400" />
        <span className="text-[13px] text-slate-600">{r.appointmentTime}</span>
      </div>

      <div className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
        {r.appointmentType}
      </div>
    </div>

    {r.markedBy && (
      <div className="mb-3 flex items-center gap-2 text-[12px] text-slate-600">
        <FiUser className="text-sm text-slate-400" />

        <span>
          <span className="font-medium">Marked by:</span> {r.markedBy}
        </span>
      </div>
    )}

    <div className="flex gap-2">
      <Button
        radius="full"
        variant="light"
        className="h-10 flex-1 bg-primary/10 text-[13px] font-medium text-primary hover:bg-primary/10"
        onPress={() => onViewHistory(r.id)}
      >
        <FiEye className="mr-2" />
        Details
      </Button>
    </div>
  </div>
);

const NoShowPage: React.FC = () => {
  const navigate = useNavigate();

  /* ---------- Date Range State ---------- */
  const [startDate, setStartDate] = useState<string>(() =>
    dayjs().subtract(30, "days").format("YYYY-MM-DD"),
  );

  const [endDate, setEndDate] = useState<string>(() =>
    dayjs().format("YYYY-MM-DD"),
  );

  /* ---------- Search / Pagination / Filter ---------- */
  const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<8 | 10 | 15 | "all">(10);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const apiPageSize = rowsPerPage === "all" ? 1000 : rowsPerPage;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, rowsPerPage, startDate, endDate]);

  /* ---------- API Call ---------- */
  const { data, isLoading, isFetching, error } =
    useGetClinicNoShowAnalyticsQuery({
      startDate,
      endDate,
      search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    });

  /* ---------- Process Data ---------- */
  const incidents = useMemo(() => {
    const payload: any = data as any;
    if (!payload) return [];
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }, [data]);

  const rows: NoShowRow[] = useMemo(() => {
    return incidents.map((item: any, idx: number) => ({
      id: item?.patient?.id || `temp-${idx}`,
      patientName: item?.patient?.name || "N/A",
      patientMobile: item?.patient?.mobile || "N/A",
      doctorName: item?.doctor?.name || "N/A",
      appointmentType:
        item?.latestAppointment?.appointmentType || "Consultation",
      appointmentDate: item?.latestAppointment?.appointmentDate || "",
      appointmentTime: item?.latestAppointment?.appointmentTime || "",
      appointmentStatus: "no-show" as const,
      latestAction: (item?.latestAction || "no-show") as NoShowAction,
      reason: item?.latestAppointment?.noShowReason || "",
      markedBy: item?.latestAppointment?.noShowMarkedBy || "System",
      markedAt: item?.latestAppointment?.createdAt || "",
      totalNoShows: item?.totalNoShows || 0,
      firstNoShowDate: item?.firstNoShowDate || "",
      currentStatus: item?.currentStatus || "active",
      isBlocked: item?.isBlocked || false,
    }));
  }, [incidents]);

  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / apiPageSize));
  const currentPage = Math.min(page, totalPages);

  const isEmptyState = !isLoading && totalRecords === 0;

  const showPagination =
    !isLoading && rowsPerPage !== "all" && totalRecords > 0 && totalPages > 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    if (rowsPerPage === "all") return rows;

    const startIndex = (currentPage - 1) * apiPageSize;
    return rows.slice(startIndex, startIndex + apiPageSize);
  }, [rows, rowsPerPage, currentPage, apiPageSize]);

  /* ---------- Error Handling ---------- */
  const getErrText = (err: any, fallback: string) => {
    if (!err) return fallback;
    if (err?.data?.errors?.[0]?.message) return err.data.errors[0].message;
    if (err?.data?.message) return err.data.message;
    if (err?.error) return err.error;
    if (typeof err === "string") return err;
    return fallback;
  };

  const handleNoShowPolicy = () => {
    navigate("/profile/no-show-policy");
  };

  useEffect(() => {
    if (error) {
      addToast({
        title: "Failed to load no-show records",
        description: getErrText(error, "No-show records load failed."),
        color: "danger",
        variant: "flat",
      });
    }
  }, [error]);

  const handleViewHistory = (patientId: string) => {
    navigate(`/no-show/history/patient/${patientId}`);
  };

  const skelRows = rowsPerPage === "all" ? 8 : apiPageSize;

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between sm:px-0">
        <div>
          <div className="flex items-center gap-2">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              No-Show Management
            </h2>
            <FeatureInfoTip
              title="No-Show Tips"
              tips={noShowTips}
              guideSection="noshow-guide"
              linkLabel="Read no-show guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Track and manage patients who missed their scheduled appointments.
          </p>
        </div>

        <Button
          radius="lg"
          variant="bordered"
          size="sm"
          className="h-9 border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-white/5"
          onPress={handleNoShowPolicy}
          startContent={<FiSettings className="text-[14px]" />}
        >
          No-Show Policy
        </Button>
      </div>

      {/* Filters / Search / Toggle */}
      <div className="rounded-xl">
        <div className="flex flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center">
          <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <SearchField
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
              />
            </div>

            <DashboardDateRangePicker
              startYmd={startDate}
              endYmd={endDate}
              isFetching={isFetching}
              onApply={(s, e) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="items-center gap-2 hidden md:flex">
              {/* List View Button */}
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={[
                  "grid h-10 w-10 place-items-center rounded-lg border text-[17px] shadow-sm transition",
                  viewMode === "list"
                    ? "border-primary bg-primary/10 text-primary dark:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                ].join(" ")}
              >
                <FiList />
              </button>

              {/* Grid View Button */}
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={[
                  "grid h-10 w-10 place-items-center rounded-lg border text-[17px] shadow-sm transition",
                  viewMode === "grid"
                    ? "border-primary bg-primary/10 text-primary dark:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                ].join(" ")}
              >
                <FiGrid />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading / Empty / Data */}
      {isLoading ? (
        <>
          <div className="p-3 sm:p-4 md:hidden">
            <NoShowCardsSkeleton rows={skelRows} />
          </div>

          <div className="hidden md:block">
            {viewMode === "grid" ? (
              <div className="p-4">
                <NoShowCardsSkeleton rows={skelRows} />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <NoShowTableSkeleton rows={skelRows} />
              </div>
            )}
          </div>
        </>
      ) : isEmptyState ? (
        <NoShowEmptyState />
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="space-y-3 p-3 sm:p-4 md:hidden">
            {pageRows.map((r) => (
              <NoShowCard key={r.id} r={r} onViewHistory={handleViewHistory} />
            ))}
          </div>

          {/* Desktop: Grid or List */}
          <div className="hidden md:block">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
                {pageRows.map((r) => (
                  <NoShowCard
                    key={r.id}
                    r={r}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-slate-50/80 dark:bg-[#111726]">
                      <tr className="border-b border-slate-100 dark:border-[#273244]">
                        <th className="w-[20%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                          Patient
                        </th>

                        <th className="w-[15%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                          Doctor
                        </th>

                        <th className="w-[22%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                          Last Appointment
                        </th>

                        <th className="w-[15%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                          Total No-Show
                        </th>

                        <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                          Last Action
                        </th>

                        <th className="w-[10%] px-5 py-4 text-center text-[13px] font-bold text-slate-500 dark:text-white">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                      {pageRows.map((r) => (
                        <tr
                          key={r.id}
                          className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                        >
                          {/* Patient */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                <FaUserInjured className="text-sm text-blue-600" />
                              </div>

                              <div>
                                <div className="font-semibold text-slate-900">
                                  {r.patientName}
                                </div>

                                <div className="text-xs text-slate-500">
                                  {r.patientMobile}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Doctor */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                                <FaUserMd className="text-xs text-green-600" />
                              </div>

                              <span className="text-slate-700">
                                Dr. {r.doctorName}
                              </span>
                            </div>
                          </td>

                          {/* Last Appointment */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <FiCalendar className="text-xs text-slate-400" />

                                <span className="text-sm font-medium text-slate-900">
                                  {dayjs(r.appointmentDate).format(
                                    "MMM DD, YYYY",
                                  )}
                                </span>

                                <span className="text-xs text-slate-500">
                                  {r.appointmentTime}
                                </span>
                              </div>

                              <div className="mt-1 text-xs text-slate-600">
                                {r.appointmentType}
                              </div>
                            </div>
                          </td>

                          {/* Total No-Shows */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <NoShowCountBadge count={r.totalNoShows} />

                              {r.firstNoShowDate && (
                                <span className="truncate text-[10px] text-slate-500">
                                  First:{" "}
                                  {dayjs(r.firstNoShowDate).format(
                                    "MMM DD, YY",
                                  )}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Last Action */}
                          <td className="px-6 py-4">
                            <ActionStatusChip action={r.latestAction} />

                            {r.isBlocked && (
                              <div className="mt-1 text-xs font-medium text-red-600">
                                Patient is currently blocked
                              </div>
                            )}
                          </td>

                          {/* Action */}
                          <td className="w-[96px] px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                radius="full"
                                className="text-primary hover:bg-primary/5"
                                onPress={() => handleViewHistory(r.id)}
                                title="View Details"
                              >
                                <FiEye size={18} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls — inside table card */}
                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 dark:border-[#273244] lg:flex-row lg:items-center lg:justify-between">
                  {/* Showing info */}
                  <div className="flex items-center justify-center text-[13px] font-medium text-slate-500 dark:text-white sm:justify-start">
                    <span>
                      Showing{" "}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {totalRecords > 0 ? Math.min((currentPage - 1) * apiPageSize + 1, totalRecords) : 0}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {Math.min(currentPage * apiPageSize, totalRecords)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {totalRecords}
                      </span>{" "}
                      records
                    </span>
                  </div>

                  {/* Per page + Pagination */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 dark:text-white sm:justify-start">
                      <span className="whitespace-nowrap">Rows per page:</span>
                      <div className="relative">
                        <select
                          className={[
                            "h-9 w-[72px] appearance-none rounded-lg border border-primary/35",
                            "bg-white pl-3 pr-8 text-[13px] font-semibold text-primary shadow-sm",
                            "dark:bg-[#111726] dark:text-white",
                            "outline-none transition",
                            "hover:border-primary/60 hover:bg-primary/5",
                            "focus:border-primary focus:ring-2 focus:ring-primary/20",
                          ].join(" ")}
                          value={rowsPerPage}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const v =
                              e.target.value === "all" ? "all" : Number(e.target.value);
                            setRowsPerPage(v as 8 | 10 | 15 | "all");
                            setPage(1);
                          }}
                        >
                          <option value={8}>8</option>
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value="all">All</option>
                        </select>
                        <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-primary" />
                      </div>
                    </div>

                    {/* HeroUI Pagination */}
                    {showPagination && (
                      <div className="flex justify-center lg:justify-end">
                        <Pagination
                          isCompact
                          showControls
                          total={totalPages}
                          page={currentPage}
                          onChange={setPage}
                          radius="lg"
                          classNames={{
                            wrapper: "gap-2 flex-wrap justify-center lg:justify-end",
                            item:
                              "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none " +
                              "hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary " +
                              "dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                            prev:
                              "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                            next:
                              "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                            cursor: "hidden",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NoShowPage;
