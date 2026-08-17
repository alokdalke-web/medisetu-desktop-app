import {
  addToast,
  useDisclosure,
  Spinner
} from "@heroui/react";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { today, getLocalTimeZone } from "@internationalized/date";
import { FiChevronDown, FiCheck } from "react-icons/fi";

import {
  useGetLabTestsQuery,
  useUpdateLabTestMutation,
  useGetLabDepartmentsQuery,
} from "../../redux/api/labApi";
import {
  getLabApiErrorMessage,
  useGetLabAppointmentTestsQuery,
  useMarkAppointmentTestPaymentPaidMutation,
  useMoveAppointmentTestOnHoldMutation,
  useRejectAppointmentTestMutation,
  useUploadAppointmentTestReportMutation,
  useSaveLabResultMutation,
  useLazyGetLabResultTemplateQuery,
  useUpdateAppointmentTestSampleStatusMutation,
  type AppointmentTestListTab,
  type LabDashboardMetricTrend,
} from "../../redux/api/labAssistantApi";
import { LabTestTable, type LabTestTableMode } from "./components/LabTestTable";
import {
  canUploadReport,
  mapAppointmentTestRow,
  type LabTestRow,
} from "./labData";
import { LabTestsErrorBanner } from "./lab-tests/LabTestsErrorBanner";
import { LabTestsFilters } from "./lab-tests/LabTestsFilters";
import { LabTestsHeader } from "./lab-tests/LabTestsHeader";
import { LabTestsMetricsGrid } from "./lab-tests/LabTestsMetrics";
import { LabTestsModals } from "./lab-tests/LabTestsModals";
import { buildLabTestStats } from "./lab-tests/buildLabTestStats";
import {
  firstMetricNumber,
  formatDateRangeControlLabel,
  getTodayDateRange,
  isRequestReviewStatus,
  LAB_CATALOG_PICKER_LIMIT,
  normalizeTestName,
  parseOptionalMetricNumber,
  buildMetricTrend,
  trendPointValue,
  hasVisibleTrend,
  hasUsableTrend,
  buildFallbackSparkline,
  parseMetricNumber,
} from "./lab-tests/metricUtils";
import type {
  AppointmentTestApiRow,
  CategoryFilterKey,
  LabPaymentMethod,
  LabTestsView,
  LabTestRowWithCatalog,
  StatusFilterKey,
  LabTrendPoint,
} from "./lab-tests/types";

type LabTestsPageProps = {
  mode: LabTestTableMode;
};


type MetricCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
  isLoading: boolean;
  subValue?: string | number;
  trend?: MetricTrendDisplay;
  trendData?: LabTrendPoint[];
  trendKey?: string;
  color?: string;
};

type MetricCardData = Omit<MetricCardProps, "isLoading">;

type MetricTrendDisplay = {
  percentage: number;
  comparisonLabel: string;
  direction?: string | null;
};



const formatTrendPercentage = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
};

const normalizeComparisonLabel = (value: unknown) => String(value ?? "").trim();

