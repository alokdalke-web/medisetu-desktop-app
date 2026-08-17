import type { ReactNode } from "react";

import type { mapAppointmentTestRow, LabTestRow } from "../labData";

export type LabTestsView = "list" | "card";

export type MetricTrendDisplay = {
  percentage: number;
  comparisonLabel: string;
  direction?: string | null;
};

export type MetricCardData = {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
  subValue?: string | number;
  trend?: MetricTrendDisplay;
  trendData?: LabTrendPoint[];
  trendKey?: string;
  color?: string;
};

export type AppointmentTestApiRow = Parameters<typeof mapAppointmentTestRow>[0] & {
  dateTime?: string | Date | null;
  createdAt?: string | Date | null;
  price?: string | number | null;
};

export type LabTrendPoint = {
  tests?: string | number | null;
  revenue?: string | number | null;
  value?: string | number | null;
  [key: string]: unknown;
};

export type LabTestRowWithCatalog = LabTestRow & {
  isAvailableInLabCatalog?: boolean;
};

export type LabPaymentMethod = "CASH" | "UPI";

export const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "INITIATED", label: "New Request" },
  { key: "ON_HOLD", label: "Accepted" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "AVAILABLE", label: "Available Tests" },
] as const;

export type StatusFilterKey = (typeof STATUS_FILTERS)[number]["key"];
export type CategoryFilterKey = "ALL" | string;
