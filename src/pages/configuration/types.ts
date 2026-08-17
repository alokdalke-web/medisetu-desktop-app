import type React from "react";

export type ConfigurationStatus = "active" | "inactive" | "pending";

export type ConfigurationStat = {
  label: string;
  value: number | string;
  icon: React.ReactNode;
};

export type ConfigurationSection = {
  id: string;
  title: string;
  description: string;
  status: ConfigurationStatus;
  icon: React.ReactNode;
  iconBgClass?: string;
  iconTextClass?: string;
  stats: ConfigurationStat[];
  highlightLabel?: string;
  highlightValue?: number | string;
  actionLabel: string;
  onAction: () => void;
};

export type QuickAccessItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: "lab" | "pharmacy" | "system";
  timestamp: string;
};

export type CategoryStat = {
  name: string;
  percentage: number;
  color: string;
};

export type StatusStat = {
  label: string;
  value: number;
  percentage: number;
  color: string;
};

export type LabOverviewData = {
  totalTests: number;
  testsToday: number;
  revenue: number;
  pendingReports: number;
  topCategories: CategoryStat[];
  statusOverview: StatusStat[];
};

export type PharmacyOverviewData = {
  totalStockItems: number;
  lowStockItems: number;
  stockValue: number;
  expiringSoon: number;
  stockStatus: StatusStat[];
  topCategories: CategoryStat[];
};

export type LabActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  status: "Completed" | "Pending" | "In Progress";
  timestamp: string;
  iconColor: string;
};

export type PharmacyActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  status: "In Stock" | "Low Stock";
  timestamp: string;
  iconColor: string;
};

export type AlertNotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  type: "expiry" | "low_stock" | "pending_reports" | "unpaid_invoices";
  iconColor: string;
};

export type PharmaLabActiveUser = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  createdAt: string;
  status: string;
};
