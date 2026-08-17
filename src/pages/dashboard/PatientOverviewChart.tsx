// src/pages/dashboard/PatientOverviewChart.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type PatientPoint = {
  label: string; // "Dec 31"
  onTime: number;
  delay?: number;
};

const GRID = "#E5E7EB";
const TICK = "#6B7280";

const ONTIME = "#0F766E";
const DELAY = "#E11D48";

function niceMax(n: number) {
  if (n <= 0) return 10;
  const pow10 = Math.pow(10, Math.floor(Math.log10(n)));
  const scaled = Math.ceil(n / pow10);
  const nice = (scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * pow10;
  return nice;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const onTimeVal =
    payload.find((p: any) => p.dataKey === "onTime")?.value ?? 0;
  const delayVal = payload.find((p: any) => p.dataKey === "delay")?.value ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="mb-2 text-[11px] sm:text-xs font-medium text-slate-700">
        {label}
      </div>

      <div className="space-y-1 text-[11px] sm:text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: ONTIME }}
          />
          <span className="flex-1">On Time</span>
          <span className="font-semibold text-slate-900">{onTimeVal}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: DELAY }} />
          <span className="flex-1">Delay</span>
          <span className="font-semibold text-slate-900">{delayVal}</span>
        </div>
      </div>
    </div>
  );
};

export type TrendsRangeKey = "thisMonth" | "thisYear";

const TRENDS_RANGE_OPTIONS: { key: TrendsRangeKey; label: string }[] = [
  { key: "thisMonth", label: "This Month" },
  { key: "thisYear", label: "This Year" },
];

export interface PatientOverviewChartProps {
  data: PatientPoint[];
  title?: string;
  range?: TrendsRangeKey;
  onRangeChange?: (range: TrendsRangeKey) => void;
}

const PatientOverviewChart: React.FC<PatientOverviewChartProps> = ({
  data,
  title = "Patient Overview",
  range,
  onRangeChange,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeRange = range ?? "thisMonth";
  const activeLabel = TRENDS_RANGE_OPTIONS.find((o) => o.key === activeRange)?.label ?? "This Month";

  const handleSelect = (key: TrendsRangeKey) => {
    setOpen(false);
    if (onRangeChange) onRangeChange(key);
  };

  // same logic: normalize delay fallback
  const normalized = useMemo(() => {
    const safe = Array.isArray(data) ? data : [];
    const avgOnTime =
      safe.length > 0
        ? safe.reduce((sum, b) => sum + (Number(b.onTime ?? 0) || 0), 0) /
          safe.length
        : 0;

    const fallbackDelay = Math.max(0, Math.round(avgOnTime * 0.7));

    return safe.map((d) => ({
      label: String(d.label ?? ""),
      onTime: Number(d.onTime ?? 0) || 0,
      delay:
        typeof d.delay === "number" && Number.isFinite(d.delay)
          ? d.delay
          : fallbackDelay,
    }));
  }, [data]);

  const yMax = useMemo(() => {
    const max = Math.max(
      0,
      ...normalized.map((d) =>
        Math.max(Number(d.onTime ?? 0), Number(d.delay ?? 0))
      )
    );
    return niceMax(max);
  }, [normalized]);

  const ticks = useMemo(() => {
    const step = yMax / 4;
    return [0, step, step * 2, step * 3, yMax].map((v) => Math.round(v));
  }, [yMax]);

  // ✅ mobile-friendly tick count (max 6 labels)
  const xInterval = useMemo(() => {
    const n = normalized.length;
    const maxLabels = 6; // mobile clean
    return Math.max(0, Math.ceil(n / maxLabels) - 1);
  }, [normalized.length]);

  if (!normalized.length) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div ref={dropdownRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
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
              <div className="absolute right-0 top-full z-20 mt-2 w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {TRENDS_RANGE_OPTIONS.map((opt) => {
                  const isActive = opt.key === activeRange;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelect(opt.key)}
                      className={`cursor-pointer flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition hover:bg-slate-50 ${isActive ? "text-teal-600 bg-teal-50/50" : "text-slate-600"}`}
                    >
                      {opt.label}
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
        <div className="h-56 sm:h-64 flex items-center justify-center text-sm text-slate-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 min-w-0 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* header responsive */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="text-base font-semibold text-slate-900 flex-1">
          {title}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: ONTIME }}
              />
              <span className="font-medium">On Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: DELAY }}
              />
              <span className="font-medium">Delay</span>
            </div>
          </div>

          {/* Range Dropdown */}
          <div ref={dropdownRef} className="relative select-none">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
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
              <div className="absolute right-0 top-full z-20 mt-2 w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-100">
                {TRENDS_RANGE_OPTIONS.map((opt) => {
                  const isActive = opt.key === activeRange;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelect(opt.key)}
                      className={`cursor-pointer flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition hover:bg-slate-50 ${isActive ? "text-teal-600 bg-teal-50/50" : "text-slate-600"}`}
                    >
                      {opt.label}
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
      </div>

      <div className="h-48 sm:h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={normalized}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid vertical={false} stroke={GRID} />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={xInterval}
              tick={{ fill: TICK, fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              height={40}
              tickMargin={8}
              minTickGap={10}
              tickFormatter={(v: string) => String(v).replace(/\s+/g, "")}
            />

            <YAxis
              domain={[0, yMax]}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              width={38}
              tick={{ fill: TICK, fontSize: 11 }}
              tickMargin={8}
            />

            <Tooltip cursor={{ stroke: GRID }} content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="onTime"
              stroke={ONTIME}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            />

            <Line
              type="monotone"
              dataKey="delay"
              stroke={DELAY}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PatientOverviewChart;