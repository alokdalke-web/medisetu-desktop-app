import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DonutChartItem {
  label: string;
  value: number;
  percentage: string;
  color: string;
  [key: string]: unknown;
}

interface DonutChartProps {
  title: string;
  total: number;
  items: DonutChartItem[];
  centerLabel?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  title,
  total,
  items,
  centerLabel = "Total",
}) => {
  const hasData = useMemo(
    () => items.some((x) => (Number(x.value) || 0) > 0),
    [items]
  );

  return (
    <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 min-h-[240px] sm:min-h-[280px] flex flex-col dark:bg-[#111726] dark:border-[#273244]">
      <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] dark:text-white">
        {title}
      </h3>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-[#677294] text-[13px] dark:text-slate-400">
          No data
        </div>
      ) : (
        <div className="flex-1 flex items-center mt-3">
          <div className="flex flex-col sm:flex-row w-full items-center gap-3 sm:gap-4">
            {/* Donut */}
            <div className="h-[120px] w-[120px] sm:h-[150px] sm:w-[150px] shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {items.map((it, idx) => (
                      <Cell key={`${it.label}-${idx}`} fill={it.color} />
                    ))}
                  </Pie>

                  <text
                    x="50%"
                    y="43%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    className="fill-[#677294] dark:fill-slate-400"
                    fontWeight="400"
                  >
                    {centerLabel}
                  </text>

                  <text
                    x="50%"
                    y="58%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="16"
                    fontWeight="600"
                    className="fill-[#100e1c] dark:fill-white"
                  >
                    {total.toLocaleString()}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-3 min-w-0 flex-1">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-[3px] shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-[12px] text-[#677294] whitespace-nowrap dark:text-slate-400">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[13px] font-semibold text-[#100e1c] dark:text-white">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#677294] ml-1 dark:text-white/60">
                      ({item.percentage})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonutChart;
