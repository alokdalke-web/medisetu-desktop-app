import React from "react";
import {
  FiHome,
  FiUsers,
  FiDollarSign,
  FiBookmark,
  FiTrendingUp,
} from "react-icons/fi";
import KpiMetricCard from "./KpiMetricCard";

interface KpiMetricsSectionProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * KPI Metrics Section showing top-level platform metrics
 * Based on design reference with color-coded icons and mini charts
 */
export const KpiMetricsSection: React.FC<KpiMetricsSectionProps> = () => {
  // Mock data - replace with actual API data
  const metricsData = [
    {
      title: "Total Clinics",
      value: 79,
      icon: FiHome,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: "+400%",
      changeType: "positive" as const,
      period: "last 7 days",
      chartColor: "bg-gradient-to-r from-blue-400 to-blue-500",
    },
    {
      title: "Total Scans",
      value: 1248,
      icon: FiUsers,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      change: "+18.5%",
      changeType: "positive" as const,
      period: "last 7 days",
      chartColor: "bg-gradient-to-r from-teal-400 to-teal-500",
    },
    {
      title: "Total Revenue",
      value: "₹3,956",
      icon: FiDollarSign,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      change: "+3.2%",
      changeType: "positive" as const,
      period: "last 7 days",
      chartColor: "bg-gradient-to-r from-amber-400 to-amber-500",
    },
    {
      title: "Active Subscriptions",
      value: 79,
      icon: FiBookmark,
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
      change: "+8.7%",
      changeType: "positive" as const,
      period: "last 7 days",
      chartColor: "bg-gradient-to-r from-pink-400 to-pink-500",
    },
    {
      title: "Total Users",
      value: 4285,
      icon: FiTrendingUp,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      change: "+12.8%",
      changeType: "positive" as const,
      period: "last 7 days",
      chartColor: "bg-gradient-to-r from-purple-400 to-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      {metricsData.map((metric, index) => (
        <KpiMetricCard key={index} {...metric} />
      ))}
    </div>
  );
};
