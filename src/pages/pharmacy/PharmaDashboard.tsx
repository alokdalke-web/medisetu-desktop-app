

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@heroui/react";
import { useNavigate } from "react-router";

import { useGetUserQuery } from "../../redux/api/authApi";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import RevenueOverviewChart, { type ChartPoint } from "../dashboard/RevenueOverviewChart";
import DonutOverviewCard, { type DonutItem } from "../dashboard/DonutOverviewCard";

import {
  useGetPharmaDashboardSummaryQuery,
  useGetPharmaDashboardTopSellingQuery,
  useGetPharmaDashboardStockHealthQuery,
} from "../../redux/api/pharmaDashApi";

/* ---------------- helpers ---------------- */

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function monthStartYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  } catch {
    return `₹${n}`;
  }
};

function formatShortLabel(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ---------------- public icon helper (Vite + fallback) ---------------- */

// const joinBase = (base: string, path: string) => {
//   const b = (base || "/").replace(/\/?$/, "/");
//   const p = path.replace(/^\//, "");
//   return `${b}${p}`;
// };

// const getPublicBase = () => {
//   // Vite
//   const viteBase = (import.meta as any)?.env?.BASE_URL;
//   if (typeof viteBase === "string") return viteBase;

//   // CRA fallback (safe)
//   const craBase = (globalThis as any)?.process?.env?.PUBLIC_URL;
//   if (typeof craBase === "string" && craBase) return craBase;

//   return "/";
// };

// const PUBLIC_BASE = getPublicBase();
const ASSET_BASE = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
const iconSrc = (file: string) => `${ASSET_BASE}assets/icons/${file}`;


/* ---------------- tiny UI helpers ---------------- */

const Panel = ({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5",
        "h-full flex flex-col",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-slate-900 text-[14px] md:text-[18px]">{title}</div>
        {right ? <div className="text-xs text-slate-500">{right}</div> : null}
      </div>
      <div className="mt-4 flex-1 min-h-0">{children}</div>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  onClick,
  iconBoxClassName = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  iconBoxClassName?: string;
}) => {
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        "rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4 text-left w-full",
        clickable ? "hover:shadow-sm transition cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className={["h-10 w-10 rounded-lg grid place-items-center", iconBoxClassName].join(" ")}>
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-[12px] md:text-[14px] text-slate-500 truncate">{label}</div>
          <div className="mt-1 text-[18px] md:text-[24px] font-semibold text-slate-900 truncate">{value}</div>
        </div>
      </div>
    </button>
  );
};

/* ---------------- skeleton ---------------- */

