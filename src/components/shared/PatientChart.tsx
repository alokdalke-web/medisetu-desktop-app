import React, { useId, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { FiChevronDown } from "react-icons/fi";

const BLUE = "#3b82f6";
const GRID = "#e5e7eb";
const TICK = "#6b7280";

export type ChartPoint = { month: string; visits: number };

interface Props {
  data: ChartPoint[];  
  title?: string;
}

function niceMax(n: number) {
  if (n <= 0) return 10;
  const pow10 = Math.pow(10, Math.floor(Math.log10(n)));
  const scaled = Math.ceil(n / pow10);
  const nice = (scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * pow10;
  return nice;
}

const PatientChart: React.FC<Props> = ({ data, title = "Patient Visit" }) => {
  const gid = useId();

  const yMax = useMemo(
    () => niceMax(Math.max(0, ...data.map((d) => d.visits))),
    [data]
  );
  const ticks = useMemo(() => {
    const step = yMax / 4;
    return [0, step, step * 2, step * 3, yMax].map((v) => Math.round(v));
  }, [yMax]);

  return (
    <div className="mt-5 rounded-2xl border border-gray-300 bg-white p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-500 sm:inline">Sort by</span>
          <div className="relative">
            <select
              className="h-9 appearance-none rounded-full border border-gray-300 bg-white px-3 pr-8 text-sm outline-none"
              defaultValue="Monthly"
              disabled
              title="Backend provides monthly series"
            >
              <option>Monthly</option>
              <option>Weekly</option>
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`visitsGradient-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0.06} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: TICK, fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              tick={{ fill: TICK, fontSize: 12 }}
              tickMargin={10}
            />
            <Tooltip cursor={{ stroke: GRID }} contentStyle={{ borderRadius: 12, borderColor: GRID }} />

            <Area
              type="monotone"
              dataKey="visits"
              stroke="none"
              fill={`url(#visitsGradient-${gid})`}
              baseValue={0}
            />

            <Line
              type="monotone"
              dataKey="visits"
              stroke={BLUE}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PatientChart;
