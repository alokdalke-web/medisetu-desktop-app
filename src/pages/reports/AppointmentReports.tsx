import React, { useState, useCallback, useMemo } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiUserX,
  FiActivity,
  FiRefreshCw,
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
import PatientMetricCard from "../../components/reports/PatientMetricCard";
import DonutChart from "../../components/reports/DonutChart";
import LineChart from "../../components/reports/LineChart";
import ReportsLayout from "../../components/reports/ReportsLayout";
import ReportFilterBar, {
  type ReportFilters,
  type FilterField,
} from "../../components/reports/ReportFilterBar";
import {
  useGetAppointmentReportsQuery,
  useLazyGetAppointmentReportsTrendQuery,
  type AppointmentReportsQueryArgs,
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

const STATUS_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const TYPE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];
const NOSHOW_COLORS = ["#ef4444", "#8b5cf6", "#f59e0b"];

const AppointmentReports: React.FC = () => {
  // ─── Fetch Doctors ──────────────────────────────────────────────────────────
  const { data: doctorsData } = useGetAllUsersQuery({ page: 1, pageSize: 100, userType: "Doctor" });
  const { data: doctorProfileData } = useGetDoctorQuery();
  const doctorOptions = useMemo(() => (doctorsData?.users ?? []).map((d: any) => ({ label: d.name ?? "Unknown", value: d.id ?? d._id ?? "" })), [doctorsData]);

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
    { id: "department", label: "Service", type: "select" as const, placeholder: "All Services", options: departmentOptions },
    { id: "doctor", label: "Doctor", type: "select" as const, placeholder: "All Doctors", options: doctorOptions },
    { id: "appointmentType", label: "Appointment Type", type: "select" as const, placeholder: "All Types", options: [
      { label: "Consultation", value: "Consultation" },
      { label: "Follow-up", value: "Follow-up" },
      { label: "Procedure", value: "Procedure" },
      { label: "Other", value: "Other" },
    ]},
  ], [departmentOptions, doctorOptions]);

  // ─── Filter State ───────────────────────────────────────────────────────────
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 6);

  const defaultCompareStart = new Date(defaultStart);
  defaultCompareStart.setDate(defaultCompareStart.getDate() - 7);
  const defaultCompareEnd = new Date(defaultEnd);
  defaultCompareEnd.setDate(defaultCompareEnd.getDate() - 7);

  const [queryArgs, setQueryArgs] = useState<AppointmentReportsQueryArgs>({
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
      appointmentType: filters.selectedOptions.appointmentType || undefined,
    });
  }, []);

  // ─── API Call ─────────────────────────────────────────────────────────────
  const { data: apptRes, isLoading, isFetching } = useGetAppointmentReportsQuery(queryArgs);
  const [fetchTrend] = useLazyGetAppointmentReportsTrendQuery();
  const report = apptRes?.data;
  const metrics = report?.metrics;

  // ─── Period Selectors ───────────────────────────────────────────────────────
  const [trendPeriod, setTrendPeriod] = useState<string>("daily");
  const [trendOverride, setTrendOverride] = useState<{ labels: string[]; currentPeriod: number[]; previousPeriod: number[] } | null>(null);

  const handleTrendPeriodChange = useCallback(async (period: string) => {
    setTrendPeriod(period);
    const now = new Date();
    let startDate = queryArgs.startDate;
    let endDate = queryArgs.endDate;
    if (period === "weekly") {
      const day = now.getDay();
      const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      startDate = toYMD(monday); endDate = toYMD(sunday);
    } else if (period === "monthly") {
      startDate = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      endDate = toYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }
    const result = await fetchTrend({ type: "appointments", period: period as any, startDate, endDate, department: queryArgs.department, doctorId: queryArgs.doctorId, appointmentType: queryArgs.appointmentType });
    if (result.data?.data) setTrendOverride(result.data.data);
  }, [fetchTrend, queryArgs]);

  // ─── Comparison Label ───────────────────────────────────────────────────────
  const comparisonLabel = useMemo(() => {
    const start = new Date(queryArgs.startDate + "T00:00:00");
    const end = new Date(queryArgs.endDate + "T00:00:00");
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diff <= 1) return "vs previous day";
    if (diff <= 7) return "vs previous 7 days";
    if (diff <= 14) return "vs previous 2 weeks";
    if (diff <= 31) return "vs previous month";
    return "vs previous period";
  }, [queryArgs.startDate, queryArgs.endDate]);

  // ─── Derived Data ───────────────────────────────────────────────────────────
  const appointmentsTrend = trendOverride ?? report?.appointmentsTrend ?? { labels: [], currentPeriod: [], previousPeriod: [] };

  const statusDist = useMemo(() => (report?.statusDistribution ?? []).map((item, i) => ({
    label: item.label, value: item.value, percentage: `${item.percentage}%`, color: STATUS_COLORS[i] ?? "#94a3b8",
  })), [report?.statusDistribution]);

  const typeDist = useMemo(() => (report?.typeDistribution ?? []).map((item, i) => ({
    label: item.label, value: item.value, percentage: `${item.percentage}%`, color: TYPE_COLORS[i] ?? "#94a3b8",
  })), [report?.typeDistribution]);

  const noShowBreakdown = useMemo(() => (report?.noShowAnalysis?.breakdown ?? []).map((item, i) => ({
    label: item.label, value: item.value, percentage: `${item.percentage}%`, color: NOSHOW_COLORS[i] ?? "#94a3b8",
  })), [report?.noShowAnalysis]);

  const byDayData = useMemo(() => report?.appointmentsByDay ?? [], [report?.appointmentsByDay]);
  const timeSlots = report?.topBookingTimeSlots ?? [];
  const topDoctors = useMemo(() => report?.topDoctors ?? [], [report?.topDoctors]);
  const bottom = report?.bottomMetrics;
  const noShow = report?.noShowAnalysis;

  // ─── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!report) return;
    const lines: string[] = [];
    lines.push("Appointment Reports Export");
    lines.push(`Date Range: ${queryArgs.startDate} to ${queryArgs.endDate}`);
    lines.push("");
    lines.push("--- METRICS ---");
    lines.push(`Total Appointments,${metrics?.totalAppointments.value ?? 0},${metrics?.totalAppointments.change ?? 0}%`);
    lines.push(`Completed,${metrics?.completed.value ?? 0},${metrics?.completed.change ?? 0}%`);
    lines.push(`Pending,${metrics?.pending.value ?? 0}`);
    lines.push(`Cancelled,${metrics?.cancelled.value ?? 0}`);
    lines.push(`No Show,${metrics?.noShow.value ?? 0}`);
    lines.push(`Avg Duration,${metrics?.avgDuration.value ?? 0} min`);
    lines.push("");
    lines.push("--- BY DAY ---");
    lines.push("Day,Appointments");
    byDayData.forEach((d) => lines.push(`${d.day},${d.appointments}`));
    lines.push("");
    lines.push("--- TOP DOCTORS ---");
    lines.push("Doctor,Appointments,Completed,Completion Rate");
    topDoctors.forEach((d) => lines.push(`${d.doctor},${d.appointments},${d.completed},${d.completionRate}%`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointment-reports_${queryArgs.startDate}_to_${queryArgs.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [report, queryArgs, metrics, byDayData, topDoctors]);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ReportsLayout title="Appointment Reports" subtitle="Track and analyze appointment performance and patterns.">
        <div className="space-y-4 animate-pulse">
          <div className="h-[72px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[104px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[260px] bg-slate-200 rounded-[16px] dark:bg-[#172033]" />)}
          </div>
        </div>
      </ReportsLayout>
    );
  }

  return (
    <ReportsLayout title="Appointment Reports" subtitle="Track and analyze appointment performance and patterns." onExport={handleExport}>
      <ReportFilterBar fields={filterFields} showCompare={true} onApply={handleFilterApply} />

      {/* Metric Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 ${isFetching ? "opacity-70 transition-opacity" : ""}`}>
        <PatientMetricCard icon={<FiCalendar className="text-[#3b82f6] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(59,130,246,0.1)]" label="Total Appointments" value={formatCompact(metrics?.totalAppointments.value ?? 0)} change={`${metrics?.totalAppointments.change ?? 0}%`} changeType={metrics?.totalAppointments.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiCheckCircle className="text-[#27b77a] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(39,183,122,0.1)]" label="Completed" value={formatCompact(metrics?.completed.value ?? 0)} change={`${metrics?.completed.change ?? 0}%`} changeType={metrics?.completed.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiClock className="text-[#e89b00] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(232,155,0,0.1)]" label="Pending" value={formatCompact(metrics?.pending.value ?? 0)} change={`${metrics?.pending.change ?? 0}%`} changeType={metrics?.pending.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiXCircle className="text-[#e5484d] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(229,72,77,0.1)]" label="Cancelled" value={formatCompact(metrics?.cancelled.value ?? 0)} change={`${metrics?.cancelled.change ?? 0}%`} changeType={metrics?.cancelled.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiUserX className="text-[#6366f1] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(99,102,241,0.1)]" label="No Show" value={formatCompact(metrics?.noShow.value ?? 0)} change={`${metrics?.noShow.change ?? 0}%`} changeType={metrics?.noShow.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiActivity className="text-[#0F766E] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(15,118,110,0.1)]" label="Avg. Duration" value={`${metrics?.avgDuration.value ?? 0} min`} change={`${metrics?.avgDuration.change ?? 0} min`} changeType={metrics?.avgDuration.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
      </div>

      {/* Row 1: Trend + Status + Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <LineChart title="Appointments Trend" data={appointmentsTrend} periodSelector={
          <Select aria-label="Period" selectedKeys={new Set([trendPeriod])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; if (k) handleTrendPeriodChange(k); }} size="sm" radius="lg" variant="bordered" classNames={{ trigger: "h-8 min-h-8 w-[100px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]", value: "text-[12px] text-[#100e1c] dark:text-white", popoverContent: "dark:bg-[#111726]" }}>
            <SelectItem key="daily">Daily</SelectItem>
            <SelectItem key="weekly">Weekly</SelectItem>
            <SelectItem key="monthly">Monthly</SelectItem>
          </Select>
        } />
        <DonutChart title="Appointments by Status" total={statusDist.reduce((s, i) => s + i.value, 0)} items={statusDist} centerLabel="Total" />
        <DonutChart title="Appointments by Type" total={typeDist.reduce((s, i) => s + i.value, 0)} items={typeDist} centerLabel="Total" />
      </div>

      {/* Row 2: Time Slots + By Day + Top Doctors + No Show */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Top Booking Time Slots */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">Top Booking Time Slots</h3>
          <div className="space-y-2.5">
            {timeSlots.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-[#100e1c] w-[120px] shrink-0 dark:text-white">{item.timeSlot}</span>
                <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden dark:bg-[#273244]">
                  <div className="h-full rounded-full bg-[#0F766E]" style={{ width: `${item.percentage}%` }} />
                </div>
                <span className="text-[10px] text-[#677294] w-[60px] text-right shrink-0 dark:text-white/60">{item.appointments} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments by Day */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 flex flex-col dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] mb-3 dark:text-white">Appointments by Day</h3>
          <div className="flex-1 min-h-0" style={{ minHeight: "150px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDayData} margin={{ top: 15, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9EA2AE", fontSize: 10 }} tickMargin={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="appointments" fill="#0F766E" radius={[4, 4, 0, 0]} maxBarSize={24} label={{ position: "top", fill: "#677294", fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Doctors */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] mb-3 dark:text-white">Top Doctors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#e5e7ea] dark:border-[#273244]">
                  <th className="pb-2 pr-2 text-left font-medium text-[#677294] dark:text-white/70">Doctor</th>
                  <th className="pb-2 px-1 text-right font-medium text-[#677294] dark:text-white/70">Appts</th>
                  <th className="pb-2 px-1 text-right font-medium text-[#677294] dark:text-white/70">Done</th>
                  <th className="pb-2 pl-1 text-right font-medium text-[#677294] dark:text-white/70">Rate</th>
                </tr>
              </thead>
              <tbody>
                {topDoctors.map((row, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] last:border-0 dark:border-[#273244]/50">
                    <td className="py-2 pr-2 text-[#100e1c] dark:text-white">{row.doctor}</td>
                    <td className="py-2 px-1 text-right text-[#100e1c] dark:text-white">{row.appointments}</td>
                    <td className="py-2 px-1 text-right text-[#100e1c] dark:text-white">{row.completed}</td>
                    <td className="py-2 pl-1 text-right text-[#27b77a] font-medium">{row.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Show Analysis */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] mb-3 dark:text-white">No Show Analysis</h3>
          <div className="space-y-2">
            {noShowBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px] shrink-0" style={{ background: item.color }} /><span className="text-[11px] text-[#677294] dark:text-slate-400">{item.label}</span></div>
                <span className="text-[12px] font-semibold text-[#100e1c] dark:text-white">{item.value} <span className="text-[10px] font-normal text-[#677294]">({item.percentage})</span></span>
              </div>
            ))}
          </div>
          {noShow && (
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] dark:border-[#273244]">
              <p className="text-[11px] text-[#677294] dark:text-white/60">No Show Rate</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[18px] font-bold text-[#100e1c] dark:text-white">{noShow.rate}%</span>
                <span className={`text-[11px] font-medium ${noShow.rateChangeType === "decrease" ? "text-[#27b77a]" : "text-[#e5484d]"}`}>{noShow.rateChangeType === "decrease" ? "↓" : "↑"} {noShow.rateChange}%</span>
                <span className="text-[10px] text-[#677294] dark:text-white/60">{comparisonLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        <PatientMetricCard icon={<FiCalendar className="text-[#3b82f6] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(59,130,246,0.1)]" label="Advance Bookings" value={formatCompact(bottom?.advanceBookings.value ?? 0)} change={`${bottom?.advanceBookings.percentage ?? 0}%`} changeType="increase" subtitle="of total" />
        <PatientMetricCard icon={<FiCheckCircle className="text-[#27b77a] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(39,183,122,0.1)]" label="Walk-in" value={formatCompact(bottom?.walkIn.value ?? 0)} change={`${bottom?.walkIn.percentage ?? 0}%`} changeType="increase" subtitle="of total" />
        <PatientMetricCard icon={<FiRefreshCw className="text-[#e89b00] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(232,155,0,0.1)]" label="Rescheduled" value={formatCompact(bottom?.rescheduled.value ?? 0)} change={`${bottom?.rescheduled.percentage ?? 0}%`} changeType="increase" subtitle="of total" />
        <PatientMetricCard icon={<FiClock className="text-[#6366f1] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(99,102,241,0.1)]" label="Avg. Advance Days" value={String(bottom?.avgAdvanceDays.value ?? 0)} change={`${bottom?.avgAdvanceDays.change ?? 0}`} changeType={bottom?.avgAdvanceDays.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
        <PatientMetricCard icon={<FiCalendar className="text-[#e89b00] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(232,155,0,0.1)]" label="Peak Day" value={bottom?.peakDay.day ?? "—"} change="" changeType="increase" subtitle={`${bottom?.peakDay.appointments ?? 0} appointments`} />
        <PatientMetricCard icon={<FiClock className="text-[#3b82f6] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(59,130,246,0.1)]" label="Peak Time" value={bottom?.peakTime.time ?? "—"} change="" changeType="increase" subtitle={`${bottom?.peakTime.appointments ?? 0} appointments`} />
        <PatientMetricCard icon={<FiActivity className="text-[#0F766E] h-[18px] w-[18px]" />} iconBgColor="bg-[rgba(15,118,110,0.1)]" label="Utilization Rate" value={`${bottom?.utilizationRate.value ?? 0}%`} change={`${bottom?.utilizationRate.change ?? 0}%`} changeType={bottom?.utilizationRate.changeType === "decrease" ? "decrease" : "increase"} subtitle={comparisonLabel} />
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30"><span className="text-blue-600 text-[10px]">ℹ</span></div>
          <span>All appointment data updated in real-time. Last updated: {report?.meta?.generatedAt ? new Date(report.meta.generatedAt).toLocaleString() : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center dark:bg-green-900/30"><span className="text-green-600 text-[10px]">✓</span></div>
          <span>Data Accuracy: {report?.meta?.accuracy ?? 0}%</span>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default AppointmentReports;
