import React, { useState, useCallback, useMemo } from "react";
import {
  FiDollarSign,
  FiCreditCard,
  FiClock,
  FiFileText,
  FiTrendingUp,
  FiRefreshCw,
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
import ReportsLayout from "../../components/reports/ReportsLayout";
import ReportFilterBar, {
  type ReportFilters,
  type FilterField,
} from "../../components/reports/ReportFilterBar";
import {
  useGetRevenueReportsQuery,
  useLazyGetRevenueReportsTrendQuery,
  type RevenueReportsQueryArgs,
} from "../../redux/api/reportsOverviewApi";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCurrency(n: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n || 0))}`;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
}

const BREAKDOWN_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#64748b"];
const PAYMENT_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];

const PAYMENT_MODE_OPTIONS = [
  { label: "Cash", value: "Cash" },
  { label: "UPI", value: "UPI" },
  { label: "Card", value: "Card" },
  { label: "Online", value: "Online" },
];

const RevenueReports: React.FC = () => {
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
    {
      id: "paymentMode",
      label: "Payment Mode",
      type: "select" as const,
      placeholder: "All Modes",
      options: PAYMENT_MODE_OPTIONS,
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

  const [queryArgs, setQueryArgs] = useState<RevenueReportsQueryArgs>({
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
      paymentMode: filters.selectedOptions.paymentMode || undefined,
    });
  }, []);

  // ─── API Call ───────────────────────────────────────────────────────────────
  const { data: revenueRes, isLoading, isFetching } = useGetRevenueReportsQuery(queryArgs);
  const [fetchTrend] = useLazyGetRevenueReportsTrendQuery();
  const report = revenueRes?.data;
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
    const result = await fetchTrend({
      type: "revenue",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      department: queryArgs.department,
      doctorId: queryArgs.doctorId,
      paymentMode: queryArgs.paymentMode,
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
  const revenueTrendData = trendOverride ?? report?.revenueTrend ?? { labels: [], currentPeriod: [], previousPeriod: [] };

  const revenueBreakdownData = useMemo(() => (report?.revenueBreakdown ?? []).map((item, i) => ({
    label: item.label,
    value: item.value,
    percentage: `${item.percentage}%`,
    color: BREAKDOWN_COLORS[i] ?? "#94a3b8",
  })), [report?.revenueBreakdown]);

  const paymentMethodData = useMemo(() => (report?.paymentModeDistribution ?? []).map((item, i) => ({
    label: item.label,
    value: item.value,
    percentage: `${item.percentage}%`,
    color: PAYMENT_COLORS[i] ?? "#94a3b8",
  })), [report?.paymentModeDistribution]);

  const topRevenueServicesData = useMemo(() => (report?.topServices ?? []).map((row) => ({
    service: row.service,
    revenue: formatCurrency(row.revenue),
    percentage: `${row.percentage}%`,
  })), [report?.topServices]);

  const doctorWiseRevenueData = useMemo(() => (report?.doctorWiseRevenue ?? []).map((row) => ({
    doctor: row.doctor,
    revenue: formatCurrency(row.revenue),
    percentage: `${row.percentage}%`,
  })), [report?.doctorWiseRevenue]);

  const appointmentTypeRevenueData = useMemo(() => (report?.appointmentTypeRevenue ?? []).map((row) => ({
    appointmentType: row.appointmentType,
    revenue: formatCurrency(row.revenue),
    percentage: `${row.percentage}%`,
  })), [report?.appointmentTypeRevenue]);

  const outstandingAgingData = useMemo(() => (report?.outstandingAging ?? []).map((row) => ({
    agingBracket: row.bracket,
    amount: formatCurrency(row.amount),
    percentage: `${row.percentage}%`,
  })), [report?.outstandingAging]);

  const monthlyRevenueData = useMemo(() => report?.monthlyRevenue ?? [], [report?.monthlyRevenue]);
  const ytd = report?.ytd;
  const insights = report?.insights ?? [];

  const breakdownTotal = revenueBreakdownData.reduce((sum, item) => sum + item.value, 0);
  const paymentTotal = paymentMethodData.reduce((sum, item) => sum + item.value, 0);

  // ─── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!report) return;
    const lines: string[] = [];
    lines.push("Revenue Reports Export");
    lines.push(`Date Range: ${queryArgs.startDate} to ${queryArgs.endDate}`);
    lines.push("");
    lines.push("--- METRICS ---");
    lines.push(`Total Revenue,${report.metrics.totalRevenue.value},${report.metrics.totalRevenue.change}%`);
    lines.push(`Amount Collected,${report.metrics.amountCollected.value},${report.metrics.amountCollected.change}%`);
    lines.push(`Pending Amount,${report.metrics.pendingAmount.value}`);
    lines.push(`Avg Invoice Value,${report.metrics.avgInvoiceValue.value}`);
    lines.push(`Total Invoices,${report.metrics.totalInvoices.value}`);
    lines.push(`Refunds,${report.metrics.refunds.value}`);
    lines.push("");
    lines.push("--- REVENUE BY SERVICE ---");
    lines.push("Service,Revenue,% of Total");
    report.topServices.forEach((row) => lines.push(`${row.service},${row.revenue},${row.percentage}%`));
    lines.push("");
    lines.push("--- DOCTOR-WISE REVENUE ---");
    lines.push("Doctor,Revenue,%");
    report.doctorWiseRevenue.forEach((row) => lines.push(`${row.doctor},${row.revenue},${row.percentage}%`));
    lines.push("");
    lines.push("--- OUTSTANDING AGING ---");
    lines.push("Bracket,Amount,% of Total");
    report.outstandingAging.forEach((row) => lines.push(`${row.bracket},${row.amount},${row.percentage}%`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenue-reports_${queryArgs.startDate}_to_${queryArgs.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [report, queryArgs]);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ReportsLayout title="Revenue Reports" subtitle="Track financial performance and revenue insights.">
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
      title="Revenue Reports"
      subtitle="Track financial performance and revenue insights."
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
          icon={<FiDollarSign className="text-[#27b77a] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(39,183,122,0.1)]"
          label="Total Revenue"
          value={formatCurrency(metrics?.totalRevenue.value ?? 0)}
          change={`${metrics?.totalRevenue.change ?? 0}%`}
          changeType={metrics?.totalRevenue.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiCreditCard className="text-[#3b82f6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          label="Amount Collected"
          value={formatCurrency(metrics?.amountCollected.value ?? 0)}
          change={`${metrics?.amountCollected.change ?? 0}%`}
          changeType={metrics?.amountCollected.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiClock className="text-[#e89b00] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(232,155,0,0.1)]"
          label="Pending Amount"
          value={formatCurrency(metrics?.pendingAmount.value ?? 0)}
          change={`${metrics?.pendingAmount.change ?? 0}%`}
          changeType={metrics?.pendingAmount.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiFileText className="text-[#6366f1] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(99,102,241,0.1)]"
          label="Avg. Invoice Value"
          value={formatCurrency(metrics?.avgInvoiceValue.value ?? 0)}
          change={`${metrics?.avgInvoiceValue.change ?? 0}%`}
          changeType={metrics?.avgInvoiceValue.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiTrendingUp className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Total Invoices"
          value={formatCompact(metrics?.totalInvoices.value ?? 0)}
          change={`${metrics?.totalInvoices.change ?? 0}%`}
          changeType={metrics?.totalInvoices.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiRefreshCw className="text-[#e5484d] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(229,72,77,0.1)]"
          label="Refunds"
          value={formatCurrency(metrics?.refunds.value ?? 0)}
          change={`${metrics?.refunds.change ?? 0}%`}
          changeType={metrics?.refunds.changeType === "increase" ? "increase" : "decrease"}
          subtitle={comparisonLabel}
        />
      </div>

      {/* Charts Row 1: Revenue Trend + Breakdown + Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <LineChart
          title="Revenue Trend"
          data={revenueTrendData}
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
          title="Revenue Breakdown"
          total={breakdownTotal}
          items={revenueBreakdownData}
          centerLabel="Total"
        />

        <DonutChart
          title="Revenue by Payment Method"
          total={paymentTotal}
          items={paymentMethodData}
          centerLabel="Total"
        />
      </div>

      {/* Charts Row 2: Services + Doctors + Appointment Types + Outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <DataTable
          title="Top Revenue Generating Services"
          columns={[
            { key: "service", label: "Service", align: "left" },
            { key: "revenue", label: "Revenue", align: "right" },
            { key: "percentage", label: "% of Total", align: "right" },
          ]}
          data={topRevenueServicesData}
          onViewAll={() => console.log("View all services")}
          viewAllText="View All Services"
        />

        <DataTable
          title="Doctor-wise Revenue"
          columns={[
            { key: "doctor", label: "Doctor", align: "left" },
            { key: "revenue", label: "Revenue", align: "right" },
            { key: "percentage", label: "%", align: "right" },
          ]}
          data={doctorWiseRevenueData}
        />

        <DataTable
          title="Revenue by Appointment Type"
          columns={[
            { key: "appointmentType", label: "Type", align: "left" },
            { key: "revenue", label: "Revenue", align: "right" },
            { key: "percentage", label: "% of Total", align: "right" },
          ]}
          data={appointmentTypeRevenueData}
        />

        <DataTable
          title="Outstanding Aging"
          columns={[
            { key: "agingBracket", label: "Aging Bracket", align: "left" },
            { key: "amount", label: "Amount", align: "right" },
            { key: "percentage", label: "% of Total", align: "right" },
          ]}
          data={outstandingAgingData}
          onViewAll={() => console.log("View all outstanding")}
          viewAllText="View All Outstanding"
        />
      </div>

      {/* Monthly Revenue Summary */}
      <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
            Monthly Revenue Summary
          </h3>
          <div className="flex items-center gap-4 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#0F766E]" />
              <span className="text-[#677294] dark:text-white/70">This Year</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#94a3b8]" />
              <span className="text-[#677294] dark:text-white/70">Last Year</span>
            </div>
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyRevenueData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9EA2AE", fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                tickFormatter={(v) => `₹${Math.round(v / 100000)}L`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
                formatter={(value: any) => [formatCurrency(Number(value)), ""]}
              />
              <Bar
                dataKey="lastYear"
                name="Last Year"
                fill="#94a3b8"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="thisYear"
                name="This Year"
                fill="#0F766E"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* YTD Summary + Key Insight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <p className="text-[12px] text-[#677294] mb-1 dark:text-white/60">
            {ytd?.label ?? "YTD"}
          </p>
          <div className="text-[24px] font-bold text-[#100e1c] dark:text-white">
            {formatCurrency(ytd?.revenue ?? 0)}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] mt-1">
            <span className={`font-medium ${ytd?.changeType === "decrease" ? "text-[#e5484d]" : "text-[#27b77a]"}`}>
              {ytd?.changeType === "decrease" ? "↓" : "↑"} {ytd?.change ?? 0}%
            </span>
            <span className="text-[#677294] dark:text-white/60">vs last year</span>
          </div>
          <div className="mt-2 text-[12px] text-[#677294] dark:text-white/60">
            Last Year: <span className="font-semibold text-[#100e1c] dark:text-white">{formatCurrency(ytd?.lastYearRevenue ?? 0)}</span>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <p className="text-[12px] text-[#677294] mb-1 dark:text-white/60">
            YTD Collected
          </p>
          <div className="text-[24px] font-bold text-[#100e1c] dark:text-white">
            {formatCurrency(ytd?.collected ?? 0)}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] mt-1">
            <span className={`font-medium ${ytd?.collectedChangeType === "decrease" ? "text-[#e5484d]" : "text-[#27b77a]"}`}>
              {ytd?.collectedChangeType === "decrease" ? "↓" : "↑"} {ytd?.collectedChange ?? 0}%
            </span>
            <span className="text-[#677294] dark:text-white/60">vs last year</span>
          </div>
          <div className="mt-2 text-[12px] text-[#677294] dark:text-white/60">
            Last Year: <span className="font-semibold text-[#100e1c] dark:text-white">{formatCurrency(ytd?.lastYearCollected ?? 0)}</span>
          </div>
        </div>

        <div className="bg-[#e6fbf7] rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#16352f] dark:border-[#273244]">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0 dark:bg-[#111726]">
              <HiOutlineLightBulb className="text-[#0a6c74] h-5 w-5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#100e1c] dark:text-white">
                Key Insight
              </p>
              {insights.length > 0 ? (
                insights.map((insight, i) => (
                  <p key={i} className="text-[12px] text-[#677294] mt-1 leading-[17px] dark:text-white/70">
                    {insight}
                  </p>
                ))
              ) : (
                <p className="text-[12px] text-[#677294] mt-1 leading-[17px] dark:text-white/70">
                  No revenue recorded for this period yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30">
            <span className="text-blue-600 text-[10px]">ℹ</span>
          </div>
          <span>All revenue data is updated in real-time. Last updated: {report?.meta?.generatedAt ? new Date(report.meta.generatedAt).toLocaleString() : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center dark:bg-green-900/30">
            <span className="text-green-600 text-[10px]">✓</span>
          </div>
          <span>Data Accuracy: {report?.meta?.accuracy ?? 0}%</span>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default RevenueReports;
