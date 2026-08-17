import React, { useState, useCallback, useMemo } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiPercent,
  FiCalendar,
  FiTrendingUp,
  FiCheckCircle,
  FiLock,
} from "react-icons/fi";
import { Select, SelectItem } from "@heroui/react";
import PatientMetricCard from "../../components/reports/PatientMetricCard";
import DonutChart from "../../components/reports/DonutChart";
import LineChart from "../../components/reports/LineChart";
import DataTable from "../../components/reports/DataTable";
import ReportsLayout from "../../components/reports/ReportsLayout";
import ReportFilterBar, {
  type ReportFilters,
  type FilterField,
} from "../../components/reports/ReportFilterBar";
import {
  useGetStaffReportsQuery,
  useLazyGetStaffReportsTrendQuery,
  type StaffReportsQueryArgs,
} from "../../redux/api/reportsOverviewApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
}

/** `user_type` values as stored, mapped to what a clinic admin would call them. */
const ROLE_LABELS: Record<string, string> = {
  Doctor: "Doctors",
  Nurse: "Nurses",
  Receptionist: "Receptionists",
  Lab_Assistant: "Lab Assistants",
  Pharmacist: "Pharmacists",
  Radiologist: "Radiologists",
  Admin: "Admins",
  Super_Admin: "Super Admins",
  User: "Other Staff",
};

const ROLE_OPTIONS = [
  { label: "Doctor", value: "Doctor" },
  { label: "Nurse", value: "Nurse" },
  { label: "Receptionist", value: "Receptionist" },
  { label: "Lab Assistant", value: "Lab_Assistant" },
  { label: "Pharmacist", value: "Pharmacist" },
];

const ROLE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280"];
const STATUS_COLORS: Record<string, string> = {
  Active: "#10b981",
  Inactive: "#94a3b8",
  Blocked: "#ef4444",
  Pending: "#f59e0b",
  New: "#3b82f6",
  Reviewing: "#8b5cf6",
  Rejected: "#e5484d",
};

/**
 * Attendance, leave, overtime and shift rosters have no tables in the backend
 * schema, so these panels state that plainly instead of rendering placeholder
 * figures that would read as real.
 */
const UNAVAILABLE_PANELS: Record<string, { title: string; body: string }> = {
  attendance: {
    title: "Attendance Overview",
    body: "Attendance isn't tracked yet — there's no check-in/check-out data to report on.",
  },
  leaves: {
    title: "Leaves",
    body: "Leave requests and balances aren't recorded in the system yet.",
  },
  overtime: {
    title: "Overtime Hours",
    body: "Working hours aren't logged, so overtime can't be calculated.",
  },
  shiftRoster: {
    title: "Shift Roster",
    body: "Shift scheduling isn't part of the system yet.",
  },
};

const ComingSoonPanel: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="bg-white rounded-[16px] border border-dashed border-[rgba(229,231,234,0.9)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">{title}</h3>
      <span className="rounded-full bg-[#e89b00]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#b47700] dark:text-[#e89b00]">
        Coming soon
      </span>
    </div>
    <div className="flex items-start gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 dark:bg-[#1a2236]">
        <FiLock className="h-4 w-4 text-[#677294] dark:text-white/60" />
      </div>
      <p className="text-[12px] leading-[18px] text-[#677294] dark:text-white/60">{body}</p>
    </div>
  </div>
);

