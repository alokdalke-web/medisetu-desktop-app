// src/pages/dashboard/StatCards.tsx
import React from "react";
import { Card, CardBody } from "@heroui/react";
import { FiCalendar, FiUsers, FiClipboard, FiAlertCircle } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

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
  noShowAppointments?: number;
  showRevenue?: boolean;

  appointmentDeltaPercent?: number;
  activePatientsDeltaPercent?: number;
  revenueDeltaPercent?: number;
  noShowDeltaPercent?: number;

  labels?: {
    totalAppointments?: string;
    activePatients?: string;
    revenue?: string;
    pendingTasks?: string;
    noShowAppointments?: string;
  };
  comingSoon?: {
    totalAppointments?: boolean;
    activePatients?: boolean;
    revenue?: boolean;
    pendingTasks?: boolean;
    noShowAppointments?: boolean;
  };
};

type StatCardProps = {
  id?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number;
  tileBg: string;
  iconColor: string;
  isComingSoon?: boolean;
};

const StatCard: React.FC<StatCardProps> = ({
  id,
  icon,
  label,
  value,
  delta,
  tileBg,
  iconColor,
  isComingSoon,
}) => {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = (delta ?? 0) >= 0;

  const deltaAbs = showDelta ? Math.round(Math.abs(delta as number)) : 0;
  const deltaClass = isUp ? "text-emerald-600" : "text-rose-600";

  return (
    <Card
      id={id}
      radius="lg"
      shadow="none"
      className="
        relative overflow-hidden border border-slate-200/80 bg-white
        rounded-2xl transition-all duration-200 hover:border-slate-300
        hover:shadow-md
      "
    >
      <CardBody
        className={[
          "px-5 py-4",
          "min-h-[96px] flex flex-col justify-between",
          isComingSoon ? "blur-[2px] opacity-60" : "",
        ].join(" ")}
      >
        <div className="flex items-start justify-between">
          <div
            className={[
              "h-10 w-10 rounded-xl",
              "flex items-center justify-center shrink-0",
              "transition-transform duration-200",
              tileBg,
              iconColor,
            ].join(" ")}
          >
            <span className="text-lg">{icon}</span>
          </div>
        </div>

        {/* Label - refined typography */}
        <div className="mt-2 text-xs font-medium text-slate-500 leading-snug uppercase tracking-wider">
          {label}
        </div>

        {/* Value + Delta row */}
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="text-2xl font-bold leading-none text-slate-900 truncate">
            {value}
          </div>

          {showDelta ? (
            <div
              className={[
                "flex items-center gap-1",
                "text-xs font-semibold leading-none",
                deltaClass,
                "whitespace-nowrap flex-shrink-0",
              ].join(" ")}
            >
              <span className="translate-y-[2px]">{isUp ? "▲" : "▼"}</span>
              <span>{deltaAbs}%</span>
            </div>
          ) : null}
        </div>
      </CardBody>

      {isComingSoon && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            Coming Soon
          </div>
        </div>
      )}
    </Card>
  );
};

const StatCards: React.FC<Props> = ({
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
  labels,
  comingSoon,
}) => {
  const gridClasses = showRevenue
    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
    : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div
      id="tour-dashboard-stats"
      className={gridClasses}
    >
      <StatCard
        id="tour-stat-appointments"
        icon={<FiCalendar />}
        label={labels?.totalAppointments || "Total Appointments"}
        value={formatCompact(totalAppointments)}
        delta={appointmentDeltaPercent}
        tileBg="bg-blue-50"
        iconColor="text-blue-600"
        isComingSoon={comingSoon?.totalAppointments}
      />

      <StatCard
        id="tour-stat-patients"
        icon={<FiUsers />}
        label={labels?.activePatients || "Active Patients"}
        value={formatCompact(activePatients)}
        delta={activePatientsDeltaPercent}
        tileBg="bg-emerald-50"
        iconColor="text-emerald-600"
        isComingSoon={comingSoon?.activePatients}
      />

      {showRevenue && (
        <StatCard
          id="tour-stat-revenue"
          icon={<FaRupeeSign />}
          label={labels?.revenue || "Total Revenue"}
          value={formatINR(revenue)}
          delta={revenueDeltaPercent}
          tileBg="bg-amber-50"
          iconColor="text-amber-600"
          isComingSoon={comingSoon?.revenue}
        />
      )}

      {typeof noShowAppointments === "number" ? (
        <StatCard
          id="tour-stat-noshow"
          icon={<FiAlertCircle />}
          label={labels?.noShowAppointments || "No Show Appointments"}
          value={formatCompact(noShowAppointments)}
          delta={noShowDeltaPercent}
          tileBg="bg-red-50"
          iconColor="text-red-600"
          isComingSoon={comingSoon?.noShowAppointments}
        />
      ) : null}

      <StatCard
        id="tour-stat-tasks"
        icon={<FiClipboard />}
        label={labels?.pendingTasks || "Pending Tasks"}
        value={formatCompact(pendingTasks)}
        tileBg="bg-rose-50"
        iconColor="text-rose-600"
        isComingSoon={comingSoon?.pendingTasks}
      />
    </div>
  );
};

export default StatCards;
