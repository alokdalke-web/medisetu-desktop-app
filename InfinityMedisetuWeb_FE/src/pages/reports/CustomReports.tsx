import React, { useState } from "react";
import {
  FiSave,
  FiCalendar,
  FiDownload,
  FiPlay,
  FiSearch,
  FiPlus,
  FiX,
  FiEdit2,
  FiMoreVertical,
  FiStar,
  FiCheck,
} from "react-icons/fi";
import { Button, Select, SelectItem } from "@heroui/react";
import DonutChart from "../../components/reports/DonutChart";
import LineChart from "../../components/reports/LineChart";
import ReportsLayout from "../../components/reports/ReportsLayout";

interface MetricGroup {
  category: string;
  metrics: { id: string; label: string; checked: boolean }[];
}

const CustomReports: React.FC = () => {
  const [metricsGroups, setMetricsGroups] = useState<MetricGroup[]>([
    {
      category: "APPOINTMENTS",
      metrics: [
        { id: "total-appointments", label: "Total Appointments", checked: true },
        { id: "completed-appointments", label: "Completed Appointments", checked: true },
        { id: "no-show-appointments", label: "No Show Appointments", checked: true },
        { id: "rescheduled-appointments", label: "Rescheduled Appointments", checked: false },
      ],
    },
    {
      category: "REVENUE",
      metrics: [
        { id: "total-revenue", label: "Total Revenue", checked: false },
        { id: "avg-consultation-fee", label: "Average Consultation Fee", checked: false },
        { id: "amount-collected", label: "Amount Collected", checked: false },
        { id: "pending-amount", label: "Pending Amount", checked: false },
        { id: "refunds", label: "Refunds", checked: false },
      ],
    },
  ]);

  const [appliedFilters, setAppliedFilters] = useState([
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
    { id: "no-show", label: "No Show" },
  ]);

  const [advancedOptions, setAdvancedOptions] = useState({
    showPercentage: true,
    showGrowth: true,
    includeZeroValues: false,
    roundValues: true,
  });

  const handleMetricChange = (groupIndex: number, metricId: string) => {
    const newGroups = [...metricsGroups];
    const metric = newGroups[groupIndex].metrics.find((m) => m.id === metricId);
    if (metric) {
      metric.checked = !metric.checked;
      setMetricsGroups(newGroups);
    }
  };

  const removeFilter = (id: string) => {
    setAppliedFilters(appliedFilters.filter((f) => f.id !== id));
  };

  const toggleOption = (key: keyof typeof advancedOptions) => {
    setAdvancedOptions({ ...advancedOptions, [key]: !advancedOptions[key] });
  };

  // Sample data for results
  const previewData = [
    { doctor: "Dr. Amit Sharma", totalAppointments: 128, completed: 98, cancelled: 20, noShow: 10, cancellationRate: "15.6%", totalRevenue: "1,24,600" },
    { doctor: "Dr. Pooja Verma", totalAppointments: 96, completed: 76, cancelled: 12, noShow: 8, cancellationRate: "12.5%", totalRevenue: "96,800" },
    { doctor: "Dr. Rahul Gupta", totalAppointments: 82, completed: 64, cancelled: 10, noShow: 8, cancellationRate: "12.2%", totalRevenue: "78,400" },
    { doctor: "Dr. Neha Singh", totalAppointments: 48, completed: 40, cancelled: 6, noShow: 2, cancellationRate: "12.5%", totalRevenue: "56,200" },
    { doctor: "Dr. Vivek Patel", totalAppointments: 36, completed: 30, cancelled: 4, noShow: 2, cancellationRate: "11.1%", totalRevenue: "38,600" },
  ];

  const appointmentsTrendData = {
    labels: ["May 1", "May 4", "May 7", "May 10", "May 13", "May 16", "May 18"],
    currentPeriod: [60, 80, 70, 85, 90, 75, 88],
    previousPeriod: [50, 60, 55, 70, 75, 65, 70],
  };

  const statusDistributionData = [
    { label: "Completed", value: 308, percentage: "79.0%", color: "#10b981" },
    { label: "Cancelled", value: 52, percentage: "13.3%", color: "#f59e0b" },
    { label: "No Show", value: 30, percentage: "7.7%", color: "#ef4444" },
  ];

  const typeDistributionData = [
    { label: "New Consultation", value: 210, percentage: "53.8%", color: "#3b82f6" },
    { label: "Follow Up", value: 140, percentage: "35.9%", color: "#10b981" },
    { label: "Procedure", value: 40, percentage: "10.3%", color: "#8b5cf6" },
  ];

  const savedReports = [
    {
      name: "Doctor Performance Overview",
      type: "Appointments",
      lastRun: "May 18, 2025 11:30 AM",
      starred: false,
    },
    {
      name: "Revenue by Department",
      type: "Revenue",
      lastRun: "May 18, 2025 10:15 AM",
      starred: false,
    },
    {
      name: "Patient Visit Summary",
      type: "Patients",
      lastRun: "May 17, 2025 09:20 PM",
      starred: false,
    },
    {
      name: "Monthly Appointment Analysis",
      type: "Appointments",
      lastRun: "May 16, 2025 06:40 PM",
      starred: false,
    },
  ];

  return (
    <ReportsLayout
      title="Custom Reports"
      subtitle="Build powerful reports tailored to your clinic's needs. Choose data, apply filters, visualize and export."
    >
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="bordered"
          className="border-[rgba(207,207,207,0.6)] dark:border-[#273244]"
          startContent={<FiSave />}
          size="sm"
        >
          Save Report
        </Button>
        <Button
          variant="bordered"
          className="border-[rgba(207,207,207,0.6)] dark:border-[#273244]"
          startContent={<FiSave />}
          size="sm"
        >
          Save As
        </Button>
        <Button
          variant="bordered"
          className="border-[rgba(207,207,207,0.6)] dark:border-[#273244]"
          startContent={<FiCalendar />}
          size="sm"
        >
          Schedule
        </Button>
        <Button
          color="primary"
          className="bg-primary text-white"
          startContent={<FiDownload />}
          size="sm"
        >
          Export
        </Button>
      </div>

      {/* Builder Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Data Source & Metrics */}
        <div className="space-y-5">
          {/* Step 1: Select Data Source */}
          <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                Select Data Source
              </h3>
            </div>
            <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
              <option>Appointments</option>
              <option>Patients</option>
              <option>Revenue</option>
              <option>Medicines</option>
              <option>Staff</option>
            </select>
          </div>

          {/* Step 2: Choose Metrics */}
          <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                Choose Metrics
              </h3>
            </div>

            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search metrics..."
                className="w-full pl-9 pr-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-[#172033] dark:border-[#273244] dark:text-white"
              />
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto">
              {metricsGroups.map((group, groupIndex) => (
                <div key={group.category}>
                  <p className="text-[11px] font-semibold text-slate-500 mb-2 dark:text-white/60">
                    {group.category}
                  </p>
                  <div className="space-y-2">
                    {group.metrics.map((metric) => (
                      <label
                        key={metric.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={metric.checked}
                          onChange={() => handleMetricChange(groupIndex, metric.id)}
                          className="w-4 h-4 rounded border-[rgba(207,207,207,0.6)] text-primary focus:ring-primary"
                        />
                        <span className="text-[13px] text-[#100e1c] dark:text-white">
                          {metric.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[rgba(207,207,207,0.6)] rounded-lg text-[13px] text-slate-600 hover:bg-[#f8f9fb] dark:border-[#273244] dark:text-white dark:hover:bg-[#172033]">
              <FiPlus />
              Add Custom Metric
            </button>
          </div>
        </div>

        {/* Middle/Right Columns: Filters and Configuration */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 3: Apply Filters */}
          <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                  Apply Filters
                </h3>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-1.5 text-[13px] text-slate-600 hover:bg-[#f8f9fb] rounded-lg dark:text-white dark:hover:bg-[#172033]">
                  Reset
                </button>
                <Button
                  color="primary"
                  className="bg-primary text-white"
                  startContent={<FiPlay />}
                  size="sm"
                >
                  Run Report
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Date Range
                </label>
                <input
                  type="text"
                  defaultValue="May 1, 2025 - May 18, 2025"
                  className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#172033] dark:border-[#273244] dark:text-white"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Compare With
                </label>
                <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>Previous Period</option>
                  <option>Last Year</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Department
                </label>
                <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>All Departments</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Doctor
                </label>
                <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>All Doctors</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Patient
                </label>
                <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>All Patients</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Appointment Status
                </label>
                <div className="flex flex-wrap gap-1.5 px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl min-h-[42px] dark:border-[#273244]">
                  {appliedFilters.map((filter) => (
                    <span
                      key={filter.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[12px] dark:bg-teal-900/30 dark:text-teal-300"
                    >
                      {filter.label}
                      <button onClick={() => removeFilter(filter.id)}>
                        <FiX className="text-xs" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Appointment Type
                </label>
                <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>All</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                  Payment Status
                </label>
                <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>All</option>
                </select>
              </div>
            </div>

            <button className="mt-4 flex items-center gap-2 px-3 py-2 border border-dashed border-[rgba(207,207,207,0.6)] rounded-lg text-[13px] text-slate-600 hover:bg-[#f8f9fb] dark:border-[#273244] dark:text-white dark:hover:bg-[#172033]">
              <FiPlus />
              Add Filter
            </button>
          </div>

          {/* Steps 4 & 5: Group By and Sort By */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                  Group By
                </h3>
              </div>
              <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white mb-3 dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                <option>Doctor</option>
                <option>Department</option>
                <option>Patient</option>
              </select>
              <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                Then By (Optional)
              </label>
              <select className="w-full px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                <option>Appointment Type</option>
              </select>
            </div>

            <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                  5
                </div>
                <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                  Sort By
                </h3>
              </div>
              <div className="flex gap-2 mb-3">
                <select className="flex-1 px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>Total Appointments</option>
                </select>
                <select className="px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>Descending</option>
                  <option>Ascending</option>
                </select>
              </div>
              <label className="text-[12px] font-medium text-[#677294] mb-1.5 block dark:text-white">
                Then By (Optional)
              </label>
              <div className="flex gap-2">
                <select className="flex-1 px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>Total Revenue</option>
                </select>
                <select className="px-3 py-2 border border-[rgba(207,207,207,0.6)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-[#172033] dark:border-[#273244] dark:text-white">
                  <option>Descending</option>
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
              <h3 className="text-[16px] font-semibold text-[#100e1c] mb-4 dark:text-white">
                Advanced Options
              </h3>
              <div className="space-y-3">
                {[
                  { key: "showPercentage", label: "Show Percentage" },
                  { key: "showGrowth", label: "Show Growth" },
                  { key: "includeZeroValues", label: "Include Zero Values" },
                  { key: "roundValues", label: "Round Values" },
                ].map((option) => (
                  <div key={option.key} className="flex items-center justify-between">
                    <span className="text-[13px] text-[#100e1c] dark:text-white">
                      {option.label}
                    </span>
                    <button
                      onClick={() => toggleOption(option.key as keyof typeof advancedOptions)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        advancedOptions[option.key as keyof typeof advancedOptions]
                          ? "bg-primary"
                          : "bg-slate-300 dark:bg-[#273244]"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          advancedOptions[option.key as keyof typeof advancedOptions]
                            ? "left-[22px]"
                            : "left-0.5"
                        }`}
                      ></div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 6: Preview & Results */}
      <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
            6
          </div>
          <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
            Preview & Results
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7ea] dark:border-[#273244]">
                <th className="pb-3 text-left font-medium text-[#677294] dark:text-white/70">Doctor</th>
                <th className="pb-3 text-right font-medium text-[#677294] dark:text-white/70">Total Appointments</th>
                <th className="pb-3 text-right font-medium text-[#677294] dark:text-white/70">Completed</th>
                <th className="pb-3 text-right font-medium text-[#677294] dark:text-white/70">Cancelled</th>
                <th className="pb-3 text-right font-medium text-[#677294] dark:text-white/70">No Show</th>
                <th className="pb-3 text-right font-medium text-[#677294] dark:text-white/70">Cancellation %</th>
                <th className="pb-3 text-right font-medium text-[#677294] dark:text-white/70">Total Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i} className="border-b border-[#f1f5f9] dark:border-[#273244]/50">
                  <td className="py-3 text-[#100e1c] dark:text-white">{row.doctor}</td>
                  <td className="py-3 text-right text-[#100e1c] dark:text-white">{row.totalAppointments}</td>
                  <td className="py-3 text-right text-[#100e1c] dark:text-white">{row.completed}</td>
                  <td className="py-3 text-right text-[#100e1c] dark:text-white">{row.cancelled}</td>
                  <td className="py-3 text-right text-[#100e1c] dark:text-white">{row.noShow}</td>
                  <td className="py-3 text-right text-[#100e1c] dark:text-white">{row.cancellationRate}</td>
                  <td className="py-3 text-right text-[#100e1c] dark:text-white">{row.totalRevenue}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[rgba(207,207,207,0.6)] font-semibold dark:border-[#273244]">
                <td className="py-3 text-[#100e1c] dark:text-white">Total</td>
                <td className="py-3 text-right text-[#100e1c] dark:text-white">390</td>
                <td className="py-3 text-right text-[#100e1c] dark:text-white">308</td>
                <td className="py-3 text-right text-[#100e1c] dark:text-white">52</td>
                <td className="py-3 text-right text-[#100e1c] dark:text-white">30</td>
                <td className="py-3 text-right text-[#100e1c] dark:text-white">13.3%</td>
                <td className="py-3 text-right text-[#100e1c] dark:text-white">₹3,94,600</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-[#677294] dark:text-white/70">Showing 1 to 5 of 5 entries</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-[rgba(207,207,207,0.6)] rounded text-slate-600 hover:bg-[#f8f9fb] dark:border-[#273244] dark:text-white dark:hover:bg-[#172033]">
              ‹
            </button>
            <button className="px-3 py-1 bg-primary text-white rounded">1</button>
            <button className="px-3 py-1 border border-[rgba(207,207,207,0.6)] rounded text-slate-600 hover:bg-[#f8f9fb] dark:border-[#273244] dark:text-white dark:hover:bg-[#172033]">
              ›
            </button>
          </div>
          <select className="px-3 py-1 border border-[rgba(207,207,207,0.6)] rounded text-slate-600 dark:bg-[#172033] dark:border-[#273244] dark:text-white">
            <option>10 / page</option>
            <option>25 / page</option>
            <option>50 / page</option>
          </select>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <LineChart
            title="Appointments Trend"
            data={appointmentsTrendData}
            periodSelector={
              <Select
                aria-label="Period"
                defaultSelectedKeys={new Set(["daily"])}
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
              </Select>
            }
          />
        </div>

        <DonutChart
          title="Appointments Status Distribution"
          total={390}
          items={statusDistributionData}
          centerLabel="Total"
        />

        <DonutChart
          title="Appointments by Type"
          total={390}
          items={typeDistributionData}
          centerLabel="Total"
        />
      </div>

      {/* Suggested Insights & Saved Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Suggested Insights */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-yellow-50 rounded-lg flex items-center justify-center dark:bg-yellow-900/20">
              <FiCheck className="text-yellow-600" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
              Suggested Insights
            </h3>
          </div>
          <div className="space-y-3">
            {[
              "Total appointments increased by 18.6% compared to the previous period.",
              "Dr. Amit Sharma has the highest revenue contribution (31.6%).",
              "No show rate is 7.7%. Consider follow-up reminders to reduce it.",
              "Follow up appointments contribute 35.9% of total appointments.",
            ].map((insight, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0"></div>
                <p className="text-[12px] text-[#100e1c] dark:text-white">{insight}</p>
              </div>
            ))}
          </div>
          <button className="text-[#0a6c74] text-[13px] font-medium flex items-center gap-1 hover:underline mt-4">
            View all insights →
          </button>
        </div>

        {/* Saved Custom Reports */}
        <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-5 dark:bg-[#111726] dark:border-[#273244]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center dark:bg-blue-900/20">
                <FiSave className="text-blue-600" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                Saved Custom Reports
              </h3>
            </div>
            <button className="text-[#0a6c74] text-[13px] font-medium hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {savedReports.map((report, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-3 hover:bg-[#f8f9fb] rounded-lg dark:hover:bg-[#172033]"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FiSave className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate dark:text-white">
                      {report.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[11px] dark:bg-teal-900/30 dark:text-teal-300">
                        {report.type}
                      </span>
                      <span className="text-[11px] text-[#677294] dark:text-white/60">
                        Last run: {report.lastRun}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded dark:hover:bg-[#273244]">
                    <FiPlay className="text-sm" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded dark:hover:bg-[#273244]">
                    <FiEdit2 className="text-sm" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded dark:hover:bg-[#273244]">
                    <FiMoreVertical className="text-sm" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-yellow-500 hover:bg-slate-100 rounded dark:hover:bg-[#273244]">
                    <FiStar className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ReportsLayout>
  );
};

export default CustomReports;
