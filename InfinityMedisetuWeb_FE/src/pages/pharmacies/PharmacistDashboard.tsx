// src/pages/dashboard/PharmacistDashboard.tsx
import React, { useState, useEffect } from "react";
import { BsCapsule, BsTruck } from "react-icons/bs";
import {
  FiAlertCircle,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiAward,
  FiCpu,
  FiPackage,
  FiPlusCircle,
  FiShoppingCart,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router";
import { StatCard } from "../../components/StatCard";
import CustomDateRangePicker from "../dashboard/CustomDateRangePicker";
import DateFilterTabs, { DateTab } from "../dashboard/DateFilterTabs";
import {
  useGetDashboardSummaryQuery,
  useGetSalesOverviewQuery,
  useGetCategoryRevenueQuery,
  useGetTopPerformersQuery,
  useGetAiStockPredictionQuery,
  DashboardPeriod,
} from "../../redux/api/pharmaciesApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import { Select, SelectItem } from "@heroui/react";

// ─── Helper Functions ───
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateRangeLabel(startYmd: string, endYmd: string): string {
  const s = new Date(startYmd + "T00:00:00");
  const e = new Date(endYmd + "T00:00:00");
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()))
    return "Custom";
  const fmt = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" });
    return `${day} ${mon}`;
  };
  const year = e.getFullYear();
  return `${fmt(s)} - ${fmt(e)} ${year}`;
}

function getGreetingName(user?: any): string {
  // Get the user's name from your user data
  const name = user?.name || user?.firstName || user?.username || "Pharmacist";
  return name;
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return "Good morning";
  } else if (hour < 17) {
    return "Good afternoon";
  } else if (hour < 21) {
    return "Good evening";
  } else {
    return "Good night";
  }
}

function getFullGreeting(user?: any): string {
  const greeting = getTimeBasedGreeting();
  const name = getGreetingName(user);
  return `${greeting}, ${name} 👋`;
}

// ─── SalesOverviewChart ───
type SalesTab = "revenue" | "profit" | "orders";

interface SalesOverviewChartProps {
  data: Array<{ label: string; value: number }>;
  period: "week" | "month" | "year";
  onPeriodChange: (period: "week" | "month" | "year") => void;
  onMetricChange: (metric: SalesTab) => void;
  totalValue?: string;
  delta?: number;
  deltaLabel?: string;
  bottomStats?: Array<{ label: string; value: string; delta?: number }>;
}

