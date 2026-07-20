// src/pages/patient/Patient.tsx
import { Avatar, Pagination, addToast, Select, SelectItem, Button } from "@heroui/react";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiRefreshCw,
  FiUsers,
  FiUserPlus,
  FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router";
import StatusChip from "../../components/shared/StatusChip";

import { isNetworkError } from "../../utils/getApiErrorText";

import AppButton from "../../components/shared/AppButton";
import SearchField from "../../components/shared/SearchField";
import { useGetAllPatientsQuery } from "../../redux/api/patientApi";
import useDebounce from "../../hooks/useDebounce";
import { DateRangeInput, type DateRange } from "../../components/reports/ReportFilterBar";
import PageHeader from "../../components/common/PageHeader";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { patientsTips } from "../../constants/featureTips";

/* ---------------- Types ---------------- */

type SortKey = "name";
type PageSize = 6 | 10 | 15;

type PatientRow = {
  id: string;
  name?: string;
  age?: number | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  gender?: string | null;
  profileImage?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;

  [key: string]: any;
};

type ApiPagination = {
  totalRecords?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
};

/* ---------------- Date helpers ---------------- */

const safeParseDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const normalized =
      s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
    const d1 = new Date(normalized);
    if (!Number.isNaN(d1.getTime())) return d1;
    return null;
  }
  return null;
};

const formatDateLong = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(d);

/* ---------------- UI helpers ---------------- */

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-[#172033] ${className}`}
  />
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
        <p className={["mt-1 truncate text-[12px] ", detailClassName].join(" ")}>{detail}</p>
      </div>
    </div>
  </div>
);

/* ---------------- Bottom Controls ---------------- */

