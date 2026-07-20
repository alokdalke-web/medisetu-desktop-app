import React, { useState, useCallback, useMemo } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiPercent,
  FiCalendar,
  FiTrendingUp,
  FiClock,
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

const StaffReports: React.FC = () => {
  // ─── Filter Configuration ───────────────────────────────────────────────────
  const filterFields: FilterField[] = [
    {
      id: "department",
      label: "Department",
      type: "select",
      placeholder: "All Departments",
      options: [
        { label: "Medical", value: "medical" },
        { label: "Nursing", value: "nursing" },
        { label: "Lab", value: "lab" },
        { label: "Pharmacy", value: "pharmacy" },
        { label: "Reception", value: "reception" },
      ],
    },
    {
      id: "role",
      label: "Role",
      type: "select",
      placeholder: "All Roles",
      options: [
        { label: "Doctor", value: "doctor" },
        { label: "Nurse", value: "nurse" },
        { label: "Lab Technician", value: "lab-tech" },
        { label: "Pharmacist", value: "pharmacist" },
        { label: "Receptionist", value: "receptionist" },
      ],
    },
  ];

  const [_activeFilters, setActiveFilters] = useState<ReportFilters | null>(null);

  const handleFilterApply = useCallback((filters: ReportFilters) => {
    setActiveFilters(filters);
    console.log("Applied filters:", filters);
  }, []);

  // ─── Period Selectors State ─────────────────────────────────────────────────
  const [trendPeriod, setTrendPeriod] = useState<string>("daily");
  const [workloadPeriod, setWorkloadPeriod] = useState<string>("thisWeek");
  const [leavesPeriod, setLeavesPeriod] = useState<string>("thisMonth");
  const [heatmapPeriod, setHeatmapPeriod] = useState<string>("thisMonth");

  // ─── Sample Data ────────────────────────────────────────────────────────────
  const staffPerformanceTrendData = {
    labels: ["May 1", "May 4", "May 7", "May 10", "May 13", "May 16", "May 18"],
    currentPeriod: [75, 80, 78, 85, 82, 88, 86],
    previousPeriod: [65, 70, 68, 72, 70, 75, 73],
  };

  const staffByRoleData = [
    { label: "Doctors", value: 8, percentage: "28.6%", color: "#3b82f6" },
    { label: "Nurses", value: 9, percentage: "32.1%", color: "#10b981" },
    { label: "Receptionists", value: 4, percentage: "14.3%", color: "#f59e0b" },
    { label: "Lab Technicians", value: 3, percentage: "10.7%", color: "#8b5cf6" },
    { label: "Pharmacists", value: 2, percentage: "7.1%", color: "#ef4444" },
    { label: "Others", value: 2, percentage: "7.1%", color: "#6b7280" },
  ];

  const attendanceOverviewData = [
    { label: "Present", value: 539, percentage: "94.6%", color: "#10b981" },
    { label: "Absent", value: 22, percentage: "3.8%", color: "#ef4444" },
    { label: "Late", value: 9, percentage: "1.6%", color: "#f59e0b" },
  ];

  const topPerformingStaffData = [
    { staffName: "Dr. Amit Sharma", role: "Doctor", appointments: 210, performance: "98%" },
    { staffName: "Dr. Pooja Verma", role: "Doctor", appointments: 168, performance: "95%" },
    { staffName: "Sister Neha Singh", role: "Nurse", appointments: 146, performance: "93%" },
    { staffName: "Rahul Gupta", role: "Lab Technician", appointments: 138, performance: "92%" },
    { staffName: "Vivek Patel", role: "Pharmacist", appointments: 112, performance: "90%" },
  ];

  const staffWorkloadData = [
    { name: "Dr. Amit Sharma", current: 23, max: 25 },
    { name: "Dr. Pooja Verma", current: 19, max: 25 },
    { name: "Sister Neha Singh", current: 16, max: 20 },
    { name: "Rahul Gupta", current: 14, max: 20 },
    { name: "Vivek Patel", current: 11, max: 20 },
  ];

  // Heatmap data (seeded, not random)
  const heatmapData = useMemo(() => {
    const statuses = ["present", "present", "present", "present", "late", "absent", "off"];
    return Array.from({ length: 5 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => statuses[(week * 7 + day * 3) % statuses.length])
    );
  }, []);

  const heatmapColors: Record<string, string> = {
    present: "bg-[#10b981]",
    late: "bg-[#f59e0b]",
    absent: "bg-[#ef4444]",
    off: "bg-[#e5e7eb] dark:bg-[#273244]",
  };

  return (
    <ReportsLayout
      title="Staff Reports"
      subtitle="Analyze staff performance, productivity and workload."
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
          icon={<FiUsers className="text-[#3b82f6] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          label="Total Staff"
          value="28"
          change="7.7%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30"
        />
        <PatientMetricCard
          icon={<FiUserCheck className="text-[#27b77a] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(39,183,122,0.1)]"
          label="Active Staff"
          value="24"
          change="9.1%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30"
        />
        <PatientMetricCard
          icon={<FiPercent className="text-[#0F766E] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(15,118,110,0.1)]"
          label="Avg. Attendance"
          value="94.6%"
          change="4.3%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30"
        />
        <PatientMetricCard
          icon={<FiCalendar className="text-[#e89b00] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(232,155,0,0.1)]"
          label="Total Leaves"
          value="7"
          change="2"
          changeType="decrease"
          subtitle="vs Apr 13 – Apr 30"
        />
        <PatientMetricCard
          icon={<FiTrendingUp className="text-[#6366f1] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(99,102,241,0.1)]"
          label="Avg. Productivity"
          value="86.3%"
          change="6.8%"
          changeType="increase"
          subtitle="vs Apr 13 – Apr 30"
        />
        <PatientMetricCard
          icon={<FiClock className="text-[#e5484d] h-[18px] w-[18px]" />}
          iconBgColor="bg-[rgba(229,72,77,0.1)]"
          label="Overtime Hours"
          value="48h 20m"
          change="5h 10m"
          changeType="decrease"
          subtitle="vs Apr 13 – Apr 30"
        />
      </div>

      {/* Charts Row 1: Performance Trend + Staff by Role + Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <LineChart
          title="Staff Performance Trend"
          data={staffPerformanceTrendData}
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
          title="Staff by Role"
          total={28}
          items={staffByRoleData}
          centerLabel="Total"
        />

        <DonutChart
          title="Attendance Overview"
          total={570}
          items={attendanceOverviewData}
          centerLabel="Avg. Attendance"
        />
      </div>

      {/* Charts Row 2: Top Performing + Workload + Leaves + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Top Performing Staff */}
        <DataTable
          title="Top Performing Staff"
          columns={[
            { key: "staffName", label: "Staff Name", align: "left" },
            { key: "role", label: "Role", align: "left" },
            { key: "appointments", label: "Appts", align: "right" },
            { key: "performance", label: "Perf.", align: "right" },
          ]}
          data={topPerformingStaffData}
          onViewAll={() => console.log("View all staff")}
          viewAllText="View All Staff Performance"
        />

        {/* Staff Workload - Bar Chart */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 flex flex-col dark:bg-[#111726] dark:border-[#273244]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-[16px] font-semibold text-[#100e1c] whitespace-nowrap dark:text-white">
              Staff Workload
            </h3>
            <div className="shrink-0">
              <Select
                aria-label="Period"
                selectedKeys={new Set([workloadPeriod])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  if (key) setWorkloadPeriod(key);
                }}
                size="sm"
                radius="lg"
                classNames={{
                  trigger:
                    "h-7 min-h-7 w-[95px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                  value: "text-[11px] text-[#100e1c] dark:text-white",
                  popoverContent: "dark:bg-[#111726]",
                }}
                variant="bordered"
              >
                <SelectItem key="thisWeek">This Week</SelectItem>
                <SelectItem key="lastWeek">Last Week</SelectItem>
              </Select>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {staffWorkloadData.map((staff, i) => {
              const pct = Math.round((staff.current / staff.max) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-[#100e1c] truncate dark:text-white">{staff.name}</span>
                    <span className="text-[11px] text-[#677294] shrink-0 ml-2 dark:text-white/60">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden dark:bg-[#273244]">
                      <div
                        className="h-full rounded-full bg-[#0F766E]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#677294] w-[40px] text-right dark:text-white/50">
                      {staff.current}/{staff.max}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaves Summary */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-[16px] font-semibold text-[#100e1c] whitespace-nowrap dark:text-white">
              Leaves Summary
            </h3>
            <div className="shrink-0">
              <Select
                aria-label="Period"
                selectedKeys={new Set([leavesPeriod])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  if (key) setLeavesPeriod(key);
                }}
                size="sm"
                radius="lg"
                classNames={{
                  trigger:
                    "h-7 min-h-7 w-[100px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                  value: "text-[11px] text-[#100e1c] dark:text-white",
                  popoverContent: "dark:bg-[#111726]",
                }}
                variant="bordered"
              >
                <SelectItem key="thisMonth">This Month</SelectItem>
                <SelectItem key="lastMonth">Last Month</SelectItem>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Casual Leave", value: 4, color: "#3b82f6" },
              { label: "Sick Leave", value: 2, color: "#e89b00" },
              { label: "Earned Leave", value: 3, color: "#27b77a" },
              { label: "Maternity Leave", value: 1, color: "#6366f1" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-[#677294] dark:text-white/60">{item.label}</span>
                <span className="text-[13px] font-semibold text-[#100e1c] ml-auto dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#f1f5f9] pt-3 dark:border-[#273244]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#677294] dark:text-white/60">Total Leaves</span>
              <span className="text-[18px] font-bold text-[#100e1c] dark:text-white">10</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden dark:bg-[#273244]">
                <div className="bg-[#0F766E] h-full rounded-full" style={{ width: "35%" }} />
              </div>
              <span className="text-[11px] font-medium text-[#100e1c] dark:text-white">35%</span>
            </div>
            <p className="text-[10px] text-[#677294] mt-1 dark:text-white/50">of staff on leave</p>
          </div>
        </div>

        {/* Attendance Heatmap */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-[16px] font-semibold text-[#100e1c] whitespace-nowrap dark:text-white">
              Attendance Heatmap
            </h3>
            <div className="shrink-0">
              <Select
                aria-label="Period"
                selectedKeys={new Set([heatmapPeriod])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  if (key) setHeatmapPeriod(key);
                }}
                size="sm"
                radius="lg"
                classNames={{
                  trigger:
                    "h-7 min-h-7 w-[100px] border border-[rgba(207,207,207,0.6)] bg-white shadow-none data-[hover=true]:border-[#0a6c74]/40 dark:bg-[#172033] dark:border-[#273244]",
                  value: "text-[11px] text-[#100e1c] dark:text-white",
                  popoverContent: "dark:bg-[#111726]",
                }}
                variant="bordered"
              >
                <SelectItem key="thisMonth">This Month</SelectItem>
                <SelectItem key="lastMonth">Last Month</SelectItem>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            {/* Header */}
            <div className="flex items-center gap-1.5">
              <span className="w-[42px] text-[10px] text-[#677294] dark:text-white/50" />
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="flex-1 text-center text-[9px] text-[#677294] dark:text-white/50">{d}</span>
              ))}
            </div>
            {/* Weeks */}
            {heatmapData.map((week, wi) => (
              <div key={wi} className="flex items-center gap-1.5">
                <span className="w-[42px] text-[10px] text-[#677294] dark:text-white/50">Week {wi + 1}</span>
                {week.map((status, di) => (
                  <div
                    key={di}
                    className={`flex-1 h-6 rounded-[4px] ${heatmapColors[status]}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] mt-3 pt-3 border-t border-[#f1f5f9] dark:border-[#273244]">
            {[
              { label: "Present", color: "bg-[#10b981]" },
              { label: "Late", color: "bg-[#f59e0b]" },
              { label: "Absent", color: "bg-[#ef4444]" },
              { label: "Off", color: "bg-[#e5e7eb] dark:bg-[#273244]" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-[2px] ${item.color}`} />
                <span className="text-[#677294] dark:text-white/60">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Summary + Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Department Summary */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-4 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
          <h3 className="text-[16px] font-semibold text-[#100e1c] mb-5 dark:text-white">
            Department Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: "Doctors", count: 8, pct: "95.2%", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
              { name: "Nurses", count: 9, pct: "93.1%", color: "#27b77a", bg: "rgba(39,183,122,0.1)" },
              { name: "Receptionists", count: 4, pct: "96.4%", color: "#e89b00", bg: "rgba(232,155,0,0.1)" },
              { name: "Lab Technicians", count: 3, pct: "92.0%", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
              { name: "Pharmacists", count: 2, pct: "94.3%", color: "#e5484d", bg: "rgba(229,72,77,0.1)" },
            ].map((dept, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ background: dept.bg }}
                >
                  <FiUsers style={{ color: dept.color }} className="h-5 w-5" />
                </div>
                <p className="text-[11px] text-[#677294] dark:text-white/60">{dept.name}</p>
                <p className="text-[20px] font-semibold text-[#100e1c] dark:text-white">{dept.count}</p>
                <p className="text-[10px] text-[#677294] dark:text-white/50">{dept.pct}</p>
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
              { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", text: "Overall staff productivity increased by 6.8% compared to previous period." },
              { color: "#27b77a", bg: "rgba(39,183,122,0.1)", text: "Dr. Amit Sharma is the top performing staff with 98% performance score." },
              { color: "#e89b00", bg: "rgba(232,155,0,0.1)", text: "Absenteeism rate decreased by 1.2% compared to previous period." },
            ].map((item, i) => (
              <div key={i} className="flex gap-2.5 p-2.5 rounded-xl" style={{ background: item.bg }}>
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${item.color}30` }}
                >
                  <span style={{ color: item.color }} className="text-[10px] font-bold">
                    {i === 0 ? "↑" : i === 1 ? "★" : "↓"}
                  </span>
                </div>
                <p className="text-[12px] text-[#100e1c] leading-[17px] dark:text-white">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#677294] py-3 dark:text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center dark:bg-blue-900/30">
            <span className="text-blue-600 text-[10px]">ℹ</span>
          </div>
          <span>All staff data is updated in real-time. Last updated: May 18, 2025 11:59 PM</span>
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

export default StaffReports;
