/**
 * useAppointmentStats.ts
 *
 * Derives the five stat-card values (Total, Completed, Upcoming, Cancelled,
 * No Show) from API data and tab counts.
 * Returns a ready-to-render array consumed directly by StatCard components.
 */

import { useMemo } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiUserX,
  FiXCircle,
} from "react-icons/fi";
import React from "react";
import type { AppointmentRow, ApiPatient } from "../../../utils/appointment.mapper";
import { mapAppointmentFromApi } from "../../../utils/appointment.mapper";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClinicMetric {
  count?: number;
  percentageLabel?: string;
  percentageChange?: number;
}

interface ClinicAppointmentDetails {
  totalAppointments?: ClinicMetric;
  completed?: ClinicMetric;
  upcoming?: ClinicMetric;
  confirmed?: ClinicMetric;
  patientArrived?: ClinicMetric;
  cancelled?: ClinicMetric;
  noShow?: ClinicMetric;
}

export interface StatCardData {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  iconClassName: string;
  detailClassName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const metricValue = (metric: ClinicMetric | undefined, fallback: number): number =>
  typeof metric?.count === "number" ? metric.count : fallback;

const metricDetail = (
  metric: ClinicMetric | undefined,
  fallback: string,
  suffix = "",
): string => {
  const label = metric?.percentageLabel?.trim();
  if (label) return `${label}${suffix}`;
  if (typeof metric?.percentageChange === "number") {
    return `${metric.percentageChange}%${suffix}`;
  }
  return fallback;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseAppointmentStatsArgs {
  view: "list" | "card" | "calendar";
  rows: AppointmentRow[];
  patientsRawCal: ApiPatient[];
  tabCounts: Record<string, number>;
  totalRecords: number;
  clinicAppointmentDetails: ClinicAppointmentDetails | null | undefined;
}

export const useAppointmentStats = ({
  view,
  rows,
  patientsRawCal,
  tabCounts,
  totalRecords,
  clinicAppointmentDetails,
}: UseAppointmentStatsArgs): StatCardData[] => {
  return useMemo(() => {
    const sourceRows: AppointmentRow[] =
      view === "calendar" ? patientsRawCal.map(mapAppointmentFromApi) : rows;

    const total = Number(tabCounts?.all ?? totalRecords ?? rows.length);

    // Count by status keys, preferring tabCounts when available
    const countByStatus = (keys: string[]): number => {
      const hasTabCount = keys.some((key) => typeof tabCounts?.[key] === "number");

      if (hasTabCount) {
        return keys.reduce((sum, key) => {
          const value = tabCounts?.[key];
          return sum + (typeof value === "number" ? value : 0);
        }, 0);
      }

      return sourceRows.reduce((sum, row) => {
        const status = String(row.status || "").trim().toLowerCase();
        return keys.includes(status) ? sum + 1 : sum;
      }, 0);
    };

    const completedCount = countByStatus(["completed"]);
    const upcomingCount = countByStatus([
      "pending",
      "confirmed",
      "patientarrived",
      "patient arrived",
      "patient_arrived",
    ]);
    const cancelledCount = countByStatus(["cancelled", "canceled"]);
    const noShowCount = countByStatus(["noshow", "no show", "no_show"]);

    const details = clinicAppointmentDetails;
    const totalValue = metricValue(details?.totalAppointments, total);

    const upcomingValue =
      details && details.upcoming
        ? metricValue(details.upcoming, 0) +
          metricValue(details.confirmed, 0) +
          metricValue(details.patientArrived, 0)
        : upcomingCount;

    const percentOfTotal = (value: number): string => {
      if (totalValue <= 0) return "0% of total";
      const pct = (value * 100) / totalValue;
      const formatted = Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1);
      return `${formatted}% of total`;
    };

    return [
      {
        label: "Total Appointments",
        value: totalValue,
        detail: metricDetail(
          details?.totalAppointments,
          total > sourceRows.length && sourceRows.length > 0
            ? `${sourceRows.length} shown on page`
            : "Current range",
          " Previous Period",
        ),
        icon: React.createElement(FiCalendar, { className: "text-[22px]" }),
        iconClassName: "bg-emerald-50 text-emerald-600",
        detailClassName: "text-emerald-600",
      },
      {
        label: "Completed",
        value: metricValue(details?.completed, completedCount),
        detail: percentOfTotal(metricValue(details?.completed, completedCount)),
        icon: React.createElement(FiCheckCircle, { className: "text-[22px]" }),
        iconClassName: "bg-blue-50 text-blue-600",
        detailClassName: "text-blue-600",
      },
      {
        label: "Upcoming",
        value: upcomingValue,
        detail: percentOfTotal(upcomingValue),
        icon: React.createElement(FiClock, { className: "text-[22px]" }),
        iconClassName:
          "bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200",
        detailClassName: "text-violet-600",
      },
      {
        label: "Cancelled",
        value: metricValue(details?.cancelled, cancelledCount),
        detail: percentOfTotal(metricValue(details?.cancelled, cancelledCount)),
        icon: React.createElement(FiXCircle, { className: "text-[22px]" }),
        iconClassName:
          "bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200",
        detailClassName: "text-rose-600",
      },
      {
        label: "No Show",
        value: metricValue(details?.noShow, noShowCount),
        detail: percentOfTotal(metricValue(details?.noShow, noShowCount)),
        icon: React.createElement(FiUserX, { className: "text-[22px]" }),
        iconClassName: "bg-orange-50 text-orange-600",
        detailClassName: "text-orange-600",
      },
    ];
  }, [
    clinicAppointmentDetails,
    patientsRawCal,
    rows,
    tabCounts,
    totalRecords,
    view,
  ]);
};
