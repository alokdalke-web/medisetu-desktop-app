import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MdOutlineBiotech } from "react-icons/md";
import { FiBarChart2, FiFileText } from "react-icons/fi";
import { TbCurrencyRupee } from "react-icons/tb";
import type { LabOverviewData } from "../types";

type LabOverviewCardProps = {
  data: LabOverviewData;
};

const LabOverviewCard: React.FC<LabOverviewCardProps> = ({ data }) => {
  const calculatedTotalTests = React.useMemo(() => {
    return (data.statusOverview ?? []).reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  }, [data.statusOverview]);

  const hasData = React.useMemo(() => {
    return (data.statusOverview ?? []).some(x => (Number(x.value) || 0) > 0);
  }, [data.statusOverview]);

  const statusOverviewData = React.useMemo(() => {
    if (!hasData || (data.statusOverview ?? []).length === 0) {
      return [
        { label: "No Data", value: 1, color: "#E2E8F0" }
      ];
    }
    return data.statusOverview;
  }, [data.statusOverview, hasData]);

  const kpis = [
    {
      label: "Total Tests",
      value: data.totalTests,
      icon: <MdOutlineBiotech className="text-lg" />,
      bg: "bg-[#EEF2F6] text-[#4F46E5] dark:bg-[#1E1B4B]",
    },
    {
      label: "Tests Today",
      value: data.testsToday,
      icon: <FiBarChart2 className="text-lg" />,
      bg: "bg-[#F0FDF4] text-[#16A34A] dark:bg-[#14532D]",
    },
    {
      label: "Revenue (This Month)",
      value: `₹${data.revenue.toLocaleString("en-IN")}`,
      icon: <TbCurrencyRupee className="text-lg" />,
      bg: "bg-[#FFFBEB] text-[#D97706] dark:bg-[#78350F]",
    },
    {
      label: "Pending Reports",
      value: data.pendingReports,
      icon: <FiFileText className="text-lg" />,
      bg: "bg-[#FEF2F2] text-[#DC2626] dark:bg-[#7F1D1D]",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-default-100 dark:bg-background sm:p-6 flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-2">
        <MdOutlineBiotech className="text-teal-600 text-xl" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
          Laboratory Overview
        </h3>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-default-100/50"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kpi.bg}`}>
              {kpi.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-400 dark:text-default-400 uppercase tracking-wider">
                {kpi.label}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {kpi.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Chart & Categories Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Top Test Categories */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-default-200">
            Top Test Categories
          </h4>
          <div className="space-y-3.5">
            {data.topCategories.map((category, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium text-slate-700 dark:text-default-300">
                      {category.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {category.percentage}%
                  </span>
                </div>
                {/* Custom Progress Bar Line */}
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-default-50">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${category.percentage}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Status Overview (Donut Chart) */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-default-200">
            Test Status Overview
          </h4>
          <div className="flex items-center justify-between gap-4 mt-2">
            {/* Donut Chart Container */}
            <div className="relative h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusOverviewData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={hasData ? 3 : 0}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {statusOverviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Absolute Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-slate-800 dark:text-white leading-none">
                  {calculatedTotalTests}
                </span>
                <span className="text-[9px] text-slate-400 font-medium mt-1">
                  Total Tests
                </span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex flex-col gap-2.5 flex-1 min-w-0">
              {data.statusOverview.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-500 truncate dark:text-default-400">
                      {item.label}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-white shrink-0">
                    {item.value}{" "}
                    <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabOverviewCard;
