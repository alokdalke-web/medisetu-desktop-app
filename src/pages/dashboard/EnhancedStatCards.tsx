// src/pages/dashboard/EnhancedStatCards.tsx
import React from "react";
import { FiCalendar, FiUsers, FiClipboard, FiAlertCircle } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import EnhancedStatCard, { type SparklinePoint } from "./EnhancedStatCard";

export type { SparklinePoint };

const formatCompact = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
};

const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${formatCompact(n)}`;
  }
};

type Props = {
  totalAppointments: number;
  activePatients: number;
  revenue: number;
  pendingTasks: number;
  totalUsers?: number;
  noShowAppointments?: number;
  showRevenue?: boolean;

  appointmentDeltaPercent?: number;
  activePatientsDeltaPercent?: number;
  revenueDeltaPercent?: number;
  noShowDeltaPercent?: number;
  totalUsersDeltaPercent?: number;

  // Sparkline data
  appointmentSparkline?: SparklinePoint[];
  patientSparkline?: SparklinePoint[];
  revenueSparkline?: SparklinePoint[];
  tasksSparkline?: SparklinePoint[];
  noShowSparkline?: SparklinePoint[];
  usersSparkline?: SparklinePoint[];

  labels?: {
    totalAppointments?: string;
    activePatients?: string;
    revenue?: string;
    pendingTasks?: string;
    noShowAppointments?: string;
    totalUsers?: string;
  };

  comparisonTexts?: {
    totalAppointments?: string;
    activePatients?: string;
    revenue?: string;
    pendingTasks?: string;
    noShowAppointments?: string;
    totalUsers?: string;
  };

  comingSoon?: {
    totalAppointments?: boolean;
    activePatients?: boolean;
    revenue?: boolean;
    pendingTasks?: boolean;
    noShowAppointments?: boolean;
    totalUsers?: boolean;
  };
};

const EnhancedStatCards: React.FC<Props> = ({
  totalAppointments,
  activePatients,
  revenue,
  pendingTasks,
  showRevenue = true,
  appointmentDeltaPercent,
  activePatientsDeltaPercent,
  revenueDeltaPercent,
  noShowAppointments,
  noShowDeltaPercent,
  totalUsers,
  totalUsersDeltaPercent,
  appointmentSparkline,
  patientSparkline,
  revenueSparkline,
  tasksSparkline,
  noShowSparkline,
  usersSparkline,
  labels,
  comparisonTexts,
  comingSoon,
}) => {
  const gridClasses = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5";

  return (
    <div id="tour-dashboard-stats" className={gridClasses}>
      <EnhancedStatCard
        id="tour-stat-appointments"
        icon={<FiCalendar />}
        label={labels?.totalAppointments || "Total Appointments"}
        value={formatCompact(totalAppointments)}
        delta={appointmentDeltaPercent}
        comparisonText={comparisonTexts?.totalAppointments}
        sparklineData={appointmentSparkline}
        tileBg="bg-blue-50"
        iconColor="text-blue-600"
        trendColor={appointmentDeltaPercent ? (appointmentDeltaPercent >= 0 ? "text-emerald-600" : "text-rose-600") : undefined}
        isComingSoon={comingSoon?.totalAppointments}
      />

      <EnhancedStatCard
        id="tour-stat-patients"
        icon={<FiUsers />}
        label={labels?.activePatients || "Active Patients"}
        value={formatCompact(activePatients)}
        delta={activePatientsDeltaPercent}
        comparisonText={comparisonTexts?.activePatients}
        sparklineData={patientSparkline}
        tileBg="bg-emerald-50"
        iconColor="text-emerald-600"
        trendColor={activePatientsDeltaPercent ? (activePatientsDeltaPercent >= 0 ? "text-emerald-600" : "text-rose-600") : undefined}
        isComingSoon={comingSoon?.activePatients}
      />

      {showRevenue && (
        <EnhancedStatCard
          id="tour-stat-revenue"
          icon={<FaRupeeSign />}
          label={labels?.revenue || "Total Revenue"}
          value={formatINR(revenue)}
          delta={revenueDeltaPercent}
          comparisonText={comparisonTexts?.revenue}
          sparklineData={revenueSparkline}
          tileBg="bg-amber-50"
          iconColor="text-amber-600"
          trendColor={revenueDeltaPercent ? (revenueDeltaPercent >= 0 ? "text-emerald-600" : "text-rose-600") : undefined}
          isComingSoon={comingSoon?.revenue}
        />
      )}

      {typeof totalUsers === "number" ? (
        <EnhancedStatCard
          id="tour-stat-users"
          icon={<FiUsers />}
          label={labels?.totalUsers || "Total Users"}
          value={formatCompact(totalUsers)}
          delta={totalUsersDeltaPercent}
          comparisonText={comparisonTexts?.totalUsers}
          sparklineData={usersSparkline}
          tileBg="bg-purple-50"
          iconColor="text-purple-600"
          trendColor={totalUsersDeltaPercent ? (totalUsersDeltaPercent >= 0 ? "text-emerald-600" : "text-rose-600") : undefined}
          isComingSoon={comingSoon?.totalUsers}
        />
      ) : null}

      {typeof noShowAppointments === "number" ? (
        <EnhancedStatCard
          id="tour-stat-noshow"
          icon={<FiAlertCircle />}
          label={labels?.noShowAppointments || "No Show Appointments"}
          value={formatCompact(noShowAppointments)}
          delta={noShowDeltaPercent}
          comparisonText={comparisonTexts?.noShowAppointments}
          sparklineData={noShowSparkline}
          tileBg="bg-red-50"
          iconColor="text-red-600"
          trendColor={noShowDeltaPercent ? (noShowDeltaPercent >= 0 ? "text-emerald-600" : "text-rose-600") : undefined}
          isComingSoon={comingSoon?.noShowAppointments}
        />
      ) : null}

      <EnhancedStatCard
        id="tour-stat-tasks"
        icon={<FiClipboard />}
        label={labels?.pendingTasks || "Pending Tasks"}
        value={formatCompact(pendingTasks)}
        delta={undefined}
        comparisonText={comparisonTexts?.pendingTasks}
        sparklineData={tasksSparkline}
        tileBg="bg-rose-50"
        iconColor="text-rose-600"
        isComingSoon={comingSoon?.pendingTasks}
      />
    </div>
  );
};

export default EnhancedStatCards;
