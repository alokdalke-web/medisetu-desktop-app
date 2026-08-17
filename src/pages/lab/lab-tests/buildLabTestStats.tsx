import { getLocalTimeZone, today } from "@internationalized/date";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiCreditCard,
  FiXCircle,
} from "react-icons/fi";

import type { LabTestTableMode } from "../components/LabTestTable";
import { safeDate } from "../labData";
import {
  buildFallbackSparkline,
  buildMetricTrend,
  firstMetricNumber,
  hasUsableTrend,
  isRequestReviewStatus,
  normalizeComparisonLabel,
  toLocalYmd,
  trendPointValue,
} from "./metricUtils";
import type {
  AppointmentTestApiRow,
  LabTestRowWithCatalog,
  LabTrendPoint,
  MetricCardData,
} from "./types";

type BuildLabTestStatsArgs = {
  mode: LabTestTableMode;
  dashboardSummary: any;
  requestReview: any;
  data: any;
  requestRows: LabTestRowWithCatalog[];
  rows: LabTestRowWithCatalog[];
  selectedStartDate?: string;
  selectedEndDate?: string;
  totalRows: number;
};

export const buildLabTestStats = ({
  mode,
  dashboardSummary,
  requestReview,
  data,
  requestRows,
  rows,
  selectedStartDate,
  selectedEndDate,
  totalRows,
}: BuildLabTestStatsArgs): MetricCardData[] => {
  const summary = dashboardSummary;
  const reviewCards = requestReview?.cards ?? [];
  const getReviewCardValue = (key: string) =>
    reviewCards.find((card: any) => card.key === key)?.value;
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
};
