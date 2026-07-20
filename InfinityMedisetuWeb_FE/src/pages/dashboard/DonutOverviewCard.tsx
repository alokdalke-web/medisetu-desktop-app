// src/pages/dashboard/DonutOverviewCard.tsx
import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export type DonutItem = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  centerLabel: string;
  items: DonutItem[];
};

const DonutOverviewCard: React.FC<Props> = ({ title, centerLabel, items }) => {
  const total = useMemo(
    () => (items ?? []).reduce((a, b) => a + (Number(b.value) || 0), 0),
    [items]
  );

  const hasData = (items ?? []).some((x) => (Number(x.value) || 0) > 0);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-2 sm:px-5 sm:py-2 flex flex-col w-full shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="text-base font-semibold text-slate-900">
        {title}
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          No data available
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center md:justify-start">
          <div className="flex flex-col md:flex-row w-full items-center md:items-start gap-3 md:gap-4">
            {/* Donut */}
            <div className="h-28 w-28 sm:h-32 sm:w-32 shrink-0 relative min-h-28 min-w-28 sm:min-h-32 sm:min-w-32">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={112}
                minHeight={112}
                initialDimension={{ width: 112, height: 112 }}
              >
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
                    isAnimationActive={false}
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
                    className="fill-slate-500"
                    fontWeight="500"
                  >
                    {centerLabel}
                  </text>

                  <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="18"
                    fontWeight="700"
                    className="fill-slate-900"
                  >
                    {total}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="m-auto flex flex-col 2xl:gap-2 gap-0 min-w-0 flex-1 w-full md:w-auto">
              {items.map((it) => {
                const pct = total > 0 ? ((Number(it.value) || 0) / total * 100).toFixed(1) : "0.0";
                return (
                  <div
                    key={it.label}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <span
                      className="2xl:h-2.5 2xl:w-2.5  h-1 w-1 rounded-full shrink-0"
                      style={{ background: it.color }}
                    />
                    <span className="text-xs md:text-xs text-slate-600 min-w-0 flex-1 truncate">
                      {it.label}
                    </span>
                    <span className="text-xs md:text-sm font-semibold text-slate-900 flex-shrink-0">
                      {Number(it.value) || 0}{" "}
                      <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonutOverviewCard;
