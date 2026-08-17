import { Spinner } from "@heroui/react";
import { motion } from "framer-motion";

import { formatTrendPercentage } from "./metricUtils";
import type { MetricCardData } from "./types";

type MetricCardProps = MetricCardData & {
  isLoading: boolean;
};

type LabTestsMetricsGridProps = {
  tourNamespace: string;
  stats: MetricCardData[];
  isLoading: boolean;
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
    <div className="min-h-[96px] overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm transition-colors hover:border-slate-300 dark:border-[#273244] dark:bg-[#111726] sm:min-h-[110px] sm:px-4 sm:py-4">
      <div className="flex h-full min-w-0 items-center gap-3 sm:gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full sm:h-[52px] sm:w-[52px] ${tone}`}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold leading-4 text-slate-500 dark:text-white sm:text-[13px]">
            {label}
          </p>
          <div className="mt-1 text-[24px] font-semibold leading-none text-slate-950 dark:text-white sm:text-[26px]">
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
            <p className="mt-2 truncate text-[11px] font-semibold text-slate-500 dark:text-white sm:text-[12px]">
              {subValue}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LabTestsMetricsGrid({
  tourNamespace,
  stats,
  isLoading,
}: LabTestsMetricsGridProps) {
  return (
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
  );
}