const StaffReports: React.FC = () => {
  // ─── Filter State ───────────────────────────────────────────────────────────
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 6);

  const defaultCompareStart = new Date(defaultStart);
  defaultCompareStart.setDate(defaultCompareStart.getDate() - 7);
  const defaultCompareEnd = new Date(defaultEnd);
  defaultCompareEnd.setDate(defaultCompareEnd.getDate() - 7);

  const [queryArgs, setQueryArgs] = useState<StaffReportsQueryArgs>({
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
      role: filters.selectedOptions.role || undefined,
    });
  }, []);

  // Department is deliberately absent: staff are not grouped into departments
  // anywhere in the schema, so the old dropdown filtered nothing.
  const filterFields: FilterField[] = useMemo(() => [
    {
      id: "role",
      label: "Role",
      type: "select" as const,
      placeholder: "All Roles",
      options: ROLE_OPTIONS,
    },
  ], []);

  // ─── API Call ───────────────────────────────────────────────────────────────
  const { data: staffRes, isLoading, isFetching } = useGetStaffReportsQuery(queryArgs);
  const [fetchTrend] = useLazyGetStaffReportsTrendQuery();
  const report = staffRes?.data;
  const metrics = report?.metrics;

  // ─── Period Selector ────────────────────────────────────────────────────────
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
    const result = await fetchTrend({
      type: "appointments",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      role: queryArgs.role,
    });
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
  const appointmentsTrendData = trendOverride ?? report?.appointmentsTrend ?? { labels: [], currentPeriod: [], previousPeriod: [] };

  const staffByRoleData = useMemo(() => (report?.staffByRole ?? []).map((item, i) => ({
    label: ROLE_LABELS[item.label] ?? item.label,
    value: item.value,
    percentage: `${item.percentage}%`,
    color: ROLE_COLORS[i] ?? "#94a3b8",
  })), [report?.staffByRole]);

  const staffByStatusData = useMemo(() => (report?.staffByStatus ?? []).map((item) => ({
    label: item.label,
    value: item.value,
    percentage: `${item.percentage}%`,
    color: STATUS_COLORS[item.label] ?? "#94a3b8",
  })), [report?.staffByStatus]);

  const topPerformingStaffData = useMemo(() => (report?.topPerformingStaff ?? []).map((row) => ({
    staffName: row.staffName,
    role: ROLE_LABELS[row.role]?.replace(/s$/, "") ?? row.role,
    appointments: formatCompact(row.appointments),
    completionRate: `${row.completionRate}%`,
  })), [report?.topPerformingStaff]);

  const staffWorkload = report?.staffWorkload ?? [];
  const maxWorkload = staffWorkload.reduce((max, row) => Math.max(max, row.appointments), 0) || 1;
  const insights = report?.insights ?? [];
  const unavailable = report?.unavailableSections ?? Object.keys(UNAVAILABLE_PANELS);

  const roleTotal = staffByRoleData.reduce((sum, item) => sum + item.value, 0);
  const statusTotal = staffByStatusData.reduce((sum, item) => sum + item.value, 0);

  // ─── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!report) return;
    const lines: string[] = [];
    lines.push("Staff Reports Export");
    lines.push(`Date Range: ${queryArgs.startDate} to ${queryArgs.endDate}`);
    lines.push("");
    lines.push("--- METRICS ---");
    lines.push(`Total Staff,${report.metrics.totalStaff.value}`);
    lines.push(`Active Staff,${report.metrics.activeStaff.value}`);
    lines.push(`Appointments Handled,${report.metrics.appointmentsHandled.value},${report.metrics.appointmentsHandled.change}%`);
    lines.push(`Completed,${report.metrics.completedAppointments.value},${report.metrics.completedAppointments.change}%`);
    lines.push(`Avg Appointments / Doctor,${report.metrics.avgAppointmentsPerDoctor.value}`);
    lines.push(`Completion Rate,${report.metrics.completionRate.value}%`);
    lines.push("");
    lines.push("--- STAFF BY ROLE ---");
    lines.push("Role,Count,% of Staff");
    report.staffByRole.forEach((row) => lines.push(`${row.label},${row.value},${row.percentage}%`));
    lines.push("");
    lines.push("--- PER DOCTOR ---");
    lines.push("Staff,Role,Appointments,Completed,Completion Rate,% of Clinic");
    report.topPerformingStaff.forEach((row) => {
      const workload = report.staffWorkload.find((w) => w.staffId === row.staffId);
      lines.push(`${row.staffName},${row.role},${row.appointments},${row.completed},${row.completionRate}%,${workload?.shareOfClinic ?? 0}%`);
    });
    lines.push("");
    lines.push("--- NOT TRACKED ---");
    report.unavailableSections.forEach((key) => lines.push(UNAVAILABLE_PANELS[key]?.title ?? key));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-reports_${queryArgs.startDate}_to_${queryArgs.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [report, queryArgs]);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ReportsLayout title="Staff Reports" subtitle="Analyze staff roster and appointment workload.">
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
    <ReportsLayout
      title="Staff Reports"
      subtitle="Analyze staff roster and appointment workload."
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
          icon={<FiUsers className="text-[#3b82f6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          label="Total Staff"
          value={formatCompact(metrics?.totalStaff.value ?? 0)}
          change=""
          changeType="increase"
          subtitle="assigned to clinic"
        />
        <PatientMetricCard
          icon={<FiUserCheck className="text-[#27b77a] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(39,183,122,0.1)]"
          label="Active Staff"
          value={formatCompact(metrics?.activeStaff.value ?? 0)}
          change=""
          changeType="increase"
          subtitle="active accounts"
        />
        <PatientMetricCard
          icon={<FiCalendar className="text-[#6366f1] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(99,102,241,0.1)]"
          label="Appointments Handled"
          value={formatCompact(metrics?.appointmentsHandled.value ?? 0)}
          change={`${metrics?.appointmentsHandled.change ?? 0}%`}
          changeType={metrics?.appointmentsHandled.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiCheckCircle className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Completed"
          value={formatCompact(metrics?.completedAppointments.value ?? 0)}
          change={`${metrics?.completedAppointments.change ?? 0}%`}
          changeType={metrics?.completedAppointments.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiTrendingUp className="text-[#e89b00] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(232,155,0,0.1)]"
          label="Avg. per Doctor"
          value={formatCompact(metrics?.avgAppointmentsPerDoctor.value ?? 0)}
          change={`${metrics?.avgAppointmentsPerDoctor.change ?? 0}%`}
          changeType={metrics?.avgAppointmentsPerDoctor.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiPercent className="text-[#8b5cf6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(139,92,246,0.1)]"
          label="Completion Rate"
          value={`${metrics?.completionRate.value ?? 0}%`}
          change={`${metrics?.completionRate.change ?? 0}%`}
          changeType={metrics?.completionRate.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
      </div>

      {/* Row 1: Trend + Role split + Account status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <LineChart
          title="Appointments Handled"
          data={appointmentsTrendData}
          periodSelector={
            <Select
              aria-label="Period"
              selectedKeys={new Set([trendPeriod])}
              onSelectionChange={(keys) => {
                const key = Array.from(keys as Set<string>)[0];
                if (key) handleTrendPeriodChange(key);
              }}
              size="sm"
              radius="lg"
              classNames={{
                trigger:
                  "h-8 min-h-8 w-[100px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                value: "text-[12px] text-[#100e1c] dark:text-white",
                popoverContent: "dark:bg-[#111726]",
              }}
              variant="bordered"
            >
              <SelectItem key="daily">Daily</SelectItem>
              <SelectItem key="weekly">Weekly</SelectItem>
              <SelectItem key="monthly">Monthly</SelectItem>
            </Select>
          }
        />

        <DonutChart
          title="Staff by Role"
          total={roleTotal}
          items={staffByRoleData}
          centerLabel="Staff"
        />

        <DonutChart
          title="Account Status"
          total={statusTotal}
          items={staffByStatusData}
          centerLabel="Staff"
        />
      </div>

      {/* Row 2: Per-doctor tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataTable
          title="Top Performing Doctors"
          columns={[
            { key: "staffName", label: "Staff Name", align: "left" },
            { key: "role", label: "Role", align: "left" },
            { key: "appointments", label: "Appts", align: "right" },
            { key: "completionRate", label: "Completed", align: "right" },
          ]}
          data={topPerformingStaffData}
        />

        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">
            Workload Distribution
          </h3>
          {staffWorkload.length === 0 ? (
            <p className="text-[12px] text-[#677294] dark:text-white/60">
              No appointments were booked in this period.
            </p>
          ) : (
            <div className="space-y-3">
              {staffWorkload.map((row) => (
                <div key={row.staffId} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#100e1c] w-[130px] shrink-0 truncate dark:text-white">
                    {row.staffName}
                  </span>
                  <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden dark:bg-[#273244]">
                    <div
                      className="h-full rounded-full bg-[#0F766E]"
                      style={{ width: `${Math.round((row.appointments / maxWorkload) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#677294] w-[74px] text-right shrink-0 dark:text-white/60">
                    {row.appointments} ({row.shareOfClinic}%)
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-[10px] leading-[15px] text-[#677294] dark:text-white/50">
            Workload is measured as appointments booked with each doctor. Nurses,
            receptionists and lab staff aren't linked to appointments, so they
            don't appear here.
          </p>
        </div>
      </div>

      {/* Row 3: Not-yet-tracked panels — stated, never faked */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {unavailable.map((key) => {
          const panel = UNAVAILABLE_PANELS[key];
          if (!panel) return null;
          return <ComingSoonPanel key={key} title={panel.title} body={panel.body} />;
        })}
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
        <h3 className="text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">
          Key Insights
        </h3>
        {insights.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insights.map((text, i) => (
              <div key={i} className="flex gap-2.5 p-2.5 rounded-xl bg-[rgba(59,130,246,0.08)]">
                <span className="h-5 w-5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  ℹ
                </span>
                <p className="text-[12px] text-[#100e1c] leading-[17px] dark:text-white">{text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[#677294] dark:text-white/60">
            No staff activity recorded for this period.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30">
            <span className="text-blue-600 text-[10px]">ℹ</span>
          </div>
          <span>Last updated: {report?.meta?.generatedAt ? new Date(report.meta.generatedAt).toLocaleString() : "—"}</span>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default StaffReports;
