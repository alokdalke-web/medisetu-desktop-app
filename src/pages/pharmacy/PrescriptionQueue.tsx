
import React, { useEffect, useRef, useState } from "react";
import { Avatar, Pagination, Skeleton } from "@heroui/react";
import { useNavigate } from "react-router";
import { FiCheck, FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";

import StatusChip from "../../components/shared/StatusChip";
import SearchField from "../../components/shared/SearchField";
import { useGetPrescriptionQueueQuery } from "../../redux/api/prescriptionQueueApi";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";

const STATUS_KEYS = ["ALL", "ON_HOLD", "PENDING", "COMPLETED", "REJECTED"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

const statusLabel: Record<StatusKey, string> = {
  ALL: "Status - All",
  ON_HOLD: "On hold",
  PENDING: "Pending",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const rowStatusLabel: Record<string, string> = {
  ON_HOLD: "On hold",
  PENDING: "Pending",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

// debounce hook
function useDebouncedValue<T>(value: T, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ---------------- Component ---------------- */

const PrescriptionQueue: React.FC = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const rowsPerPage = 10; // Match appointment standard

  // filters
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>("ALL");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);

  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 500);

  const getTodayIST = () =>
    new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

  const [displayStartDate, setDisplayStartDate] = useState<string>(() => getTodayIST());
  const [displayEndDate, setDisplayEndDate] = useState<string>(() => getTodayIST());

  const [sort] = useState<"asc" | "desc">("desc");

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { data, isFetching, isLoading, isError } = useGetPrescriptionQueueQuery({
    page,
    limit: rowsPerPage,
    sort,
    status: selectedStatus === "ALL" ? undefined : selectedStatus,
    startDate: displayStartDate || undefined,
    endDate: displayEndDate || undefined,
    search: debouncedSearch?.trim() ? debouncedSearch.trim() : undefined,
  });

  const prescriptions = isFetching && page === 1 ? [] : (data?.result?.data ?? []);
  const total = data?.result?.total ?? 0;
  const pages = Math.ceil(total / rowsPerPage);

  const showSkeleton = isLoading || (isFetching && page === 1);

  const shiftDateRangeByOneDay = (direction: "prev" | "next") => {
    if (!displayStartDate || !displayEndDate) return;
    const shift = direction === "prev" ? -1 : 1;
    const parseYmdLocal = (ymdStr: string) => {
      const [y, m, d] = (ymdStr || "").split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };
    const toYmdLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    const baseDate = parseYmdLocal(displayStartDate);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + shift);
    const nextYmd = toYmdLocal(nextDate);

    setDisplayStartDate(nextYmd);
    setDisplayEndDate(nextYmd);
    setPage(1);
  };

  if (isError) {
    return (
      <div className="h-64 flex items-center justify-center text-red-500">
        Failed to load prescription queue
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* Header title */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] md:text-[24px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl ">
          Prescription Queue
        </h2>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        {/* left filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center ">
          {/* Search */}
          <div className="w-full sm:w-[260px]">
            <SearchField
              type="text"
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              onClear={() => {
                setSearchText("");
                setPage(1);
              }}
              placeholder="Search prescription"
              className="w-full"
            />
          </div>

          {/* Date range */}
          <div className="inline-flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={isFetching}
              onClick={() => shiftDateRangeByOneDay("prev")}
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white",
                "text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
              title="Previous date"
              aria-label="Previous date"
            >
              <FiChevronLeft size={15} />
            </button>

            <div
              className="
                flex shrink-0 items-center
                [&_[data-slot='base']]:!w-auto
                [&_[data-slot='input-wrapper']]:!h-8
                [&_[data-slot='input-wrapper']]:!min-w-[190px]
                [&_[data-slot='input-wrapper']]:!w-auto
                [&_[data-slot='input-wrapper']]:!rounded-lg
                [&_[data-slot='input-wrapper']]:!border
                [&_[data-slot='input-wrapper']]:!border-gray-200
                [&_[data-slot='input-wrapper']]:!bg-white
                [&_[data-slot='input']]:!text-[13px]
              "
            >
              <DashboardDateRangePicker
                startYmd={displayStartDate}
                endYmd={displayEndDate}
                isFetching={isFetching}
                onApply={(s, e) => {
                  if (!s || !e) return;
                  setDisplayStartDate(s);
                  setDisplayEndDate(e);
                  setPage(1);
                }}
              />
            </div>

            <button
              type="button"
              disabled={isFetching}
              onClick={() => shiftDateRangeByOneDay("next")}
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white",
                "text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
              title="Next date"
              aria-label="Next date"
            >
              <FiChevronRight size={15} />
            </button>
          </div>

          {/* Status dropdown */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[190px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen((prev) => !prev)}
              className={[
                "flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white",
                "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
                "outline-none transition",
                "hover:border-primary/40 hover:bg-slate-50",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              ].join(" ")}
            >
              <span className="truncate text-left">{statusLabel[selectedStatus]}</span>
              <FiChevronDown
                className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 ${
                  isStatusOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isStatusOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
                {STATUS_KEYS.map((k) => {
                  const active = selectedStatus === k;

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(k);
                        setPage(1);
                        setIsStatusOpen(false);
                      }}
                      className={[
                        "flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                        active
                          ? "bg-teal-50 text-teal-700"
                          : "text-slate-700 hover:bg-slate-50 hover:text-primary",
                      ].join(" ")}
                    >
                      <span className="line-clamp-2">{statusLabel[k]}</span>
                      {active && <FiCheck className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[980px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-gray-100">
                <th className="w-[240px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Doctor
                </th>
                <th className="w-[240px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Patient
                </th>
                <th className="w-[180px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Date
                </th>
                <th className="w-[220px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Medicines
                </th>
                <th className="w-[140px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {showSkeleton ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <Skeleton className="h-4 w-44 rounded" />
                          <Skeleton className="mt-2 h-3 w-64 max-w-[70%] rounded" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : prescriptions.length > 0 ? (
                prescriptions.map((item: any) => {
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-slate-50/50"
                      onClick={() => navigate(item.id)}
                    >
                      {/* Doctor */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src="/doctor.png"
                            name={item.doctorName || "Doctor"}
                            size="sm"
                            className="bg-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-slate-900">
                              {item.doctorName}
                            </p>
                            <p className="truncate text-[12px] font-medium text-slate-500">
                              Doctor
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src="/patient.png"
                            name={item.patientName || "Patient"}
                            size="sm"
                            className="bg-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-slate-900">
                              {item.patientName}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-slate-900">
                            {new Date(item.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Medicines */}
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-slate-900">
                            {item.medicineNames?.slice(0, 2).join(", ") || "—"}
                            {item.medicineNames?.length > 2 &&
                              ` (+${item.medicineNames.length - 2})`}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusChip
                          status={item.status}
                          text={rowStatusLabel[item.status] || item.status}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="h-[320px] text-center text-slate-400"
                  >
                    No prescriptions found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!showSkeleton && total > 0 && pages > 1 && (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex justify-center sm:justify-end">
              <Pagination
                isCompact
                showControls
                total={pages}
                page={page}
                onChange={setPage}
                radius="full"
                classNames={{
                  wrapper: "gap-2 flex-wrap justify-center sm:justify-end",
                  item:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                  prev:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  next:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  cursor: "hidden",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionQueue;
