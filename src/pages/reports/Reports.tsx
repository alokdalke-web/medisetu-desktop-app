import React, { useState, useCallback, useMemo } from "react";
import {
  FiUsers,
  FiCalendar,
  FiUserPlus,
  FiFileText,
  FiDollarSign,
  FiStar,
  FiAlertCircle,
  FiTrendingUp,
  FiPlus,
  FiClock,
} from "react-icons/fi";
import { Select, SelectItem } from "@heroui/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useNavigate } from "react-router";
import PatientMetricCard from "../../components/reports/PatientMetricCard";
import DonutChart from "../../components/reports/DonutChart";
import LineChart from "../../components/reports/LineChart";
import DataTable from "../../components/reports/DataTable";
import ReportsLayout from "../../components/reports/ReportsLayout";
import ReportFilterBar, {
  type ReportFilters,
  type FilterField,
} from "../../components/reports/ReportFilterBar";
import PremiumFeatureCard from "../../components/reports/PremiumFeatureCard";
import {
  useGetReportsOverviewQuery,
  useLazyGetReportsOverviewTrendQuery,
  type ReportsOverviewQueryArgs,
} from "../../redux/api/reportsOverviewApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatINR(value: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(value))}`;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

// ─── Alert Icon Map ──────────────────────────────────────────────────────────

const ALERT_CONFIG: Record<string, { icon: React.ReactNode; bgColor: string; iconBg: string }> = {
  warning: {
    icon: <FiClock className="text-yellow-600 text-lg" />,
    bgColor: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
  },
  danger: {
    icon: <FiTrendingUp className="text-red-600 text-lg" />,
    bgColor: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
    iconBg: "bg-red-100 dark:bg-red-900/40",
  },
  info: {
    icon: <FiAlertCircle className="text-blue-600 text-lg" />,
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
  },
};

// ─── Donut Colors ────────────────────────────────────────────────────────────

const PATIENT_DIST_COLORS = ["#14b8a6", "#3b82f6", "#f59e0b"];
const PAYMENT_MODE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#cbd5e1"];
const NO_SHOW_COLORS = ["#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#6366f1"];

