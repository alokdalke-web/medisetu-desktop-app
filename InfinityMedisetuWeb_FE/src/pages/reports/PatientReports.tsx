import React, { useState, useCallback, useMemo } from "react";
import {
  FiUsers,
  FiUserPlus,
  FiRefreshCw,
  FiUserCheck,
  FiUserX,
  FiStar,
} from "react-icons/fi";
import { HiOutlineLightBulb } from "react-icons/hi";
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
import PatientMetricCard from "../../components/reports/PatientMetricCard";
import DonutChart from "../../components/reports/DonutChart";
import LineChart from "../../components/reports/LineChart";
import DataTable from "../../components/reports/DataTable";
import GrowthSummaryCard from "../../components/reports/GrowthSummaryCard";
import ReportsLayout from "../../components/reports/ReportsLayout";
import ReportFilterBar, {
  type ReportFilters,
  type FilterField,
} from "../../components/reports/ReportFilterBar";
import {
  useGetPatientReportsQuery,
  useLazyGetPatientReportsTrendQuery,
  type ReportsOverviewQueryArgs,
} from "../../redux/api/reportsOverviewApi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

const AGE_COLORS = ["#14b8a6", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];
const GENDER_COLORS = ["#3b82f6", "#ec4899", "#8b5cf6"];

