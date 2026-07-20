import { useState } from "react";
import {
  FiHome,
  FiTrendingUp,
  FiChevronDown,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

/* ---------- Types ---------- */

export type TopClinicData = {
  name: string;
  revenue: number;
  growthPercent: number;
};

export type RevenueByPlanItem = {
  planName: string;
  amount: number;
  percentage: number;
};

export type RevenueAnalyticsData = {
  thisMonth?: { amount: number; growthPercent: number };
  lastMonth?: { amount: number; growthPercent: number };
  allTime?: { amount: number; growthPercent: number };
};

type Props = {
  topClinics?: TopClinicData[];
  revenueByPlan?: {
    thisWeek?: RevenueByPlanItem[];
    thisMonth?: RevenueByPlanItem[];
  };
  totalRevenue?: number;
  analytics?: RevenueAnalyticsData;
};

/* ---------- Helpers ---------- */

function formatINR(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "₹0";
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

/* ---------- Component ---------- */

function EmptyStateCard() {
  return (
    <div className="col-span-12 md:col-span-6 lg:col-span-4">
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-8 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-sm font-medium text-slate-600">No clinic data available</p>
        <p className="text-xs text-slate-400 mt-1">Data will appear here once available</p>
      </div>
    </div>
  );
}

export default function RevenueBottomSection({
  topClinics,
  revenueByPlan,
  totalRevenue,
  analytics,
}: Props) {
  const [planPeriod, setPlanPeriod] = useState<"thisWeek" | "thisMonth">("thisWeek");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"monthly" | "weekly">("monthly");

  // Fallback data for top clinics
  const clinics = topClinics ?? [];

  // Revenue by plan — switch locally without API call
  const planData = revenueByPlan?.[planPeriod] ?? [];

  // Revenue analytics — all from same response, just displayed differently
  const analyticsData = analytics ?? {};

  // Sparkline data — use actual API data if available (currently not provided)
  const thisMonthChart: any[] = [];
  const lastMonthChart: any[] = [];
  const allTimeChart: any[] = [];

  return (
    <div className="mt-3 grid grid-cols-12 gap-4 items-start">
      {/* Show empty state if no data at all */}
      {!clinics.length && !planData.length && !Object.keys(analyticsData).length ? (
        <EmptyStateCard />
      ) : (
        <>
          {/* Top Performing Clinics */}
          {clinics.length > 0 && (
            <div className="col-span-12 md:col-span-6 lg:col-span-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Top Performing Clinics
                  </h3>
                  <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    View All
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-12 text-xs font-medium text-slate-400">
                    <div className="col-span-6">Clinic Name</div>
                    <div className="col-span-3 text-right">Revenue</div>
                    <div className="col-span-3 text-right">Growth</div>
                  </div>

                  {clinics.map((clinic) => (
                    <div
                      key={clinic.name}
                      className="grid grid-cols-12 items-center rounded-lg hover:bg-slate-50"
                    >
                      <div className="col-span-6 flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                          <FiHome
                            className="text-blue-600"
                            size={14}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {clinic.name}
                        </span>
                      </div>
                      <div className="col-span-3 text-right text-sm font-semibold text-slate-700">
                        {formatINR(clinic.revenue)}
                      </div>
                      <div className="col-span-3 flex justify-end">
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
                          +{clinic.growthPercent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Revenue By Plan — local toggle, no API call */}
          {planData.length > 0 && (
            <div className="col-span-12 xl:col-span-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Revenue by Plan
                  </h3>
                  <button
                    onClick={() => setPlanPeriod(prev => prev === "thisWeek" ? "thisMonth" : "thisWeek")}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {planPeriod === "thisWeek" ? "This Week" : "This Month"}
                    <FiChevronDown size={12} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Donut */}
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                    <div className="h-24 w-24 rounded-full border-[14px] border-blue-500 border-r-emerald-500" />
                    <div className="absolute text-center">
                      <p className="text-[9px] text-slate-400">Total Revenue</p>
                      <p className="text-sm font-bold text-slate-900">{formatINR(totalRevenue ?? 0)}</p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2 flex-1 min-w-0">
                    {planData.map((plan, idx) => (
                      <div key={plan.planName}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${idx === 0 ? "bg-blue-500" : "bg-emerald-500"}`} />
                          <span className="text-sm font-medium text-slate-700">{plan.planName}</span>
                        </div>
                        <p className="pl-5 text-xs text-slate-500">
                          {formatINR(plan.amount)} ({plan.percentage}%)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Analytics — local toggle, no API call */}
          {Object.keys(analyticsData).length > 0 && (
            <div className="col-span-12 xl:col-span-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Revenue Analytics
                  </h3>
                  <button
                    onClick={() => setAnalyticsPeriod(prev => prev === "monthly" ? "weekly" : "monthly")}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {analyticsPeriod === "monthly" ? "Monthly" : "Weekly"}
                    <FiChevronDown size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* This Month */}
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-400">This Month</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {formatINR(analyticsData.thisMonth?.amount ?? 0)}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <FiTrendingUp size={10} />
                      {analyticsData.thisMonth?.growthPercent ?? 0}%
                    </div>
                    {thisMonthChart.length > 0 ? (
                      <div className="mt-2 h-8 -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={thisMonthChart} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="mt-2 h-8 bg-slate-50 rounded flex items-center justify-center">
                        <p className="text-[10px] text-slate-400">No chart data</p>
                      </div>
                    )}
                  </div>

                  {/* Last Month */}
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-400">Last Month</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {formatINR(analyticsData.lastMonth?.amount ?? 0)}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <FiTrendingUp size={10} />
                      {analyticsData.lastMonth?.growthPercent ?? 0}%
                    </div>
                    {lastMonthChart.length > 0 ? (
                      <div className="mt-2 h-8 -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lastMonthChart} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="mt-2 h-8 bg-slate-50 rounded flex items-center justify-center">
                        <p className="text-[10px] text-slate-400">No chart data</p>
                      </div>
                    )}
                  </div>

                  {/* All Time */}
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-400">All Time</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {formatINR(analyticsData.allTime?.amount ?? 0)}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-purple-600">
                      <FiTrendingUp size={10} />
                      {analyticsData.allTime?.growthPercent ?? 0}%
                    </div>
                    {allTimeChart.length > 0 ? (
                      <div className="mt-2 h-8 -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={allTimeChart} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Line type="monotone" dataKey="value" stroke="#A855F7" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="mt-2 h-8 bg-slate-50 rounded flex items-center justify-center">
                        <p className="text-[10px] text-slate-400">No chart data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
