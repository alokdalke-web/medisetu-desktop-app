import { Spinner } from "@heroui/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FaRupeeSign } from "react-icons/fa";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowUpRight,
  FiBox,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCreditCard,
  FiFilePlus,
  FiFileText,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiUserPlus,
  FiZap
} from "react-icons/fi";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "../../components/StatCard";
import { useGetUserQuery } from "../../redux/api/authApi";
import {
  getLabApiErrorMessage,
  useGetLabAppointmentTestsQuery,
  type AppointmentTestListItem,
  type LabDashboardLabInsights,
  type LabDashboardMeta,
  type LabDashboardMetricTrend,
  type LabDashboardRecentActivity,
  type LabDashboardSummary,
  type LabDashboardTopRequestedTest,
  type LabDashboardTrendPoint,
  type LabDashboardUpcomingSampleCollection,
} from "../../redux/api/labAssistantApi";
import { formatCurrency, getGreetingName } from "../lab/labData";
import CustomDateRangePicker from "./CustomDateRangePicker";
import DateFilterTabs, { type DateTab } from "./DateFilterTabs";

type TrendPeriod = "daily" | "weekly" | "monthly";

type ChartDatum = {
  key?: string;
  label: string;
  tests: number;
  revenue: number;
};

type NormalizedBreakdownItem = {
  key: string;
  name: string;
  value: number;
  amount: number;
  percentage: number;
  color: string;
};

const PANEL_CLASS =
  "rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none";

type LooseSummary = LabDashboardSummary & Record<string, unknown>;

type TopTestItem = {
  testName: string;
  category: string;
  count: number;
  revenue: number;
};

const DEFAULT_TOP_TEST_NAMES = [
  "CBC",
  "ESR",
  "Blood Sugar",
  "Lipid Profile",
  "Thyroid Profile",
];

type RequestRow = {
  id: string;
  requestId: string;
  patient: string;
  test: string;
  sampleType: string;
  status: string;
  requestedBy: string;
  time: string;
};

type PendingReportRow = {
  id: string;
  test: string;
  patient: string;
  registeredOn: string;
  dueIn: string;
};

type SampleCollectionDisplayItem = {
  appointmentTestId: string;
  patientName?: string | null;
  testName?: string | null;
  sampleType?: string | null;
  collectionTime?: string | null;
  appointmentTime?: string | null;
  dateTime?: string | null;
  patientMobile?: string | null;
  patientPhone?: string | null;
  patientNumber?: string | null;
};

type TrendDirection = "up" | "down" | "neutral";