const PatientReports: React.FC = () => {
  // ─── Fetch Doctors for Filter ───────────────────────────────────────────────
  const { data: doctorsData } = useGetAllUsersQuery({ page: 1, pageSize: 100, userType: "Doctor" });
  const { data: doctorProfileData } = useGetDoctorQuery();

  const doctorOptions = useMemo(() => {
    return (doctorsData?.users ?? []).map((doc: any) => ({
      label: doc.name ?? "Unknown",
      value: doc.id ?? doc._id ?? "",
    }));
  }, [doctorsData]);

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
  const { data: patientRes, isLoading, isFetching } = useGetPatientReportsQuery(queryArgs);
  const [fetchTrend] = useLazyGetPatientReportsTrendQuery();

  const report = patientRes?.data;
  const metrics = report?.metrics;

  // ─── Period Selectors ───────────────────────────────────────────────────────
  const [patientTrendPeriod, setPatientTrendPeriod] = useState<string>("weekly");
  const [newVsReturningPeriod, setNewVsReturningPeriod] = useState<string>("weekly");

  const [patientTrendOverride, setPatientTrendOverride] = useState<{
    labels: string[]; currentPeriod: number[]; previousPeriod: number[];
  } | null>(null);
  const [newVsRetOverride, setNewVsRetOverride] = useState<{
    labels: string[]; currentPeriod: number[]; previousPeriod: number[];
  } | null>(null);

  const handlePatientTrendPeriodChange = useCallback(async (period: string) => {
    setPatientTrendPeriod(period);
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
      type: "patients",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      department: queryArgs.department,
      doctorId: queryArgs.doctorId,
    });
    if (result.data?.data) setPatientTrendOverride(result.data.data);
  }, [fetchTrend, queryArgs]);

  const handleNewVsRetPeriodChange = useCallback(async (period: string) => {
    setNewVsReturningPeriod(period);
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
      type: "newVsReturning",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      department: queryArgs.department,
      doctorId: queryArgs.doctorId,
    });
    if (result.data?.data) setNewVsRetOverride(result.data.data);
  }, [fetchTrend, queryArgs]);

  // ─── Comparison Label ───────────────────────────────────────────────────────
  const comparisonLabel = useMemo(() => {
    const start = new Date(queryArgs.startDate + "T00:00:00");
    const end = new Date(queryArgs.endDate + "T00:00:00");
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diffDays <= 1) return "vs previous day";
    if (diffDays <= 7) return "vs previous 7 days";
    if (diffDays <= 14) return "vs previous 2 weeks";
    if (diffDays <= 31) return "vs previous month";
    return "vs previous period";
  }, [queryArgs.startDate, queryArgs.endDate]);

  // ─── Derived Data ───────────────────────────────────────────────────────────
  const patientTrend = patientTrendOverride ?? report?.patientTrend ?? { labels: [], currentPeriod: [], previousPeriod: [] };

  const newVsReturningData = useMemo(() => {
    const src = newVsRetOverride ?? report?.newVsReturning ?? { labels: [], currentPeriod: [], previousPeriod: [] };
    return src.labels.map((label, i) => ({
      day: label,
      newPatients: src.currentPeriod[i] ?? 0,
      returningPatients: src.previousPeriod[i] ?? 0,
    }));
  }, [newVsRetOverride, report?.newVsReturning]);

  const ageDistribution = useMemo(() => {
    return (report?.ageDistribution ?? []).map((item, i) => ({
      label: item.label,
      value: item.value,
      percentage: `${item.percentage}%`,
      color: AGE_COLORS[i] ?? "#94a3b8",
    }));
  }, [report?.ageDistribution]);

  const genderDistribution = useMemo(() => {
    return (report?.genderDistribution ?? []).map((item, i) => ({
      label: item.label,
      value: item.value,
      percentage: `${item.percentage}%`,
      color: GENDER_COLORS[i] ?? "#94a3b8",
    }));
  }, [report?.genderDistribution]);

  const topCities = report?.topCities ?? [];
  const visitFrequency = report?.visitFrequency ?? [];
  const lastVisitRecency = report?.lastVisitRecency ?? [];
  const growth = report?.growthSummary;

  const growthMetrics = useMemo(() => {
    if (!growth) return [];
    return [
      { label: "This Week", value: formatCompact(growth.thisWeek.value), change: growth.thisWeek.change ? `${growth.thisWeek.change}%` : "", changeType: "increase" as const },
      { label: "Last Week", value: formatCompact(growth.lastWeek.value), change: "", changeType: "increase" as const },
      { label: "This Month", value: formatCompact(growth.thisMonth.value), change: growth.thisMonth.change ? `${growth.thisMonth.change}%` : "", changeType: "increase" as const },
      { label: "Last Month", value: formatCompact(growth.lastMonth.value), change: "", changeType: "increase" as const },
      { label: "This Year", value: formatCompact(growth.thisYear.value), change: growth.thisYear.change ? `${growth.thisYear.change}%` : "", changeType: "increase" as const },
      { label: "Last Year", value: formatCompact(growth.lastYear.value), change: "", changeType: "increase" as const },
    ];
  }, [growth]);

  // ─── Loading ────────────────────────────────────────────────────────────────

  // ─── Export Handler ───────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!report) return;

    const lines: string[] = [];
    lines.push("Patient Reports Export");
    lines.push(`Date Range: ${queryArgs.startDate} to ${queryArgs.endDate}`);
    lines.push(`Generated: ${report.meta?.generatedAt ?? new Date().toISOString()}`);
    lines.push("");

    lines.push("--- KEY METRICS ---");
    lines.push(`Total Patients,${metrics?.totalPatients.value ?? 0},${metrics?.totalPatients.change ?? 0}%`);
    lines.push(`New Patients,${metrics?.newPatients.value ?? 0},${metrics?.newPatients.change ?? 0}%`);
    lines.push(`Returning Patients,${metrics?.returningPatients.value ?? 0},${metrics?.returningPatients.change ?? 0}%`);
    lines.push(`Active Patients,${metrics?.activePatients.value ?? 0},${metrics?.activePatients.change ?? 0}%`);
    lines.push(`Inactive Patients,${metrics?.inactivePatients.value ?? 0},${metrics?.inactivePatients.change ?? 0}%`);
    lines.push(`Avg Visits/Patient,${metrics?.avgVisitsPerPatient.value ?? 0},${metrics?.avgVisitsPerPatient.change ?? 0}%`);
    lines.push("");

    lines.push("--- AGE DISTRIBUTION ---");
    lines.push("Age Group,Patients,Percentage");
    (report.ageDistribution ?? []).forEach((d) => lines.push(`${d.label},${d.value},${d.percentage}%`));
    lines.push("");

    lines.push("--- GENDER DISTRIBUTION ---");
    lines.push("Gender,Patients,Percentage");
    (report.genderDistribution ?? []).forEach((d) => lines.push(`${d.label},${d.value},${d.percentage}%`));
    lines.push("");

    lines.push("--- TOP CITIES ---");
    lines.push("City,Patients,Percentage");
    (report.topCities ?? []).forEach((d) => lines.push(`${d.city},${d.patients},${d.percentage}%`));
    lines.push("");

    lines.push("--- VISIT FREQUENCY ---");
    lines.push("Frequency,Patients,Percentage");
    (report.visitFrequency ?? []).forEach((d) => lines.push(`${d.frequency},${d.patients},${d.percentage}%`));
    lines.push("");

    lines.push("--- LAST VISIT RECENCY ---");
    lines.push("Last Visit,Patients,Percentage");
    (report.lastVisitRecency ?? []).forEach((d) => lines.push(`${d.lastVisit},${d.patients},${d.percentage}%`));

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `patient-reports_${queryArgs.startDate}_to_${queryArgs.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [report, queryArgs, metrics]);

  if (isLoading) {
    return (
      <ReportsLayout title="Patient Reports" subtitle="Comprehensive insights and analytics about your patients.">
        <div className="space-y-4 animate-pulse">
          <div className="h-[72px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[104px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-[260px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
            <div className="h-[260px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
            <div className="h-[260px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
          </div>
        </div>
      </ReportsLayout>
    );
  }

  return (
    <ReportsLayout
      title="Patient Reports"
      subtitle="Comprehensive insights and analytics about your patients."
      onExport={handleExport}
    >
      {/* Filter Bar */}
      <ReportFilterBar fields={filterFields} showCompare={true} onApply={handleFilterApply} />

      {/* Metric Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 ${isFetching ? "opacity-70 transition-opacity" : ""}`}>
        <PatientMetricCard icon={<FiUsers className="text-[#0F766E] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(15,118,110,0.1)]" label="Total Patients" value={formatCompact(metrics?.totalPatients.value ?? 0)} change={`${metrics?.totalPatients.change ?? 0}%`} changeType={metrics?.totalPatients.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiUserPlus className="text-[#6366f1] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(99,102,241,0.1)]" label="New Patients" value={formatCompact(metrics?.newPatients.value ?? 0)} change={`${metrics?.newPatients.change ?? 0}%`} changeType={metrics?.newPatients.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiRefreshCw className="text-[#3b82f6] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(59,130,246,0.1)]" label="Returning Patients" value={formatCompact(metrics?.returningPatients.value ?? 0)} change={`${metrics?.returningPatients.change ?? 0}%`} changeType={metrics?.returningPatients.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiUserCheck className="text-[#27b77a] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(39,183,122,0.1)]" label="Active Patients" value={formatCompact(metrics?.activePatients.value ?? 0)} change={`${metrics?.activePatients.change ?? 0}%`} changeType={metrics?.activePatients.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiUserX className="text-[#e5484d] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(229,72,77,0.1)]" label="Inactive Patients" value={formatCompact(metrics?.inactivePatients.value ?? 0)} change={`${metrics?.inactivePatients.change ?? 0}%`} changeType={metrics?.inactivePatients.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiStar className="text-[#e89b00] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(232,155,0,0.1)]" label="Avg. Visits / Patient" value={String(metrics?.avgVisitsPerPatient.value ?? 0)} change={`${metrics?.avgVisitsPerPatient.change ?? 0}%`} changeType={metrics?.avgVisitsPerPatient.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
      </div>

      {/* Row 1: Patient Trend + Age Distribution + Gender Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <LineChart
          title="Patient Trend"
          data={patientTrend}
          periodSelector={
            <Select aria-label="Period" selectedKeys={new Set([patientTrendPeriod])} onSelectionChange={(keys) => { const key = Array.from(keys as Set<string>)[0]; if (key) handlePatientTrendPeriodChange(key); }} size="sm" radius="lg" variant="bordered" classNames={{ trigger: "h-8 min-h-8 w-[110px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]", value: "text-[12px] text-[#100e1c] dark:text-white", popoverContent: "dark:bg-[#111726]" }}>
              <SelectItem key="weekly">Weekly</SelectItem>
              <SelectItem key="monthly">Monthly</SelectItem>
            </Select>
          }
        />
        <DonutChart title="Patient Distribution by Age" total={ageDistribution.reduce((s, i) => s + i.value, 0)} items={ageDistribution} centerLabel="Total" />
        <DonutChart title="Gender Distribution" total={genderDistribution.reduce((s, i) => s + i.value, 0)} items={genderDistribution} centerLabel="Total" />
      </div>

      {/* Row 2: Top Cities + New vs Returning + Visit Frequency + Last Visit */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <DataTable
          title="Top Cities"
          columns={[
            { key: "city", label: "City", align: "left" },
            { key: "patients", label: "Patients", align: "right" },
            { key: "percentage", label: "%", align: "right", render: (v: number) => `${v}%` },
          ]}
          data={topCities}
        />

        {/* New vs Returning - BarChart */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 flex flex-col dark:bg-[#111726] dark:border-[#273244]">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] whitespace-nowrap dark:text-white">
              New vs Returning
            </h3>
            <div className="shrink-0">
              <Select aria-label="Period" selectedKeys={new Set([newVsReturningPeriod])} onSelectionChange={(keys) => { const key = Array.from(keys as Set<string>)[0]; if (key) handleNewVsRetPeriodChange(key); }} size="sm" radius="lg" variant="bordered" classNames={{ trigger: "h-7 min-h-7 w-[95px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]", value: "text-[11px] text-[#100e1c] dark:text-white", popoverContent: "dark:bg-[#111726]" }}>
                <SelectItem key="weekly">Weekly</SelectItem>
                <SelectItem key="monthly">Monthly</SelectItem>
              </Select>
            </div>
          </div>
          <div className="mb-2 flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#0F766E]" /><span className="text-[#677294] dark:text-white/70">New</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#27b77a]" /><span className="text-[#677294] dark:text-white/70">Returning</span></div>
          </div>
          <div className="flex-1 min-h-0" style={{ minHeight: "150px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={newVsReturningData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9EA2AE", fontSize: 10 }} tickMargin={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="newPatients" name="New" fill="#0F766E" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="returningPatients" name="Returning" fill="#27b77a" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <DataTable
          title="Visit Frequency"
          columns={[
            { key: "frequency", label: "Frequency", align: "left" },
            { key: "patients", label: "Patients", align: "right" },
            { key: "percentage", label: "%", align: "right", render: (v: number) => `${v}%` },
          ]}
          data={visitFrequency}
        />

        <DataTable
          title="Last Visit Recency"
          columns={[
            { key: "lastVisit", label: "Last Visit", align: "left" },
            { key: "patients", label: "Patients", align: "right" },
            { key: "percentage", label: "%", align: "right", render: (v: number) => `${v}%` },
          ]}
          data={lastVisitRecency}
        />
      </div>

      {/* Growth Summary */}
      {growth && (
        <GrowthSummaryCard
          title="Patient Growth Summary"
          metrics={growthMetrics}
          yearlyGrowth={{
            label: growth.yearlyGrowth.label,
            value: `${growth.yearlyGrowth.value}%`,
            change: "vs last year",
          }}
          chartData={[60, 65, 70, 75, 85, 90, 95, 92, 88, 93, 97, 100]}
          insight={{
            icon: <HiOutlineLightBulb className="w-5 h-5" />,
            title: "Key Insight",
            description: growth.insight,
          }}
        />
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30">
            <span className="text-blue-600 text-[10px]">ℹ</span>
          </div>
          <span>All reports generated in real-time. Last updated: {report?.meta?.generatedAt ? new Date(report.meta.generatedAt).toLocaleString() : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center dark:bg-green-900/30">
            <span className="text-green-600 text-[10px]">✓</span>
          </div>
          <span>Data accuracy: {report?.meta?.accuracy ?? 0}%</span>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default PatientReports;
