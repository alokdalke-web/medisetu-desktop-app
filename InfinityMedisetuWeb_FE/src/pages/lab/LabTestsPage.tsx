import {
  addToast,
  DateRangePicker,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import { I18nProvider } from "@react-aria/i18n";
import { getLocalTimeZone, today } from "@internationalized/date";
import { motion } from "framer-motion";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiActivity,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiCreditCard,
  FiGrid,
  FiList,
  FiSearch,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router";

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
import PaymentModal from "../dashboard/PaymentModal";
import { ConfirmRejectModal } from "./components/ConfirmRejectModal";
import { LabInvoiceModal } from "./components/LabInvoiceModal";
import { LabTestTable, type LabTestTableMode } from "./components/LabTestTable";
import { AddEditTestModal } from "./components/AddEditTestModal";
import {
  canUploadReport,
  mapAppointmentTestRow,
  safeDate,
  type LabTestRow,
} from "./labData";

type LabTestsPageProps = {
  mode: LabTestTableMode;
};

type LabTestsView = "list" | "card";

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

type AppointmentTestApiRow = Parameters<typeof mapAppointmentTestRow>[0] & {
  dateTime?: string | Date | null;
  createdAt?: string | Date | null;
  price?: string | number | null;
};

type LabTrendPoint = {
  tests?: string | number | null;
  revenue?: string | number | null;
  value?: string | number | null;
  [key: string]: unknown;
};

type LabTestRowWithCatalog = LabTestRow & {
  isAvailableInLabCatalog?: boolean;
};

const REQUEST_REVIEW_STATUSES = new Set<LabTestRow["status"]>([
  "INITIATED",
  "REJECTED",
]);

const isRequestReviewStatus = (status: unknown) =>
  REQUEST_REVIEW_STATUSES.has(status as LabTestRow["status"]);

const parseMetricNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalMetricNumber = (value: unknown) => {
  if (value == null || value === "") return null;
  const parsed = parseMetricNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
};

const firstMetricNumber = (fallback: number, ...values: unknown[]) => {
  for (const value of values) {
    const parsed = parseOptionalMetricNumber(value);
    if (parsed != null) return parsed;
  }

  return fallback;
};

const formatTrendPercentage = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
};

const normalizeComparisonLabel = (value: unknown) => String(value ?? "").trim();

const buildMetricTrend = (
  metric: LabDashboardMetricTrend | null | undefined,
  fallbackComparisonLabel: string,
): MetricTrendDisplay | undefined => {
  if (!metric) return undefined;

  const rawPercentage = metric.percentage ?? metric.trendPercentage;
  if (rawPercentage == null || rawPercentage === "") return undefined;

  const percentage = parseMetricNumber(rawPercentage);
  return {
    percentage,
    comparisonLabel:
      normalizeComparisonLabel(metric.comparisonLabel) ||
      fallbackComparisonLabel,
    direction:
      metric.direction ||
      (percentage > 0 ? "up" : percentage < 0 ? "down" : "neutral"),
  };
};

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

type LabPaymentMethod = "CASH" | "UPI";

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

type StatusFilterKey = (typeof _STATUS_FILTERS)[number]["key"];
type CategoryFilterKey = "ALL" | string;

const LAB_CATALOG_PICKER_LIMIT = 1000;

const normalizeTestName = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
const getTodayDateRange = () => {
  const currentDate = today(getLocalTimeZone());

  return {
    start: currentDate,
    end: currentDate,
  };
};

