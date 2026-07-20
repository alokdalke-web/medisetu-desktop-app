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
  highlightLabel: string;
  highlightValue: number | string;
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
