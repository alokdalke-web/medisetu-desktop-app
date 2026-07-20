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
import { useGetDoctorQuery } from "../../redux/api/doctorApi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";

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
  ], [departmentOptions, doctorOptions]);

  const [_activeFilters, setActiveFilters] = useState<ReportFilters | null>(null);

  const handleFilterApply = useCallback((filters: ReportFilters) => {
    setActiveFilters(filters);
    console.log("Applied filters:", filters);
  }, []);

  // ─── Period Selectors State ─────────────────────────────────────────────────
  const [trendPeriod, setTrendPeriod] = useState<string>("daily");

  // ─── Sample Data ────────────────────────────────────────────────────────────
  const revenueTrendData = {
    labels: ["May 1", "May 4", "May 7", "May 10", "May 13", "May 16", "May 18"],
    currentPeriod: [100000, 110000, 105000, 140000, 130000, 150000, 130000],
    previousPeriod: [80000, 85000, 80000, 100000, 95000, 100000, 95000],
  };

  const revenueBreakdownData = [
    { label: "Consultation", value: 342100, percentage: "40.6%", color: "#3b82f6" },
    { label: "Procedures", value: 212850, percentage: "25.3%", color: "#8b5cf6" },
    { label: "Lab Tests", value: 125430, percentage: "14.9%", color: "#10b981" },
    { label: "Medicines", value: 102180, percentage: "12.1%", color: "#f59e0b" },
    { label: "Others", value: 60000, percentage: "7.1%", color: "#ef4444" },
  ];

  const paymentMethodData = [
    { label: "Cash", value: 312450, percentage: "37.1%", color: "#3b82f6" },
    { label: "UPI", value: 268720, percentage: "31.9%", color: "#10b981" },
    { label: "Card", value: 145230, percentage: "17.2%", color: "#8b5cf6" },
    { label: "Insurance", value: 95400, percentage: "11.3%", color: "#f59e0b" },
    { label: "Others", value: 20760, percentage: "2.5%", color: "#ef4444" },
  ];

  const topRevenueServicesData = [
    { service: "Consultation", revenue: "₹3,42,100", percentage: "40.6%" },
    { service: "ECG", revenue: "₹1,28,450", percentage: "15.2%" },
    { service: "Physiotherapy", revenue: "₹1,02,300", percentage: "12.1%" },
    { service: "Blood Test", revenue: "₹78,560", percentage: "9.3%" },
    { service: "X-Ray", revenue: "₹65,200", percentage: "7.7%" },
  ];

  const doctorWiseRevenueData = [
    { doctor: "Dr. Amit Sharma", revenue: "₹3,12,450", percentage: "37.1%" },
    { doctor: "Dr. Pooja Verma", revenue: "₹2,18,760", percentage: "25.9%" },
    { doctor: "Dr. Rahul Gupta", revenue: "₹1,68,320", percentage: "20.0%" },
    { doctor: "Dr. Neha Singh", revenue: "₹85,230", percentage: "10.1%" },
    { doctor: "Dr. Vivek Patel", revenue: "₹57,800", percentage: "6.9%" },
  ];

  const departmentWiseRevenueData = [
    { department: "Cardiology", revenue: "₹3,28,450", percentage: "39.0%" },
    { department: "Physiotherapy", revenue: "₹1,56,200", percentage: "18.5%" },
    { department: "Pathology", revenue: "₹1,25,430", percentage: "14.9%" },
    { department: "General Medicine", revenue: "₹1,15,800", percentage: "13.7%" },
    { department: "Others", revenue: "₹16,680", percentage: "2.0%" },
  ];

  const outstandingAgingData = [
    { agingBracket: "0 - 30 Days", amount: "₹32,450", percentage: "56.6%" },
    { agingBracket: "31 - 60 Days", amount: "₹14,200", percentage: "24.8%" },
    { agingBracket: "61 - 90 Days", amount: "₹6,780", percentage: "11.8%" },
    { agingBracket: "90+ Days", amount: "₹3,890", percentage: "6.8%" },
  ];

  const monthlyRevenueData = [
    { month: "Jan", thisYear: 520000, lastYear: 420000 },
    { month: "Feb", thisYear: 580000, lastYear: 460000 },
    { month: "Mar", thisYear: 540000, lastYear: 440000 },
    { month: "Apr", thisYear: 650000, lastYear: 510000 },
    { month: "May", thisYear: 842560, lastYear: 710200 },
    { month: "Jun", thisYear: 0, lastYear: 480000 },
    { month: "Jul", thisYear: 0, lastYear: 520000 },
    { month: "Aug", thisYear: 0, lastYear: 560000 },
    { month: "Sep", thisYear: 0, lastYear: 600000 },
    { month: "Oct", thisYear: 0, lastYear: 640000 },
    { month: "Nov", thisYear: 0, lastYear: 680000 },
    { month: "Dec", thisYear: 0, lastYear: 720000 },
  ];

  return (
    <ReportsLayout
      title="Revenue Reports"
      subtitle="Track financial performance and revenue insights."
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
          icon={<FiDollarSign className="text-[#27b77a] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(39,183,122,0.1)]"
          label="Total Revenue"
          value="₹8,42,560"
          change="18.6%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30, 2025"
        />
        <PatientMetricCard
          icon={<FiCreditCard className="text-[#3b82f6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          label="Amount Collected"
          value="₹7,85,240"
          change="16.4%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30, 2025"
        />
        <PatientMetricCard
          icon={<FiClock className="text-[#e89b00] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(232,155,0,0.1)]"
          label="Pending Amount"
          value="₹57,320"
          change="7.2%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30, 2025"
        />
        <PatientMetricCard
          icon={<FiFileText className="text-[#6366f1] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(99,102,241,0.1)]"
          label="Avg. Invoice Value"
          value="₹1,248"
          change="9.8%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30, 2025"
        />
        <PatientMetricCard
          icon={<FiTrendingUp className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Total Invoices"
          value="675"
          change="12.3%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30, 2025"
        />
        <PatientMetricCard
          icon={<FiRefreshCw className="text-[#e5484d] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(229,72,77,0.1)]"
          label="Refunds"
          value="₹8,320"
          change="5.6%"
          changeType="decrease"
          subtitle="vs Apr 13 – Apr 30, 2025"
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
                if (key) setTrendPeriod(key);
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
          total={842560}
          items={revenueBreakdownData}
          centerLabel="Total"
        />

        <DonutChart
          title="Revenue by Payment Method"
          total={842560}
          items={paymentMethodData}
          centerLabel="Total"
        />
      </div>

      {/* Charts Row 2: Services + Doctors + Departments + Outstanding */}
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
          onViewAll={() => console.log("View all doctors")}
          viewAllText="View All Doctors"
        />

        <DataTable
          title="Department-wise Revenue"
          columns={[
            { key: "department", label: "Department", align: "left" },
            { key: "revenue", label: "Revenue", align: "right" },
            { key: "percentage", label: "% of Total", align: "right" },
          ]}
          data={departmentWiseRevenueData}
          onViewAll={() => console.log("View all departments")}
          viewAllText="View All Departments"
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
                formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
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
            YTD (Jan 1 – May 18, 2025)
          </p>
          <div className="text-[24px] font-bold text-[#100e1c] dark:text-white">₹36,85,210</div>
          <div className="flex items-center gap-1.5 text-[12px] mt-1">
            <span className="text-[#27b77a] font-medium">↑ 19.3%</span>
            <span className="text-[#677294] dark:text-white/60">vs last year</span>
          </div>
          <div className="mt-2 text-[12px] text-[#677294] dark:text-white/60">
            Last Year: <span className="font-semibold text-[#100e1c] dark:text-white">₹30,89,450</span>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <p className="text-[12px] text-[#677294] mb-1 dark:text-white/60">
            YTD Collected
          </p>
          <div className="text-[24px] font-bold text-[#100e1c] dark:text-white">₹34,12,760</div>
          <div className="flex items-center gap-1.5 text-[12px] mt-1">
            <span className="text-[#27b77a] font-medium">↑ 17.6%</span>
            <span className="text-[#677294] dark:text-white/60">vs last year</span>
          </div>
          <div className="mt-2 text-[12px] text-[#677294] dark:text-white/60">
            Last Year: <span className="font-semibold text-[#100e1c] dark:text-white">₹29,03,200</span>
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
              <p className="text-[12px] text-[#677294] mt-1 leading-[17px] dark:text-white/70">
                Revenue is higher on Wednesdays and Thursdays.
              </p>
              <p className="text-[12px] text-[#677294] mt-0.5 leading-[17px] dark:text-white/70">
                Consultation revenue increased by 18.6%.
              </p>
              <button className="mt-2 text-[#0a6c74] text-[12px] font-medium flex items-center gap-1 hover:opacity-80 dark:text-[#9be7dc]">
                View Full Insights →
              </button>
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
          <span>All revenue data is updated in real-time. Last updated: May 18, 2025 11:59 PM</span>
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

export default RevenueReports;
