// src/pages/dashboard/doctorDash/components/AppointmentTrendChart.tsx
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTheme } from "../../../../hooks/useTheme";

export type TrendPoint = {
  date: string;
  count: number;
  noShowCount: number;
  completedCount: number;
};

const GRID_LIGHT = "#F3F4F6";
const GRID_DARK = "#273244";
const TICK_LIGHT = "#9EA2AE";
const TICK_DARK = "#8891a5";

const TOTAL_COLOR = "#6366f1";
const COMPLETED_COLOR = "#27b77a";
const NOSHOW_COLOR = "#f43f5e";

function fmtXLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return dateStr;
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  return `${mon} ${day}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-surface border border-line px-3 py-2 shadow-lg dark:shadow-none">
      <p className="text-[11px] font-medium text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-text-muted">{p.name}:</span>
          <span className="font-semibold text-text">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

type Props = {
  data: TrendPoint[];
  title?: string;
};

const AppointmentTrendChart: React.FC<Props> = ({
  data,
  title = "Appointment Trend",
}) => {
  const { isDark } = useTheme();
  const GRID = isDark ? GRID_DARK : GRID_LIGHT;
  const TICK = isDark ? TICK_DARK : TICK_LIGHT;

  const rows = useMemo(
    () =>
      (data ?? []).map((p) => ({
        x: fmtXLabel(p.date),
        Total: p.count,
        Completed: p.completedCount,
        "No-Show": p.noShowCount,
      })),
    [data],
  );

  const hasData = rows.some(
    (r) => r.Total > 0 || r.Completed > 0 || r["No-Show"] > 0,
  );

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 min-w-0 flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="text-base font-semibold text-text mb-2">{title}</div>

      {!hasData ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-text-muted">
          No data available for this range
        </div>
      ) : (
        <div className="h-[220px] w-full min-w-0 min-h-[220px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={220}
            initialDimension={{ width: 1, height: 220 }}
          >
            <AreaChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TOTAL_COLOR} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={TOTAL_COLOR} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COMPLETED_COLOR} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={COMPLETED_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="x"
                axisLine={false}
                tickLine={false}
                tick={{ fill: TICK, fontSize: 11, fontWeight: 400 }}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={30}
                tick={{ fill: TICK, fontSize: 11, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />

              <Area
                type="monotone"
                dataKey="Total"
                stroke={TOTAL_COLOR}
                strokeWidth={2}
                fill="url(#totalGrad)"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="Completed"
                stroke={COMPLETED_COLOR}
                strokeWidth={2}
                fill="url(#completedGrad)"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="No-Show"
                stroke={NOSHOW_COLOR}
                strokeWidth={1.5}
                fill="transparent"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AppointmentTrendChart;
