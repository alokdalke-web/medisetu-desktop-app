import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button, addToast } from "@heroui/react";
import { FiSettings } from "react-icons/fi";
import dayjs from "dayjs";
import { useGetClinicNoShowAnalyticsQuery } from "../../redux/api/appointmentApi";
import useDebounce from "../../hooks/useDebounce";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { noShowTips } from "../../constants/featureTips";
import PageHeader from "../../components/common/PageHeader";
import NoShowToolbar from "./components/toolbar/NoShowToolbar";
import NoShowTable from "./components/list/NoShowTable";
import NoShowCardGrid from "./components/list/NoShowCardGrid";
import { mapNoShowRows, getErrText } from "./helpers/noShowFormatters";
import type { NoShowRow, RowsPerPage, NoShowViewMode } from "../../types/noshow";

const MOBILE_BREAKPOINT = "(max-width: 639px)";

const getDefaultViewMode = (): NoShowViewMode =>
  typeof window !== "undefined" && window.matchMedia(MOBILE_BREAKPOINT).matches
    ? "grid"
    : "list";

const NoShowPage: React.FC = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState<string>(() =>
    dayjs().subtract(30, "days").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState<string>(() => dayjs().format("YYYY-MM-DD"));

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<RowsPerPage>(10);
  const [viewMode, setViewModeState] = useState<NoShowViewMode>(() => getDefaultViewMode());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Once the user explicitly picks a view we stop auto-forcing it on resize,
  // so their choice is respected (mirrors useAppointmentFilters.ts).
  const userChoseViewRef = useRef(false);
  const setViewMode = (mode: NoShowViewMode) => {
    userChoseViewRef.current = true;
    setViewModeState(mode);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const syncView = () => {
      if (userChoseViewRef.current) return;
      setViewModeState(mediaQuery.matches ? "grid" : "list");
    };
    mediaQuery.addEventListener("change", syncView);
    return () => mediaQuery.removeEventListener("change", syncView);
  }, []);

  const apiPageSize = rowsPerPage === "all" ? 1000 : rowsPerPage;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, rowsPerPage, startDate, endDate]);

  const { data, isLoading, isFetching, error } = useGetClinicNoShowAnalyticsQuery({
    startDate,
    endDate,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
  });

  const incidents = useMemo(() => {
    const payload = data as { data?: unknown } | undefined;
    return Array.isArray(payload?.data) ? payload.data : [];
  }, [data]);

  const rows: NoShowRow[] = useMemo(() => mapNoShowRows(incidents), [incidents]);

  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / apiPageSize));
  const currentPage = Math.min(page, totalPages);

  const showSkeleton = isLoading;

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

  return (
    <div className="mx-auto w-full max-w-full">
      <PageHeader
        title="No-Show Management"
        description="Track and manage patients who missed their scheduled appointments."
        titleExtra={
          <FeatureInfoTip
            title="No-Show Tips"
            tips={noShowTips}
            guideSection="noshow-guide"
            linkLabel="Read no-show guide"
          />
        }
        actions={
          <Button
            variant="bordered"
            className="hidden h-10 shrink-0 whitespace-nowrap rounded-xl border-line bg-surface px-3 text-[13px] font-semibold text-text shadow-sm hover:bg-surface-muted sm:flex sm:px-5"
            onPress={() => navigate("/profile/no-show-policy")}
            startContent={<FiSettings className="text-[14px]" />}
          >
            No-Show Policy
          </Button>
        }
      />

      <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
        <NoShowToolbar
          search={search}
          setSearch={setSearch}
          mobileFiltersOpen={mobileFiltersOpen}
          setMobileFiltersOpen={setMobileFiltersOpen}
          startDate={startDate}
          endDate={endDate}
          isFetching={isFetching}
          onApplyRange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
          onShiftDate={(direction) => {
            const start = new Date(startDate + "T00:00:00");
            const end = new Date(endDate + "T00:00:00");
            const shift = direction === "prev" ? -1 : 1;
            start.setDate(start.getDate() + shift);
            end.setDate(end.getDate() + shift);
            setStartDate(dayjs(start).format("YYYY-MM-DD"));
            setEndDate(dayjs(end).format("YYYY-MM-DD"));
          }}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {/* The view toggle drives layout at every breakpoint — mobile isn't
            force-locked to cards. NoShowTable is already overflow-x-auto
            with a min-w, so it scrolls rather than breaking the page on a
            phone (same as every other table in the app). */}
        {viewMode === "grid" ? (
          <NoShowCardGrid
            rows={pageRows}
            showSkeleton={showSkeleton}
            onViewHistory={handleViewHistory}
            page={currentPage}
            setPage={setPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            apiPageSize={apiPageSize}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
          />
        ) : (
          <NoShowTable
            rows={pageRows}
            showSkeleton={showSkeleton}
            onViewHistory={handleViewHistory}
            page={currentPage}
            setPage={setPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            apiPageSize={apiPageSize}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
          />
        )}
      </div>
    </div>
  );
};

export default NoShowPage;