const DashboardSkeleton = () => {
  const LIST_PANEL_HEIGHT = "h-[320px] sm:h-[340px]";

  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="mt-2 h-5 w-36 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 sm:mt-5 grid grid-cols-12 gap-3 sm:gap-5 items-stretch">
        <div className="col-span-12 lg:col-span-8 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 h-[320px]">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="mt-4 h-[240px] w-full rounded-xl" />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 h-[320px]">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="mt-6 mx-auto h-40 w-40 rounded-full" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mt-5 grid grid-cols-12 gap-3 sm:gap-5 items-stretch">
        {Array.from({ length: 2 }).map((_, p) => (
          <div key={p} className="col-span-12 md:col-span-6 min-w-0">
            <div className={["rounded-2xl border border-slate-200 bg-white p-4 sm:p-5", LIST_PANEL_HEIGHT].join(" ")}>
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-44 rounded" />
                      <Skeleton className="mt-2 h-3 w-64 rounded" />
                    </div>
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------------- component ---------------- */

const PharmaDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { isLoading: isUserLoading } = useGetUserQuery();

  const [displayStartDate, setDisplayStartDate] = useState(() => monthStartYMD(new Date()));
  const [displayEndDate, setDisplayEndDate] = useState(() => toYMD(new Date()));
  const [startDate, setStartDate] = useState(() => monthStartYMD(new Date()));
  const [endDate, setEndDate] = useState(() => toYMD(new Date()));
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setStartDate(displayStartDate);
      setEndDate(displayEndDate);
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [displayStartDate, displayEndDate]);

  const rangeParams = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  const { data: summaryRes, isLoading: isSummaryLoading, isFetching: isSummaryFetching } =
    useGetPharmaDashboardSummaryQuery(rangeParams);

  const { data: topSellingRes, isLoading: isTopSellingLoading, isFetching: isTopSellingFetching } =
    useGetPharmaDashboardTopSellingQuery(rangeParams);

  const { data: stockHealthRes, isLoading: isStockHealthLoading, isFetching: isStockHealthFetching } =
    useGetPharmaDashboardStockHealthQuery(rangeParams);

  const isDashFetching = isSummaryFetching || isTopSellingFetching || isStockHealthFetching;

  /* ---------------- Summary -> Cards ---------------- */

  const cards = useMemo(() => {
    const d = (summaryRes?.data ?? summaryRes?.result) as any;
    return (d?.cards ?? {}) as {
      totalSales?: number;
      pendingPrescriptions?: number;
      totalMedicine?: number;
      lowStockCount?: number;
      expiredMedicineCount?: number;
    };
  }, [summaryRes]);

  const topStats = useMemo(() => {
    return {
      todaysSales: Number(cards.totalSales ?? 0) || 0,
      pendingPrescriptions: Number(cards.pendingPrescriptions ?? 0) || 0,
      Medicine: Number(cards.totalMedicine ?? 0) || 0,
      expiryAlerts: Number(cards.expiredMedicineCount ?? 0) || 0,
    };
  }, [cards]);

  /* ---------------- Revenue -> Chart ---------------- */

  const revenuePoints: ChartPoint[] = useMemo(() => {
    const d = (summaryRes?.data ?? summaryRes?.result) as any;
    const pts = d?.revenue?.points;
    const safePoints: any[] = Array.isArray(pts) ? pts : [];

    return safePoints.map((p) => {
      const date = String(p?.date ?? "");
      const value = Number(p?.value ?? 0) || 0;
      return { date, count: value, label: formatShortLabel(date) };
    });
  }, [summaryRes]);

  const totalRevenue = useMemo(() => {
    const v = Number(cards.totalSales ?? 0);
    if (Number.isFinite(v) && v > 0) return v;
    return revenuePoints.reduce((sum, p) => sum + (Number(p.count ?? 0) || 0), 0);
  }, [cards, revenuePoints]);

  /* ---------------- Stock breakdown -> Donut ---------------- */

  const stockBreakdownItems: DonutItem[] = useMemo(() => {
    const d = (summaryRes?.data ?? summaryRes?.result) as any;
    const sb = d?.stockBreakdown ?? {};

    const active = Number(sb.activePercent ?? 0) || 0;
    const low = Number(sb.lowPercent ?? 0) || 0;
    const out = Number(sb.outPercent ?? 0) || 0;

    const total = Number(sb.totalCount ?? 0) || 0;
    const activeP = active || (total ? (Number(sb.activeCount ?? 0) / total) * 100 : 0);
    const lowP = low || (total ? (Number(sb.lowCount ?? 0) / total) * 100 : 0);
    const outP = out || (total ? (Number(sb.outOfStockCount ?? 0) / total) * 100 : 0);

    return [
      { label: "Active Stock", value: Math.round(activeP), color: "#10B981" },
      { label: "Low Stock", value: Math.round(lowP), color: "#F59E0B" },
      { label: "Out of Stock", value: Math.round(outP), color: "#EF4444" },
    ];
  }, [summaryRes]);

  /* ---------------- Top Selling ---------------- */

  const topSelling = useMemo(() => {
    const raw = (topSellingRes?.data ?? topSellingRes?.result) as unknown;
    const list = Array.isArray(raw) ? raw : [];

    const sorted = [...list].sort(
      (a: any, b: any) => Number(b?.soldQty ?? 0) - Number(a?.soldQty ?? 0)
    );

    return sorted.map((m: any) => {
      const name = String(m?.drugName ?? "—");
      const sold = Number(m?.soldQty ?? 0) || 0;

      const meta = [
        m?.strength ? String(m.strength) : null,
        m?.packSize != null ? `Pack ${m.packSize}` : null,
        m?.sku ? `SKU: ${m.sku}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      return { name, meta, sold };
    });
  }, [topSellingRes]);

  /* ---------------- Stock Health ---------------- */

  const stockHealthSummary = useMemo(() => {
    const d = (stockHealthRes?.data ?? stockHealthRes?.result) as any;
    const s = d?.summary ?? {};
    return {
      expiredCount: Number(s.expiredCount ?? 0) || 0,
      nearExpiryCount: Number(s.nearExpiryCount ?? 0) || 0,
      totalCount: Number(s.totalCount ?? 0) || 0,
    };
  }, [stockHealthRes]);

  const stockHealth = useMemo(() => {
    const d = (stockHealthRes?.data ?? stockHealthRes?.result) as any;
    const itemsRaw = d?.items;
    const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : [];

    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    return items.map((it) => {
      const name = String(it?.drugName ?? "—");
      const qty = Number(it?.availableQty ?? 0) || 0;

      const expiry = String(it?.expiryDate ?? "");
      const expDate = new Date(`${expiry}T00:00:00`);
      const expMid = Number.isNaN(expDate.getTime())
        ? null
        : new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();

      let status = "—";
      let tone: "danger" | "warn" = "warn";

      if (expMid != null) {
        const diffDays = Math.ceil((expMid - todayMid) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
          status = "Expires today";
          tone = "danger";
        } else {
          status = `Expires - ${diffDays} days`;
          tone = "warn";
        }
      }

      return { name, status, tone, qty };
    });
  }, [stockHealthRes]);

  const showSkeleton =
    isUserLoading || isSummaryLoading || isTopSellingLoading || isStockHealthLoading;

  const LIST_PANEL_HEIGHT = "h-[320px] sm:h-[340px]";

  return (
    <div
      className="
        mx-auto w-full max-w-full 2xl:max-w-full
        px-3 sm:px-4 lg:px-6 xl:px-8
        py-4 sm:py-5
        text-[13px] sm:text-[14px] lg:text-[15px]
        leading-snug sm:leading-normal
        antialiased
      "
    >
      {/* Header */}
      <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-[18px] md:text-[28px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl ">
            Dashboard
          </h2>
        </div>

        <div className="w-full sm:w-auto min-w-0">
          <DashboardDateRangePicker
            startYmd={displayStartDate}
            endYmd={displayEndDate}
            isFetching={isDashFetching}
            onApply={(s, e) => {
              if (!s || !e) return;
              setDisplayStartDate(s);
              setDisplayEndDate(e);
            }}
          />
        </div>
      </div>

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Top 4 Stat Cards */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
  label="Today's Sales"
  value={formatINR(topStats.todaysSales)}
  icon={
    <img
      src={iconSrc("pharma1.svg")}
      alt=""
      className=" object-contain"
      onError={(e) => {
        console.log("ICON FAIL:", e.currentTarget.src);
      }}
    />
  }
  iconBoxClassName="bg-blue-50"
  onClick={() => navigate("/pharmacy/invoice")}
/>

<StatCard
  label="Pending Prescriptions"
  value={formatINR(topStats.pendingPrescriptions)}
  icon={
    <img
      src={iconSrc("pharma2.svg")}
      alt=""
      className=" object-contain"
      onError={(e) => {
        console.log("ICON FAIL:", e.currentTarget.src);
      }}
    />
  }
  iconBoxClassName="bg-orange-50"
  onClick={() => navigate("/pharmacy/prescription-queue")}
/>

<StatCard
  label="Total Medicines"
  value={String(topStats.Medicine)}
  icon={
    <img
      src={iconSrc("pharma3.svg")}
      alt=""
      className=" object-contain"
      onError={(e) => {
        console.log("ICON FAIL:", e.currentTarget.src);
      }}
    />
  }
  iconBoxClassName="bg-emerald-50"
/>

<StatCard
  label="Expiry Alerts"
  value={String(topStats.expiryAlerts)}
  icon={
    <img
      src={iconSrc("pharma4.svg")}
      alt=""
      className=" object-contain"
      onError={(e) => {
        console.log("ICON FAIL:", e.currentTarget.src);
      }}
    />
  }
  iconBoxClassName="bg-rose-50"
/>

          </div>

          {/* Charts */}
          <div className="mt-4 sm:mt-5 grid grid-cols-12 gap-3 sm:gap-5 items-stretch">
            <div className="col-span-12 lg:col-span-8 min-w-0 h-full">
              <RevenueOverviewChart
                title="Sales Trend"
                data={revenuePoints}
                totalRevenue={totalRevenue}
              />
            </div>
            <div className="col-span-12 lg:col-span-4 min-w-0 h-full">
              <DonutOverviewCard
                title="Stock Breakdown"
                centerLabel="Total Stock"
                items={stockBreakdownItems}
              />
            </div>
          </div>

          {/* Bottom 2 cards */}
          <div className="mt-4 sm:mt-5 grid grid-cols-12 gap-3 sm:gap-5 items-stretch">
            {/* Top Selling */}
            <div className="col-span-12 md:col-span-6 min-w-0">
              <Panel
                title="Top Selling Medicines"
                className={LIST_PANEL_HEIGHT}
                
                right={
                  isTopSellingFetching ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Updating...
                    </span>
                  ) : null
                }
              >
                <div className="h-full overflow-y-auto pr-2 no-scrollbar">
                  <div className="divide-y divide-slate-100">
                    {topSelling.length === 0 ? (
                      <div className="py-6 text-center text-sm text-slate-500">No data</div>
                    ) : (
                      topSelling.slice(0, 5).map((m, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate text-[16px]">{m.name}</div>
                            <div className="text-xs text-slate-500 truncate">{m.meta}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[16px] font-semibold text-emerald-600">
                              {m.sold.toLocaleString("en-IN")}
                            </div>
                            <div className="text-xs text-slate-400">Sold Qty</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Panel>
            </div>

            {/* Stock Health */}
            <div className="col-span-12 md:col-span-6 min-w-0">
              <Panel
                title="Stock Health"
                className={LIST_PANEL_HEIGHT}
                right={
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-[12px]">
                      <span className="h-2 w-2 rounded-full bg-orange-500 " />
                      Near ({stockHealthSummary.nearExpiryCount})
                    </span>
                    <span className="inline-flex items-center gap-1  text-[12px] ">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Expired ({stockHealthSummary.expiredCount})
                    </span>
                  </div>
                }
              >
                <div className="h-full overflow-y-auto pr-2 no-scrollbar">
                  <div className="divide-y divide-slate-100">
                    {stockHealth.length === 0 ? (
                      <div className="py-6 text-center text-sm text-slate-500">No data</div>
                    ) : (
                      stockHealth.slice(0, 5).map((s, idx) => {
                        const isDanger = s.tone === "danger";
                        return (
                          <div key={idx} className="py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate text-[16px]">{s.name}</div>
                              <div className={`text-xs truncate ${isDanger ? "text-red-600" : "text-orange-600 "}`}>
                                {s.status}
                              </div>
                            </div>
                            <div className={`text-xs font-semibold shrink-0 ${isDanger ? "text-red-600" : "text-orange-600"}`}>
                              QTY : {s.qty}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PharmaDashboard;