function MetricCard({
  label,
  value,
  icon,
  tone,
  isLoading,
  subValue,
  trend,
}: MetricCardProps) {
  const trendClass =
    trend?.direction === "down"
      ? "text-red-600"
      : trend?.direction === "neutral" || trend?.percentage === 0
        ? "text-slate-500"
        : "text-emerald-600";
  const trendArrow =
    trend?.direction === "down" && trend.percentage !== 0
      ? "↓ "
      : trend?.direction === "up" && trend.percentage !== 0
        ? "↑ "
        : "";
  const trendSign = trend && trend.percentage > 0 ? "+" : "";

  return (
    <div className="min-h-[110px] overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-slate-300 dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex h-full min-w-0 items-center gap-4">
        <span
          className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full ${tone}`}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-500 dark:text-white">
            {label}
          </p>
          <div className="mt-1 text-[26px] font-semibold leading-none text-slate-950 dark:text-white">
            {isLoading ? <Spinner size="sm" /> : value}
          </div>
          {trend && !isLoading ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-1 leading-none">
              <span className={`text-[12px] font-semibold ${trendClass}`}>
                {trendArrow}
                {trendSign}
                {formatTrendPercentage(trend.percentage)}%
              </span>
              <span className="text-[12px] font-semibold text-slate-500">
                {trend.comparisonLabel}
              </span>
            </div>
          ) : subValue && !isLoading ? (
            <p className="mt-2 truncate text-[12px] font-semibold text-slate-500 dark:text-white">
              {subValue}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type FilterDropdownOption<KeyType extends string> = {
  key: KeyType;
  label: string;
  count?: number;
};

type FilterDropdownProps<KeyType extends string> = {
  ariaLabel: string;
  prefix: string;
  options: FilterDropdownOption<KeyType>[];
  selectedKey: KeyType;
  onChange: (key: KeyType) => void;
};

function FilterDropdown<KeyType extends string>({
  ariaLabel,
  prefix,
  options,
  selectedKey,
  onChange,
}: FilterDropdownProps<KeyType>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    options.find((option) => option.key === selectedKey) ?? options[0];
  const selectedCount =
    selectedOption?.count == null ? "" : ` (${selectedOption.count})`;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left text-[13px] font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/10 ${
          isOpen
            ? "border-primary/45 ring-2 ring-primary/10"
            : "border-slate-200"
        }`}
      >
        <span className="min-w-0 truncate">
          {prefix} - {selectedOption?.label ?? "All"}
          {selectedCount}
        </span>

        <FiChevronDown
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {options.map((option) => {
              const isSelected = option.key === selectedKey;
              const count =
                option.count == null || option.key !== selectedKey
                  ? ""
                  : ` (${option.count})`;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onChange(option.key);
                    setIsOpen(false);
                  }}
                  className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                    isSelected
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">
                    {prefix} - {option.label}
                    {count}
                  </span>
                  {isSelected && <FiCheck className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-[18px] shadow-sm transition",
        active
          ? "border-black bg-[#e8f6f4] text-primary"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


const _STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "INITIATED", label: "New Request" },
  { key: "ON_HOLD", label: "Accepted" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "AVAILABLE", label: "Available Tests" },
] as const;



const toLocalYmd = (date: Date | null) => {
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};



const LabTestsPage = ({ mode }: LabTestsPageProps) => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<LabTestsView>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("ALL");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilterKey>("ALL");
  const [dateRangeValue, setDateRangeValue] =
    useState<any>(getTodayDateRange());
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRow, setRejectRow] = useState<LabTestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentRow, setPaymentRow] = useState<LabTestRow | null>(null);
  const [payMethod, setPayMethod] = useState<LabPaymentMethod>("UPI");
  const [uploadRow, setUploadRow] = useState<LabTestRow | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<{
    appointmentTestId: string;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
  } | null>(null);
  const [invoiceMetaByAppointmentId, setInvoiceMetaByAppointmentId] = useState<
    Record<string, { invoiceId?: string | null; invoiceNumber?: string | null }>
  >({});

  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onOpenChange: onEditModalOpenChange,
  } = useDisclosure();

  const [editingCatalogTestId, setEditingCatalogTestId] = useState<
    string | null
  >(null);
  const [editName, setEditName] = useState("");
  const [editTestCode, setEditTestCode] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editSampleType, setEditSampleType] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "deactive">("active");

  const { data: departments = [] } = useGetLabDepartmentsQuery(undefined, {
    skip: mode !== "all",
  });
  const [updateLabTest, { isLoading: isUpdatingCatalogTest }] =
    useUpdateLabTestMutation();

  const departmentOptions = useMemo(() => {
    return departments.map((dept) => ({
      label: dept.departmentName ?? dept.name ?? "",
      value: String(dept.id ?? dept._id ?? ""),
    }));
  }, [departments]);

  const tab: AppointmentTestListTab = mode === "all" ? "new" : mode;
  const selectedStartDate = dateRangeValue?.start?.toString();
  const selectedEndDate = dateRangeValue?.end?.toString();
  const hasDateRange = Boolean(selectedStartDate && selectedEndDate);
  const dateRangeControlLabel = formatDateRangeControlLabel(dateRangeValue);

  const { data, isLoading, isError, error, refetch } =
    useGetLabAppointmentTestsQuery({
      tab,
      search: search.trim() || undefined,
      status:
        statusFilter === "ALL" || statusFilter === "AVAILABLE"
          ? undefined
          : statusFilter,
      category: categoryFilter === "ALL" ? undefined : categoryFilter,
      page,
      limit: pageSize,
      datePreset: hasDateRange ? "custom" : undefined,
      startDate: hasDateRange ? selectedStartDate : undefined,
      endDate: hasDateRange ? selectedEndDate : undefined,
    });

  useEffect(() => {
    setPage(1);
  }, [
    categoryFilter,
    search,
    selectedEndDate,
    selectedStartDate,
    statusFilter,
  ]);

  const labCatalogQueryArgs = useMemo(
    () => ({
      page: 1,
      limit: LAB_CATALOG_PICKER_LIMIT,
      status: "active",
      sortBy: "name" as const,
      sortOrder: "asc" as const,
    }),
    [],
  );

  const {
    data: labCatalogResponse,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    error: catalogError,
    refetch: refetchCatalog,
  } = useGetLabTestsQuery(labCatalogQueryArgs, { skip: mode !== "all" });

  const labCatalog = useMemo(
    () => labCatalogResponse?.data ?? [],
    [labCatalogResponse?.data],
  );

  const [moveOnHold, { isLoading: isMovingOnHold }] =
    useMoveAppointmentTestOnHoldMutation();
  const [rejectTest, { isLoading: isRejecting }] =
    useRejectAppointmentTestMutation();
  const [markPaid, { isLoading: isPaying }] =
    useMarkAppointmentTestPaymentPaidMutation();
  const [uploadReport, { isLoading: isUploadingReport }] =
    useUploadAppointmentTestReportMutation();
  const [saveResult] = useSaveLabResultMutation();
  const [loadResultTemplate] = useLazyGetLabResultTemplateQuery();
  const [updateSampleStatus] = useUpdateAppointmentTestSampleStatusMutation();

  const labCatalogDetails = useMemo(() => {
    if (mode !== "all") return null;

    const names = new Set<string>();
    const codes = new Set<string>();
    const sampleTypes = new Set<string>();

    labCatalog.forEach((test) => {
      if (String(test.status ?? "active").toLowerCase() === "active") {
        if (test.name) names.add(normalizeTestName(test.name));
        if (test.testCode) codes.add(normalizeTestName(test.testCode));
        if (test.sampleType)
          sampleTypes.add(normalizeTestName(test.sampleType));
      }
    });

    return { names, codes, sampleTypes };
  }, [labCatalog, mode]);

  const rows = useMemo<LabTestRowWithCatalog[]>(() => {
    const appointmentTests = (data?.data ?? []) as AppointmentTestApiRow[];

    const mappedRows: LabTestRowWithCatalog[] = appointmentTests.map(
      (item: AppointmentTestApiRow): LabTestRowWithCatalog => {
        const row = mapAppointmentTestRow(item) as LabTestRowWithCatalog;
        const invoiceMeta = invoiceMetaByAppointmentId[row.rawId];

        return invoiceMeta
          ? {
              ...row,
              invoiceId: row.invoiceId ?? invoiceMeta.invoiceId,
              invoiceNumber: row.invoiceNumber ?? invoiceMeta.invoiceNumber,
            }
          : row;
      },
    );

    if (mode !== "all" || !labCatalogDetails) return mappedRows;

    return mappedRows.map(
      (row: LabTestRowWithCatalog): LabTestRowWithCatalog => {
        const normalizedName = normalizeTestName(row.testName);
        const isAvailable =
          labCatalogDetails.names.has(normalizedName) ||
          labCatalogDetails.codes.has(normalizedName);

        return {
          ...row,
          isAvailableInLabCatalog: isAvailable,
        };
      },
    );
  }, [data?.data, invoiceMetaByAppointmentId, labCatalogDetails, mode]);

  const pagination = data?.pagination;
  const dashboardSummary = data?.dashboard?.summary;
  const requestReview = data?.dashboard?.requestReview;

  const requestRows = useMemo<LabTestRowWithCatalog[]>(() => {
    if (mode !== "all") return rows;

    return rows.filter((row: LabTestRowWithCatalog) =>
      isRequestReviewStatus(row.status),
    );
  }, [mode, rows]);

  const requestReviewTotalRows = useMemo(() => {
    if (mode !== "all") return pagination?.totalRecords ?? rows.length;
    if (statusFilter === "INITIATED" || statusFilter === "REJECTED") {
      return pagination?.totalRecords ?? requestRows.length;
    }

    const reviewCards = requestReview?.cards ?? [];
    const getReviewCardValue = (key: string) =>
      reviewCards.find((card) => card.key === key)?.value;
    const newRequestsTotal = parseOptionalMetricNumber(
      requestReview?.newRequests ?? getReviewCardValue("newRequests"),
    );
    const rejectedRequestsTotal = parseOptionalMetricNumber(
      requestReview?.rejectedRequests ?? getReviewCardValue("rejectedRequests"),
    );

    if (newRequestsTotal != null || rejectedRequestsTotal != null) {
      return (newRequestsTotal ?? 0) + (rejectedRequestsTotal ?? 0);
    }

    return requestRows.length;
  }, [
    mode,
    pagination?.totalRecords,
    requestReview,
    requestRows.length,
    rows.length,
    statusFilter,
  ]);

  const totalRows = requestReviewTotalRows;

  const totalPages = Math.max(
    1,
    mode === "all"
      ? Math.ceil(totalRows / pageSize)
      : (pagination?.totalPages ?? Math.ceil(totalRows / pageSize)),
  );

  const safePage = Math.min(page, totalPages);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of requestRows) {
      const category = String(row.testCategory ?? "").trim();
      if (!category || category === "-") continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => ({ category, count }));
  }, [requestRows]);

  const categoryFilterOptions = useMemo(
    () => [
      { key: "ALL", label: "All Categories", count: totalRows },
      ...categoryOptions.map((option) => ({
        key: option.category,
        label: option.category,
        count: option.count,
      })),
    ],
    [categoryOptions, totalRows],
  );

  const filteredRows = useMemo<LabTestRowWithCatalog[]>(() => {
    let nextRows = requestRows;

    if (statusFilter === "AVAILABLE") {
      nextRows = nextRows.filter(
        (row: LabTestRowWithCatalog) => row.isAvailableInLabCatalog !== false,
      );
    }

    if (categoryFilter !== "ALL") {
      nextRows = nextRows.filter(
        (row: LabTestRowWithCatalog) => row.testCategory === categoryFilter,
      );
    }

    return nextRows;
  }, [categoryFilter, requestRows, statusFilter]);

  const displayedRows = useMemo<LabTestRowWithCatalog[]>(() => {
    return filteredRows.slice(0, pageSize);
  }, [filteredRows, pageSize]);

  const tableLoading = isLoading || (mode === "all" && isCatalogLoading);

  const hasError = isError || (mode === "all" && isCatalogError);
  const visibleError = isError ? error : catalogError;

  const statusCounts = useMemo(() => {
    const acceptedRowsCount = rows.filter((row: LabTestRowWithCatalog) =>
      ["ON_HOLD", "IN_PROGRESS", "COMPLETED"].includes(row.status),
    ).length;
    const counts: Record<string, number> = {
      ALL: totalRows,
      AVAILABLE: firstMetricNumber(
        requestRows.filter(
          (row: LabTestRowWithCatalog) => row.isAvailableInLabCatalog !== false,
        ).length,
        requestReview?.acceptableRequests,
      ),
      INITIATED: firstMetricNumber(
        requestRows.filter(
          (row: LabTestRowWithCatalog) => row.status === "INITIATED",
        ).length,
        requestReview?.newRequests,
        dashboardSummary?.newRequests,
      ),
      ON_HOLD: firstMetricNumber(
        rows.filter((row: LabTestRowWithCatalog) => row.status === "ON_HOLD")
          .length,
        requestReview?.acceptedRequests,
        requestReview?.acceptedToday,
        dashboardSummary?.onHoldTests,
        acceptedRowsCount,
      ),
      IN_PROGRESS: firstMetricNumber(
        rows.filter(
          (row: LabTestRowWithCatalog) => row.status === "IN_PROGRESS",
        ).length,
        dashboardSummary?.inProgressTests,
      ),
      COMPLETED: firstMetricNumber(
        rows.filter((row: LabTestRowWithCatalog) => row.status === "COMPLETED")
          .length,
        dashboardSummary?.completedTests,
      ),
      PENDING: firstMetricNumber(
        rows.filter((row: LabTestRowWithCatalog) => row.status === "PENDING")
          .length,
        dashboardSummary?.pendingTests,
      ),
      REJECTED: firstMetricNumber(
        requestRows.filter(
          (row: LabTestRowWithCatalog) => row.status === "REJECTED",
        ).length,
        requestReview?.rejectedRequests,
        dashboardSummary?.rejectedTests,
      ),
    };

    return counts;
  }, [dashboardSummary, requestReview, requestRows, rows, totalRows]);

  const visibleFilters = useMemo(() => {
    if (mode === "all") {
      return [
        { key: "ALL", label: "All" },
        { key: "INITIATED", label: "New Request" },
        { key: "REJECTED", label: "Rejected" },
      ] as const;
    } else {
      return [
        { key: "ALL", label: "All" },
        { key: "IN_PROGRESS", label: "In Progress" },
        { key: "COMPLETED", label: "Completed" },
        { key: "REJECTED", label: "Rejected" },
      ] as const;
    }
  }, [mode]);

  const statusFilterOptions = useMemo(
    () =>
      visibleFilters.map((option) => ({
        key: option.key,
        label: option.label,
        count: statusCounts[option.key] ?? 0,
      })),
    [statusCounts, visibleFilters],
  );

  const stats = useMemo(
    () =>
      buildLabTestStats({
        mode,
        dashboardSummary,
        requestReview,
        data,
        requestRows,
        rows,
        selectedStartDate,
        selectedEndDate,
        totalRows,
      }),
    [
      dashboardSummary,
      data,
      mode,
      requestReview,
      requestRows,
      rows,
      selectedEndDate,
      selectedStartDate,
      totalRows,
    ],
  );

  useEffect(() => {
    setPage(1);
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setDateRangeValue(getTodayDateRange());
  }, [mode]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageTitle =
    mode === "all"
      ? "Patient Test Requests"
      : mode === "assigned"
        ? "Active Tests"
        : "My Tests";

  const pageSubtitle =
    mode === "all"
      ? "Review incoming patient test requests, validate mappings, and take action quickly."
      : mode === "assigned"
        ? "Track assigned lab tests and continue the sample workflow."
        : "Manage your lab test queue, payment status, samples, and reports.";
  const pageInfo =
    mode === "all"
      ? {
          title: "Patient Test Requests",
          description:
            "This screen shows patient tests assigned by doctors. Review each request, confirm the test is available in your lab catalog, then accept it to start the lab workflow or reject it with a reason when it cannot be processed.",
          items: [
            "Accepted requests move into Active Tests for sample tracking and reporting.",
            "Unavailable tests should be added to the catalog before accepting.",
          ],
          guideSection: "lab",
          linkLabel: "Read full lab guide",
        }
      : mode === "assigned"
        ? {
            title: "Active Tests",
            description:
              "This screen shows accepted tests that are now active in the lab. Use it to monitor payment, sample, and report status before opening the detailed sample workflow.",
            items: [
              "Open tracking to collect samples, receive them at the lab, enter results, upload reports, and view invoices.",
              "Completed tests remain visible here with their latest workflow and payment status.",
            ],
            guideSection: "lab",
            linkLabel: "Read full lab guide",
          }
        : {
            title: "Lab Tests",
            description:
              "Use this screen to manage lab test status, payment status, sample progress, and reports from one queue.",
            guideSection: "lab",
            linkLabel: "Read full lab guide",
          };

  const useClientPagination =
    statusFilter === "AVAILABLE" || categoryFilter !== "ALL";
  const tablePage = useClientPagination ? 1 : safePage;
  const tableTotalRows = useClientPagination
    ? filteredRows.length
    : totalRows;
  const tableTotalPages = useClientPagination
    ? 1
    : totalPages;
  const tableHasNextPage = useClientPagination
    ? false
    : mode === "all"
      ? tablePage < tableTotalPages
      : pagination?.hasNextPage;
  const tableHasPreviousPage = useClientPagination
    ? false
    : mode === "all"
      ? tablePage > 1
      : pagination?.hasPreviousPage;
  const tableNextPage = tableHasNextPage
    ? mode === "all"
      ? tablePage + 1
      : pagination?.nextPage
    : null;
  const tablePreviousPage = tableHasPreviousPage
    ? mode === "all"
      ? tablePage - 1
      : pagination?.previousPage
    : null;
  const shiftDateRange = (dayOffset: number) => {
    const fallbackDate = today(getLocalTimeZone());
    const currentStart = dateRangeValue?.start ?? fallbackDate;
    const currentEnd =
      dateRangeValue?.end ?? dateRangeValue?.start ?? fallbackDate;

    setDateRangeValue({
      start: currentStart.add({ days: dayOffset }),
      end: currentEnd.add({ days: dayOffset }),
    });
  };

  const showCatalogActionWarning = (row: LabTestRow) => {
    addToast({
      title: "Action unavailable",
      description: `${row.testName} is not available in My Test. Add it there before moving this test to On Hold or Rejecting it.`,
      color: "warning",
    });
  };

  const canUseAllTestActions = (row: LabTestRow) =>
    mode !== "all" || row.isAvailableInLabCatalog !== false;

  const hasValidTestPrice = (row: LabTestRow) => {
    const price = Number(row.testPrice ?? 0);
    return Number.isFinite(price) && price > 0;
  };

  const requestReject = (row: LabTestRow) => {
    if (!canUseAllTestActions(row)) {
      showCatalogActionWarning(row);
      return;
    }

    setRejectRow(row);
    setRejectReason("");
    setRejectOpen(true);
  };

  const openTracking = (row: LabTestRow) => {
    navigate(`/lab/tests/${encodeURIComponent(row.rawId)}/sample-tracking`);
  };

  const openInvoice = (row: LabTestRow) => {
    if (!row.rawId) return;

    const invoiceMeta = invoiceMetaByAppointmentId[row.rawId];

    setInvoiceTarget({
      appointmentTestId: row.rawId,
      invoiceId: row.invoiceId ?? invoiceMeta?.invoiceId ?? null,
      invoiceNumber: row.invoiceNumber ?? invoiceMeta?.invoiceNumber ?? null,
    });
  };

  const handleSaveCatalogTest = async () => {
    if (!editingCatalogTestId) return;

    const parsedPrice = Number(editPrice);
    if (!editPrice.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      addToast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        color: "danger",
      });
      return;
    }

    const payload = {
      departmentId: editDepartmentId.trim(),
      testName: editName.trim(),
      sampleType: editSampleType.trim(),
      price: parsedPrice,
      status: editStatus,
      ...(editTestCode.trim() ? { testCode: editTestCode.trim() } : {}),
    };

    try {
      await updateLabTest({
        id: editingCatalogTestId,
        body: payload,
      }).unwrap();

      addToast({
        title: "Updated",
        description: "Lab test price updated successfully.",
        color: "success",
      });

      onEditModalOpenChange();
      setEditingCatalogTestId(null);
      setEditName("");
      setEditTestCode("");
      setEditDepartmentId("");
      setEditSampleType("");
      setEditPrice("");
      setEditStatus("active");

      await refetchCatalog();
      await refetch();
    } catch (err: any) {
      addToast({
        title: "Failed",
        description:
          err?.data?.message || "Could not update the lab test price.",
        color: "danger",
      });
    }
  };

  const onHold = async (row: LabTestRow) => {
    if (!row.rawId) return;

    if (!canUseAllTestActions(row)) {
      showCatalogActionWarning(row);
      return;
    }

    if (row.status === "ON_HOLD" || row.status === "IN_PROGRESS") {
      openTracking(row);
      return;
    }

    if (!hasValidTestPrice(row)) {
      const matchingTest = labCatalog.find(
        (t) =>
          String(t.status ?? "active").toLowerCase() === "active" &&
          (normalizeTestName(t.name) === normalizeTestName(row.testName) ||
            (t.testCode &&
              normalizeTestName(t.testCode) ===
                normalizeTestName(row.testName))),
      );

      const catalogPrice = Number(matchingTest?.price ?? 0);
      const hasCatalogPrice =
        Number.isFinite(catalogPrice) && catalogPrice > 0;

      if (!hasCatalogPrice) {
        if (matchingTest) {
          setEditingCatalogTestId(matchingTest.id ?? matchingTest._id ?? null);
          setEditName(matchingTest.name ?? "");
          setEditTestCode(matchingTest.testCode ?? "");
          setEditDepartmentId(matchingTest.departmentId ?? "");
          setEditSampleType(matchingTest.sampleType ?? "");
          setEditPrice(matchingTest.price ? String(matchingTest.price) : "");
          setEditStatus(
            (matchingTest.status === "deactive" ? "deactive" : "active") as
              | "active"
              | "deactive",
          );
          onEditModalOpen();
        } else {
          showCatalogActionWarning(row);
        }
        return;
      }
    }

    try {
      await moveOnHold({ appointmentTestId: row.rawId }).unwrap();

      addToast({
        title: "Moved to On Hold",
        description: "Sample tracking is ready for this test.",
        color: "success",
      });

      await refetch();
      openTracking(row);
    } catch (err) {
      addToast({
        title: "Unable to move test",
        description: getLabApiErrorMessage(
          err,
          "Could not move this test to on hold.",
        ),
        color: "danger",
      });
    }
  };

  const onRejectConfirm = async () => {
    if (!rejectRow?.rawId) return;

    try {
      await rejectTest({
        appointmentTestId: rejectRow.rawId,
        reason: rejectReason,
      }).unwrap();

      addToast({
        title: "Rejected",
        description: "The test has been rejected successfully.",
        color: "success",
      });

      setRejectOpen(false);
      setRejectRow(null);
      setRejectReason("");
      refetch();
    } catch (err) {
      addToast({
        title: "Reject failed",
        description: getLabApiErrorMessage(err, "Could not reject this test."),
        color: "danger",
      });
    }
  };

  const onPayConfirm = async () => {
    if (!paymentRow?.rawId) return;

    try {
      const response = await markPaid({
        appointmentTestId: paymentRow.rawId,
        amount: Number(paymentRow.testPrice ?? 0),
        paymentMethod: payMethod,
      }).unwrap();
      const invoiceId = response.data?.invoiceId ?? null;
      const invoiceNumber = response.data?.invoiceNumber ?? null;

      setInvoiceMetaByAppointmentId((prev) => ({
        ...prev,
        [paymentRow.rawId]: {
          invoiceId,
          invoiceNumber,
        },
      }));

      addToast({
        title: "Payment marked as paid",
        description: invoiceNumber
          ? `Invoice ${invoiceNumber} is ready.`
          : "The payment status was updated successfully.",
        color: "success",
      });

      setPaymentOpen(false);
      setPaymentRow(null);
      refetch();
    } catch (err) {
      addToast({
        title: "Payment update failed",
        description: getLabApiErrorMessage(err, "Could not mark payment paid."),
        color: "danger",
      });
    }
  };

  const onUploadReport = (row: LabTestRow) => {
    if (!canUploadReport(row.paymentStatus, row.sampleStatus)) {
      addToast({
        title: "Report upload locked",
        description:
          "Report upload is allowed only after payment and sample process completion",
        color: "warning",
      });
      return;
    }

    setUploadRow(row);
    fileRef.current?.click();
  };

  const onEnterResult = (row: LabTestRow) => {
    if (!canUploadReport(row.paymentStatus, row.sampleStatus)) {
      addToast({
        title: "Result entry locked",
        description:
          "Result entry is available only after payment and sample process completion.",
        color: "warning",
      });
      return;
    }

    navigate(`/lab/tests/${encodeURIComponent(row.rawId)}/sample-tracking`);
  };

  const onReportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadRow?.rawId) return;

    try {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.trim().toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        addToast({
          title: "Invalid report file",
          description: "Upload a PDF report file.",
          color: "danger",
        });
        return;
      }

      await uploadReport({
        appointmentTestId: uploadRow.rawId,
        reportPdf: file,
      }).unwrap();

      try {
        const template = await loadResultTemplate({
          appointmentTestId: uploadRow.rawId,
        }).unwrap();

        if (template?.id) {
          await saveResult({
            appointmentTestId: uploadRow.rawId,
            templateId: template.id,
            status: "Completed",
            values: [],
          }).unwrap();
        }
      } catch (err) {
        console.error(
          "Failed to mark test completed automatically on upload:",
          err,
        );
      }

      try {
        await updateSampleStatus({
          appointmentTestId: uploadRow.rawId,
          action: "MARK_COMPLETED",
        }).unwrap();
      } catch (err) {
        console.error(
          "Failed to auto-advance sample status to completed on upload:",
          err,
        );
      }

      addToast({
        title: "Report uploaded",
        description: "The report PDF was uploaded successfully.",
        color: "success",
      });

      setUploadRow(null);
      await refetch();
    } catch (err) {
      addToast({
        title: "Upload failed",
        description: getLabApiErrorMessage(
          err,
          "Report upload is allowed only after payment and sample process completion",
        ),
        color: "danger",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const tourNamespace =
    mode === "all"
      ? "tour-lab-requests"
      : mode === "assigned"
        ? "tour-lab-active"
        : "tour-lab-tests";

  return (
    <div
      id={`${tourNamespace}-page`}
      className="mx-auto flex min-w-0 w-full flex-col gap-4 overflow-x-hidden"
    >
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onReportFileChange}
      />

      <LabTestsHeader
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        infoTitle={pageInfo.title}
        infoDescription={pageInfo.description}
        infoItems={pageInfo.items}
        guideSection={pageInfo.guideSection}
        linkLabel={pageInfo.linkLabel}
      />

      <LabTestsMetricsGrid
        tourNamespace={tourNamespace}
        stats={stats}
        isLoading={isLoading}
      />

      <LabTestsFilters
        tourNamespace={tourNamespace}
        search={search}
        statusFilter={statusFilter}
        statusFilterOptions={statusFilterOptions}
        categoryFilter={categoryFilter}
        categoryFilterOptions={categoryFilterOptions}
        dateRangeValue={dateRangeValue}
        dateRangeControlLabel={dateRangeControlLabel}
        view={view}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onCategoryFilterChange={setCategoryFilter}
        onDateRangeChange={setDateRangeValue}
        onViewChange={setView}
      />

      {hasError && (
        <LabTestsErrorBanner
          error={visibleError}
          onRetry={() => {
            refetch();
            if (mode === "all") refetchCatalog();
          }}
        />
      )}

      <div id={`${tourNamespace}-table`} className="min-w-0">
        <LabTestTable
          mode={mode}
          view={view}
          rows={displayedRows}
          isLoading={tableLoading}
          page={tablePage}
          pageSize={pageSize}
          totalRows={tableTotalRows}
          totalPages={tableTotalPages}
          hasNextPage={tableHasNextPage}
          hasPreviousPage={tableHasPreviousPage}
          nextPage={tableNextPage}
          previousPage={tablePreviousPage}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          onHold={onHold}
          onReject={requestReject}
          onMarkPaid={(row) => {
            setPaymentRow(row);
            setPayMethod("UPI");
            setPaymentOpen(true);
          }}
          onViewInvoice={openInvoice}
          onViewTracking={openTracking}
          onEnterResult={onEnterResult}
          onUploadReport={onUploadReport}
          isMutating={isMovingOnHold || isUploadingReport}
        />
      </div>

      <LabTestsModals
        rejectOpen={rejectOpen}
        rejectRow={rejectRow}
        rejectReason={rejectReason}
        isRejecting={isRejecting}
        setRejectOpen={setRejectOpen}
        setRejectRow={setRejectRow}
        setRejectReason={setRejectReason}
        onRejectConfirm={onRejectConfirm}
        paymentOpen={paymentOpen}
        paymentRow={paymentRow}
        payMethod={payMethod}
        isPaying={isPaying}
        setPaymentOpen={setPaymentOpen}
        setPaymentRow={setPaymentRow}
        setPayMethod={setPayMethod}
        onPayConfirm={onPayConfirm}
        invoiceTarget={invoiceTarget}
        setInvoiceTarget={setInvoiceTarget}
        isEditModalOpen={isEditModalOpen}
        onEditModalOpenChange={onEditModalOpenChange}
        setEditingCatalogTestId={setEditingCatalogTestId}
        editName={editName}
        editTestCode={editTestCode}
        editDepartmentId={editDepartmentId}
        editSampleType={editSampleType}
        editPrice={editPrice}
        editStatus={editStatus}
        setEditName={setEditName}
        setEditTestCode={setEditTestCode}
        setEditDepartmentId={setEditDepartmentId}
        setEditSampleType={setEditSampleType}
        setEditPrice={setEditPrice}
        setEditStatus={setEditStatus}
        departmentOptions={departmentOptions}
        isUpdatingCatalogTest={isUpdatingCatalogTest}
        onSaveCatalogTest={handleSaveCatalogTest}
      />
    </div>
  );
};

export default LabTestsPage;
