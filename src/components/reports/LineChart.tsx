import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface LineChartProps {
  title: string;
  data: {
    labels: string[];
    currentPeriod: number[];
    previousPeriod: number[];
  };
  periodSelector?: React.ReactNode;
}

const CURRENT_COLOR = "#0F766E";
const PREVIOUS_COLOR = "#94a3b8";
const GRID_COLOR = "#f1f5f9";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:bg-[#111726] dark:border-[#273244]">
      <p className="text-[11px] font-medium text-slate-500 mb-1 dark:text-slate-400">
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-slate-600 dark:text-white/70">
            {entry.name}:
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const LineChart: React.FC<LineChartProps> = ({ title, data, periodSelector }) => {
  const chartData = useMemo(() => {
    return data.labels.map((label, index) => ({
      name: label,
      current: data.currentPeriod[index] ?? 0,
      previous: data.previousPeriod[index] ?? 0,
    }));
  }, [data]);

  const yMax = useMemo(() => {
    const max = Math.max(...data.currentPeriod, ...data.previousPeriod, 0);
    if (max <= 0) return 10;
    if (max <= 5) return Math.ceil(max / 5) * 5 || 5;
    if (max <= 10) return 10;
    const pow10 = Math.pow(10, Math.floor(Math.log10(max)));
    const scaled = Math.ceil(max / pow10);
    return (scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * pow10;
  }, [data]);

  return (
    <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 min-h-[240px] sm:min-h-[280px] flex flex-col dark:bg-[#111726] dark:border-[#273244]">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] whitespace-nowrap dark:text-white">
          {title}
        </h3>
        <div className="shrink-0">{periodSelector}</div>
      </div>

      <div className="mb-3 flex items-center gap-4 text-[12px]">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: CURRENT_COLOR }}
          />
          <span className="text-[#677294] dark:text-white/70">This Period</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: PREVIOUS_COLOR }}
          />
          <span className="text-[#677294] dark:text-white/70">
            Previous Period
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full" style={{ minHeight: "150px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke={GRID_COLOR}
              strokeDasharray=""
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9EA2AE", fontSize: 11 }}
              tickMargin={8}
            />
            <YAxis
              domain={[0, yMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              tickMargin={8}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="previous"
              name="Previous Period"
              stroke={PREVIOUS_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              name="This Period"
              stroke={CURRENT_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: CURRENT_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChart;