const Reports: React.FC = () => {
  const navigate = useNavigate();

  // ─── Subscription Check ─────────────────────────────────────────────────────
  const { data: clinicData } = useGetAllClinicsQuery();
  const currentSubscription = (clinicData as any)?.subscription;
  const isPremiumLocked = useMemo(() => {
    if (!currentSubscription) return true; // default locked if no subscription data
    const planName = String(currentSubscription.planName ?? "").trim().toLowerCase();
    const slug = String(currentSubscription.slug ?? "").trim().toLowerCase();
    const price = Number(currentSubscription.price);
    return (
      planName === "free" ||
      planName === "free plan" ||
      slug === "free" ||
      slug === "free-plan" ||
      (!Number.isNaN(price) && price === 0)
    );
  }, [currentSubscription]);

  // ─── Fetch Dynamic Filter Data ──────────────────────────────────────────────
  const { data: doctorProfileData } = useGetDoctorQuery();
  const { data: doctorsData } = useGetAllUsersQuery({ page: 1, pageSize: 100, userType: "Doctor" });

  const departmentOptions = useMemo(() => {
    const services = (doctorProfileData as any)?.result?.services ?? [];
    const unique = new Map<string, string>();
    for (const s of services) {
      if (s.serviceName && !unique.has(s.serviceName)) {
        unique.set(s.serviceName, s.serviceName);
      }
    }
    return Array.from(unique.entries()).map(([name]) => ({
      label: name,
      value: name,
    }));
  }, [doctorProfileData]);

  const doctorOptions = useMemo(() => {
    return (doctorsData?.users ?? []).map((doc: any) => ({
      label: doc.name ?? "Unknown",
      value: doc.id ?? doc._id ?? "",
    }));
  }, [doctorsData]);

  // ─── Filter Configuration ───────────────────────────────────────────────────
  const filterFields: FilterField[] = useMemo(() => [
    {
      id: "department",
      label: "Service",
      type: "select" as const,
      placeholder: "All Services",
      options: departmentOptions,
    },
    {
      id: "doctor",
      label: "Doctor",
      type: "select" as const,
      placeholder: "All Doctors",
      options: doctorOptions,
    },
  ], [departmentOptions, doctorOptions]);

  // ─── Filter State ───────────────────────────────────────────────────────────
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 6);

  const defaultCompareStart = new Date(defaultStart);
  defaultCompareStart.setDate(defaultCompareStart.getDate() - 7);
  const defaultCompareEnd = new Date(defaultEnd);
  defaultCompareEnd.setDate(defaultCompareEnd.getDate() - 7);

  const [queryArgs, setQueryArgs] = useState<ReportsOverviewQueryArgs>({
    startDate: toYMD(defaultStart),
    endDate: toYMD(defaultEnd),
    compareStartDate: toYMD(defaultCompareStart),
    compareEndDate: toYMD(defaultCompareEnd),
  });

  const handleFilterApply = useCallback((filters: ReportFilters) => {
    setQueryArgs({
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
      compareStartDate: filters.compareWith?.startDate,
      compareEndDate: filters.compareWith?.endDate,
      department: filters.selectedOptions.department || undefined,
      doctorId: filters.selectedOptions.doctor || undefined,
    });
  }, []);

  // ─── API Call ─────────────────────────────────────────────────────────────
  const { data: overviewRes, isLoading, isFetching } = useGetReportsOverviewQuery(queryArgs);
  const [fetchTrend] = useLazyGetReportsOverviewTrendQuery();

  const overview = overviewRes?.data;

  // ─── Period Selectors State ─────────────────────────────────────────────────
  const [appointmentsPeriod, setAppointmentsPeriod] = useState<string>("weekly");
  const [prescriptionsPeriod, setPrescriptionsPeriod] = useState<string>("weekly");
  const [revenuePeriod, setRevenuePeriod] = useState<string>("daily");

  // ─── Trend overrides (when user changes period) ─────────────────────────────
  const [appointmentsTrendOverride, setAppointmentsTrendOverride] = useState<{
    labels: string[]; currentPeriod: number[]; previousPeriod: number[];
  } | null>(null);
  const [prescriptionsTrendOverride, setPrescriptionsTrendOverride] = useState<{
    labels: string[]; currentPeriod: number[]; previousPeriod: number[];
  } | null>(null);
  const [revenueChartOverride, setRevenueChartOverride] = useState<{
    label: string; value: number;
  }[] | null>(null);

  const handleAppointmentsPeriodChange = useCallback(async (period: string) => {
    setAppointmentsPeriod(period);

    // Expand date range based on selected period for meaningful data
    const now = new Date();
    let startDate = queryArgs.startDate;
    let endDate = queryArgs.endDate;

    if (period === "weekly") {
      // Show full current week (Mon–Sun)
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDate = toYMD(monday);
      endDate = toYMD(sunday);
    } else if (period === "monthly") {
      // Show full current month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = toYMD(monthStart);
      endDate = toYMD(monthEnd);
    }

    const result = await fetchTrend({
      type: "appointments",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      department: queryArgs.department,
    });
    if (result.data?.data) {
      setAppointmentsTrendOverride(result.data.data);
    }
  }, [fetchTrend, queryArgs]);

  const handlePrescriptionsPeriodChange = useCallback(async (period: string) => {
    setPrescriptionsPeriod(period);

    // Expand date range based on selected period for meaningful data
    const now = new Date();
    let startDate = queryArgs.startDate;
    let endDate = queryArgs.endDate;

    if (period === "weekly") {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDate = toYMD(monday);
      endDate = toYMD(sunday);
    } else if (period === "monthly") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = toYMD(monthStart);
      endDate = toYMD(monthEnd);
    }

    const result = await fetchTrend({
      type: "prescriptions",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      department: queryArgs.department,
    });
    if (result.data?.data) {
      setPrescriptionsTrendOverride(result.data.data);
    }
  }, [fetchTrend, queryArgs]);

  const handleRevenuePeriodChange = useCallback(async (period: string) => {
    setRevenuePeriod(period);

    const now = new Date();
    let startDate = queryArgs.startDate;
    let endDate = queryArgs.endDate;

    if (period === "daily") {
      // Use the filter's date range as-is (shows daily breakdown)
      startDate = queryArgs.startDate;
      endDate = queryArgs.endDate;
    } else if (period === "weekly") {
      // Show last 4 weeks
      const weekEnd = new Date(now);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 27); // ~4 weeks
      startDate = toYMD(weekStart);
      endDate = toYMD(weekEnd);
    } else if (period === "monthly") {
      // Show last 6 months
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      startDate = toYMD(monthStart);
      endDate = toYMD(monthEnd);
    }

    const result = await fetchTrend({
      type: "revenue",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      department: queryArgs.department,
    });
    if (result.data?.data) {
      // Convert trend data to chart format
      const chartData = result.data.data.labels.map((label, i) => ({
        label,
        value: result.data!.data.currentPeriod[i] ?? 0,
      }));
      setRevenueChartOverride(chartData);
    }
  }, [fetchTrend, queryArgs]);

  // ─── Comparison Label (dynamic based on date range) ──────────────────────
  const comparisonLabel = useMemo(() => {
    const start = new Date(queryArgs.startDate + "T00:00:00");
    const end = new Date(queryArgs.endDate + "T00:00:00");
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    if (diffDays <= 1) return "vs previous day";
    if (diffDays <= 7) return "vs previous 7 days";
    if (diffDays <= 14) return "vs previous 2 weeks";
    if (diffDays <= 31) return "vs previous month";
    if (diffDays <= 92) return "vs previous quarter";
    return "vs previous period";
  }, [queryArgs.startDate, queryArgs.endDate]);

  // ─── Export Handler ───────────────────────────────────────────────────────
  const metrics = overview?.metrics;

  const handleExport = useCallback(() => {
    if (!overview) return;

    const lines: string[] = [];

    // Header
    lines.push(`Reports Overview Export`);
    lines.push(`Date Range: ${queryArgs.startDate} to ${queryArgs.endDate}`);
    lines.push(`Generated: ${overview.meta?.generatedAt ?? new Date().toISOString()}`);
    lines.push("");

    // Metrics
    lines.push("--- KEY METRICS ---");
    lines.push(`Total Patients,${metrics?.totalPatients.value ?? 0},${metrics?.totalPatients.change ?? 0}%`);
    lines.push(`Appointments,${metrics?.appointments.value ?? 0},${metrics?.appointments.change ?? 0}%`);
    lines.push(`New Patients,${metrics?.newPatients.value ?? 0},${metrics?.newPatients.change ?? 0}%`);
    lines.push(`Prescriptions,${metrics?.prescriptions.value ?? 0},${metrics?.prescriptions.change ?? 0}%`);
    lines.push(`Revenue (paisa),${metrics?.revenue.value ?? 0},${metrics?.revenue.change ?? 0}%`);
    lines.push(`Avg Rating,${metrics?.avgRating.value ?? 0}/${metrics?.avgRating.maxValue ?? 5},${metrics?.avgRating.change ?? 0}%`);
    lines.push("");

    // Top Departments
    lines.push("--- TOP DEPARTMENTS ---");
    lines.push("Department,Appointments,Revenue (paisa)");
    (overview.topDepartments ?? []).forEach((d) => {
      lines.push(`${d.department},${d.appointments},${d.revenue}`);
    });
    lines.push("");

    // Medicine Sales
    lines.push("--- MEDICINE SALES ---");
    lines.push("Medicine,Units Sold,Revenue (paisa)");
    (overview.medicineSales ?? []).forEach((m) => {
      lines.push(`${m.medicine},${m.units},${m.revenue}`);
    });
    lines.push("");

    // Patient Distribution
    lines.push("--- PATIENT DISTRIBUTION ---");
    lines.push("Category,Count,Percentage");
    (overview.patientDistribution ?? []).forEach((p) => {
      lines.push(`${p.label},${p.value},${p.percentage}%`);
    });
    lines.push("");

    // Payment Mode
    lines.push("--- PAYMENT MODE DISTRIBUTION ---");
    lines.push("Mode,Amount (paisa),Percentage");
    (overview.paymentModeDistribution ?? []).forEach((p) => {
      lines.push(`${p.label},${p.value},${p.percentage}%`);
    });
    lines.push("");

    // Monthly Comparison
    lines.push("--- MONTHLY COMPARISON ---");
    lines.push("Metric,This Month,Last Month,Change %");
    (overview.monthlyComparison ?? []).forEach((row) => {
      lines.push(`${row.metric},${row.thisMonth},${row.lastMonth},${row.change}%`);
    });
    lines.push("");

    // Patient Demographics
    lines.push("--- PATIENT DEMOGRAPHICS ---");
    lines.push("Age Group,Patients,Percentage");
    (overview.patientDemographics ?? []).forEach((d) => {
      lines.push(`${d.ageGroup},${d.patients},${d.percentage}%`);
    });

    // Create and download CSV
    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-overview_${queryArgs.startDate}_to_${queryArgs.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [overview, queryArgs, metrics]);

  // ─── Derived Data ───────────────────────────────────────────────────────────
  const appointmentsTrend = appointmentsTrendOverride ?? overview?.appointmentsTrend ?? { labels: [], currentPeriod: [], previousPeriod: [] };
  const prescriptionsTrend = prescriptionsTrendOverride ?? overview?.prescriptionsTrend ?? { labels: [], currentPeriod: [], previousPeriod: [] };

  const patientDistribution = useMemo(() => {
    return (overview?.patientDistribution ?? []).map((item, i) => ({
      label: item.label,
      value: item.value,
      percentage: `${item.percentage}%`,
      color: PATIENT_DIST_COLORS[i] ?? "#94a3b8",
    }));
  }, [overview?.patientDistribution]);

  const paymentModeDistribution = useMemo(() => {
    return (overview?.paymentModeDistribution ?? []).map((item, i) => ({
      label: item.label.charAt(0).toUpperCase() + item.label.slice(1),
      value: item.value,
      percentage: `${item.percentage}%`,
      color: PAYMENT_MODE_COLORS[i] ?? "#94a3b8",
    }));
  }, [overview?.paymentModeDistribution]);

  const noShowBreakdown = useMemo(() => {
    return (overview?.noShowAnalysis?.breakdown ?? []).map((item, i) => ({
      label: item.label,
      value: item.value,
      percentage: `${item.percentage}%`,
      color: NO_SHOW_COLORS[i] ?? "#94a3b8",
    }));
  }, [overview?.noShowAnalysis]);

  const topDepartments = useMemo(() => {
    return (overview?.topDepartments ?? []).map((d) => ({
      department: d.department,
      appointments: d.appointments,
      revenue: formatINR(d.revenue),
    }));
  }, [overview?.topDepartments]);

  const medicineSales = useMemo(() => {
    return (overview?.medicineSales ?? []).map((m) => ({
      medicine: m.medicine,
      units: m.units,
      revenue: formatINR(m.revenue),
    }));
  }, [overview?.medicineSales]);

  const revenueChartData = useMemo(() => {
    const source = revenueChartOverride ?? overview?.revenueOverview?.chartData ?? [];
    return source.map((d) => ({
      month: d.label,
      revenue: d.value,
    }));
  }, [overview?.revenueOverview, revenueChartOverride]);

  const monthlyComparison = useMemo(() => {
    return (overview?.monthlyComparison ?? []).map((row) => ({
      metric: row.metric,
      thisMonth: row.metric === "Revenue" ? formatINR(row.thisMonth) : formatCompact(row.thisMonth),
      lastMonth: row.metric === "Revenue" ? formatINR(row.lastMonth) : formatCompact(row.lastMonth),
      change: `↑ ${row.change}%`,
    }));
  }, [overview?.monthlyComparison]);

  const demographics = overview?.patientDemographics ?? [];
  const alerts = overview?.alerts ?? [];

  // Loading skeleton
  if (isLoading) {
    return (
      <ReportsLayout title="Reports" subtitle="Advanced insights and analytics for your clinic performance.">
        <div className="space-y-5 animate-pulse">
          <div className="h-[72px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[104px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="h-[280px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
            <div className="h-[280px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
          </div>
        </div>
      </ReportsLayout>
    );
  }

  // Free plan — show only the upgrade banner, no report data
  // (Handled by ReportsLayout)

  return (
    <ReportsLayout
      title="Reports"
      subtitle="Advanced insights and analytics for your clinic performance."
      onExport={handleExport}
    >
      {/* Filter Bar */}
      <ReportFilterBar
        fields={filterFields}
        showCompare={true}
        onApply={handleFilterApply}
      />

      {/* Metric Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 ${isFetching ? "opacity-70 transition-opacity" : ""}`}>
        <PatientMetricCard
          icon={<FiUsers className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Total Patients"
          value={formatCompact(metrics?.totalPatients.value ?? 0)}
          change={`${metrics?.totalPatients.change ?? 0}%`}
          changeType={metrics?.totalPatients.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiCalendar className="text-[#3b82f6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          label="Appointments"
          value={formatCompact(metrics?.appointments.value ?? 0)}
          change={`${metrics?.appointments.change ?? 0}%`}
          changeType={metrics?.appointments.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiUserPlus className="text-[#6366f1] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(99,102,241,0.1)]"
          label="New Patients"
          value={formatCompact(metrics?.newPatients.value ?? 0)}
          change={`${metrics?.newPatients.change ?? 0}%`}
          changeType={metrics?.newPatients.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiFileText className="text-[#e5484d] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(229,72,77,0.1)]"
          label="Prescriptions"
          value={formatCompact(metrics?.prescriptions.value ?? 0)}
          change={`${metrics?.prescriptions.change ?? 0}%`}
          changeType={metrics?.prescriptions.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiDollarSign className="text-[#e89b00] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(232,155,0,0.1)]"
          label="Revenue"
          value={formatINR(metrics?.revenue.value ?? 0)}
          change={`${metrics?.revenue.change ?? 0}%`}
          changeType={metrics?.revenue.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiStar className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Avg. Rating"
          value={`${metrics?.avgRating.value ?? 0}/${metrics?.avgRating.maxValue ?? 5}`}
          change={`${metrics?.avgRating.change ?? 0}%`}
          changeType={metrics?.avgRating.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
      </div>

      {/* Charts Row 1: Appointments Trend & Patient Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <LineChart
          title="Appointments Trend"
          data={appointmentsTrend}
          periodSelector={
            <Select
              aria-label="Period"
              selectedKeys={new Set([appointmentsPeriod])}
              onSelectionChange={(keys) => {
                const key = Array.from(keys as Set<string>)[0];
                if (key) handleAppointmentsPeriodChange(key);
              }}
              size="sm"
              radius="lg"
              classNames={{
                trigger: "h-8 min-h-8 w-[110px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                value: "text-[12px] text-[#100e1c] dark:text-white",
                popoverContent: "dark:bg-[#111726]",
              }}
              variant="bordered"
            >
              <SelectItem key="weekly">Weekly</SelectItem>
              <SelectItem key="monthly">Monthly</SelectItem>
            </Select>
          }
        />

        <DonutChart
          title="Patient Distribution"
          total={patientDistribution.reduce((s, i) => s + i.value, 0)}
          items={patientDistribution}
          centerLabel="Total"
        />
      </div>

      {/* Charts Row 2: Top Departments, Revenue Overview, Payment Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <DataTable
          title="Top Departments"
          columns={[
            { key: "department", label: "Department", align: "left" },
            { key: "appointments", label: "Appointments", align: "right" },
            { key: "revenue", label: "Revenue", align: "right" },
          ]}
          data={topDepartments}
        />

        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 flex flex-col dark:bg-[#111726] dark:border-[#273244]">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-[16px] font-semibold text-[#100e1c] whitespace-nowrap dark:text-white">
              Revenue Overview
            </h3>
            <div className="shrink-0">
              <Select
                aria-label="Revenue Period"
                selectedKeys={new Set([revenuePeriod])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  if (key) handleRevenuePeriodChange(key);
                }}
                size="sm" radius="lg" variant="bordered"
                classNames={{
                  trigger: "h-8 min-h-8 w-[110px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                  value: "text-[12px] text-[#100e1c] dark:text-white",
                  popoverContent: "dark:bg-[#111726]",
                }}
              >
                <SelectItem key="daily">Daily</SelectItem>
                <SelectItem key="weekly">Weekly</SelectItem>
                <SelectItem key="monthly">Monthly</SelectItem>
              </Select>
            </div>
          </div>
          <div className="mb-3">
            <div className="text-[22px] font-bold text-[#100e1c] dark:text-white">
              {formatINR(overview?.revenueOverview?.totalRevenue ?? 0)}
            </div>
            <div className="text-[12px] text-[#677294] dark:text-white/70">Total Revenue</div>
            <div className="flex items-center gap-1 text-[12px] font-medium text-[#27b77a] mt-1">
              <span>↑ {overview?.revenueOverview?.change ?? 0}%</span>
              <span className="text-[#677294] font-normal dark:text-white/60">
                {overview?.revenueOverview?.comparisonLabel ?? "vs previous period"}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0" style={{ minHeight: "140px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9EA2AE", fontSize: 11 }} tickMargin={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} tickFormatter={(v) => {
                  if (v >= 100000) return `₹${Math.round(v / 100000)}L`;
                  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
                  return `₹${v}`;
                }} width={50} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#0F766E" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <DonutChart
          title="Payment Mode Distribution"
          total={paymentModeDistribution.reduce((s, i) => s + i.value, 0)}
          items={paymentModeDistribution}
          centerLabel="Total"
        />
      </div>

      {/* Charts Row 3: Medicine Sales, Prescriptions Trend, No Show Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <DataTable
          title="Medicine Sales"
          columns={[
            { key: "medicine", label: "Medicine", align: "left" },
            { key: "units", label: "Units", align: "right" },
            { key: "revenue", label: "Revenue", align: "right" },
          ]}
          data={medicineSales}
        />

        <LineChart
          title="Prescriptions Trend"
          data={prescriptionsTrend}
          periodSelector={
            <Select
              aria-label="Period"
              selectedKeys={new Set([prescriptionsPeriod])}
              onSelectionChange={(keys) => {
                const key = Array.from(keys as Set<string>)[0];
                if (key) handlePrescriptionsPeriodChange(key);
              }}
              size="sm" radius="lg" variant="bordered"
              classNames={{
                trigger: "h-8 min-h-8 w-[110px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                value: "text-[12px] text-[#100e1c] dark:text-white",
                popoverContent: "dark:bg-[#111726]",
              }}
            >
              <SelectItem key="weekly">Weekly</SelectItem>
              <SelectItem key="monthly">Monthly</SelectItem>
            </Select>
          }
        />

        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-3 dark:text-white">No Show Analysis</h3>
          <div className="mb-3">
            <div className="text-[22px] font-bold text-[#100e1c] dark:text-white">{overview?.noShowAnalysis?.total ?? 0}</div>
            <div className="text-[12px] text-[#677294] dark:text-white/70">No Show Appointments</div>
            <div className="flex items-center gap-1 text-[12px] font-medium text-[#e5484d] mt-1">
              <span>{(overview?.noShowAnalysis?.changeType === "increase" ? "↑" : "↓")} {overview?.noShowAnalysis?.change ?? 0}%</span>
              <span className="text-[#677294] font-normal dark:text-white/60">{comparisonLabel}</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {noShowBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
                  <span className="text-[12px] text-[#677294] dark:text-slate-400">{item.label}</span>
                </div>
                <div className="text-[13px]">
                  <span className="font-semibold text-[#100e1c] dark:text-white">{item.value}</span>
                  <span className="text-[#677294] ml-1 dark:text-white/60">({item.percentage})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 4: Patient Demographics, Monthly Comparison, Alerts & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Patient Demographics */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">Patient Demographics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#677294] mb-2 dark:text-white/70">
              <span className="font-medium">Age Group</span>
              <span className="font-medium">Patients</span>
            </div>
            {demographics.map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#100e1c] dark:text-white">{item.ageGroup}</span>
                  <span className="font-semibold text-[#100e1c] dark:text-white">
                    {item.patients} <span className="text-[#677294] font-normal dark:text-white/60">({item.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#f1f5f9] rounded-full h-1.5 dark:bg-[#273244]">
                  <div className="bg-[#0F766E] h-1.5 rounded-full transition-all" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">Monthly Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e5e7ea] dark:border-[#273244]">
                  <th className="pb-3 text-left text-[11px] font-medium text-[#677294] dark:text-white/70">Metric</th>
                  <th className="pb-3 text-right text-[11px] font-medium text-[#677294] dark:text-white/70">This Month</th>
                  <th className="pb-3 text-right text-[11px] font-medium text-[#677294] dark:text-white/70">Last Month</th>
                  <th className="pb-3 text-right text-[11px] font-medium text-[#677294] dark:text-white/70">Change</th>
                </tr>
              </thead>
              <tbody>
                {monthlyComparison.map((row, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] last:border-0 dark:border-[#273244]/50">
                    <td className="py-3 text-[#100e1c] dark:text-white">{row.metric}</td>
                    <td className="py-3 text-right font-semibold text-[#100e1c] dark:text-white">{row.thisMonth}</td>
                    <td className="py-3 text-right text-[#677294] dark:text-white/70">{row.lastMonth}</td>
                    <td className="py-3 text-right font-medium text-[#27b77a]">{row.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Insights */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">Alerts & Insights</h3>
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const config = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.info;
              return (
                <div key={i} className={`flex gap-3 p-3 border rounded-xl ${config.bgColor}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}>
                    {config.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#100e1c] dark:text-white">{alert.title}</p>
                    <p className="text-[11px] text-[#677294] mt-0.5 dark:text-white/70">{alert.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Custom Report Builder & Scheduled Reports (Premium) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <PremiumFeatureCard
          icon={<FiFileText className="text-[#0a6c74] text-lg" />}
          iconBg="bg-[#e6fbf7] dark:bg-[#16352f]"
          title="Custom Report Builder"
          description="Build advanced reports with your custom filters and metrics."
          buttonLabel="Create Custom Report"
          buttonIcon={<FiPlus className="text-sm" />}
          isLocked={isPremiumLocked}
          onAction={() => navigate("/reports/custom")}
          onUpgrade={() => navigate("/subscription")}
        />

        <PremiumFeatureCard
          icon={<FiCalendar className="text-[#3b82f6] text-lg" />}
          iconBg="bg-[#eef6ff] dark:bg-[#172b48]"
          title="Scheduled Reports"
          description="Manage and automate your reports with scheduled delivery."
          buttonLabel="Manage Schedules"
          buttonIcon={<FiCalendar className="text-sm" />}
          isLocked={isPremiumLocked}
          onAction={() => console.log("Manage schedules")}
          onUpgrade={() => navigate("/subscription")}
        />
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30">
            <span className="text-blue-600 text-[10px]">ℹ</span>
          </div>
          <span>All reports are generated in real-time. Last updated: {overview?.meta?.generatedAt ? new Date(overview.meta.generatedAt).toLocaleString() : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center dark:bg-green-900/30">
            <span className="text-green-600 text-[10px]">✓</span>
          </div>
          <span>Data accuracy: {overview?.meta?.accuracy ?? 0}%</span>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default Reports;