const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({
  data,
  period,
  onPeriodChange,
  onMetricChange,
  totalValue,
  delta,
  deltaLabel = "vs last week",
  bottomStats,
}) => {
  const [activeTab, setActiveTab] = useState<SalesTab>("revenue");
  const tabs: SalesTab[] = ["revenue", "profit", "orders"];

  const handleTabChange = (tab: SalesTab) => {
    setActiveTab(tab);
    onMetricChange(tab);
  };

  const getTabLabel = (tab: SalesTab) => {
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  };

  return (
    <div className="h-full flex flex-col rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
          Sales Overview
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-3 py-1 text-[11px] font-medium transition-all ${
                  activeTab === tab
                     ? "bg-[#0a6c74] text-white"
                    : "bg-white text-[#677294] hover:bg-slate-50 dark:bg-[#172033] dark:text-slate-300"
                }`}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </div>
          <Select
            size="sm"
            variant="bordered"
            selectedKeys={[period]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as
                | "week"
                | "month"
                | "year";
              onPeriodChange(value);
            }}
            className="w-32"
          >
            <SelectItem key="week">This Week</SelectItem>
            <SelectItem key="month">This Month</SelectItem>
            <SelectItem key="year">This Year</SelectItem>
          </Select>
        </div>
      </div>

      {totalValue && (
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[22px] font-bold text-[#100e1c] dark:text-white">{totalValue}</span>
          {typeof delta === "number" && (
            <span className={`text-[12px] font-medium ${delta >= 0 ? "text-[#27b77a]" : "text-[#e5484d]"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && <span className="text-[12px] text-[#677294]">{deltaLabel}</span>}
        </div>
      )}

      <div className="flex-1 min-h-[150px]">
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => {
              if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
              return `₹${v}`;
            }} />
            <Tooltip
              formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, activeTab]}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #eef2f7",
                borderRadius: "10px",
                boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                color: "#100e1c",
                fontSize: "11px",
              }}
              labelStyle={{ color: "#677294", fontSize: "10px" }}
            />
            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fill="url(#salesFill)" dot={false} activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {bottomStats && bottomStats.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#e5e7ea] dark:border-[#273244] flex flex-wrap gap-4 sm:gap-6">
          {bottomStats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#677294] dark:text-white">{stat.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[14px] font-bold text-[#100e1c] dark:text-white">{stat.value}</span>
                {typeof stat.delta === "number" && (
                  <span className={`text-[10px] font-medium ${stat.delta >= 0 ? "text-[#27b77a]" : "text-[#e5484d]"}`}>
                    {stat.delta >= 0 ? "▲" : "▼"} {Math.abs(stat.delta)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── InventoryHealthCard ───
interface InventoryItem {
  label: string;
  value: number;
  color: string;
}

interface InventoryHealthCardProps {
  items: InventoryItem[];
}

const InventoryHealthCard: React.FC<InventoryHealthCardProps> = ({ items }) => {
  const total = items.reduce((a, b) => a + b.value, 0);

  return (
    <div className="h-full flex flex-col rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white p-5 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <h3 className="text-[16px] font-semibold text-[#100e1c] mb-3 dark:text-white">
        Inventory Health
      </h3>

      <div className="flex items-center gap-4 flex-1">
        <div className="relative shrink-0 h-[130px] w-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items.map(item => ({ ...item, value: item.value }))}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="105%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {items.map((it, idx) => (
                  <Cell key={idx} fill={it.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[22px] font-bold text-[#100e1c] dark:text-white">{total}</span>
            <span className="text-[10px] text-[#677294] dark:text-white">Total Medicines</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 min-w-0 flex-1">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-[12px] text-[#677294] dark:text-white min-w-[80px]">{item.label}</span>
                <span className="text-[12px] font-semibold text-[#100e1c] dark:text-white ml-auto">
                  {item.value} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center rounded-xl border border-[rgba(229,231,234,0.6)] bg-[#f8f9fb] py-2.5 px-1 dark:border-[#273244] dark:bg-[#172033]"
          >
            <span className="text-[18px] font-bold" style={{ color: item.color }}>
              {item.value}
            </span>
            <span className="text-[9px] text-[#677294] dark:text-white text-center leading-tight mt-0.5">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── CriticalAlerts ───
interface AlertItem {
  id: string;
  title: string;
  description: string;
  type: "warning" | "danger" | "info";
}

interface CriticalAlertsProps {
  alerts: AlertItem[];
}

const iconConfig = {
  warning: { bg: "bg-amber-50", text: "text-amber-500" },
  danger: { bg: "bg-red-50", text: "text-red-500" },
  info: { bg: "bg-blue-50", text: "text-blue-500" },
};

const CriticalAlerts: React.FC<CriticalAlertsProps> = ({ alerts }) => {
  return (
    <div className="h-full flex flex-col rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-4 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
          Critical Alerts
        </h3>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {alerts.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {alerts.map((alert) => {
          const cfg = iconConfig[alert.type];
          return (
            <div
              key={alert.id}
              className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-[rgba(229,231,234,0.6)] hover:shadow-sm transition dark:bg-[#0f1728] dark:border-[#273244]"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                <FiAlertCircle className={`h-4 w-4 ${cfg.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#100e1c] dark:text-white leading-tight truncate">
                  {alert.title}
                </p>
                <p className="text-[10px] text-[#677294] leading-tight mt-0.5 truncate">
                  {alert.description}
                </p>
              </div>
              {/* <FiChevronRight className="h-4 w-4 shrink-0 text-slate-300" /> */}
            </div>
          );
        })}
      </div>

      {/* <button className="mt-3 flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
        View All Alerts <FiChevronRight className="h-3 w-3" />
      </button> */}
    </div>
  );
};

// ─── CategoryRevenueChart ───
interface CategoryItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface CategoryRevenueChartProps {
  data: CategoryItem[];
  totalRevenue: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

const CategoryRevenueChart: React.FC<CategoryRevenueChartProps> = ({
  data,
  totalRevenue,
  period,
  onPeriodChange,
}) => {
  return (
    <div className="rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">Category Revenue</h3>
        <Select
          size="sm"
          variant="bordered"
          selectedKeys={[period]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as DashboardPeriod;
            onPeriodChange(value);
          }}
          className="w-36"
        >
          <SelectItem key="thisMonth">This Month</SelectItem>
          <SelectItem key="lastMonth">Last Month</SelectItem>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie
                data={data.map(item => ({ ...item, value: item.value }))}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={52}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((item, i) => (
                  <Cell key={i} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[16px] font-bold text-[#100e1c] dark:text-white">{totalRevenue}</span>
            <span className="text-[9px] text-[#677294]">Total</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 min-w-0 flex-1">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-[#677294] dark:text-white truncate">{item.name}</span>
              <span className="text-[11px] font-bold text-[#100e1c] dark:text-white ml-auto shrink-0 pl-1.5 whitespace-nowrap">
                ₹{item.value.toLocaleString("en-IN")} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── TopPerformers ───
interface PerformerCard {
  type: string;
  label: string;
  name: string;
  value: string;
  subValue: string;
  delta?: number;
  icon?: React.ReactNode;
}

interface TopPerformersProps {
  performers: PerformerCard[];
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

const TopPerformers: React.FC<TopPerformersProps> = ({ performers, period, onPeriodChange }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "topSellingMedicine":
        return <BsCapsule className="h-4 w-4 text-emerald-500" />;
      case "topBrand":
        return <BsTruck className="h-4 w-4 text-blue-500" />;
      case "topProfitMargin":
        return <FiTrendingUp className="h-4 w-4 text-violet-500" />;
      default:
        return <FiAward className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">Top Performers</h3>
        <Select
          size="sm"
          variant="bordered"
          selectedKeys={[period]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as DashboardPeriod;
            onPeriodChange(value);
          }}
          className="w-36"
        >
          <SelectItem key="thisMonth">This Month</SelectItem>
          <SelectItem key="lastMonth">Last Month</SelectItem>
        </Select>
      </div>

      <div className="flex flex-col divide-y divide-[#e5e7ea] dark:divide-[#273244]">
        {performers.map((perf) => {
          const isUp = (perf.delta ?? 0) >= 0;
          return (
            <div key={perf.type} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f8f9fb] border border-[rgba(229,231,234,0.6)] dark:bg-[#172033] dark:border-[#273244]">
                {getIcon(perf.type)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-[#677294] dark:text-white truncate">{perf.label}</p>
                <p className="text-[13px] font-bold text-[#100e1c] dark:text-white truncate">{perf.name}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[14px] font-bold text-[#100e1c] dark:text-white whitespace-nowrap">{perf.value}</p>
                <div className="flex items-center justify-end gap-1.5">
                  {perf.subValue && <span className="text-[10px] text-[#677294] dark:text-white">{perf.subValue}</span>}
                  {typeof perf.delta === "number" && (
                    <span className={`text-[10px] font-medium ${isUp ? "text-[#27b77a]" : "text-[#e5484d]"}`}>
                      {isUp ? "▲" : "▼"} {Math.abs(perf.delta)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── PaymentOverview ───
interface PaymentOverviewProps {
  totalReceivables: number;
  receivablesFrom: string;
  totalPayables: number;
  payablesTo: string;
}

const PaymentOverview: React.FC<PaymentOverviewProps> = ({
  totalReceivables,
  receivablesFrom,
  totalPayables,
  payablesTo,
}) => {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">Payment Overview</h3>
        {/* <button className="text-[12px] font-medium text-[#0a6c74] hover:text-[#085a61] dark:text-[#9be7dc]">
          View All
        </button> */}
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#677294] dark:text-white mb-0.5">Total Receivables</p>
            <p className="text-[22px] font-bold text-[#100e1c] dark:text-white">{fmt(totalReceivables)}</p>
            <p className="text-[10px] text-[#677294] dark:text-white mt-0.5">{receivablesFrom}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e6fbf7] dark:bg-[#16352f]">
            <FiArrowDownLeft className="h-5 w-5 text-[#27b77a]" />
          </div>
        </div>

        <hr className="border-[rgba(229,231,234,0.6)] dark:border-[#273244]" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#677294] dark:text-white mb-0.5">Total Payables</p>
            <p className="text-[22px] font-bold text-[#100e1c] dark:text-white">{fmt(totalPayables)}</p>
            <p className="text-[10px] text-[#677294] dark:text-white mt-0.5">{payablesTo}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0f0] dark:bg-[#332022]">
            <FiArrowUpRight className="h-5 w-5 text-[#e5484d]" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── AIStockPrediction ───
interface PredictionItem {
  medicineName: string;
  runoutDays: number;
  currentStock: number;
  dailyAverageUsage: number;
  suggestedOrder: number;
}

interface AIStockPredictionProps {
  prediction: PredictionItem;
  onCreateOrder: () => void;
}

const AIStockPrediction: React.FC<AIStockPredictionProps> = ({ prediction, onCreateOrder }) => {
  const getRunoutText = (days: number) => {
    if (days === 0) return "Out of stock!";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <div className="rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f8f9fb] dark:bg-[#172033]">
          <FiCpu className="h-4 w-4 text-[#6366f1]" />
        </div>
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">AI Stock Prediction</h3>
        <span className="rounded-full bg-[#e6fbf7] px-2 py-0.5 text-[9px] font-bold text-[#0a6c74] uppercase dark:bg-[#16352f] dark:text-[#9be7dc]">New</span>
      </div>

      {prediction.medicineName ? (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f8f9fb] border border-[rgba(229,231,234,0.6)] dark:bg-[#172033] dark:border-[#273244]">
              <span className="text-lg">💊</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#100e1c] dark:text-white">{prediction.medicineName}</p>
              <p className="text-[11px] text-[#677294] dark:text-white">
                Will run out in <span className="font-bold text-[#e5484d]">{getRunoutText(prediction.runoutDays)}</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-10 w-px bg-[#e5e7ea] dark:bg-[#273244]" />

          <div className="flex gap-4 sm:gap-5 flex-wrap">
            <div>
              <p className="text-[10px] text-[#677294] dark:text-white">Current Stock</p>
              <p className="text-[14px] font-bold text-[#0a6c74] dark:text-[#9be7dc]">{prediction.currentStock} units</p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#e5e7ea] dark:bg-[#273244] self-center" />
            <div>
              <p className="text-[10px] text-[#677294] dark:text-white">Daily Usage</p>
              <p className="text-[14px] font-bold text-[#100e1c] dark:text-white">{prediction.dailyAverageUsage} units</p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#e5e7ea] dark:bg-[#273244] self-center" />
            <div>
              <p className="text-[10px] text-[#677294] dark:text-white">Suggested Order</p>
              <p className="text-[14px] font-bold text-[#100e1c] dark:text-white">{prediction.suggestedOrder} units</p>
            </div>
          </div>

          <button onClick={onCreateOrder} className="ml-auto rounded-[10px] cursor-pointer bg-[#0a6c74] px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-[#085a61] transition shadow-sm shrink-0">
            Create Order
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-6 text-[#677294] dark:text-white">
          <p>No prediction data available</p>
        </div>
      )}
    </div>
  );
};

// ─── SmartInsights ───
interface Insight {
  id: string;
  text: string;
  detail?: string;
  type: "success" | "warning" | "info";
}

interface SmartInsightsProps {
  insights: Insight[];
}

const icons = {
  success: <FiTrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
  warning: <FiAlertCircle className="h-3.5 w-3.5 text-amber-500" />,
  info: <FiAward className="h-3.5 w-3.5 text-blue-500" />,
};

const SmartInsights: React.FC<SmartInsightsProps> = ({ insights }) => {
  return (
    <div className="rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <h3 className="mb-3 text-[16px] font-semibold text-[#100e1c] dark:text-white">Smart Insights</h3>

      <div className="space-y-3">
        {insights.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">{icons[item.type]}</div>
            <p className="text-[11px] leading-relaxed text-[#100e1c] dark:text-slate-300">
              <span className="font-semibold">{item.text}</span>
              {item.detail && <span className="text-[#677294] ml-1">{item.detail}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* <button className="mt-3 flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
        View All Insights <FiChevronRight className="h-3 w-3" />
      </button> */}
    </div>
  );
};

// ─── QuickActions ───
interface QuickAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <div className="rounded-2xl border border-[rgba(229,231,234,0.6)] bg-white px-5 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
      <h3 className="mb-4 text-[16px] font-semibold text-[#100e1c] dark:text-white">Quick Actions</h3>

      <div className="flex items-center gap-5">
        {/* <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-200/60 dark:shadow-none hover:bg-emerald-600 transition-colors">
          <FiPlus className="h-7 w-7 text-white" />
        </div> */}

        <div className="grid flex-1 grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`flex items-center gap-2 rounded-xl cursor-pointer border px-3 py-2.5 text-[12px] font-medium transition hover:shadow-sm ${action.color}`}
            >
              {action.icon}
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───
const PharmacistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: user } = useGetUserQuery();
  const fullGreeting = getFullGreeting(user);
  // ─── State ───
  const [salesPeriod, setSalesPeriod] = useState<"week" | "month" | "year">("week");
  const [salesMetric, setSalesMetric] = useState<"revenue" | "profit" | "orders">("revenue");
  const [categoryPeriod, setCategoryPeriod] = useState<DashboardPeriod>("thisMonth");
  const [performerPeriod, setPerformerPeriod] = useState<DashboardPeriod>("thisMonth");

  // ─── Date Filter State ───
  const [startDate, setStartDate] = useState(() => toYMD(new Date()));
  const [endDate, setEndDate] = useState(() => toYMD(new Date()));
  const [activeTab, setActiveTab] = useState<DateTab>("today");
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  // ─── API Queries ───
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery({
    startDate,
    endDate,
  });

  const {
    data: salesOverviewData,
    isLoading: _salesLoading,
    refetch: refetchSales,
  } = useGetSalesOverviewQuery({
    period: salesPeriod,
    metric: salesMetric,
  });

  const {
    data: categoryData,
    isLoading: _categoryLoading,
    refetch: refetchCategory,
  } = useGetCategoryRevenueQuery({
    period: categoryPeriod,
  });

  const {
    data: performerData,
    isLoading: _performerLoading,
    refetch: refetchPerformers,
  } = useGetTopPerformersQuery({
    period: performerPeriod,
  });

  const {
    data: predictionData,
    isLoading: _predictionLoading,
    refetch: refetchPrediction,
  } = useGetAiStockPredictionQuery();

  // ─── Handle Date Tab Changes ───
  const handleTabChange = (tab: DateTab) => {
    setActiveTab(tab);
    const today = new Date();
    let s = today;
    let e = today;

    if (tab === "today") {
      s = today;
      e = today;
    } else if (tab === "yesterday") {
      const yd = new Date(today);
      yd.setDate(yd.getDate() - 1);
      s = yd;
      e = yd;
    } else if (tab === "thisWeek") {
      const day = today.getDay();
      s = new Date(today);
      s.setDate(today.getDate() - day);
      e = today;
    } else if (tab === "thisMonth") {
      s = new Date(today.getFullYear(), today.getMonth(), 1);
      e = today;
    }

    setStartDate(toYMD(s));
    setEndDate(toYMD(e));
  };

  // ─── Format Data for UI ───
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN")}`;
  };

  // ─── Prepare Stat Cards ───
  const statCards = summaryData?.statCards || {
    todayProfit: { value: 0, delta: 0, sparkUp: true, comparisonLabel: "vs yesterday" },
    lowStockMedicines: { value: 0, delta: 0, sparkUp: false, comparisonLabel: "Needs attention" },
    paidToSuppliers: { value: 0, delta: 0, sparkUp: true, comparisonLabel: "vs last month" },
    totalSales: { value: 0, delta: 0, sparkUp: true, comparisonLabel: "vs yesterday" },
  };

  // ─── Prepare Inventory Health ───
  const inventoryHealth = summaryData?.inventoryHealth || {
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    // expiringSoon: 0,
  };

  const inventoryDonutItems = [
    { label: "In Stock", value: inventoryHealth.inStock, color: "#10b981" },
    { label: "Low Stock", value: inventoryHealth.lowStock, color: "#f59e0b" },
    { label: "Out of Stock", value: inventoryHealth.outOfStock, color: "#ef4444" },
    // { label: "Expiring Soon", value: inventoryHealth.expiringSoon, color: "#f97316" },
  ];

  // ─── Prepare Alerts ───
  const alerts = summaryData?.criticalAlerts || [];

  // ─── Prepare Payment Overview ───
  const paymentOverview = summaryData?.paymentOverview || {
    totalReceivables: 0,
    receivablesFrom: "From 0 customers",
    totalPayables: 0,
    payablesTo: "To 0 suppliers",
  };

  // ─── Prepare Smart Insights ───
  const insights = summaryData?.smartInsights || [];

  // ─── Prepare Sales Overview ───
  const salesData = salesOverviewData?.chartData || [];
  const salesTotal = salesOverviewData?.totalValue || 0;
  const salesDelta = salesOverviewData?.delta || 0;
  const salesDeltaLabel = salesOverviewData?.deltaLabel || "vs last week";
  const bottomStats = salesOverviewData?.bottomStats || [];

  // ─── Prepare Category Revenue ───
  const categoryChartData = categoryData?.categories || [];
  const categoryTotal = categoryData?.totalRevenue || 0;

  // ─── Prepare Top Performers ───
  const performers = performerData?.performers || [];

  // ─── Prepare AI Prediction ───
  const prediction = predictionData || {
    medicineName: "",
    runoutDays: 0,
    currentStock: 0,
    dailyAverageUsage: 0,
    suggestedOrder: 0,
  };

  // ─── Quick Actions ───
  const quickActions = [
    { label: "Sales", icon: <FiShoppingCart className="h-3.5 w-3.5" />, color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", onClick: () => navigate("/pharmacy/sales") },
    { label: "Medicines", icon: <BsCapsule className="h-3.5 w-3.5" />, color: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400", onClick: () => navigate("/pharmacy/medicines") },
    { label: "Stocks", icon: <FiPlusCircle className="h-3.5 w-3.5" />, color: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400", onClick: () => navigate("/pharmacy/stock") },
    { label: "Suppliers", icon: <BsTruck className="h-3.5 w-3.5" />, color: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400", onClick: () => navigate("/pharmacy/suppliers") },
  ];

  // ─── Refetch when dependencies change ───
  useEffect(() => {
    refetchSummary();
  }, [startDate, endDate]);

  useEffect(() => {
    refetchSales();
  }, [salesPeriod, salesMetric]);

  useEffect(() => {
    refetchCategory();
  }, [categoryPeriod]);

  useEffect(() => {
    refetchPerformers();
  }, [performerPeriod]);

  useEffect(() => {
    refetchPrediction();
  }, []);

  // ─── Loading State ───
  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a6c74] mx-auto"></div>
          <p className="mt-4 text-[#677294] dark:text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (summaryError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiAlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-[#677294] dark:text-white">Failed to load dashboard data</p>
          <button
            onClick={() => refetchSummary()}
            className="mt-2 px-4 py-2 bg-[#0a6c74] text-white rounded-lg hover:bg-[#085a61]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="tour-pharmacy-dashboard-overview"
      className="w-full min-w-0 scroll-mt-6 px-2 sm:px-0 pb-4 sm:pb-6 space-y-3 sm:space-y-4 lg:space-y-5"
    >
      {/* ===== Header: Greeting + DateFilterTabs ===== */}
      <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex shrink-0 flex-col gap-1">
          <h2 className="text-[18px] sm:text-[22px] md:text-[24px] lg:text-[26px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white">
            {fullGreeting}
          </h2>
          <p className="text-[12px] sm:text-[13px] lg:text-[14px] font-normal leading-5 text-[#677294] dark:text-white">
            Here's what's happening in your pharmacy today.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
          <div
            className="relative flex items-center gap-3 overflow-x-auto no-scrollbar sm:justify-end"
            data-datepicker-anchor
          >
            <DateFilterTabs
              active={activeTab}
              onChange={handleTabChange}
              onCustom={() => {
                setActiveTab("custom");
                setShowCustomCalendar(true);
              }}
              customLabel={
                activeTab === "custom" && !showCustomCalendar
                  ? formatDateRangeLabel(startDate, endDate)
                  : undefined
              }
            />
            {showCustomCalendar && (
              <CustomDateRangePicker
                startYmd={startDate}
                endYmd={endDate}
                onApply={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                  setShowCustomCalendar(false);
                }}
                onCancel={() => {
                  setShowCustomCalendar(false);
                  setActiveTab("today");
                  handleTabChange("today");
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== Row 1: KPI Stat Cards ===== */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <StatCard
          icon={<FiTrendingUp className="h-5 w-5 text-[#27b77a]" />}
          label="Today's Profit"
          sublabel=""
          value={formatCurrency(statCards.todayProfit.value)}
          delta={statCards.todayProfit.delta}
          bgColor="bg-[rgba(39,183,122,0.1)]"
          deltaLabel={statCards.todayProfit.comparisonLabel}
          sparkUp={statCards.todayProfit.sparkUp}
        />
        <StatCard
          icon={<FiAlertCircle className="h-5 w-5 text-[#e89b00]" />}
          label="Low Stock Medicines"
          sublabel=""
          value={`${statCards.lowStockMedicines.value}`}
          delta={statCards.lowStockMedicines.delta}
          bgColor="bg-[#fff7e6]"
          deltaLabel={statCards.lowStockMedicines.comparisonLabel}
          sparkUp={statCards.lowStockMedicines.sparkUp}
        />
        <StatCard
          icon={<FiPackage className="h-5 w-5 text-[#27b77a]" />}
          label="Amount Paid To Suppliers"
          sublabel=""
          value={formatCurrency(statCards.paidToSuppliers.value)}
          delta={statCards.paidToSuppliers.delta}
          bgColor="bg-[#e6fbf7]"
          deltaLabel={statCards.paidToSuppliers.comparisonLabel}
          sparkUp={statCards.paidToSuppliers.sparkUp}
        />
        <StatCard
          icon={<FiShoppingCart className="h-5 w-5 text-[#8b5cf6]" />}
          label="Total Sales (Today)"
          sublabel=""
          value={formatCurrency(statCards.totalSales.value)}
          delta={statCards.totalSales.delta}
          bgColor="bg-[#eef1ff]"
          deltaLabel={statCards.totalSales.comparisonLabel}
          sparkUp={statCards.totalSales.sparkUp}
        />
      </div>

      {/* ===== Row 2: Sales Overview (5) + Inventory Health (4) + Critical Alerts (3) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        <div className="lg:col-span-5">
          <SalesOverviewChart
            data={salesData}
            period={salesPeriod}
            onPeriodChange={setSalesPeriod}
            onMetricChange={setSalesMetric}
            totalValue={formatCurrency(salesTotal)}
            delta={salesDelta}
            deltaLabel={salesDeltaLabel}
            bottomStats={bottomStats}
          />
        </div>
        <div className="lg:col-span-4">
          <InventoryHealthCard items={inventoryDonutItems} />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <CriticalAlerts alerts={alerts} />
        </div>
      </div>

      {/* ===== Row 3: Category Revenue + Top Performers + Payment Overview ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <CategoryRevenueChart
          data={categoryChartData}
          totalRevenue={formatCurrency(categoryTotal)}
          period={categoryPeriod}
          onPeriodChange={setCategoryPeriod}
        />
        <TopPerformers
          performers={performers}
          period={performerPeriod}
          onPeriodChange={setPerformerPeriod}
        />
        <div className="md:col-span-2 xl:col-span-1">
          <PaymentOverview
            totalReceivables={paymentOverview.totalReceivables}
            receivablesFrom={paymentOverview.receivablesFrom}
            totalPayables={paymentOverview.totalPayables}
            payablesTo={paymentOverview.payablesTo}
          />
        </div>
      </div>

      {/* ===== Row 4: AI Stock Prediction + Smart Insights + Quick Actions ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <div className="md:col-span-2 xl:col-span-1">
          <AIStockPrediction prediction={prediction} onCreateOrder={() => navigate("/pharmacy/stock/add")} />
        </div>
        <SmartInsights insights={insights} />
        <QuickActions actions={quickActions} />
      </div>
    </div>
  );
};

export default PharmacistDashboard;