const formatDateRangeControlLabel = (dateRange: any) => {
  const rangeStart = dateRange?.start?.toString();
  const rangeEnd = (dateRange?.end ?? dateRange?.start)?.toString();
  const currentDate = today(getLocalTimeZone()).toString();

  if (!rangeStart || !rangeEnd) return "";
  if (rangeStart === currentDate && rangeEnd === currentDate) return "Today";

  const formatDate = (ymd: string) => {
    const date = new Date(`${ymd}T00:00:00`);

    if (Number.isNaN(date.getTime())) return ymd;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  return `${formatDate(rangeStart)} - ${formatDate(rangeEnd)}`;
};

const toLocalYmd = (date: Date | null) => {
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const trendPointValue = (point: LabTrendPoint) =>
  parseMetricNumber(point.tests ?? point.value);

const hasVisibleTrend = (points: LabTrendPoint[]) =>
  points.some((point) => trendPointValue(point) > 0);

const hasUsableTrend = (points: LabTrendPoint[]) =>
  points.length >= 2 && hasVisibleTrend(points);

const buildFallbackSparkline = (value: number): LabTrendPoint[] => {
  if (value <= 0) {
    return [
      { value: 1 },
      { value: 0.96 },
      { value: 1.03 },
      { value: 0.98 },
      { value: 1.02 },
      { value: 0.97 },
      { value: 1 },
    ];
  }

  return [
    { value: Math.max(0, value - 2) },
    { value: Math.max(0, value - 1) },
    { value: Math.max(0, value + 1) },
    { value },
    { value: Math.max(0, value + 2) },
    { value: Math.max(0, value - 1) },
    { value },
  ];
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

  const stats = useMemo<MetricCardData[]>(() => {
    const summary = dashboardSummary;
    const reviewCards = requestReview?.cards ?? [];
    const getReviewCardValue = (key: string) =>
      reviewCards.find((card) => card.key === key)?.value;
    const dailyTrend = (data?.dashboard?.dailyTrend ?? []) as LabTrendPoint[];
    const revenueOverviewTrend = (((data?.dashboard as any)?.revenueOverview
      ?.points ?? []) as LabTrendPoint[]);
    const kpiTrends = data?.dashboard?.kpiTrends;
    const fallbackComparisonLabel =
      normalizeComparisonLabel(data?.dashboard?.meta?.comparisonLabel) ||
      "vs yesterday";
    const initiatedRowsCount = requestRows.filter(
      (row: LabTestRowWithCatalog) => row.status === "INITIATED",
    ).length;
    const rejectedRowsCount = requestRows.filter(
      (row: LabTestRowWithCatalog) => row.status === "REJECTED",
    ).length;
    const actionableRequestsCount = requestRows.filter(
      (row: LabTestRowWithCatalog) =>
        row.status === "INITIATED" && row.isAvailableInLabCatalog !== false,
    ).length;
    const todayYmd = today(getLocalTimeZone()).toString();
    const selectedRangeIsToday =
      selectedStartDate === todayYmd && selectedEndDate === todayYmd;
    const todayRowsCount = ((data?.data ?? []) as AppointmentTestApiRow[]).filter(
      (item: AppointmentTestApiRow) =>
        (mode !== "all" || isRequestReviewStatus(item.workflowStatus)) &&
        toLocalYmd(safeDate(item.dateTime ?? item.createdAt)) === todayYmd,
    ).length;
    const todayCountFallback = selectedRangeIsToday
      ? Math.max(todayRowsCount, totalRows)
      : todayRowsCount;

    const newRequestsVal = firstMetricNumber(
      initiatedRowsCount,
      requestReview?.newRequests,
      getReviewCardValue("newRequests"),
      summary?.newRequests,
      initiatedRowsCount,
    );
    const rejectedRequestsVal = firstMetricNumber(
      rejectedRowsCount,
      requestReview?.rejectedRequests,
      getReviewCardValue("rejectedRequests"),
      summary?.rejectedTests,
      rejectedRowsCount,
    );
    const activeRequestsVal = firstMetricNumber(
      actionableRequestsCount,
      requestReview?.activeRequests,
      requestReview?.acceptableRequests,
      actionableRequestsCount,
    );
    const totalTestsVal =
      mode === "all"
        ? totalRows
        : firstMetricNumber(
            totalRows,
            requestReview?.totalRequests,
            getReviewCardValue("totalRequests"),
            summary?.totalTests,
            totalRows,
          );
    const todayTestsFromApi = firstMetricNumber(
      0,
      requestReview?.todayRequests,
      summary?.todayTests,
    );
    const todayTestsVal =
      todayTestsFromApi > 0 ? todayTestsFromApi : todayCountFallback;
    const inProgressTestsVal = firstMetricNumber(0, summary?.inProgressTests);
    const completedTestsVal = firstMetricNumber(0, summary?.completedTests);
    const pendingPaymentsVal = firstMetricNumber(0, summary?.pendingPayments);
    const totalRequestsTrendSource = hasUsableTrend(dailyTrend)
      ? dailyTrend
      : hasUsableTrend(revenueOverviewTrend)
        ? revenueOverviewTrend
        : [];
    const totalRequestsTrendData =
      totalRequestsTrendSource.length > 0
        ? totalRequestsTrendSource.map((point: LabTrendPoint) => ({
            value: trendPointValue(point),
          }))
        : buildFallbackSparkline(totalTestsVal);
    const completedTrendData =
      completedTestsVal > 0
        ? buildFallbackSparkline(completedTestsVal)
        : buildFallbackSparkline(0);

    const totalTestsCard = {
      label: mode === "all" ? "Total Requests" : "Total Tests",
      value: totalTestsVal,
      icon: <FiCalendar className="text-lg text-emerald-600" />,
      tone: "bg-emerald-50",
      subValue: `${todayTestsVal} today`,
      trendData: totalRequestsTrendData,
      trendKey: "value",
      color: totalTestsVal > 0 ? "#10b981" : "#94a3b8",
    };

    const newRequestsCard = {
      label: "New Requests",
      value: newRequestsVal,
      icon: <FiClipboard className="text-lg text-blue-600" />,
      tone: "bg-blue-50",
      subValue: "Awaiting review",
      trendData: [
        { value: Math.max(0, newRequestsVal - 1) },
        { value: Math.max(0, newRequestsVal - 2) },
        { value: Math.max(0, newRequestsVal + 1) },
        { value: Math.max(0, newRequestsVal - 1) },
        { value: Math.max(0, newRequestsVal + 2) },
        { value: Math.max(0, newRequestsVal - 3) },
        { value: newRequestsVal },
      ],
      trendKey: "value",
      color: "#3b82f6",
    };

    const rejectedRequestsCard = {
      label: "Rejected",
      value: rejectedRequestsVal,
      icon: <FiXCircle className="text-lg text-rose-600" />,
      tone: "bg-rose-50",
      trend: buildMetricTrend(
        kpiTrends?.rejectedRequests,
        fallbackComparisonLabel,
      ),
      trendData: [
        { value: Math.max(0, rejectedRequestsVal - 1) },
        { value: Math.max(0, rejectedRequestsVal - 2) },
        { value: Math.max(0, rejectedRequestsVal + 1) },
        { value: Math.max(0, rejectedRequestsVal - 1) },
        { value: Math.max(0, rejectedRequestsVal + 2) },
        { value: Math.max(0, rejectedRequestsVal - 1) },
        { value: rejectedRequestsVal },
      ],
      trendKey: "value",
      color: "#f43f5e",
    };

    const activeRequestsCard = {
      label: "Active Test",
      value: activeRequestsVal,
      icon: <FiActivity className="text-lg text-indigo-600" />,
      tone: "bg-indigo-50",
      subValue: "Accept / reject available",
      trendData: [
        { value: Math.max(0, activeRequestsVal - 1) },
        { value: Math.max(0, activeRequestsVal - 2) },
        { value: Math.max(0, activeRequestsVal + 1) },
        { value: Math.max(0, activeRequestsVal - 1) },
        { value: Math.max(0, activeRequestsVal + 2) },
        { value: Math.max(0, activeRequestsVal - 1) },
        { value: activeRequestsVal },
      ],
      trendKey: "value",
      color: "#6366f1",
    };

    const inProgressCard = {
      label: mode === "all" ? "Active Tests" : "In Progress",
      value:
        mode === "all"
          ? rows.filter(
              (row: LabTestRowWithCatalog) =>
                row.isAvailableInLabCatalog !== false,
            ).length
          : inProgressTestsVal,
      icon: <FiActivity className="text-lg text-indigo-600" />,
      tone: "bg-indigo-50",
      subValue: mode === "all" ? "Available in lab" : "Active workflow",
      trendData: [
        { value: Math.max(0, inProgressTestsVal - 2) },
        { value: Math.max(0, inProgressTestsVal - 1) },
        { value: Math.max(0, inProgressTestsVal - 3) },
        { value: Math.max(0, inProgressTestsVal + 1) },
        { value: Math.max(0, inProgressTestsVal + 2) },
        { value: Math.max(0, inProgressTestsVal - 1) },
        { value: inProgressTestsVal },
      ],
      trendKey: "value",
      color: "#6366f1",
    };

    const completedCard = {
      label: "Completed Tests",
      value: completedTestsVal,
      icon: <FiCheckCircle className="text-lg text-emerald-600" />,
      tone: "bg-emerald-50",
      subValue: `${completedTestsVal} completed`,
      trendData: completedTrendData,
      trendKey: "value",
      color: completedTestsVal > 0 ? "#10b981" : "#94a3b8",
    };

    const pendingPaymentsCard = {
      label: "Pending Payments",
      value: pendingPaymentsVal,
      icon: <FiCreditCard className="text-lg text-amber-600" />,
      tone: "bg-amber-50",
      subValue: "Collection pending",
      trendData: [
        { value: Math.max(0, pendingPaymentsVal - 1) },
        { value: Math.max(0, pendingPaymentsVal - 3) },
        { value: Math.max(0, pendingPaymentsVal - 2) },
        { value: Math.max(0, pendingPaymentsVal + 1) },
        { value: Math.max(0, pendingPaymentsVal - 1) },
        { value: Math.max(0, pendingPaymentsVal + 2) },
        { value: pendingPaymentsVal },
      ],
      trendKey: "value",
      color: "#f59e0b",
    };

    if (mode === "all") {
      return [
        totalTestsCard,
        newRequestsCard,
        rejectedRequestsCard,
        activeRequestsCard,
      ];
    }

    return [totalTestsCard, inProgressCard, completedCard, pendingPaymentsCard];
  }, [
    dashboardSummary,
    data,
    mode,
    requestReview,
    requestRows,
    rows,
    selectedEndDate,
    selectedStartDate,
    totalRows,
  ]);

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
    <div id={`${tourNamespace}-page`} className="mx-auto flex w-full flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onReportFileChange}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-1"
      >
        <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
          {pageTitle}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
          {pageSubtitle}
        </p>
      </motion.div>

      <motion.div
        id={`${tourNamespace}-kpis`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`grid gap-3 ${
          stats.length === 2
            ? "grid-cols-2"
            : stats.length === 3
              ? "grid-cols-1 sm:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {stats.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            tone={metric.tone}
            isLoading={isLoading}
            subValue={metric.subValue}
            trend={metric.trend}
            trendData={metric.trendData}
            trendKey={metric.trendKey}
            color={metric.color}
          />
        ))}
      </motion.div>
      <motion.section
        id={`${tourNamespace}-filters`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-center w-full lg:flex-1">
            <div className="group relative flex min-w-0 items-center w-full col-span-2 md:col-span-1">
              <FiSearch className="pointer-events-none absolute left-3.5 text-[18px] text-slate-400 transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Search patient, PID, doctor, or test name..."
                value={search}
                onChange={(e) => setSearch(e.target.value.slice(0, 30))}
                maxLength={30}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-[14px] font-medium text-slate-700 outline-none shadow-sm transition hover:border-slate-300 placeholder:text-[14px] placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-3 grid h-5 w-5 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
                >
                  <FiX className="text-sm" />
                </button>
              )}
            </div>

            <div className="w-full">
              <FilterDropdown
                ariaLabel="Filter by status"
                prefix="Status"
                options={statusFilterOptions}
                selectedKey={statusFilter}
                onChange={(key) => setStatusFilter(key)}
              />
            </div>

            <div className="w-full">
              <FilterDropdown
                ariaLabel="Filter by category"
                prefix="Category"
                options={categoryFilterOptions}
                selectedKey={categoryFilter}
                onChange={setCategoryFilter}
              />
            </div>

            <div className="flex min-w-0 items-center gap-2 w-full col-span-2 md:col-span-1">
              <button
                type="button"
                aria-label="Move date range back one day"
                onClick={() => shiftDateRange(-1)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <FiChevronLeft className="text-base" />
              </button>

              <div className="relative min-w-[220px] flex-1">
                <I18nProvider locale="en-IN">
                  <DateRangePicker
                    aria-label="Filter requests by date range"
                    value={dateRangeValue}
                    onChange={(value) => setDateRangeValue(value)}
                    visibleMonths={2}
                    selectorIcon={<FiCalendar className="text-slate-500" />}
                    classNames={{
                      base: "min-w-0 w-full",
                      inputWrapper:
                        "h-11 min-h-11 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition-all hover:border-primary/30 data-[focus=true]:border-primary/45 data-[focus=true]:ring-2 data-[focus=true]:ring-primary/10",
                      input: "text-[13px] font-semibold text-transparent",
                      segment: "text-transparent",
                      separator: "text-transparent",
                    }}
                  />
                </I18nProvider>

                {dateRangeControlLabel && (
                  <span className="pointer-events-none absolute inset-y-px left-px right-10 z-10 flex items-center justify-center rounded-l-lg bg-white px-3 text-center text-[13px] font-semibold text-slate-700 dark:bg-[#111726] dark:text-white">
                    {dateRangeControlLabel}
                  </span>
                )}
              </div>

              <button
                type="button"
                aria-label="Move date range forward one day"
                onClick={() => shiftDateRange(1)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <FiChevronRight className="text-base" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <ViewToggleButton
              active={view === "list"}
              label="Show list view"
              onClick={() => setView("list")}
            >
              <FiList />
            </ViewToggleButton>
            <ViewToggleButton
              active={view === "card"}
              label="Show card view"
              onClick={() => setView("card")}
            >
              <FiGrid />
            </ViewToggleButton>
          </div>
        </div>
      </motion.section>

      {hasError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {getLabApiErrorMessage(visibleError, "Failed to load tests.")}
            </span>

            <button
              onClick={() => {
                refetch();
                if (mode === "all") refetchCatalog();
              }}
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-red-100"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div id={`${tourNamespace}-table`}>
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

      <ConfirmRejectModal
        isOpen={rejectOpen}
        row={rejectRow}
        reason={rejectReason}
        isLoading={isRejecting}
        onReasonChange={setRejectReason}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) {
            setRejectRow(null);
            setRejectReason("");
          }
        }}
        onCancel={() => {
          setRejectOpen(false);
          setRejectRow(null);
          setRejectReason("");
        }}
        onConfirm={onRejectConfirm}
      />

      <PaymentModal
        isOpen={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) setPaymentRow(null);
        }}
        paymentRow={paymentRow}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        isLoading={isPaying}
        onCancel={() => {
          setPaymentOpen(false);
          setPaymentRow(null);
        }}
        onConfirm={onPayConfirm}
      />

      <LabInvoiceModal
        isOpen={Boolean(invoiceTarget)}
        onOpenChange={(open) => {
          if (!open) setInvoiceTarget(null);
        }}
        appointmentTestId={invoiceTarget?.appointmentTestId}
        invoiceId={invoiceTarget?.invoiceId}
        invoiceNumber={invoiceTarget?.invoiceNumber}
      />

      <AddEditTestModal
        isOpen={isEditModalOpen}
        mode="edit"
        name={editName}
        testCode={editTestCode}
        departmentId={editDepartmentId}
        sampleType={editSampleType}
        price={editPrice}
        status={editStatus}
        departments={departmentOptions}
        isSaving={isUpdatingCatalogTest}
        alertMessage="Price required. Please add the price of this test."
        disableDetails={true}
        onOpenChange={(open) => {
          onEditModalOpenChange();
          if (!open) {
            setEditingCatalogTestId(null);
            setEditName("");
            setEditTestCode("");
            setEditDepartmentId("");
            setEditSampleType("");
            setEditPrice("");
            setEditStatus("active");
          }
        }}
        onNameChange={setEditName}
        onTestCodeChange={setEditTestCode}
        onDepartmentChange={setEditDepartmentId}
        onSampleTypeChange={setEditSampleType}
        onPriceChange={setEditPrice}
        onStatusChange={setEditStatus}
        onCancel={() => {
          onEditModalOpenChange();
          setEditingCatalogTestId(null);
          setEditName("");
          setEditTestCode("");
          setEditDepartmentId("");
          setEditSampleType("");
          setEditPrice("");
          setEditStatus("active");
        }}
        onSubmit={handleSaveCatalogTest}
      />
    </div>
  );
};

export default LabTestsPage;
