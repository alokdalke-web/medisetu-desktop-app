import React, { useState, useCallback, useMemo } from "react";
import {
  FiPackage,
  FiShoppingCart,
  FiDollarSign,
  FiTrendingUp,
  FiAlertTriangle,
  FiCalendar,
  FiActivity,
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
  useGetMedicineReportsQuery,
  useLazyGetMedicineReportsTrendQuery,
  type MedicineReportsQueryArgs,
} from "../../redux/api/reportsOverviewApi";

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

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const CATEGORY_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#f59e0b", "#64748b"];
const FORMULATION_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];

const MedicineReports: React.FC = () => {
  // ─── Filter State ───────────────────────────────────────────────────────────
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 6);

  const defaultCompareStart = new Date(defaultStart);
  defaultCompareStart.setDate(defaultCompareStart.getDate() - 7);
  const defaultCompareEnd = new Date(defaultEnd);
  defaultCompareEnd.setDate(defaultCompareEnd.getDate() - 7);

  const [queryArgs, setQueryArgs] = useState<MedicineReportsQueryArgs>({
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
      category: filters.selectedOptions.category || undefined,
      supplierId: filters.selectedOptions.supplier || undefined,
    });
  }, []);

  // ─── API Call ───────────────────────────────────────────────────────────────
  const { data: medicineRes, isLoading, isFetching } = useGetMedicineReportsQuery(queryArgs);
  const [fetchTrend] = useLazyGetMedicineReportsTrendQuery();
  const report = medicineRes?.data;
  const metrics = report?.metrics;

  // ─── Filter Configuration ───────────────────────────────────────────────────
  // Options come from the report itself — categories and suppliers live in the
  // pharmacy module, whose own endpoints are pharmacist-scoped and not readable
  // from an admin session.
  const categoryOptions = useMemo(
    () =>
      (report?.salesByCategory ?? [])
        .filter((item) => item.label !== "Others")
        .map((item) => ({ label: item.label, value: item.label })),
    [report?.salesByCategory],
  );

  const supplierOptions = useMemo(
    () =>
      (report?.topSuppliers ?? [])
        .filter((item) => item.supplierId)
        .map((item) => ({ label: item.supplierName, value: item.supplierId })),
    [report?.topSuppliers],
  );

  const filterFields: FilterField[] = useMemo(() => [
    {
      id: "category",
      label: "Category",
      type: "select" as const,
      placeholder: "All Categories",
      options: categoryOptions,
    },
    {
      id: "supplier",
      label: "Supplier",
      type: "select" as const,
      placeholder: "All Suppliers",
      options: supplierOptions,
    },
  ], [categoryOptions, supplierOptions]);

  // ─── Period Selectors ───────────────────────────────────────────────────────
  const [salesTrendPeriod, setSalesTrendPeriod] = useState<string>("daily");
  const [trendOverride, setTrendOverride] = useState<{ labels: string[]; currentPeriod: number[]; previousPeriod: number[] } | null>(null);

  const handleTrendPeriodChange = useCallback(async (period: string) => {
    setSalesTrendPeriod(period);
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
      type: "sales",
      period: period as "daily" | "weekly" | "monthly",
      startDate,
      endDate,
      category: queryArgs.category,
      supplierId: queryArgs.supplierId,
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
  const medicineSalesTrendData = trendOverride ?? report?.salesTrend ?? { labels: [], currentPeriod: [], previousPeriod: [] };

  const salesByCategoryData = useMemo(() => (report?.salesByCategory ?? []).map((item, i) => ({
    label: item.label,
    value: item.value,
    percentage: `${item.percentage}%`,
    color: CATEGORY_COLORS[i] ?? "#94a3b8",
  })), [report?.salesByCategory]);

  const salesByFormulationData = useMemo(() => (report?.salesByFormulation ?? []).map((item, i) => ({
    label: item.label,
    value: item.value,
    percentage: `${item.percentage}%`,
    color: FORMULATION_COLORS[i] ?? "#94a3b8",
  })), [report?.salesByFormulation]);

  const topSellingMedicinesData = useMemo(() => (report?.topSellingMedicines ?? []).map((row) => ({
    medicineName: row.medicineName,
    unitsSold: formatCompact(row.unitsSold),
    salesAmount: formatCurrency(row.salesAmount),
  })), [report?.topSellingMedicines]);

  const lowStockMedicinesData = useMemo(() => (report?.lowStockMedicines ?? []).map((row) => ({
    medicineName: row.medicineName,
    currentStock: formatCompact(row.currentStock),
    reorderLevel: formatCompact(row.reorderLevel),
  })), [report?.lowStockMedicines]);

  const expiringSoonData = useMemo(() => (report?.expiringSoon ?? []).map((row) => ({
    medicineName: row.medicineName,
    expiryDate: formatDate(row.expiryDate),
    daysLeft: formatCompact(row.daysLeft),
  })), [report?.expiringSoon]);

  const topSuppliersData = useMemo(() => (report?.topSuppliers ?? []).map((row) => ({
    supplierName: row.supplierName,
    purchaseAmount: formatCurrency(row.purchaseAmount),
    percentage: `${row.percentage}%`,
  })), [report?.topSuppliers]);

  const inventory = report?.inventorySummary;
  const insights = report?.insights ?? [];

  const categoryTotal = salesByCategoryData.reduce((sum, item) => sum + item.value, 0);
  const formulationTotal = salesByFormulationData.reduce((sum, item) => sum + item.value, 0);

  const inventoryTiles = useMemo(() => [
    { icon: <FiDollarSign />, color: "#27b77a", bg: "rgba(39,183,122,0.1)", label: "Total Stock Value", value: formatCurrency(inventory?.totalStockValue ?? 0), sub: "" },
    { icon: <FiPackage />, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "Total Stock (Units)", value: formatCompact(inventory?.totalStockUnits ?? 0), sub: "" },
    { icon: <FiTrendingUp />, color: "#e89b00", bg: "rgba(232,155,0,0.1)", label: "Fast Moving Items", value: formatCompact(inventory?.fastMoving.count ?? 0), sub: `(${inventory?.fastMoving.percentage ?? 0}%)` },
    { icon: <FiActivity />, color: "#6366f1", bg: "rgba(99,102,241,0.1)", label: "Slow Moving Items", value: formatCompact(inventory?.slowMoving.count ?? 0), sub: `(${inventory?.slowMoving.percentage ?? 0}%)` },
    { icon: <FiAlertTriangle />, color: "#e5484d", bg: "rgba(229,72,77,0.1)", label: "Dead Stock Items", value: formatCompact(inventory?.deadStock.count ?? 0), sub: `(${inventory?.deadStock.percentage ?? 0}%)` },
  ], [inventory]);

  // ─── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!report) return;
    const lines: string[] = [];
    lines.push("Medicine Reports Export");
    lines.push(`Date Range: ${queryArgs.startDate} to ${queryArgs.endDate}`);
    lines.push("");
    lines.push("--- METRICS ---");
    lines.push(`Total Medicines,${report.metrics.totalMedicines.value}`);
    lines.push(`Units Sold,${report.metrics.unitsSold.value},${report.metrics.unitsSold.change}%`);
    lines.push(`Sales Amount,${report.metrics.salesAmount.value},${report.metrics.salesAmount.change}%`);
    lines.push(`Gross Profit,${report.metrics.grossProfit.value},${report.metrics.grossProfit.change}%`);
    lines.push(`Low Stock Items,${report.metrics.lowStockItems.value}`);
    lines.push(`Expiring Batches,${report.metrics.expiringItems.value}`);
    lines.push("");
    lines.push("--- TOP SELLING MEDICINES ---");
    lines.push("Medicine,Units Sold,Sales Amount");
    report.topSellingMedicines.forEach((row) => lines.push(`${row.medicineName},${row.unitsSold},${row.salesAmount}`));
    lines.push("");
    lines.push("--- LOW STOCK ---");
    lines.push("Medicine,Current Stock,Reorder Level");
    report.lowStockMedicines.forEach((row) => lines.push(`${row.medicineName},${row.currentStock},${row.reorderLevel}`));
    lines.push("");
    lines.push("--- EXPIRING SOON ---");
    lines.push("Medicine,Batch,Expiry,Days Left,Quantity");
    report.expiringSoon.forEach((row) => lines.push(`${row.medicineName},${row.batch},${row.expiryDate},${row.daysLeft},${row.quantity}`));
    lines.push("");
    lines.push("--- TOP SUPPLIERS ---");
    lines.push("Supplier,Purchase Amount,% of Total");
    report.topSuppliers.forEach((row) => lines.push(`${row.supplierName},${row.purchaseAmount},${row.percentage}%`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medicine-reports_${queryArgs.startDate}_to_${queryArgs.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [report, queryArgs]);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ReportsLayout title="Medicine Reports" subtitle="Track medicine sales, inventory, consumption and performance.">
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
      title="Medicine Reports"
      subtitle="Track medicine sales, inventory, consumption and performance."
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
          icon={<FiPackage className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Total Medicines"
          value={formatCompact(metrics?.totalMedicines.value ?? 0)}
          change=""
          changeType="increase"
          subtitle="in catalogue"
        />
        <PatientMetricCard
          icon={<FiShoppingCart className="text-[#3b82f6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          label="Units Sold"
          value={formatCompact(metrics?.unitsSold.value ?? 0)}
          change={`${metrics?.unitsSold.change ?? 0}%`}
          changeType={metrics?.unitsSold.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiDollarSign className="text-[#27b77a] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(39,183,122,0.1)]"
          label="Sales Amount"
          value={formatCurrency(metrics?.salesAmount.value ?? 0)}
          change={`${metrics?.salesAmount.change ?? 0}%`}
          changeType={metrics?.salesAmount.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiTrendingUp className="text-[#6366f1] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(99,102,241,0.1)]"
          label="Gross Profit"
          value={formatCurrency(metrics?.grossProfit.value ?? 0)}
          change={`${metrics?.grossProfit.change ?? 0}%`}
          changeType={metrics?.grossProfit.changeType === "decrease" ? "decrease" : "increase"}
          subtitle={comparisonLabel}
        />
        <PatientMetricCard
          icon={<FiAlertTriangle className="text-[#e5484d] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(229,72,77,0.1)]"
          label="Low Stock Items"
          value={formatCompact(metrics?.lowStockItems.value ?? 0)}
          change=""
          changeType="decrease"
          subtitle="at or below reorder"
        />
        <PatientMetricCard
          icon={<FiCalendar className="text-[#e89b00] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(232,155,0,0.1)]"
          label="Expiring Batches"
          value={formatCompact(metrics?.expiringItems.value ?? 0)}
          change=""
          changeType="decrease"
          subtitle="within 30 days"
        />
      </div>

      {/* Charts Row 1: Sales Trend + Category + Formulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <LineChart
          title="Medicine Sales Trend"
          data={medicineSalesTrendData}
          periodSelector={
            <Select
              aria-label="Period"
              selectedKeys={new Set([salesTrendPeriod])}
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
          title="Sales by Category"
          total={categoryTotal}
          items={salesByCategoryData}
          centerLabel="Total"
        />

        <DonutChart
          title="Sales by Formulation"
          total={formulationTotal}
          items={salesByFormulationData}
          centerLabel="Units Sold"
        />
      </div>

      {/* Charts Row 2: Top Selling + Low Stock + Expiring + Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <DataTable
          title="Top Selling Medicines"
          columns={[
            { key: "medicineName", label: "Medicine Name", align: "left" },
            { key: "unitsSold", label: "Units Sold", align: "right" },
            { key: "salesAmount", label: "Sales Amount", align: "right" },
          ]}
          data={topSellingMedicinesData}
          onViewAll={() => console.log("View all medicines")}
          viewAllText="View All Medicines"
        />

        <DataTable
          title="Low Stock Medicines"
          columns={[
            { key: "medicineName", label: "Medicine Name", align: "left" },
            { key: "currentStock", label: "Current Stock", align: "right" },
            { key: "reorderLevel", label: "Reorder Level", align: "right" },
          ]}
          data={lowStockMedicinesData}
          onViewAll={() => console.log("View all low stock")}
          viewAllText="View All Low Stock"
        />

        <DataTable
          title="Expiring Soon"
          columns={[
            { key: "medicineName", label: "Medicine Name", align: "left" },
            { key: "expiryDate", label: "Expiry Date", align: "right" },
            { key: "daysLeft", label: "Days Left", align: "right" },
          ]}
          data={expiringSoonData}
          onViewAll={() => console.log("View all expiring")}
          viewAllText="View All Expiring Soon"
        />

        <DataTable
          title="Top Suppliers"
          columns={[
            { key: "supplierName", label: "Supplier Name", align: "left" },
            { key: "purchaseAmount", label: "Purchase Amount", align: "right" },
            { key: "percentage", label: "% of Total", align: "right" },
          ]}
          data={topSuppliersData}
          onViewAll={() => console.log("View all suppliers")}
          viewAllText="View All Suppliers"
        />
      </div>

      {/* Inventory Summary + Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Inventory Summary */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-5 dark:text-white">
            Inventory Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {inventoryTiles.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: item.bg }}
                >
                  <span style={{ color: item.color }} className="text-[16px]">
                    {item.icon}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-[#677294] dark:text-white/60">{item.label}</p>
                  <p className="text-[18px] font-semibold text-[#100e1c] leading-6 dark:text-white">{item.value}</p>
                  {item.sub && (
                    <p className="text-[10px] text-[#677294] dark:text-white/50">{item.sub}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">
            Key Insights
          </h3>
          <div className="space-y-2">
            {insights.length > 0 ? (
              insights.map((text, i) => {
                const tone = [
                  { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", glyph: "ℹ" },
                  { color: "#e89b00", bg: "rgba(232,155,0,0.1)", glyph: "⚠" },
                  { color: "#e5484d", bg: "rgba(229,72,77,0.1)", glyph: "⚠" },
                  { color: "#27b77a", bg: "rgba(39,183,122,0.1)", glyph: "↑" },
                ][i % 4];
                return (
                  <div key={i} className="flex gap-2.5 p-2.5 rounded-xl" style={{ background: tone.bg }}>
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${tone.color}20` }}
                    >
                      <span style={{ color: tone.color }} className="text-[10px] font-bold">
                        {tone.glyph}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#100e1c] leading-[17px] dark:text-white">
                      {text}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-[12px] text-[#677294] dark:text-white/60">
                No medicine activity recorded for this period.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30">
            <span className="text-blue-600 text-[10px]">ℹ</span>
          </div>
          <span>Sales and stock are recalculated on every request. Last updated: {report?.meta?.generatedAt ? new Date(report.meta.generatedAt).toLocaleString() : "—"}</span>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default MedicineReports;
