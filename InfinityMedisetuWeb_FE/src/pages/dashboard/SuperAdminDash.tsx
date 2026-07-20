// src/pages/dashboard/SuperAdminDash.tsx
import { addToast } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FiCalendar, FiUsers, FiTrendingUp, FiDollarSign } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { MdOutlineSubscriptions } from "react-icons/md";
import { formatDistanceToNow } from "date-fns";

import { useGetSuperAdminDashboardQuery } from "../../redux/api/dashboardApi";

import DateFilterTabs, { type DateTab } from "./DateFilterTabs";
import CustomDateRangePicker from "./CustomDateRangePicker";
import DonutOverviewCard, { type DonutItem } from "./DonutOverviewCard";
import PatientOverviewChart, { type PatientPoint } from "./PatientOverviewChart";
import { isNetworkError } from "../../utils/getApiErrorText";
import RevenueOverviewChart, { type ChartPoint } from "./RevenueOverviewChart";
import KpiCards from "../../components/KpiCards";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import RevenueBottomSection from "./RevenueBottomSection";
import { StatCard } from "../../components/StatCard";

/* ---------------- helpers ---------------- */

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

function parseHikePercent(v: unknown): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const m = s.match(/^([+-]?)(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const sign = m[1] === "-" ? -1 : 1;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(sign * Math.abs(num));
}

function formatINRCompact(n: number) {
  const v = Math.round(Number(n ?? 0));
  if (!Number.isFinite(v) || v <= 0) return "₹0";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${new Intl.NumberFormat("en-IN").format(v)}`;
  if (v >= 1e3) return `₹${new Intl.NumberFormat("en-IN").format(v)}`;
  return `₹${v}`;
}

/* ---------------- Skeleton UI ---------------- */

const Sk = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
);

const SkeletonStatCards = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
    {[1, 2, 3, 4, 5].map((k) => (
      <div key={k} className="rounded-2xl border border-slate-200 bg-white p-5">
        <Sk className="h-9 w-9 rounded-lg" />
        <Sk className="mt-3 h-4 w-24" />
        <Sk className="mt-2 h-7 w-20" />
        <Sk className="mt-2 h-3 w-16" />
      </div>
    ))}
  </div>
);

const SkeletonCard = ({
  titleWidth = "w-40",
  bodyHeight = "h-64",
}: {
  titleWidth?: string;
  bodyHeight?: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-center justify-between">
      <Sk className={`h-4 ${titleWidth}`} />
      <Sk className="h-4 w-16" />
    </div>
    <Sk className={`mt-4 w-full ${bodyHeight}`} />
  </div>
);

/* ---------------- component ---------------- */

const SuperAdminDash = () => {
  // Initialize dates to match the default "thisWeek" tab
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    return toYMD(start);
  });
  const [endDate, setEndDate] = useState(() => toYMD(new Date()));
  const [activeTab, setActiveTab] = useState<DateTab>("thisWeek");
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  // Handle date tab changes
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

  // Dynamic comparison label based on active tab
  const comparisonLabel = useMemo(() => {
    switch (activeTab) {
      case "today":
        return "yesterday";
      case "yesterday":
        return "day before";
      case "thisWeek":
        return "last week";
      case "thisMonth":
        return "last month";
      case "custom":
        return "previous period";
      default:
        return "yesterday";
    }
  }, [activeTab]);

  const queryArgs = useMemo(() => {
    if (!startDate || !endDate) return undefined;
    return { startDate, endDate };
  }, [startDate, endDate]);

  const curArg = queryArgs ?? skipToken;

  const { data: curData, isLoading, isFetching, isError, error } =
    useGetSuperAdminDashboardQuery(curArg, {
      refetchOnMountOrArgChange: true,
    });

  useEffect(() => {
    if (isError && !isNetworkError(error)) {
      addToast({
        title: "Failed to load dashboard",
        description:
          (error as any)?.data?.message ??
          (error as any)?.error ??
          "Something went wrong",
        color: "danger",
        variant: "flat",
      });
    }
  }, [isError, error]);

  const r = (curData as any)?.result;

  /* ---------- Top stats (from API, no static fallbacks) ---------- */
  const topStats = useMemo(() => ({
    totalClinics: r?.clinics?.total ?? 0,
    conversionRate: r?.conversionRate?.rate ?? 0,
    totalRevenue: r?.revenue?.total ?? 0,
    activeSubscriptions: r?.subscriptions?.active ?? 0,
    totalUsers: r?.users?.total ?? 0,
  }), [r]);

  const deltas = useMemo(() => ({
    clinics: parseHikePercent(r?.clinics?.hikePersent),
    conversionRate: parseHikePercent(r?.conversionRate?.hikePersent),
    subscriptions: parseHikePercent(r?.subscriptions?.hikePersent),
    revenue: parseHikePercent(r?.revenue?.hikePersent),
    users: parseHikePercent(r?.users?.hikePersent),
  }), [r]);

  const revenuePoints: ChartPoint[] = useMemo(() => {
    const series = r?.revenue?.dailySeries;
    if (!series?.labels || !series?.data) return [];
    return series.labels.map((label: string, idx: number) => {
      const amount = series.data[idx] ?? 0;
      return { date: label, count: Number(amount), label };
    });
  }, [r]);

  const userRoleItems: DonutItem[] = useMemo(() => {
    const byRole = r?.users?.byRole;
    if (!byRole || Object.keys(byRole).length === 0) return [];
    return [
      { label: "Super Admin", value: 1, color: "#1E293B" },
      { label: "Clinic Admins", value: byRole["Admin"] ?? 0, color: "#3B82F6" },
      { label: "Doctors", value: byRole["Doctor"] ?? 0, color: "#10B981" },
      { label: "Patients", value: byRole["Patient"] ?? 0, color: "#F59E0B" },
      { label: "Receptionists", value: byRole["Receptionist"] ?? 0, color: "#8B5CF6" },
    ];
  }, [r]);

  const subscriptionStatusItems: DonutItem[] = useMemo(() => {
    if (!r?.subscriptions?.byPlan?.length) return [];
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
    return r.subscriptions.byPlan.map((p: any, idx: number) => ({
      label: p.planName,
      value: p.count,
      color: colors[idx % colors.length],
    }));
  }, [r]);

  const registrationData: PatientPoint[] = useMemo(() => {
    const series = r?.registrationTrends?.clinics;
    if (!series?.labels || !series?.data) return [];
    return series.labels.map((label: string, idx: number) => {
      const count = series.data[idx] ?? 0;
      return { label, onTime: Number(count), delay: 0 };
    });
  }, [r]);

  const showSkeleton = !curData && (isLoading || isFetching);

  return (
    <PageContainer className="2xl:space-y-4 space-y-2">
      {/* Header */}
      <PageHeader
        title="Super Admin Dashboard 👋"
        description="Real-time overview of your platform performance"
        actions={
          <div
            className="relative flex items-center gap-3 overflow-x-auto no-scrollbar"
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
                  setActiveTab("thisWeek");
                  handleTabChange("thisWeek");
                }}
              />
            )}
          </div>
        }
      />

      {showSkeleton ? (
        <>
          <SkeletonStatCards />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4"><SkeletonCard titleWidth="w-32" bodyHeight="h-20" /></div>
            <div className="col-span-12 lg:col-span-4"><SkeletonCard titleWidth="w-32" bodyHeight="h-20" /></div>
            <div className="col-span-12 lg:col-span-4"><SkeletonCard titleWidth="w-32" bodyHeight="h-20" /></div>
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8"><SkeletonCard titleWidth="w-44" bodyHeight="h-64" /></div>
            <div className="col-span-12 lg:col-span-4"><SkeletonCard titleWidth="w-36" bodyHeight="h-64" /></div>
          </div>
        </>
      ) : (
        <>
          {/* ===== Row 1: Top 5 Stat Cards ===== */}
          <div className={`transition-opacity duration-300 ${isFetching ? "opacity-75" : "opacity-100"}`}>
            <div className="grid grid-cols-1 2xl:gap-4 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                icon={<FiCalendar className="h-4 w-4 text-emerald-600" />}
                label="Total Clinics"
                value={String(topStats.totalClinics)}
                delta={deltas.clinics}
                bgColor="bg-emerald-50"
                deltaLabel={comparisonLabel}
                sparkUp={(deltas.clinics ?? 0) >= 0}
              />
              <StatCard
                icon={<FiTrendingUp className="h-4 w-4 text-blue-600" />}
                label="Conversion Rate"
                sublabel="Trial → Paid"
                value={`${topStats.conversionRate}%`}
                delta={deltas.conversionRate}
                bgColor="bg-blue-50"
                deltaLabel={comparisonLabel}
                sparkUp={(deltas.conversionRate ?? 0) >= 0}
              />
              <StatCard
                icon={<FaRupeeSign className="h-4 w-4 text-green-600" />}
                label="Total Revenue"
                value={`₹${new Intl.NumberFormat("en-IN").format(topStats.totalRevenue)}`}
                delta={deltas.revenue}
                bgColor="bg-green-50"
                deltaLabel={comparisonLabel}
                sparkUp={(deltas.revenue ?? 0) >= 0}
              />
              <StatCard
                icon={<MdOutlineSubscriptions className="h-4 w-4 text-amber-600" />}
                label="Active"
                sublabel="Subscriptions"
                value={String(topStats.activeSubscriptions)}
                delta={deltas.subscriptions}
                bgColor="bg-amber-50"
                deltaLabel={comparisonLabel}
                sparkUp={(deltas.subscriptions ?? 0) >= 0}
              />
              <StatCard
                icon={<FiUsers className="h-4 w-4 text-purple-600" />}
                label="Total Users"
                value={new Intl.NumberFormat("en-IN").format(topStats.totalUsers)}
                delta={deltas.users}
                bgColor="bg-purple-50"
                deltaLabel={comparisonLabel}
                sparkUp={(deltas.users ?? 0) >= 0}
              />
            </div>
          </div>

          {/* ===== Row 2: KPI Cards (4 cards with arrow/progress) ===== */}
          <div className={`transition-opacity duration-300 ${isFetching ? "opacity-75" : "opacity-100"}`}>
            <div className="grid grid-cols-1 2xl:gap-4 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCards
                compact
                title="Monthly Active Clinics"
                value={r?.clinics?.monthlyActive ?? 0}
                icon={<FiCalendar className="text-lg text-blue-600" />}
                iconBg="bg-blue-50"
                description={`↑ ${r?.clinics?.monthlyActive && r?.clinics?.total ? Math.round((r.clinics.monthlyActive / r.clinics.total) * 100) : 0}% of total`}
                percentage={r?.clinics?.monthlyActive && r?.clinics?.total ? Math.min((r.clinics.monthlyActive / r.clinics.total) * 100, 100) : 0}
                progressColor="bg-blue-500"
              />
              <KpiCards
                compact
                title="Monthly Active Users"
                value={new Intl.NumberFormat("en-IN").format(r?.users?.monthlyActive ?? 0)}
                icon={<FiUsers className="text-lg text-emerald-600" />}
                iconBg="bg-emerald-50"
                description={`${r?.users?.monthlyActive && r?.users?.total ? Math.round((r.users.monthlyActive / r.users.total) * 100) : 0}% of total`}
                percentage={r?.users?.monthlyActive && r?.users?.total ? Math.min((r.users.monthlyActive / r.users.total) * 100, 100) : 0}
                progressColor="bg-emerald-500"
              />
              <KpiCards
                compact
                title="Yearly Subscriptions"
                value={r?.subscriptions?.yearly ?? 0}
                icon={<FiTrendingUp className="text-lg text-amber-600" />}
                iconBg="bg-amber-50"
                description={`${r?.subscriptions?.yearly && r?.subscriptions?.total ? Math.round((r.subscriptions.yearly / r.subscriptions.total) * 100) : 0}% of total`}
                percentage={r?.subscriptions?.yearly && r?.subscriptions?.total ? Math.min((r.subscriptions.yearly / r.subscriptions.total) * 100, 100) : 0}
                progressColor="bg-amber-500"
              />
              <KpiCards
                compact
                title="Yearly Subscription Revenue"
                value={formatINRCompact(r?.revenue?.yearly ?? 0)}
                icon={<FiDollarSign className="text-lg text-rose-600" />}
                iconBg="bg-rose-50"
                description={`${r?.revenue?.yearly && r?.revenue?.total ? Math.round((r.revenue.yearly / r.revenue.total) * 100) : 0}% of total`}
                percentage={r?.revenue?.yearly && r?.revenue?.total ? Math.min((r.revenue.yearly / r.revenue.total) * 100, 100) : 0}
                progressColor="bg-rose-500"
              />
            </div>
          </div>

          {/* ===== Row 3: Revenue Overview | Performance Summary | Users by Role + Subscription by Plan ===== */}
          <div className={`transition-opacity duration-300 ${isFetching ? "opacity-75" : "opacity-100"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 2xl:gap-4 gap-2 items-start">
              {/* Revenue Overview - spans ~5 cols */}
              <div className="lg:col-span-5">
                <RevenueOverviewChart
                  title="Revenue Overview"
                  data={revenuePoints}
                  totalRevenue={r?.revenue?.currentPeriod ?? 0}
                  trend={r?.revenue?.hikePersent ? `↑ ${r.revenue.hikePersent.replace(/[+]/, '')}` : undefined}
                  comparisonLabel={`vs ${comparisonLabel}`}
                />
              </div>

              {/* Performance Summary - spans ~3 cols */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col">
                  <h3 className="text-base font-semibold text-slate-900">
                    Performance Summary
                  </h3>

                  {/* Donut */}
                  {(() => {
                    // Compute overall growth as average of available deltas
                    const validDeltas = [deltas.revenue, deltas.clinics, deltas.subscriptions, deltas.users].filter(
                      (d): d is number => typeof d === "number"
                    );
                    const overallGrowth = validDeltas.length > 0
                      ? Math.round(validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length)
                      : 0;
                    // Donut offset: 283 is full circle, offset = 283 * (1 - pct/100)
                    const pct = Math.max(0, Math.min(100, overallGrowth > 0 ? Math.min(overallGrowth, 100) : 0));
                    const offset = Math.round(283 * (1 - pct / 100));

                    return (
                      <div className="flex justify-center my-3">
                        <div className="relative w-24 h-24">
                          <svg viewBox="0 0 120 120" className="h-full w-full">
                            <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                            <circle
                              cx="60" cy="60" r="45" fill="none"
                              stroke="#10b981" strokeWidth="14"
                              strokeDasharray="283"
                              strokeDashoffset={offset}
                              transform="rotate(-90 60 60)"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-lg font-bold text-slate-900">{overallGrowth}%</p>
                            <p className="text-[8px] text-slate-500">Overall Growth</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Metrics — driven by API deltas */}
                  <div className="2xl:space-y-2 space-y-1 flex-1">
                    {([
                      { label: "Revenue", color: "bg-blue-500", delta: deltas.revenue },
                      { label: "Clinics", color: "bg-emerald-500", delta: deltas.clinics },
                      { label: "Subscriptions", color: "bg-purple-500", delta: deltas.subscriptions },
                      { label: "Users", color: "bg-rose-500", delta: deltas.users },
                    ] as const).map((metric) => {
                      const d = metric.delta;
                      const isUp = (d ?? 0) >= 0;
                      const growthLabel = d === undefined ? "No data"
                        : Math.abs(d) >= 50 ? "Excellent growth"
                          : Math.abs(d) >= 10 ? "Good growth"
                            : Math.abs(d) >= 0 ? "Slightly down"
                              : "Declining";

                      return (
                        <div key={metric.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${metric.color}`} />
                            <span className="text-xs text-slate-600">{metric.label}</span>
                          </div>
                          <div className="text-right">
                            {d !== undefined ? (
                              <span className={`text-xs font-semibold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                                {isUp ? "↑" : "↓"} {Math.abs(d)}%
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">—</span>
                            )}
                            <p className="text-[10px] text-slate-400">{growthLabel}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Users by Role + Subscription by Plan stacked */}
              <div className="lg:col-span-4 flex flex-col 2xl:gap-4 gap-2">
                {/* Users by Role */}
                <DonutOverviewCard
                  title="Users by Role"
                  centerLabel="Super Admin"
                  items={userRoleItems}
                />
                {/* Subscription by Plan */}
                <DonutOverviewCard
                  title="Subscription by Plan"
                  centerLabel="Total Plans"
                  items={subscriptionStatusItems}
                />
              </div>
            </div>
          </div>

          {/* ===== Row 4: Clinic Registration Trends | Recent Activities ===== */}
          <div className={`transition-opacity duration-300 ${isFetching ? "opacity-75" : "opacity-100"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 2xl:gap-4 gap-2 items-start">
              {/* Clinic Registration Trends */}
              <div className="lg:col-span-7">
                <PatientOverviewChart
                  title="Clinic Registration Trends"
                  data={registrationData}
                />
              </div>

              {/* Recent Activities */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">
                      Recent Activities
                    </h3>
                    <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                      View All
                    </a>
                  </div>

                  <div className="space-y-1 flex-1 overflow-y-auto">
                    {r?.activities && r.activities.length > 0 ? (
                      r.activities.slice(0, 4).map((activity: any, idx: number) => {
                        // Map activity type to icon and colors
                        const getActivityStyle = (type: string) => {
                          switch (type) {
                            case "clinic_registered":
                              return { bg: "bg-blue-50", text: "text-blue-600", label: "C" };
                            case "payment_received":
                              return { bg: "bg-emerald-50", text: "text-emerald-600", label: "P" };
                            case "subscription_created":
                              return { bg: "bg-purple-50", text: "text-purple-600", label: "S" };
                            case "verification_pending":
                              return { bg: "bg-amber-50", text: "text-amber-600", label: "V" };
                            default:
                              return { bg: "bg-slate-50", text: "text-slate-600", label: "A" };
                          }
                        };

                        const style = getActivityStyle(activity.type);

                        return (
                          <div key={activity.id || idx} className="flex gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
                              <span className={`text-xs font-bold ${style.text}`}>{style.label}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                              <p className="text-xs text-slate-500">{activity.description}</p>
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center h-32 text-center">
                        <div>
                          <p className="text-sm font-medium text-slate-900">No recent activities</p>
                          <p className="text-xs text-slate-500 mt-1">Activities will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Bottom: Top Performing Clinics + Revenue by Plan + Revenue Analytics ===== */}
      <RevenueBottomSection
        topClinics={r?.topClinics}
        revenueByPlan={r?.revenue?.byPlan}
        totalRevenue={r?.revenue?.total}
        analytics={r?.revenue?.analytics}
      />

      {/* ===== Footer ===== */}
      <div className="mt-4 flex items-center justify-between px-2">
        <p className="text-center text-xs text-slate-400 flex-1">
          © {new Date().getFullYear()} Infinity MediSetu. All rights reserved.
        </p>
        {r?.lastUpdatedAt && (
          <p className="text-xs text-slate-400 whitespace-nowrap ml-4">
            Last updated: {formatDistanceToNow(new Date(r.lastUpdatedAt), { addSuffix: true })}
          </p>
        )}
      </div>
    </PageContainer>
  );
};

export default SuperAdminDash;