const BottomControls: React.FC<{
  show: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
}> = ({ show, page, setPage, totalPages, totalRecords, rowsPerPage, setRowsPerPage }) => {
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];
  const fromRecord =
    totalRecords > 0 ? Math.min((page - 1) * rowsPerPage + 1, totalRecords) : 0;
  const toRecord =
    totalRecords > 0 ? Math.min(page * rowsPerPage, totalRecords) : 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="border-t border-slate-100 px-4 py-3 dark:border-[#273244]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-center sm:justify-start">
          <span className="text-center text-[13px] font-medium text-slate-500 dark:text-white sm:text-left">
            Showing {fromRecord} to {toRecord} of {totalRecords} patients
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
          <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 dark:text-white sm:justify-start">
            <span className="whitespace-nowrap">Rows per page:</span>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsPageSizeOpen((prev) => !prev)}
                className={[
                  "flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35",
                  "bg-white px-3 text-[13px] font-semibold text-primary shadow-sm",
                  "dark:bg-[#111726] dark:text-white",
                  "outline-none transition hover:border-primary/60 hover:bg-primary/5",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20",
                ].join(" ")}
              >
                <span>{rowsPerPage}</span>
                <FiChevronDown
                  className={`text-primary transition-transform duration-200 ${isPageSizeOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isPageSizeOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                  {pageSizeOptions.map((size) => {
                    const active = rowsPerPage === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => { setRowsPerPage(size); setIsPageSizeOpen(false); }}
                        className={[
                          "flex h-9 w-full items-center px-3 text-left text-[13px] transition",
                          active
                            ? "bg-primary text-white"
                            : "bg-white text-slate-700 hover:bg-primary/5 hover:text-primary dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                        ].join(" ")}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {show && totalRecords > 0 && totalPages > 1 && (
            <div className="flex justify-center lg:justify-end">
              <Pagination
                isCompact
                showControls
                total={totalPages}
                page={page}
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
  );
};

/* ---------------- Main Component ---------------- */

function Patient() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debouncedSearch = useDebounce(query, 500);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<PageSize>(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [gender, setGender] = useState<string>("");
  const [minAge, setMinAge] = useState<number | undefined>(undefined);
  const [maxAge, setMaxAge] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const resetAllFilters = () => {
    setQuery("");
    setGender("");
    setMinAge(undefined);
    setMaxAge(undefined);
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Reset page on search/pageSize change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, rowsPerPage, gender, minAge, maxAge, status, startDate, endDate]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  },
    [],
  );

  // API call
  const { data, isFetching, isLoading, isError, error } =
    useGetAllPatientsQuery({
      page,
      pageSize: rowsPerPage,
      q: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      gender: gender || undefined,
      minAge: minAge !== undefined ? minAge : undefined,
      maxAge: maxAge !== undefined ? maxAge : undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

  // Response shape support
  const result = useMemo(() => (data as any)?.result ?? data ?? {}, [data]);

  const patients: PatientRow[] = useMemo(() => {
    return (
      (result?.petients as PatientRow[]) ??
      (result?.patients as PatientRow[]) ??
      (data as any)?.petients ??
      (data as any)?.patients ??
      []
    );
  }, [result, data]);

  const meta: ApiPagination = result?.pagination ??
    (data as any)?.pagination ?? {
    totalRecords: patients.length,
    totalPages: 1,
    currentPage: page,
    pageSize: rowsPerPage,
  };

  const totalOverall = Number(meta?.totalRecords ?? 0);
  const totalPages = Math.max(1, Number(meta?.totalPages ?? 1));

  // Keep page valid
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Load dynamic filter options (status) from API when component mounts
  useEffect(() => {
    const fetchOptions = async () => {
      setStatusOptions(["Active", "Inactive", "Blocked", "New"]);
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (isError && !isNetworkError(error)) {
      addToast({
        title: "Failed to load patients",
        description:
          (error as any)?.data?.message ||
          (error as any)?.error ||
          "Something went wrong",
        color: "danger",
        variant: "flat",
      });
    }
  }, [isError, error]);

  const patientStats = useMemo(() => {
    const total = totalOverall;

    // Count stats from current page's patients array
    const maleCount = patients.filter(p => p.gender?.toLowerCase() === "male").length;
    const femaleCount = patients.filter(p => p.gender?.toLowerCase() === "female").length;
    const newCount = patients.filter(p => p.status?.toLowerCase() === "new").length;
    const returnCount = patients.filter(p => p.visitCount && p.visitCount > 1).length;

    const percentOfTotal = (value: number): string => {
      const denom = patients.length;
      if (denom <= 0) return "0% of total";
      const pct = (value * 100) / denom;
      const formatted = Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1);
      return `${formatted}% of total`;
    };

    return [
      {
        label: "Total Patients",
        value: total,
        detail: "Registered patients",
        icon: React.createElement(FiUsers, { className: "text-[22px]" }),
        iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200",
        detailClassName: "text-emerald-600 dark:text-emerald-200",
      },
      {
        label: "New Patients",
        value: newCount,
        detail: percentOfTotal(newCount),
        icon: React.createElement(FiUserPlus, { className: "text-[22px]" }),
        iconClassName: "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200",
        detailClassName: "text-blue-600 dark:text-blue-200",
      },
      {
        label: "Male Patients",
        value: maleCount,
        detail: percentOfTotal(maleCount),
        icon: React.createElement(FiUser, { className: "text-[22px]" }),
        iconClassName: "bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200",
        detailClassName: "text-violet-600 dark:text-violet-200",
      },
      {
        label: "Female Patients",
        value: femaleCount,
        detail: percentOfTotal(femaleCount),
        icon: React.createElement(FiUser, { className: "text-[22px]" }),
        iconClassName: "bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200",
        detailClassName: "text-rose-600 dark:text-rose-200",
      },
      {
        label: "Return Patients",
        value: returnCount,
        detail: percentOfTotal(returnCount),
        icon: React.createElement(FiRefreshCw, { className: "text-[22px]" }),
        iconClassName: "bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-200",
        detailClassName: "text-orange-600 dark:text-orange-200",
      },
    ];
  }, [patients, totalOverall]);

  // Sort current page
  const pageRows = useMemo(() => {
    const list = [...patients];
    const getName = (p: PatientRow) => (p.name ?? "").toString().toLowerCase();
    list.sort((a, b) => {
      const A = getName(a);
      const B = getName(b);
      const cmp = A.localeCompare(B, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [patients, sortDir]);

  const showSkeleton = isLoading || isFetching;

  const pickDateTime = (p: PatientRow) => {
    const candidates = [p.createdAt, p.updatedAt, p.lastVisit, p.date];
    for (const c of candidates) {
      const d = safeParseDate(c);
      if (d) return d;
    }
    return null;
  };

  const getGender = (p: PatientRow) =>
    (p.gender ?? p.sex ?? "")?.toString();

  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* Header */}
      <PageHeader
        title="All Patients"
        description="View and manage all registered patients."
        className="mb-6"
        titleExtra={
          <FeatureInfoTip
            title="Patient Tips"
            tips={patientsTips}
            guideSection="patients-guide"
            linkLabel="Read patient guide"
          />
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:justify-end">
            <div id="tour-add-patient-btn" className="shrink-0">
              <AppButton
                text="+ New Patient"
                className="h-10 shrink-0 whitespace-nowrap bg-primary px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover"
                onPress={() => navigate("/patient/new")}
              />
            </div>
          </div>
        }
      />

      {/* Stat cards */}
      <div
        className={[
          "stats-scroll",
          showSkeleton ? "opacity-75 transition-opacity" : "",
        ].join(" ")}
      >
        {patientStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div id="tour-admin-patients-page" className="mt-6 space-y-4 scroll-mt-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center w-full">
          {/* Search */}
          <div className="w-full lg:w-[320px]">
            <SearchField
              value={query}
              onChange={handleSearchChange}
              onClear={() => setQuery("")}
              placeholder="Search by name, mobile, or address..."
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

          {/* Gender */}
          <div className="w-full sm:w-[160px]">
            <Select
              aria-label="Gender"
              placeholder="All Genders"
              selectedKeys={gender ? new Set([gender]) : new Set()}
              onSelectionChange={(keys) => {
                const key = Array.from(keys as Set<string>)[0] ?? "";
                setGender(key);
              }}
              size="md"
              radius="sm"
              classNames={{
                trigger:
                  "h-11 rounded-lg border border-slate-200 bg-white px-3 shadow-sm data-[hover=true]:border-slate-300 dark:bg-[#111726] dark:border-[#273244]",
                value: "text-[14px] text-slate-700 dark:text-white",
                popoverContent: "dark:bg-[#111726]",
              }}
              variant="bordered"
            >
              <SelectItem key="Male" textValue="Male">Male</SelectItem>
              <SelectItem key="Female" textValue="Female">Female</SelectItem>
              <SelectItem key="Other" textValue="Other">Other</SelectItem>
            </Select>
          </div>

          {/* Status */}
          <div className="w-full sm:w-[160px]">
            <Select
              aria-label="Status"
              placeholder="All Statuses"
              selectedKeys={status ? new Set([status]) : new Set()}
              onSelectionChange={(keys) => {
                const key = Array.from(keys as Set<string>)[0] ?? "";
                setStatus(key);
              }}
              size="md"
              radius="sm"
              classNames={{
                trigger:
                  "h-11 rounded-lg border border-slate-200 bg-white px-3 shadow-sm data-[hover=true]:border-slate-300 dark:bg-[#111726] dark:border-[#273244]",
                value: "text-[14px] text-slate-700 dark:text-white",
                popoverContent: "dark:bg-[#111726]",
              }}
              variant="bordered"
            >
              {statusOptions.map((s) => (
                <SelectItem key={s} textValue={s}>{s}</SelectItem>
              ))}
            </Select>
          </div>

          {/* Date Range */}
          <div className="w-full sm:w-[240px]">
            <DateRangeInput
              value={{ startDate, endDate }}
              onChange={(range: DateRange) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
            />
          </div>

          {/* Age Range */}
          <div className="w-full sm:w-[200px] flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min Age"
              value={minAge ?? ""}
              onChange={(e) => setMinAge(e.target.value ? Number(e.target.value) : undefined)}
              className="w-1/2 h-11 px-3 text-[14px] text-slate-700 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[#111726] dark:border-[#273244] dark:text-white"
            />
            <span className="text-slate-400 text-sm">-</span>
            <input
              type="number"
              min="0"
              placeholder="Max Age"
              value={maxAge ?? ""}
              onChange={(e) => setMaxAge(e.target.value ? Number(e.target.value) : undefined)}
              className="w-1/2 h-11 px-3 text-[14px] text-slate-700 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[#111726] dark:border-[#273244] dark:text-white"
            />
          </div>

          {/* Reset Filters */}
          {(query || gender || status || startDate || endDate || minAge || maxAge) && (
            <Button
              variant="light"
              onPress={resetAllFilters}
              startContent={<FiRefreshCw className="text-[13px]" />}
              className="h-11 text-[#677294] text-[13px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Clear
            </Button>
          )}
        </div>
        </div>

        {/* Body */}
        <div>
          <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
            <div className="overflow-x-auto pb-1">
              <table className="w-full min-w-[1050px] table-fixed text-left">
              <thead className="bg-slate-50/80 dark:bg-[#111726]">
                <tr className="border-b border-slate-100 dark:border-gray-700">
                  <th
                    className="w-[240px] cursor-pointer px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Patient
                      <div className="flex flex-col -space-y-1">
                        <FiChevronUp className={`text-[10px] ${sortDir === "asc" ? "text-primary" : "text-slate-300 dark:text-white"}`} />
                        <FiChevronDown className={`text-[10px] ${sortDir === "desc" ? "text-primary" : "text-slate-300 dark:text-white"}`} />
                      </div>
                    </div>
                  </th>
                  <th className="w-[150px] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Contact</th>
                  <th className="w-[200px] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Address</th>
                  <th className="w-[100px] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Visits</th>
                  <th className="w-[140px] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Status</th>
                  <th className="w-[140px] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Registered</th>
                  <th className="w-[80px] px-5 py-4 text-right text-[13px] font-bold text-slate-500 dark:text-white">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                {showSkeleton ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <Skel className="h-10 w-10 rounded-full" />
                          <div className="min-w-0 flex-1">
                            <Skel className="h-4 w-44" />
                            <Skel className="mt-2 h-3 w-64 max-w-[70%]" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : pageRows.length > 0 ? (
                  pageRows.map((p) => {
                    const dt = pickDateTime(p);
                    const dateText = dt ? formatDateLong(dt) : "—";
                    const gender = getGender(p);
                    const ageText = p.age != null ? `${p.age} Y` : null;
                    const addressParts = [p.address, p.city, p.state].filter(Boolean);
                    const addressText = addressParts.length > 0 ? addressParts.join(", ") : "—";

                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-[#151e31]"
                        onClick={() => navigate(`/patient/${p.id}`)}
                      >
                        {/* Patient */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={p.profileImage ?? ""}
                              name={p.name ?? " "}
                              size="sm"
                              className="bg-emerald-50 text-emerald-700 dark:bg-[#16352f] dark:text-white"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-[14px] font-bold text-slate-950 dark:text-white">
                                  {p.name ?? "—"}
                                </p>
                                {Array.isArray(p.familyMembers) && p.familyMembers.length > 0 && p.familyMembers[0]?.relationship && (
                                  <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-800">
                                    {p.familyMembers[0].relationship === "parent"
                                      ? `Family of ${p.familyMembers[0].name ?? ""}`
                                      : p.familyMembers[0].relationship}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-[12px] font-medium text-slate-500 dark:text-white">
                                {[ageText, gender !== "" ? gender : null]
                                  .filter(Boolean)
                                  .join("  •  ") || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">
                              {p.mobile || p.linkedNumber || "—"}
                            </p>
                            {!p.mobile && p.linkedNumber && (
                              <p className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                Linked
                              </p>
                            )}
                            {p.alternateMobile && (
                              <p className="truncate text-[12px] font-medium text-slate-500 dark:text-white">
                                Alt: {p.alternateMobile}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Address */}
                        <td className="px-5 py-4">
                          <p className="truncate text-[14px] font-medium text-slate-700 dark:text-white" title={addressText}>
                            {addressText}
                          </p>
                        </td>

                        {/* Visits */}
                        <td className="px-5 py-4">
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                            {p.visitCount ?? 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusChip status={p.status || "New"} />
                        </td>

                        {/* Registered */}
                        <td className="px-5 py-4">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold text-slate-950 dark:text-white">
                              {dateText}
                            </p>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]"
                              onClick={() => navigate(`/patient/${p.id}/edit`)}
                              title="Edit patient"
                              aria-label="Edit patient"
                            >
                              <FiEdit2 className="text-[15px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="h-[320px] text-center text-slate-400 dark:text-white">
                      No patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            <BottomControls
              show={!showSkeleton}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalRecords={totalOverall}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Patient;