type KeyMetricItem = {
  label: string;
  sublabel?: string;
  value: string;
  icon: ReactNode;
  bgColor: string;
  delta: number;
  direction: TrendDirection;
  trendLabel: string;
  trendTitle: string;
};

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromYMD(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function trendDayLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function trendMonthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateRangeLabel(startYmd: string, endYmd: string) {
  const start = new Date(`${startYmd}T00:00:00`);
  const end = new Date(`${endYmd}T00:00:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return "Custom";
  }

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    return `${day} ${month}`;
  };

  return `${formatDate(start)} - ${formatDate(end)} ${end.getFullYear()}`;
}

function comparisonLabelFromTab(tab: DateTab) {
  if (tab === "today") return "vs yesterday";
  if (tab === "yesterday") return "vs previous day";
  if (tab === "thisWeek") return "vs last week";
  if (tab === "thisMonth") return "vs last month";
  return "vs selected range";
}

function trendEndYmdForTab(tab: DateTab, customEndDate: string) {
  if (tab === "custom") return customEndDate;
  if (tab === "yesterday") return toYMD(addDays(new Date(), -1));
  return toYMD(new Date());
}

function trackingPath(appointmentTestId?: string | null) {
  return appointmentTestId
    ? `/lab/tests/${appointmentTestId}/sample-tracking`
    : "/lab/all-tests";
}

function formatCompactNumber(value: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(value);
  } catch {
    return String(value);
  }
}

function numericTrendValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/%$/, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMetricTrend(value: unknown): value is LabDashboardMetricTrend {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeComparisonLabel(value: unknown) {
  const label = String(value ?? "").trim();
  if (!label) return "";
  return label.toLowerCase().startsWith("vs ") ? label : `vs ${label}`;
}

function trendPercentage(metric?: LabDashboardMetricTrend | null) {
  return numericTrendValue(metric?.percentage ?? metric?.trendPercentage) ?? 0;
}

function trendDirection(metric?: LabDashboardMetricTrend | null): TrendDirection {
  const direction = String(metric?.direction ?? "").toLowerCase();
  if (direction === "up" || direction === "down" || direction === "neutral") {
    return direction;
  }

  const percentage = trendPercentage(metric);
  if (percentage > 0) return "up";
  if (percentage < 0) return "down";
  return "neutral";
}

function trendToneClass(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "text-emerald-600 dark:text-emerald-300";
  if (direction === "down") return "text-red-600 dark:text-red-300";
  return "text-slate-400 dark:text-slate-400";
}

function trendComparisonLabel(
  metric: LabDashboardMetricTrend | null | undefined,
  fallbackLabel: string,
) {
  return normalizeComparisonLabel(metric?.comparisonLabel) || fallbackLabel;
}

function formatComparisonRangeTitle(
  metric: LabDashboardMetricTrend | null | undefined,
  meta: LabDashboardMeta | null | undefined,
  fallbackLabel: string,
) {
  const label = trendComparisonLabel(metric, fallbackLabel);
  const start = String(metric?.comparisonStartDate ?? meta?.comparisonStartDate ?? "").trim();
  const end = String(metric?.comparisonEndDate ?? meta?.comparisonEndDate ?? "").trim();

  if (!start && !end) return label;
  if (start && end) return `${label}: ${start} - ${end}`;
  return `${label}: ${start || end}`;
}

function trendForInsight(value: LabDashboardLabInsights[keyof LabDashboardLabInsights]) {
  return isMetricTrend(value) ? value : undefined;
}

function insightValue(value: LabDashboardLabInsights[keyof LabDashboardLabInsights]) {
  return isMetricTrend(value) ? value.value : value;
}

function formatInsightMetric(
  value: LabDashboardLabInsights[keyof LabDashboardLabInsights],
  fallback: string | number,
  format: "text" | "number" | "percentage",
) {
  const rawValue = insightValue(value);
  const numericValue = numericTrendValue(rawValue);

  if (format === "number") {
    return formatCompactNumber(numericValue ?? numberValue(fallback));
  }

  if (format === "percentage" && numericValue !== null) {
    return `${numericValue}%`;
  }

  const text = String(rawValue ?? "").trim();
  return text || String(fallback);
}

function summaryNumber(summary: LooseSummary, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = numberValue(summary[key]);
    if (value > 0) return value;
  }

  return fallback;
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  if (/^\d{1,2}:\d{2}/.test(value)) {
    const [hourPart, minutePart] = value.split(":");
    const date = new Date();
    date.setHours(Number(hourPart), Number(minutePart), 0, 0);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function requestId(index: number, id?: string | null) {
  const cleanId = String(id ?? "").replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();
  return `REQ-${cleanId || String(index + 1).padStart(4, "0")}`;
}

function sampleTypeLabel(item: AppointmentTestListItem) {
  return textValue(
    (item as AppointmentTestListItem & { sampleType?: string | null }).sampleType,
    textValue(item.category, "Sample"),
  );
}

function resolvePatientPhone(item: SampleCollectionDisplayItem) {
  return (
    item.patientMobile?.trim() ||
    item.patientPhone?.trim() ||
    item.patientNumber?.trim() ||
    "Number not available"
  );
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("COMPLETED") || normalized.includes("PAID")) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  }
  if (normalized.includes("PROGRESS") || normalized.includes("INITIATED")) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  }
  if (normalized.includes("PENDING") || normalized.includes("HOLD")) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  }
  if (normalized.includes("REJECTED") || normalized.includes("FAILED")) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  }
  return "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300";
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function humanize(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "Unknown";

  return text
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActivityTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTrendTooltip(value: unknown, name: unknown) {
  const key = String(name);
  return [
    key === "revenue" ? formatCurrency(numberValue(value)) : numberValue(value),
    key === "revenue" ? "Revenue" : "Tests",
  ];
}

function statusTone(status?: string) {
  const s = String(status ?? "").toUpperCase();
  if (s === "COMPLETED") {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400";
  }
  if (s === "IN_PROGRESS") {
    return "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400";
  }
  if (s === "ON_HOLD") {
    return "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400";
  }
  if (s === "REJECTED") {
    return "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400";
  }
  return "bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400";
}

const getActivityIcon = (status: string) => {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return <FiCheckCircle />;
  if (s === "ON_HOLD") return <FiClock />;
  if (s === "REJECTED") return <FiAlertTriangle />;
  if (s === "IN_PROGRESS") return <FiActivity />;
  return <FiFilePlus />;
};

function normalizeTrend(items: LabDashboardTrendPoint[] | undefined) {
  return (items ?? []).map((item, index): ChartDatum => {
    const rawLabel = item.label ?? item.day ?? item.month ?? item.date;

    return {
      key: textValue(item.date, ""),
      label: textValue(rawLabel, `Point ${index + 1}`),
      tests: numberValue(item.tests ?? item.volume),
      revenue: numberValue(item.revenue),
    };
  });
}

function appointmentTrendDate(item: AppointmentTestListItem) {
  const date = new Date(item.dateTime ?? item.createdAt);
  return Number.isFinite(date.getTime()) ? date : null;
}

function buildEmptyTrendBuckets(period: TrendPeriod, endYmd: string): ChartDatum[] {
  const end = dateFromYMD(endYmd);

  if (period === "monthly") {
    return Array.from({ length: 6 }).map((_, index) => {
      const date = addMonths(end, index - 5);
      return {
        key: monthKey(date),
        label: trendMonthLabel(date),
        tests: 0,
        revenue: 0,
      };
    });
  }

  return Array.from({ length: period === "daily" ? 9 : 7 }).map((_, index, list) => {
    const date = addDays(end, index - list.length + 1);
    return {
      key: toYMD(date),
      label: trendDayLabel(date),
      tests: 0,
      revenue: 0,
    };
  });
}

function trendBucketKey(date: Date, period: TrendPeriod) {
  return period === "monthly" ? monthKey(date) : toYMD(date);
}

function completeTrendSeries(
  apiTrend: ChartDatum[],
  appointmentTests: AppointmentTestListItem[],
  period: TrendPeriod,
  endYmd: string,
) {
  const buckets = buildEmptyTrendBuckets(period, endYmd);
  if (apiTrend.length >= buckets.length) return apiTrend;
  if (apiTrend.length === 0 && appointmentTests.length === 0) return apiTrend;

  const bucketByKey = new Map(buckets.map((item) => [item.key, item]));

  appointmentTests.forEach((item) => {
    const date = appointmentTrendDate(item);
    if (!date) return;

    const bucket = bucketByKey.get(trendBucketKey(date, period));
    if (!bucket) return;

    bucket.tests += 1;
    bucket.revenue += numberValue(item.price);
  });

  if (apiTrend.length > 0) {
    const firstBucketIndex = Math.max(0, buckets.length - apiTrend.length);

    apiTrend.forEach((point, index) => {
      const targetBucket =
        (point.key ? bucketByKey.get(point.key) : undefined) ??
        buckets[firstBucketIndex + index];

      if (targetBucket) {
        targetBucket.tests = point.tests;
        targetBucket.revenue = point.revenue;
      }
    });
  }

  return buckets;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[140px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500">
      {label}
    </div>
  );
}

function SectionLoader({ label }: { label: string }) {
  return (
    <div className="grid min-h-[140px] place-items-center rounded-xl border border-slate-100 bg-slate-50/30 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-500">
      <span className="inline-flex items-center gap-2">
        <Spinner size="sm" />
        {label}
      </span>
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-xl bg-slate-50 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

function DashboardPanel({
  title,
  icon,
  action,
  children,
  className = "",
  bodyClassName = "p-4",
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`${PANEL_CLASS} min-w-0 overflow-hidden flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[#eef1f5] px-4 py-3.5 dark:border-[#273244] shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6fbf7] text-[#0a6c74] dark:bg-[#16352f] dark:text-[#9be7dc]">
              {icon}
            </span>
          )}
          <h3 className="truncate text-[16px] font-semibold leading-normal text-[#100e1c] dark:text-white">
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function LabSummaryBar({
  items,
  onViewStats,
}: {
  items: Array<{ label: string; value: string | number }>;
  onViewStats: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#e5e7ea] bg-[#f5fbfb] px-4 py-4 dark:border-[#273244] dark:bg-[#111726] lg:flex-row lg:items-center">
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#e6fbf7] dark:bg-[#16352f]">
          <FiClipboard className="h-5 w-5 text-[#0a6c74] dark:text-[#9be7dc]" />
        </div>
        <span className="whitespace-nowrap text-[14px] font-semibold leading-5 text-[#100e1c] dark:text-white">
          Today's
          <br />
          Summary
        </span>
      </div>

      <div className="hidden h-[44px] w-px shrink-0 bg-[#e5e7ea] dark:bg-[#273244] lg:block" />

      <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-5 lg:flex lg:items-center">
        {items.map((item, index) => (
          <div key={item.label} className="flex min-w-0 items-stretch lg:flex-1">
            {index > 0 && (
              <div className="mr-3 hidden h-[44px] w-px shrink-0 bg-[#e5e7ea] dark:bg-[#273244] lg:block" />
            )}
            <div className="flex min-w-0 flex-col gap-1.5 lg:px-3">
              <span className="truncate text-[12px] text-[#677294] dark:text-white">
                {item.label}
              </span>
              <span className="text-[14px] font-bold text-[#100e1c] dark:text-white">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onViewStats}
        className="flex w-full cursor-pointer shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#0a6c74] px-3 py-1.5 text-[12px] font-medium text-[#0a6c74] transition-all duration-200 hover:bg-[#0a6c74]/5 hover:gap-3 focus:outline-none focus:ring-2 focus:ring-[#0a6c74]/20 dark:border-[#46beae]/50 dark:text-[#9be7dc] dark:hover:bg-[#1a3a35] lg:w-auto"
      >
        View All Stats
        <FiArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function LabInsightsWidget({
  labInsights,
  fallbackComparisonLabel,
  dashboardMeta,
  reportsGeneratedFallback,
}: {
  labInsights?: LabDashboardLabInsights | null;
  fallbackComparisonLabel: string;
  dashboardMeta?: LabDashboardMeta | null;
  reportsGeneratedFallback: number;
}) {
  const insights = labInsights ?? {};
  const insightItems = [
    {
      label: "Turnaround Time",
      detail: formatInsightMetric(insights.turnaroundTime, "-", "text"),
      trend: trendForInsight(insights.turnaroundTime),
      icon: <FiClock className="h-4 w-4 text-[#0a6c74]" />,
      iconBg: "bg-[#e6fbf7] dark:bg-[#16352f]",
    },
    {
      label: "Report Accuracy",
      detail: formatInsightMetric(insights.reportAccuracy, "-", "percentage"),
      trend: trendForInsight(insights.reportAccuracy),
      icon: <FiShield className="h-4 w-4 text-[#27b77a]" />,
      iconBg: "bg-[#e6fbf7] dark:bg-[#16352f]",
    },
    {
      label: "Sample Rejection Rate",
      detail: formatInsightMetric(insights.sampleRejectionRate, "-", "percentage"),
      trend: trendForInsight(insights.sampleRejectionRate),
      icon: <FiCheckCircle className="h-4 w-4 text-[#27b77a]" />,
      iconBg: "bg-[#e6fbf7] dark:bg-[#16352f]",
    },
    {
      label: "Reports Generated",
      detail: formatInsightMetric(
        insights.reportsGenerated,
        reportsGeneratedFallback,
        "number",
      ),
      trend: trendForInsight(insights.reportsGenerated),
      icon: <FiFileText className="h-4 w-4 text-[#0a6c74]" />,
      iconBg: "bg-[#e6fbf7] dark:bg-[#16352f]",
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] dark:bg-[#1d2440]">
            <FiActivity className="h-5 w-5 text-[#6366f1]" />
          </div>
          <span className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
            Lab Insights
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {insightItems.map((item) => {
          const direction = trendDirection(item.trend);
          const percentage = trendPercentage(item.trend);
          const trendText = `${percentage > 0 ? "+" : ""}${percentage}% ${trendComparisonLabel(
            item.trend,
            fallbackComparisonLabel,
          )}`;

          return (
            <div
              key={item.label}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl p-2.5 transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31]"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}>
                {item.icon}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-[#100e1c] dark:text-white">
                  {item.label}
                </span>
              </div>
              <div
                className="text-right"
                title={formatComparisonRangeTitle(
                  item.trend,
                  dashboardMeta,
                  fallbackComparisonLabel,
                )}
              >
                <span className="block text-[12px] font-bold text-[#100e1c] dark:text-white">
                  {item.detail}
                </span>
                <span className={`block text-[10px] font-semibold ${trendToneClass(direction)}`}>
                  {trendText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendChartPanel({
  title,
  data,
  isLoading,
  period,
  onPeriodChange,
}: {
  title: string;
  data: ChartDatum[];
  isLoading: boolean;
  period: TrendPeriod;
  onPeriodChange: (period: TrendPeriod) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [dropdownOpen]);

  const activeLabel =
    period === "daily"
      ? "Last 9 Days"
      : period === "weekly"
      ? "This Week"
      : "Last 6 Months";

  return (
    <DashboardPanel
      title={title}
      icon={<FiTrendingUp className="h-4 w-4" />}
      className="min-h-[315px]"
      bodyClassName="px-4 pb-4 pt-3"
      action={
        <div ref={dropdownRef} className="relative shrink-0 text-slate-700 dark:text-slate-200">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-slate-900 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-50 transition-colors dark:border-slate-100 dark:bg-[#1a2333] dark:text-white cursor-pointer outline-none shadow-sm"
          >
            {activeLabel}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726]">
              <button
                type="button"
                onClick={() => {
                  onPeriodChange("daily");
                  setDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  period === "daily"
                    ? "text-[#0f766e] bg-[#0f766e]/5 dark:text-teal-400 dark:bg-teal-950/20 font-bold"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                Last 9 Days
                {period === "daily" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-[#0f766e] dark:text-teal-400"
                  >
                    <path
                      d="M5 12L10 17L20 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onPeriodChange("weekly");
                  setDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  period === "weekly"
                    ? "text-[#0f766e] bg-[#0f766e]/5 dark:text-teal-400 dark:bg-teal-950/20 font-bold"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                This Week
                {period === "weekly" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-[#0f766e] dark:text-teal-400"
                  >
                    <path
                      d="M5 12L10 17L20 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onPeriodChange("monthly");
                  setDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  period === "monthly"
                    ? "text-[#0f766e] bg-[#0f766e]/5 dark:text-teal-400 dark:bg-teal-950/20 font-bold"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                Last 6 Months
                {period === "monthly" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-[#0f766e] dark:text-teal-400"
                  >
                    <path
                      d="M5 12L10 17L20 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      }
    >
      {isLoading ? (
        <SectionLoader label="Loading trend..." />
      ) : data.length === 0 ? (
        <EmptyState label="No trend data available" />
      ) : (
        <div className="h-[250px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="labTestsTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8ea0bd", fontSize: 12, fontWeight: 500 }}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8ea0bd", fontSize: 12, fontWeight: 500 }}
                width={34}
              />
              <Tooltip
                formatter={formatTrendTooltip}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #eef2f7",
                  borderRadius: "10px",
                  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                  color: "#100e1c",
                }}
              />
              <Area
                type="monotone"
                dataKey="tests"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#labTestsTrend)"
                dot={false}
                activeDot={{ r: 5, fill: "#0ea5e9", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardPanel>
  );
}
function StatusBreakdown({
  items,
  isLoading,
}: {
  items: NormalizedBreakdownItem[];
  isLoading: boolean;
}) {
  if (isLoading) return <SectionLoader label="Loading status..." />;
  if (items.length === 0) return <EmptyState label="No status data" />;

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center gap-4">
      <div className="relative mx-auto h-40 w-40 shrink-0 sm:h-44 sm:w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              cx="50%"
              cy="50%"
              dataKey="value"
              innerRadius={58}
              outerRadius={78}
              paddingAngle={3}
              cornerRadius={4}
            >
              {items.map((item) => (
                <Cell key={item.key} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {total}
            </p>
            <p className="mt-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
              Total Tests
            </p>
          </div>
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex min-h-[66px] min-w-0 flex-col justify-between gap-2 rounded-lg bg-slate-50/80 px-3 py-2.5 text-xs transition-colors duration-150 hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-800/60"
          >
            <div className="flex min-w-0 items-start gap-2">
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-full shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 whitespace-normal break-words text-[11px] font-extrabold leading-snug text-slate-600 dark:text-slate-350">
                {item.name}
              </span>
            </div>
            <span className="block whitespace-nowrap pl-5 text-[12px] font-extrabold leading-none text-slate-850 dark:text-white">
              {item.value}
              <span className="ml-1 text-[10px] font-semibold text-slate-450 dark:text-slate-500">
                ({item.percentage}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueOverviewCard({
  data,
  totalRevenue,
  trend,
  fallbackComparisonLabel,
  dashboardMeta,
  isLoading,
}: {
  data: ChartDatum[];
  totalRevenue: number;
  trend?: LabDashboardMetricTrend | null;
  fallbackComparisonLabel: string;
  dashboardMeta?: LabDashboardMeta | null;
  isLoading: boolean;
}) {
  const hasData = data.some((item) => item.revenue > 0 || item.tests > 0);
  const direction = trendDirection(trend);
  const percentage = trendPercentage(trend);
  const trendText = `${percentage > 0 ? "+" : ""}${percentage}% ${trendComparisonLabel(
    trend,
    fallbackComparisonLabel,
  )}`;

  return (
    <DashboardPanel
      title="Revenue Overview"
      icon={<FiCreditCard className="h-4 w-4" />}
      // action={
      //   <button
      //     type="button"
      //     className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#273244] dark:bg-[#172033] dark:text-white"
      //   >
      //     This Week
      //     <FiChevronDown className="h-3.5 w-3.5" />
      //   </button>
      // }
      bodyClassName="px-4 pb-4 pt-3"
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-3">
        <span className="text-[22px] font-bold leading-none text-[#100e1c] dark:text-white">
          {formatCurrency(totalRevenue)}
        </span>
        <span
          className={`text-[11px] font-semibold ${trendToneClass(direction)}`}
          title={formatComparisonRangeTitle(trend, dashboardMeta, fallbackComparisonLabel)}
        >
          {trendText}
        </span>
      </div>

      {isLoading ? (
        <SectionLoader label="Loading revenue..." />
      ) : !hasData ? (
        <EmptyState label="No revenue data available" />
      ) : (
        <div className="h-[220px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8ea0bd", fontSize: 11, fontWeight: 500 }}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8ea0bd", fontSize: 11, fontWeight: 500 }}
                width={38}
                tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}K`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(numberValue(value)), "Revenue"]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #eef2f7",
                  borderRadius: "10px",
                  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardPanel>
  );
}

function TopPerformingTestsCard({
  items,
  isLoading,
}: {
  items: TopTestItem[];
  isLoading: boolean;
}) {
  const displayItems = useMemo<TopTestItem[]>(() => {
    const normalizedItems = items.slice(0, 5);
    const usedNames = new Set(
      normalizedItems.map((item) => item.testName.trim().toLowerCase()),
    );
    const fallbackItems = DEFAULT_TOP_TEST_NAMES
      .filter((testName) => !usedNames.has(testName.toLowerCase()))
      .map((testName) => ({
        testName,
        category: "Default",
        count: 0,
        revenue: 0,
      }));

    return [...normalizedItems, ...fallbackItems].slice(0, 5);
  }, [items]);
  const maxCount = Math.max(1, ...displayItems.map((item) => item.count));
  const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#fb923c", "#ef4444"];

  return (
    <DashboardPanel
      title="Top Performing Tests"
      icon={<FiTrendingUp className="h-4 w-4" />}
      action={
        <button
          type="button"
          className="text-[12px] cursor-pointer font-semibold text-[#3b82f6] transition hover:text-[#0a6c74] dark:text-[#8fc7ff]"
        >
          View All
        </button>
      }
      bodyClassName="p-4 flex items-center"
    >
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <div className="grid max-h-[250px] min-h-[240px] w-full content-center gap-5 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {displayItems.map((item, index) => (
            <div key={`${item.testName}-${index}`} className="grid grid-cols-[30px_minmax(0,1fr)_36px] items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eef1ff] text-[11px] font-bold text-[#6366f1] dark:bg-[#1d2440] dark:text-white">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-[13px] font-semibold text-[#100e1c] dark:text-white">
                    {item.testName}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#273244]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width:
                        item.count > 0
                          ? `${Math.max(8, Math.round((item.count / maxCount) * 100))}%`
                          : "0%",
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                </div>
              </div>
              <span className="text-right text-[13px] font-bold text-[#100e1c] dark:text-white">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}

function RecentActivityList({
  items,
  isLoading,
}: {
  items: LabDashboardRecentActivity[];
  isLoading: boolean;
}) {
  if (isLoading) return <ListSkeleton rows={5} />;
  if (items.length === 0) return <EmptyState label="No recent lab activity" />;

  return (
    <div className="space-y-2">
      {items.slice(0, 6).map((item, index) => {
        const status = String(item.workflowStatus ?? "");

        return (
          <div
            key={`${item.appointmentTestId ?? "activity"}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-slate-50 bg-slate-50/40 p-2.5 dark:border-slate-800/30 dark:bg-slate-900/30"
          >
            <div
              className={[
                "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs",
                statusTone(status),
              ].join(" ")}
            >
              {getActivityIcon(status)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                  {textValue(item.title, humanize(status))}
                </p>
                <span className="shrink-0 text-[9px] font-bold text-slate-400">
                  {formatActivityTime(item.updatedAt ?? item.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10.5px] text-slate-450 dark:text-slate-400 font-semibold">
                {textValue(item.testName, "Lab test")} for{" "}
                <span className="text-slate-800 dark:text-slate-200 font-bold">{textValue(item.patientName, "Patient")}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentTestRequestsTable({
  rows,
  isLoading,
  onViewAll,
}: {
  rows: RequestRow[];
  isLoading: boolean;
  onViewAll: () => void;
}) {
  const showTable = isLoading || rows.length > 0;

  return (
    <DashboardPanel
      title="Recent Test Requests"
      icon={<FiClipboard className="h-4 w-4" />}
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="text-[12px] cursor-pointer font-semibold text-[#3b82f6] transition hover:text-[#0a6c74] dark:text-[#8fc7ff]"
        >
          View All
        </button>
      }
      bodyClassName="p-0"
    >
      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-[#eef1f5] text-[10px] uppercase tracking-[0.7px] text-[#677294] dark:border-[#273244] dark:text-white">
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Tests</th>
                <th className="px-4 py-3 font-semibold">Sample Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Requested By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f5] dark:divide-[#273244]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#677294]">
                    <Spinner size="sm" /> Loading requests...
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31]">
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#100e1c] dark:text-white">
                      {row.patient}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#100e1c] dark:text-white">
                      {row.test}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#677294] dark:text-white">
                      {row.sampleType}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadgeClass(row.status)}`}>
                        {humanize(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#677294] dark:text-white">
                      {row.requestedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm font-medium text-[#677294] dark:text-white">
          No recent test requests.
        </div>
      )}
    </DashboardPanel>
  );
}

function PendingReportsTable({
  rows,
  isLoading,
  onViewAll,
}: {
  rows: PendingReportRow[];
  isLoading: boolean;
  onViewAll: () => void;
}) {
  const showTable = isLoading || rows.length > 0;

  return (
    <DashboardPanel
      title="Pending Reports"
      icon={<FiFileText className="h-4 w-4" />}
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="text-[12px] cursor-pointer font-semibold text-[#3b82f6] transition hover:text-[#0a6c74] dark:text-[#8fc7ff]"
        >
          View All
        </button>
      }
      bodyClassName="p-0"
    >
      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-[#eef1f5] text-[10px] uppercase tracking-[0.7px] text-[#677294] dark:border-[#273244] dark:text-white">
                <th className="px-4 py-3 font-semibold">Test</th>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Registered On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f5] dark:divide-[#273244]">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-[#677294]">
                    <Spinner size="sm" /> Loading reports...
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31]">
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#100e1c] dark:text-white">
                      {row.test}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#100e1c] dark:text-white">
                      {row.patient}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#677294] dark:text-white">
                      {row.registeredOn}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm font-medium text-[#677294] dark:text-white">
          No pending reports.
        </div>
      )}
    </DashboardPanel>
  );
}

function UpcomingSampleCollectionWidget({
  items,
  onViewAll,
}: {
  items: SampleCollectionDisplayItem[];
  onViewAll: () => void;
}) {
  const [visiblePhoneById, setVisiblePhoneById] = useState<Record<string, string>>({});

  const handleCallClick = (item: SampleCollectionDisplayItem) => {
    const phone = resolvePatientPhone(item);

    setVisiblePhoneById((prev) => ({
      ...prev,
      [item.appointmentTestId]: phone,
    }));
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center ">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6fbf7] dark:bg-[#16352f]">
            <FiBox className="h-5 w-5 text-[#0a6c74]" />
          </div>
          <span className="text-[15px] font-semibold text-[#100e1c] dark:text-white">
            Upcoming Sample Collection
          </span>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[12px] cursor-pointer font-semibold text-[#3b82f6] transition hover:text-[#0a6c74] dark:text-[#8fc7ff]"
        >
          View All
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <EmptyState label="No upcoming collections" />
        ) : (
          items.slice(0, 3).map((item) => (
            <div
              key={item.appointmentTestId}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl p-2.5 transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff7e6] dark:bg-[#332716]">
                <FiClock className="h-4 w-4 text-[#e89b00]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#100e1c] dark:text-white">
                  {formatTime(item.collectionTime ?? item.appointmentTime ?? item.dateTime)} - {textValue(item.patientName, "Patient")}
                </p>
                <p className="truncate text-[11px] font-medium text-[#677294] dark:text-white">
                  {textValue(item.testName, "Lab test")}
                </p>
                {item.sampleType && (
                  <p className="truncate text-[10px] font-medium text-[#8a96b3] dark:text-white/70">
                    {item.sampleType}
                  </p>
                )}
              </div>
              <div className="flex min-w-[92px] flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => handleCallClick(item)}
                  className="rounded-lg border border-[#0a6c74]/30 px-2 py-1 text-[11px] font-semibold text-[#0a6c74] transition hover:bg-[#e6fbf7] dark:text-[#9be7dc]"
                >
                  Call
                </button>
                {visiblePhoneById[item.appointmentTestId] &&
                  (visiblePhoneById[item.appointmentTestId] === "Number not available" ? (
                    <span className="max-w-[120px] text-right text-[10px] font-semibold leading-tight text-[#e5484d]">
                      {visiblePhoneById[item.appointmentTestId]}
                    </span>
                  ) : (
                    <a
                      href={`tel:${visiblePhoneById[item.appointmentTestId]}`}
                      className="max-w-[120px] truncate text-right text-[10px] font-semibold text-[#0a6c74] underline-offset-2 hover:underline dark:text-[#9be7dc]"
                    >
                      {visiblePhoneById[item.appointmentTestId]}
                    </a>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuickActionsGrid({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const actions = [
    {
      label: "Add Walk-in Test",
      icon: <FiUserPlus />,
      path: "/lab/walk-in-test",
    },
    {
      label: "Add Lab Test",
      icon: <FiFilePlus />,
      path: "/lab/queue/add-test",
    },
    {
      label: "Active Tests",
      icon: <FiActivity />,
      path: "/lab/assigned",
    },
    {
      label: "Patient Requests",
      icon: <FiFileText />,
      path: "/lab/all-tests",
    },
  ];

  return (
    <DashboardPanel
      title="Quick Actions"
      icon={<FiZap className="h-4 w-4" />}
      bodyClassName="px-4 py-3"
    >
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            aria-label={action.label}
            title={action.label}
            onClick={() => onNavigate(action.path)}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#eef1f5] bg-white text-[#0a6c74] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0a6c74]/40 hover:bg-[#e6fbf7] dark:border-[#273244] dark:bg-[#0f1728] dark:text-[#9be7dc] dark:hover:bg-[#16352f]"
          >
            <span className="text-[17px]">{action.icon}</span>
          </button>
        ))}
      </div>
    </DashboardPanel>
  );
}


const LabDash = () => {
  const navigate = useNavigate();
  const { data: user } = useGetUserQuery();
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("daily");
  const [activeTab, setActiveTab] = useState<DateTab>("today");
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [startDate, setStartDate] = useState(() => toYMD(new Date()));
  const [endDate, setEndDate] = useState(() => toYMD(new Date()));
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, endDate, searchTerm, startDate, trendPeriod]);

  const labDashboardQueryArgs = useMemo(
    () => ({
      tab: "all" as const,
      page,
      limit: 100,
      search: searchTerm.trim() || undefined,
      datePreset: activeTab,
      startDate: activeTab === "custom" ? startDate : undefined,
      endDate: activeTab === "custom" ? endDate : undefined,
      trendPeriod,
    }),
    [activeTab, endDate, page, searchTerm, startDate, trendPeriod],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetLabAppointmentTestsQuery(labDashboardQueryArgs);

  const dashboard = data?.dashboard ?? null;
  const appointmentTests: AppointmentTestListItem[] = useMemo(
    () => data?.data ?? [],
    [data?.data],
  );
  const summary: LabDashboardSummary = dashboard?.summary ?? {};
  const summaryLoose = summary as LooseSummary;
  const dashboardMeta = dashboard?.meta ?? null;
  const kpiTrends = dashboard?.kpiTrends ?? null;
  const labInsights = dashboard?.labInsights ?? null;
  const greetingName = getGreetingName(user);
  const dashboardLoading = isLoading && !dashboard;
  const comparisonLabel =
    normalizeComparisonLabel(dashboardMeta?.comparisonLabel) ||
    comparisonLabelFromTab(activeTab);

  const handleTabChange = (tab: DateTab) => {
    setActiveTab(tab);
    setShowCustomCalendar(false);

    if (tab === "thisWeek") {
      setTrendPeriod("weekly");
    } else if (tab === "thisMonth") {
      setTrendPeriod("monthly");
    } else {
      setTrendPeriod("daily");
    }
  };

  const summaryValue = (key: keyof LabDashboardSummary) =>
    numberValue(summary[key]);

  const dailyTrend = normalizeTrend(dashboard?.dailyTrend);
  const weeklyTrend = normalizeTrend(dashboard?.weeklyTrend);
  const monthlyTrend = normalizeTrend(dashboard?.monthlyTrend);
  const trendEndYmd = trendEndYmdForTab(activeTab, endDate);
  
  const activeTrend = useMemo(() => {
    const selectedTrend = trendPeriod === "daily"
      ? dailyTrend
      : trendPeriod === "weekly"
        ? weeklyTrend
        : monthlyTrend;

    return completeTrendSeries(
      selectedTrend,
      appointmentTests,
      trendPeriod,
      trendEndYmd,
    );
  }, [appointmentTests, dailyTrend, monthlyTrend, trendEndYmd, trendPeriod, weeklyTrend]);

  const activeTrendTitle =
    trendPeriod === "daily"
      ? "Daily Test Trend"
      : trendPeriod === "weekly"
        ? "Weekly Test Trend"
        : "Monthly Test Trend";

  const totalTestsVal = summaryValue("totalTests");
  const newRequestsVal = summaryValue("newRequests");
  const inProgressTestsVal = summaryValue("inProgressTests");
  const completedTestsVal = summaryValue("completedTests");
  const readyForReportVal = summaryValue("readyForReport");
  const todayRevenueVal = summaryValue("todayRevenue");
  const monthlyRevenueVal = summaryValue("monthlyRevenue");
  const pendingReportsVal = summaryNumber(
    summaryLoose,
    ["pendingReports", "pendingReportCount", "readyForReport"],
    readyForReportVal,
  );
  const reportsGeneratedVal = summaryNumber(
    summaryLoose,
    ["reportsGenerated", "generatedReports", "completedReports"],
    completedTestsVal,
  );
  const samplesCollectedVal = summaryNumber(
    summaryLoose,
    ["samplesCollected", "sampleCollected", "todaySamplesCollected"],
    appointmentTests.filter((item) =>
      !["NOT_STARTED", "SAMPLE_COLLECTION_PENDING"].includes(
        String(item.sampleStatus ?? "").toUpperCase(),
      ),
    ).length,
  );
  const testsPerformedVal = summaryNumber(
    summaryLoose,
    ["testsPerformed", "todayTestsPerformed", "todayTests"],
    summaryValue("todayTests") || totalTestsVal,
  );
  const totalRevenueVal = summaryNumber(
    summaryLoose,
    ["totalRevenue", "revenue", "monthlyRevenue"],
    monthlyRevenueVal || todayRevenueVal,
  );
  const searchQuery = searchTerm.trim().toLowerCase();

  const statusDistributionItems = useMemo(() => {
    const items = [
      { key: "NEW_REQUESTS", name: "New Requests", value: newRequestsVal, color: "#3b82f6" },
      { key: "IN_PROGRESS", name: "In Progress", value: inProgressTestsVal, color: "#8b5cf6" },
      { key: "COMPLETED", name: "Completed", value: completedTestsVal, color: "#10b981" },
      { key: "PENDING_REPORTS", name: "Pending Reports", value: pendingReportsVal, color: "#fb923c" },
    ];
    const total = items.reduce((sum, item) => sum + item.value, 0);

    return items.map((item) => ({
      ...item,
      amount: 0,
      percentage: total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0,
    }));
  }, [completedTestsVal, inProgressTestsVal, newRequestsVal, pendingReportsVal]);

  const topTests = useMemo<TopTestItem[]>(() => {
    const apiItems: LabDashboardTopRequestedTest[] = dashboard?.topRequestedTests ?? [];
    if (apiItems.length > 0) {
      return apiItems.map((item) => ({
        testName: textValue(item.testName, "Lab test"),
        category: textValue(item.category, "General"),
        count: numberValue(item.count),
        revenue: numberValue(item.revenue),
      }));
    }

    const counts = new Map<string, TopTestItem>();
    appointmentTests.forEach((item) => {
      const testName = textValue(item.testName, "Lab test");
      const existing = counts.get(testName) ?? {
        testName,
        category: textValue(item.category, "General"),
        count: 0,
        revenue: 0,
      };
      existing.count += 1;
      existing.revenue += numberValue(item.price);
      counts.set(testName, existing);
    });

    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [appointmentTests, dashboard?.topRequestedTests]);

  const averageRevenuePerTest =
    totalRevenueVal > 0 && totalTestsVal > 0 ? totalRevenueVal / totalTestsVal : 0;
  const revenueTrend = activeTrend.map((item) => ({
    ...item,
    revenue: item.revenue || Math.round(item.tests * averageRevenuePerTest),
  }));

  const recentRequestRows: RequestRow[] = appointmentTests.slice(0, 4).map((item, index) => ({
    id: item.appointmentTestId,
    requestId: requestId(index, item.uniqueTestId ?? item.appointmentTestId),
    patient: textValue(item.patientName, "Patient"),
    test: textValue(item.testName, "Lab test"),
    sampleType: sampleTypeLabel(item),
    status: textValue(item.workflowStatus, "INITIATED"),
    requestedBy: textValue(item.doctorName, "Self"),
    time: formatTime(item.appointmentTime ?? item.dateTime ?? item.createdAt),
  }));

  const pendingReportRows: PendingReportRow[] = appointmentTests
    .filter((item) => String(item.workflowStatus ?? "").toUpperCase() !== "COMPLETED")
    .slice(0, 4)
    .map((item, index) => {
      const dueIn =
        String((item as AppointmentTestListItem & { dueIn?: string }).dueIn ?? "").trim() ||
        `${Math.max(1, 2 + index)}h ${String(45 - index * 5).padStart(2, "0")}m`;

      return {
        id: item.appointmentTestId,
        test: textValue(item.testName, "Lab test"),
        patient: textValue(item.patientName, "Patient"),
        registeredOn: formatDateTime(item.createdAt ?? item.dateTime),
        dueIn,
      };
    });

  const upcomingSamples: SampleCollectionDisplayItem[] = (
    dashboard?.upcomingSampleCollections?.length
      ? dashboard.upcomingSampleCollections
      : appointmentTests.filter((item) =>
          ["NOT_STARTED", "SAMPLE_COLLECTION_PENDING"].includes(
            String(item.sampleStatus ?? "").toUpperCase(),
          ),
        )
  )
    .slice(0, 3)
    .map((item: AppointmentTestListItem | LabDashboardUpcomingSampleCollection) => ({
      appointmentTestId: item.appointmentTestId,
      patientName: item.patientName,
      testName: item.testName,
      sampleType:
        "sampleType" in item
          ? item.sampleType
          : sampleTypeLabel(item as AppointmentTestListItem),
      collectionTime:
        "collectionTime" in item ? item.collectionTime : undefined,
      appointmentTime:
        "appointmentTime" in item ? item.appointmentTime : undefined,
      dateTime: "dateTime" in item ? item.dateTime : undefined,
      patientMobile: item.patientMobile,
      patientPhone: item.patientPhone,
      patientNumber: item.patientNumber,
    }));

  const summaryItems = [
    { label: "Samples Collected", value: samplesCollectedVal },
    { label: "Tests Performed", value: testsPerformedVal },
    { label: "Reports Generated", value: reportsGeneratedVal },
    { label: "Pending Reports", value: pendingReportsVal },
  ];

  const labSearchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];

    return appointmentTests
      .filter((item) => {
        const haystack = [
          item.patientName,
          item.patientId,
          item.doctorName,
          item.testName,
          item.category,
          item.uniqueTestId,
          item.invoiceNumber,
          item.workflowStatus,
          item.paymentStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchQuery);
      })
      .slice(0, 5);
  }, [appointmentTests, searchQuery]);

  const metricTrendProps = (metric?: LabDashboardMetricTrend | null) => ({
    delta: trendPercentage(metric),
    direction: trendDirection(metric),
    trendLabel: trendComparisonLabel(metric, comparisonLabel),
    trendTitle: formatComparisonRangeTitle(metric, dashboardMeta, comparisonLabel),
  });

  const keyMetrics: KeyMetricItem[] = [
    {
      label: "Total Tests",
      value: formatCompactNumber(totalTestsVal),
      icon: <FiTrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />,
      bgColor: "bg-[#e8f4f8]",
      ...metricTrendProps(kpiTrends?.totalTests),
    },
    {
      label: "New Requests",
      value: formatCompactNumber(newRequestsVal),
      icon: <FiClipboard className="h-5 w-5 text-blue-600 dark:text-blue-300" />,
      bgColor: "bg-[#eef1ff]",
      ...metricTrendProps(kpiTrends?.newRequests),
    },
    {
      label: "In Progress",
      value: formatCompactNumber(inProgressTestsVal),
      icon: <FiActivity className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />,
      bgColor: "bg-[#eee8ff]",
      ...metricTrendProps(kpiTrends?.inProgressTests),
    },
    {
      label: "Completed",
      value: formatCompactNumber(completedTestsVal),
      icon: <FiCheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />,
      bgColor: "bg-[#e6fbf7]",
      ...metricTrendProps(kpiTrends?.completedTests),
    },
    {
      label: "Pending Reports",
      value: formatCompactNumber(pendingReportsVal),
      icon: <FiCreditCard className="h-5 w-5 text-amber-600 dark:text-amber-300" />,
      bgColor: "bg-[#fff7e6]",
      ...metricTrendProps(kpiTrends?.pendingReports),
    },
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenueVal),
      icon: <FaRupeeSign className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />,
      bgColor: "bg-[#e6fbf7]",
      ...metricTrendProps(kpiTrends?.totalRevenue),
    },
  ];



  return (
    <div id="tour-lab-dashboard" className="w-full min-w-0 px-3 pb-4 pt-0 antialiased dark:bg-[#0b1321] sm:px-0 sm:pb-6 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto no-scrollbar">
        <div className="max-w-full space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex shrink-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-[22px] md:text-[24px] lg:text-[26px]">
                  {getGreeting()}, Dr. {greetingName.replace(/^Dr\.?\s*/i, "")}!
                </h2>
                {isFetching && !isLoading && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-[#172033] dark:text-white">
                    <Spinner size="sm" /> Updating
                  </span>
                )}
              </div>
              <p className="text-[12px] font-normal leading-5 text-[#677294] dark:text-white sm:text-[13px] lg:text-[14px]">
                Here's what's happening in your lab today.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto ">
              <div
                className="relative flex items-center gap-3 overflow-x-auto no-scrollbar sm:justify-end "
                data-datepicker-anchor
              >
                <DateFilterTabs
                  active={activeTab}
                  onChange={handleTabChange}
                  onCustom={() => {
                    setActiveTab("custom");
                    setTrendPeriod("monthly");
                    setShowCustomCalendar(true);
                  }}
                  customLabel={
                    activeTab === "custom" && !showCustomCalendar
                      ? formatDateRangeLabel(startDate, endDate)
                      : undefined
                  }
                />
                {showCustomCalendar && (
                  <CustomDateRangePicker
                    startYmd={startDate}
                    endYmd={endDate}
                    onApply={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                      setShowCustomCalendar(false);
                    }}
                    onCancel={() => {
                      setShowCustomCalendar(false);
                      handleTabChange("today");
                    }}
                  />
                )}
              </div>

              <div
                ref={searchRef}
                className="relative w-full shrink-0 sm:w-[220px] lg:w-[260px] xl:w-[280px]"
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Search lab tests, patients..."
                  className="w-full rounded-xl border border-[rgba(207,207,207,0.5)] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#100e1c] outline-none placeholder:text-[#677294] focus:ring-1 focus:ring-[#0a6c74]/30 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:placeholder:text-white"
                />
                <FiSearch className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#677294] dark:text-white" />

                {showSearchResults && searchQuery.length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                    {labSearchResults.length > 0 ? (
                      labSearchResults.map((item) => (
                        <button
                          key={item.appointmentTestId}
                          type="button"
                          onClick={() => {
                            navigate(trackingPath(item.appointmentTestId));
                            setShowSearchResults(false);
                            setSearchTerm("");
                          }}
                          className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-[#273244] dark:hover:bg-[#151e31]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6fbf7] text-[11px] font-semibold text-[#0a6c74] dark:bg-[#16352f] dark:text-[#9be7dc]">
                            {(item.testName ?? "T").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                              {textValue(item.testName, "Lab test")}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-white">
                              {textValue(item.patientName, "Patient")} • {humanize(item.workflowStatus)}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-white">
                        No lab tests found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{getLabApiErrorMessage(error, "Failed to load dashboard.")}</span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!isLoading && !isError && !dashboard && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              Dashboard metrics are not available in the API response yet.
            </div>
          )}

          <div
            id="tour-lab-dashboard-stats"
            className={`grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-6 ${isFetching ? "opacity-80 transition-opacity" : ""}`}
          >
            {keyMetrics.map((metric) => (
              <StatCard
                key={`${metric.label}-${metric.sublabel ?? ""}`}
                icon={metric.icon}
                label={metric.label}
                sublabel={metric.sublabel}
                value={dashboardLoading ? "..." : metric.value}
                bgColor={metric.bgColor}
                delta={metric.delta}
                direction={metric.direction}
                trendLabel={metric.trendLabel}
                trendTitle={metric.trendTitle}
                compactSparkline
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
              <div id="tour-lab-summary">
                <LabSummaryBar
                  items={summaryItems}
                  onViewStats={() => navigate("/lab/all-tests")}
                />
              </div>

              <div id="tour-lab-trends" className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[1.45fr_1fr]">
                <TrendChartPanel
                  title={activeTrendTitle}
                  data={activeTrend}
                  isLoading={dashboardLoading}
                  period={trendPeriod}
                  onPeriodChange={setTrendPeriod}
                />

                <DashboardPanel
                  title="Test Status Distribution"
                  icon={<FiClipboard className="h-4 w-4" />}
                  bodyClassName="p-4 flex items-center"
                >
                  <StatusBreakdown
                    items={statusDistributionItems}
                    isLoading={dashboardLoading}
                  />
                </DashboardPanel>
              </div>

              <div id="tour-lab-work-queues" className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[1.45fr_1fr]">
                <RevenueOverviewCard
                  data={revenueTrend}
                  totalRevenue={totalRevenueVal}
                  trend={kpiTrends?.totalRevenue}
                  fallbackComparisonLabel={comparisonLabel}
                  dashboardMeta={dashboardMeta}
                  isLoading={dashboardLoading}
                />
                <TopPerformingTestsCard
                  items={topTests}
                  isLoading={dashboardLoading}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[1.45fr_1fr]">
                <RecentTestRequestsTable
                  rows={recentRequestRows}
                  isLoading={isLoading}
                  onViewAll={() => navigate("/lab/all-tests")}
                />
                <PendingReportsTable
                  rows={pendingReportRows}
                  isLoading={isLoading}
                  onViewAll={() => navigate("/lab/assigned")}
                />
              </div>
            </div>

            <div id="tour-lab-side-panel" className="grid grid-cols-1 content-start gap-4 self-start sm:grid-cols-2 sm:gap-5 lg:grid-cols-1">
              <DashboardPanel
                title="Recent Operations Log"
                icon={<FiFilePlus className="h-4 w-4" />}
                bodyClassName="p-3.5"
                className="sm:col-span-2 lg:col-span-1"
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/lab/all-tests")}
                    className="text-[12px] cursor-pointer font-semibold text-[#3b82f6] transition hover:text-[#0a6c74] dark:text-[#8fc7ff]"
                  >
                    View All
                  </button>
                }
              >
                <div className="max-h-[250px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                  <RecentActivityList
                    items={dashboard?.recentActivity ?? []}
                    isLoading={dashboardLoading}
                  />
                </div>
              </DashboardPanel>
              <UpcomingSampleCollectionWidget
                items={upcomingSamples}
                onViewAll={() => navigate("/lab/assigned")}
              />

              <LabInsightsWidget
                labInsights={labInsights}
                fallbackComparisonLabel={comparisonLabel}
                dashboardMeta={dashboardMeta}
                reportsGeneratedFallback={reportsGeneratedVal}
              />
              <QuickActionsGrid onNavigate={(path) => navigate(path)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabDash;
