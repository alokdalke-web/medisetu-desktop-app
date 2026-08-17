import { getLocalTimeZone, today } from "@internationalized/date";

import type { LabDashboardMetricTrend } from "../../../redux/api/labAssistantApi";
import type { LabTestRow } from "../labData";
import type { LabTrendPoint, MetricTrendDisplay } from "./types";

const REQUEST_REVIEW_STATUSES = new Set<LabTestRow["status"]>([
  "INITIATED",
  "REJECTED",
]);

export const LAB_CATALOG_PICKER_LIMIT = 1000;

export const isRequestReviewStatus = (status: unknown) =>
  REQUEST_REVIEW_STATUSES.has(status as LabTestRow["status"]);

export const parseMetricNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseOptionalMetricNumber = (value: unknown) => {
  if (value == null || value === "") return null;
  const parsed = parseMetricNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
};

export const firstMetricNumber = (fallback: number, ...values: unknown[]) => {
  for (const value of values) {
    const parsed = parseOptionalMetricNumber(value);
    if (parsed != null) return parsed;
  }

  return fallback;
};

export const formatTrendPercentage = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
};

export const normalizeComparisonLabel = (value: unknown) =>
  String(value ?? "").trim();

export const buildMetricTrend = (
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

export const normalizeTestName = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const getTodayDateRange = () => {
  const currentDate = today(getLocalTimeZone());

  return {
    start: currentDate,
    end: currentDate,
  };
};

export const formatDateRangeControlLabel = (dateRange: any) => {
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

export const toLocalYmd = (date: Date | null) => {
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const trendPointValue = (point: LabTrendPoint) =>
  parseMetricNumber(point.tests ?? point.value);

export const hasVisibleTrend = (points: LabTrendPoint[]) =>
  points.some((point) => trendPointValue(point) > 0);

export const hasUsableTrend = (points: LabTrendPoint[]) =>
  points.length >= 2 && hasVisibleTrend(points);

export const buildFallbackSparkline = (value: number): LabTrendPoint[] => {
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
