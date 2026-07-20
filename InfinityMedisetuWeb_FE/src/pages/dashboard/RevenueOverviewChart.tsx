// src/pages/dashboard/RevenueOverviewChart.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type ChartPoint = {
  date: string;
  count: number;
  label: string;
};

const GRID = "#F3F4F6";
const TICK_X = "#9EA2AE";
const TICK_Y = "#94A3B8";
const LINE_COLOR = "#0F766E";

function formatINRCompact(v: number) {
  const n = Math.round(Number(v ?? 0));
  if (!Number.isFinite(n) || n <= 0) return "₹0";
  if (n >= 1e7) {
    const val = n / 1e7;
    return val % 1 === 0 ? `₹${val}Cr` : `₹${val.toFixed(1)}Cr`;
  }
  if (n >= 1e5) {
    const val = n / 1e5;
    return val % 1 === 0 ? `₹${val}L` : `₹${val.toFixed(1)}L`;
  }
  if (n >= 1e3) {
    const val = n / 1e3;
    return val % 1 === 0 ? `₹${val}k` : `₹${val.toFixed(1)}k`;
  }
  return `₹${n}`;
}

function formatINRShort(n: number) {
  const v = Math.round(Number(n ?? 0));
  if (!Number.isFinite(v) || v <= 0) return "₹0";
  return new Intl.NumberFormat("en-IN").format(v);
}

function safeDate(p: ChartPoint): Date | null {
  const dKey = new Date(p.date);
  if (Number.isFinite(dKey.getTime())) return dKey;
  const dLabel = new Date(p.label);
  if (Number.isFinite(dLabel.getTime())) return dLabel;
  return null;
}

function fmtXLabel(d: Date) {
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  return `${mon} ${day}`;
}

function buildTicks(maxVal: number) {
  const max = Math.max(0, Number(maxVal) || 0);
  if (max <= 0) return [0, 1000, 5000, 8000, 10000];
  const roughStep = max / 4;
  const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const scaled = roughStep / pow10;
  const step = (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * pow10;
  const top = Math.max(step, Math.ceil(max / step) * step);
  return [0, step, step * 2, step * 3, top];
}

type DailyRow = {
  x: string;
  value: number;
  fullLabel: string;
  sortKey: number;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload?.[0]?.payload as DailyRow | undefined;
  const value = Number(payload?.[0]?.value ?? 0);

  return (
    <div className="rounded-lg bg-white border border-[#f1f5f9] px-[9px] py-[9px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] flex flex-col items-center gap-0.5 dark:bg-[#111726] dark:border-[#273244] dark:shadow-none">
      <span className="text-[10px] font-medium text-[#9ea2ae] leading-[14px] dark:text-slate-400">
        {row?.fullLabel ?? ""}
      </span>
      <span className="text-[12px] font-medium text-[#131927] leading-[16px] dark:text-white">
        ₹{formatINRShort(value)}
      </span>
    </div>
  );
};

type RangeKey = "thisWeek" | "thisMonth";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
];

type Props = {
  data: ChartPoint[];
  title?: string;
  totalRevenue?: number;
  range?: RangeKey;
  onRangeChange?: (range: RangeKey) => void;
  trend?: string;
  comparisonLabel?: string;
};

const RevenueOverviewChart: React.FC<Props> = ({
  data,
  title = "Revenue Overview",
  totalRevenue = 0,
  range,
  onRangeChange,
  trend,
  comparisonLabel,
}) => {
  const [internalRange, setInternalRange] = useState<RangeKey>("thisWeek");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeRange = range ?? internalRange;
  const activeLabel =
    RANGE_OPTIONS.find((o) => o.key === activeRange)?.label ?? "This Week";

  const handleSelect = (key: RangeKey) => {
    if (!range) setInternalRange(key);
    onRangeChange?.(key);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const totalCompleted = useMemo(() => {
    return (data ?? []).reduce((a, b) => a + (Number(b.count ?? 0) || 0), 0);
  }, [data]);

  const perApptRevenue = useMemo(() => {
    const tr = Number(totalRevenue ?? 0) || 0;
    if (tr <= 0 || totalCompleted <= 0) return 0;
    return tr / totalCompleted;
  }, [totalRevenue, totalCompleted]);

  const daily: DailyRow[] = useMemo(() => {
    const rows: DailyRow[] = [];
    for (const p of data ?? []) {
      const d = safeDate(p);
      if (!d) continue;
      const cnt = Number(p.count ?? 0) || 0;
      const revenue = cnt * perApptRevenue;
      rows.push({
        x: fmtXLabel(d),
        value: revenue,
        fullLabel: p.label || p.date,
        sortKey: d.getTime(),
      });
    }
    rows.sort((a, b) => a.sortKey - b.sortKey);
    return rows;
  }, [data, perApptRevenue]);

  const maxVal = useMemo(() => {
    return Math.max(0, ...daily.map((d) => Number(d.value ?? 0) || 0));
  }, [daily]);

  const ticks = useMemo(() => buildTicks(maxVal), [maxVal]);
  const yMax = ticks[ticks.length - 1] ?? 10000;

  if (!daily.length) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 min-h-[280px] sm:h-[300px] flex flex-col shadow-sm">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 min-w-0 flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header: Title + Range dropdown */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="text-base font-semibold text-slate-900 leading-normal flex-1 min-w-0">
          {title}
        </div>

        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            {activeLabel}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open && (
            <div
              role="listbox"
              className="absolute right-0 top-full z-20 mt-2 w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              {RANGE_OPTIONS.map((opt) => {
                const isActive = opt.key === activeRange;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(opt.key)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition hover:bg-slate-50 ${isActive
                        ? "text-primary bg-primary/5"
                        : "text-slate-700"
                      }`}
                  >
                    {opt.label}
                    {isActive && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M5 12L10 17L20 7"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subtitle: total + delta */}
      <div className="flex items-baseline gap-3 mb-2 pb-2 border-b border-slate-100">
        <div>
          <span className="text-2xl font-bold text-slate-900">
            {formatINRCompact(Number(totalRevenue ?? 0))}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Total Revenue</p>
        </div>
        {trend && (
          <div className="flex items-center gap-2 text-xs">
            <span className={`font-semibold ${trend.startsWith("↓") ? "text-rose-600" : "text-emerald-600"}`}>
              {trend}
            </span>
            {comparisonLabel && (
              <span className="text-slate-500">
                vs {comparisonLabel.replace(/^vs\s+/i, "")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-[200px] w-full min-w-0 min-h-[200px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={200}
          initialDimension={{ width: 1, height: 200 }}
        >
          <AreaChart
            data={daily}
            margin={{ top: 5, right: 10, left: -5, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.3} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke={GRID} />

            <XAxis
              dataKey="x"
              axisLine={false}
              tickLine={false}
              tick={{ fill: TICK_X, fontSize: 12, fontWeight: 400 }}
              tickMargin={10}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              width={38}
              tick={{ fill: TICK_Y, fontSize: 12, fontWeight: 500 }}
              tickMargin={4}
              tickFormatter={(v) => formatINRCompact(Number(v))}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#CBD5E1", strokeWidth: 1, strokeDasharray: "4 4" }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              fill="url(#revenueAreaGrad)"
              dot={false}
              activeDot={{ r: 5, fill: LINE_COLOR, stroke: "white", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueOverviewChart;
