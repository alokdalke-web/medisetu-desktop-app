// src/pages/patient/Patient.tsx
import { addToast } from "@heroui/react";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  FiRefreshCw,
  FiUsers,
  FiUserPlus,
  FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router";

import { isNetworkError } from "../../utils/getApiErrorText";

import { useGetAllPatientsQuery } from "../../redux/api/patientApi";
import useDebounce from "../../hooks/useDebounce";
import type { DateRange } from "../../components/reports/ReportFilterBar";
import PageHeader from "../../components/common/PageHeader";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { patientsTips } from "../../constants/featureTips";

import PatientStatCards from "./components/toolbar/PatientStatCards";
import PatientFiltersToolbar from "./components/toolbar/PatientFiltersToolbar";
import NewPatientButton from "./components/toolbar/NewPatientButton";
import PatientTable from "./components/list/PatientTable";
import type { ApiPagination, PageSize, PatientRow } from "../../types/patient";

/* ---------------- Main Component ---------------- */

function Patient() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debouncedSearch = useDebounce(query, 500);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<PageSize>(10);
  // Server-side sort. Defaults to most-visited-first; clicking the Patient
  // column header switches sortBy to "name" (see toggleSort below).
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "visitCount">("visitCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [gender, setGender] = useState<string>("");
  const [minAge, setMinAge] = useState<number | undefined>(undefined);
  const [maxAge, setMaxAge] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  // Mobile-only: collapse gender/status/date/age behind a "Filters" button.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  const toggleSort = () => {
    if (sortBy !== "name") {
      setSortBy("name");
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  // Reset page on search/pageSize/sort change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, rowsPerPage, gender, minAge, maxAge, status, startDate, endDate, sortBy, sortDir]);

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
      sortBy,
      sortOrder: sortDir,
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

  const showSkeleton = isLoading || isFetching;

  const dateRange: DateRange = { startDate, endDate };
  const hasActiveFilters = Boolean(
    query || gender || status || startDate || endDate || minAge || maxAge,
  );

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
        actions={<NewPatientButton onPress={() => navigate("/patient/new")} />}
      />

      <PatientStatCards stats={patientStats} isLoading={showSkeleton} />

      <div id="tour-admin-patients-page" className="mt-6 space-y-4 scroll-mt-6">
        <PatientFiltersToolbar
          query={query}
          onQueryChange={handleSearchChange}
          onQueryClear={() => setQuery("")}
          mobileFiltersOpen={mobileFiltersOpen}
          setMobileFiltersOpen={setMobileFiltersOpen}
          gender={gender}
          setGender={setGender}
          status={status}
          setStatus={setStatus}
          statusOptions={statusOptions}
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setStartDate(range.startDate);
            setEndDate(range.endDate);
          }}
          minAge={minAge}
          setMinAge={setMinAge}
          maxAge={maxAge}
          setMaxAge={setMaxAge}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetAllFilters}
        />

        <PatientTable
          rows={patients}
          showSkeleton={showSkeleton}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          goToDetails={(id) => navigate(`/patient/${id}`)}
          goToEdit={(id) => navigate(`/patient/${id}/edit`)}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalOverall}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
        />
      </div>
    </div>
  );
}

export default Patient;
