import React, { useState, useCallback } from "react";
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

const MedicineReports: React.FC = () => {
  // ─── Filter Configuration ───────────────────────────────────────────────────
  const filterFields: FilterField[] = [
    {
      id: "category",
      label: "Category",
      type: "select",
      placeholder: "All Categories",
      options: [
        { label: "Analgesics", value: "analgesics" },
        { label: "Antibiotics", value: "antibiotics" },
        { label: "Vitamins & Supplements", value: "vitamins" },
        { label: "Cardiac", value: "cardiac" },
        { label: "Others", value: "others" },
      ],
    },
    {
      id: "supplier",
      label: "Supplier",
      type: "select",
      placeholder: "All Suppliers",
      options: [
        { label: "MedPlus Pharma", value: "medplus" },
        { label: "HealthCare Ltd.", value: "healthcare" },
        { label: "LifeCare Distributors", value: "lifecare" },
        { label: "BioMedika", value: "biomedika" },
      ],
    },
  ];

  const [_activeFilters, setActiveFilters] = useState<ReportFilters | null>(null);

  const handleFilterApply = useCallback((filters: ReportFilters) => {
    setActiveFilters(filters);
    console.log("Applied filters:", filters);
  }, []);

  // ─── Period Selectors State ─────────────────────────────────────────────────
  const [salesTrendPeriod, setSalesTrendPeriod] = useState<string>("daily");

  // ─── Sample Data ────────────────────────────────────────────────────────────
  const medicineSalesTrendData = {
    labels: ["12 May", "13 May", "14 May", "15 May", "16 May", "17 May", "18 May"],
    currentPeriod: [50000, 65000, 60000, 75000, 70000, 72000, 68000],
    previousPeriod: [40000, 50000, 45000, 55000, 52000, 50000, 48000],
  };

  const salesByCategoryData = [
    { label: "Analgesics", value: 986400, percentage: "25.2%", color: "#10b981" },
    { label: "Antibiotics", value: 874320, percentage: "22.7%", color: "#3b82f6" },
    { label: "Vitamins & Supplements", value: 642560, percentage: "16.6%", color: "#8b5cf6" },
    { label: "Cardiac", value: 542560, percentage: "12.4%", color: "#ef4444" },
    { label: "Others", value: 982500, percentage: "24.1%", color: "#f59e0b" },
  ];

  const salesByFormulationData = [
    { label: "Tablet", value: 2450, percentage: "46.0%", color: "#3b82f6" },
    { label: "Capsule", value: 1320, percentage: "24.8%", color: "#10b981" },
    { label: "Syrup", value: 880, percentage: "16.5%", color: "#8b5cf6" },
    { label: "Injection", value: 380, percentage: "7.1%", color: "#f59e0b" },
    { label: "Others", value: 294, percentage: "5.5%", color: "#ef4444" },
  ];

  const topSellingMedicinesData = [
    { medicineName: "Paracetamol 500 mg", unitsSold: 520, salesAmount: "₹15,600" },
    { medicineName: "Montair LC", unitsSold: 410, salesAmount: "₹12,300" },
    { medicineName: "Azithral 500 mg", unitsSold: 320, salesAmount: "₹9,600" },
    { medicineName: "Dolo 650 mg", unitsSold: 280, salesAmount: "₹8,400" },
    { medicineName: "Ascoril LS", unitsSold: 250, salesAmount: "₹7,500" },
  ];

  const lowStockMedicinesData = [
    { medicineName: "Amoxicillin 500 mg", currentStock: 18, reorderLevel: 50 },
    { medicineName: "Cefixime 200 mg", currentStock: 12, reorderLevel: 40 },
    { medicineName: "Pantoprazole 40 mg", currentStock: 15, reorderLevel: 40 },
    { medicineName: "Montair LC", currentStock: 20, reorderLevel: 60 },
    { medicineName: "Metformin 500 mg", currentStock: 22, reorderLevel: 50 },
  ];

  const expiringSoonData = [
    { medicineName: "Augmentin 625 mg", expiryDate: "25 May 2025", daysLeft: 7 },
    { medicineName: "Azithral 500 mg", expiryDate: "28 May 2025", daysLeft: 10 },
    { medicineName: "Dolo 650 mg", expiryDate: "02 Jun 2025", daysLeft: 15 },
    { medicineName: "Montair LC", expiryDate: "05 Jun 2025", daysLeft: 18 },
    { medicineName: "Ecosprin 75 mg", expiryDate: "08 Jun 2025", daysLeft: 21 },
  ];

  const topSuppliersData = [
    { supplierName: "MedPlus Pharma", purchaseAmount: "₹1,25,600", percentage: "28.3%" },
    { supplierName: "HealthCare Ltd.", purchaseAmount: "₹1,02,300", percentage: "23.1%" },
    { supplierName: "LifeCare Distributors", purchaseAmount: "₹78,540", percentage: "17.7%" },
    { supplierName: "BioMedika", purchaseAmount: "₹62,400", percentage: "14.0%" },
    { supplierName: "Others", purchaseAmount: "₹74,120", percentage: "16.8%" },
  ];

  return (
    <ReportsLayout
      title="Medicine Reports"
      subtitle="Track medicine sales, inventory, consumption and performance."
    >
      {/* Filter Bar */}
      <ReportFilterBar
        fields={filterFields}
        showCompare={true}
        onApply={handleFilterApply}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <PatientMetricCard
          icon={<FiPackage className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Total Medicines"
          value="1,248"
          change="12.5%"
          changeType="increase"
          subtitle="vs last 7 days"
        />
        <PatientMetricCard
          icon={<FiShoppingCart className="text-[#3b82f6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          label="Units Sold"
          value="5,324"
          change="18.7%"
          changeType="increase"
          subtitle="vs last 7 days"
        />
        <PatientMetricCard
          icon={<FiDollarSign className="text-[#27b77a] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(39,183,122,0.1)]"
          label="Sales Amount"
          value="₹3,42,560"
          change="22.6%"
          changeType="increase"
          subtitle="vs last 7 days"
        />
        <PatientMetricCard
          icon={<FiTrendingUp className="text-[#6366f1] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(99,102,241,0.1)]"
          label="Gross Profit"
          value="₹1,28,760"
          change="19.3%"
          changeType="increase"
          subtitle="vs last 7 days"
        />
        <PatientMetricCard
          icon={<FiAlertTriangle className="text-[#e5484d] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(229,72,77,0.1)]"
          label="Low Stock Items"
          value="24"
          change="4"
          changeType="decrease"
          subtitle="vs last 7 days"
        />
        <PatientMetricCard
          icon={<FiCalendar className="text-[#e89b00] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(232,155,0,0.1)]"
          label="Expired Items"
          value="6"
          change="2"
          changeType="decrease"
          subtitle="vs last 7 days"
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
                if (key) setSalesTrendPeriod(key);
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
          total={3425600}
          items={salesByCategoryData}
          centerLabel="Total"
        />

        <DonutChart
          title="Sales by Formulation"
          total={5324}
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
            {[
              { icon: <FiDollarSign />, color: "#27b77a", bg: "rgba(39,183,122,0.1)", label: "Total Stock Value", value: "₹8,75,420" },
              { icon: <FiPackage />, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "Total Stock (Units)", value: "18,642" },
              { icon: <FiTrendingUp />, color: "#e89b00", bg: "rgba(232,155,0,0.1)", label: "Fast Moving Items", value: "132", sub: "(21.3%)" },
              { icon: <FiActivity />, color: "#6366f1", bg: "rgba(99,102,241,0.1)", label: "Slow Moving Items", value: "68", sub: "(10.9%)" },
              { icon: <FiAlertTriangle />, color: "#e5484d", bg: "rgba(229,72,77,0.1)", label: "Dead Stock Items", value: "14", sub: "(2.2%)" },
            ].map((item, i) => (
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
            {[
              { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", text: "Paracetamol 500 mg is the top selling medicine this week." },
              { color: "#e89b00", bg: "rgba(232,155,0,0.1)", text: "24 medicines are below reorder level. Please take action." },
              { color: "#e5484d", bg: "rgba(229,72,77,0.1)", text: "6 medicines are expiring within next 30 days." },
              { color: "#27b77a", bg: "rgba(39,183,122,0.1)", text: "Overall medicine sales increased by 22.6% compared to last week." },
            ].map((item, i) => (
              <div key={i} className="flex gap-2.5 p-2.5 rounded-xl" style={{ background: item.bg }}>
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${item.color}20` }}
                >
                  <span style={{ color: item.color }} className="text-[10px] font-bold">
                    {i === 0 ? "ℹ" : i === 1 ? "⚠" : i === 2 ? "⚠" : "↑"}
                  </span>
                </div>
                <p className="text-[12px] text-[#100e1c] leading-[17px] dark:text-white">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
          <button className="mt-3 text-[#0a6c74] text-[13px] font-medium flex items-center gap-1 hover:opacity-80 dark:text-[#9be7dc]">
            View Full Insights →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30">
            <span className="text-blue-600 text-[10px]">ℹ</span>
          </div>
          <span>All medicine data is updated in real-time. Last updated: May 18, 2025 11:59 PM</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center dark:bg-green-900/30">
            <span className="text-green-600 text-[10px]">✓</span>
          </div>
          <span>Data Accuracy: 98.6%</span>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default MedicineReports;
