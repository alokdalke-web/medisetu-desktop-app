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
  className?: string;
  /** Empty-state copy. Defaults are generic because this card is shared by the
   *  admin, doctor, reception, superadmin and pharmacy dashboards. */
  emptyTitle?: string;
  emptyHint?: string;
};

const DonutOverviewCard: React.FC<Props> = ({
  title,
  centerLabel,
  items,
  className = "",
  emptyTitle = "Nothing to show yet",
  emptyHint = "This breakdown appears once there's activity in the selected period.",
}) => {
  const total = useMemo(
    () => (items ?? []).reduce((a, b) => a + (Number(b.value) || 0), 0),
    [items]
  );

  const hasData = (items ?? []).some((x) => (Number(x.value) || 0) > 0);

  return (
    <div className={`rounded-2xl border border-line bg-surface px-4 py-3 sm:px-5 sm:py-4 flex flex-col w-full shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="text-base font-semibold text-text">
        {title}
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6 text-center">
          {/* A greyed-out ring, so the empty card still reads as "this is a
              donut chart" rather than as a failed/blank panel. */}
          <div
            className="h-16 w-16 rounded-full border-[6px] border-line"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1">
            <p className="text-[13px] font-medium text-text-muted">
              {emptyTitle}
            </p>
            <p className="text-[12px] text-text-subtle max-w-[220px]">
              {emptyHint}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col md:flex-row w-full items-center md:items-center gap-4 md:gap-8 justify-center py-2">
            {/* Donut */}
            <div className="h-36 w-36 sm:h-44 sm:w-44 shrink-0 relative min-h-36 min-w-36 sm:min-h-44 sm:min-w-44">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={140}
                minHeight={140}
                initialDimension={{ width: 140, height: 140 }}
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
                    y="42%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    className="fill-text-muted"
                    fontWeight="500"
                  >
                    {centerLabel}
                  </text>

                  <text
                    x="50%"
                    y="59%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="22"
                    fontWeight="700"
                    className="fill-text"
                  >
                    {total}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2.5 min-w-0 flex-1 w-full md:w-auto">
              {items.map((it) => {
                const pct = total > 0 ? ((Number(it.value) || 0) / total * 100).toFixed(1) : "0.0";
                return (
                  <div
                    key={it.label}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <span
                      className="2xl:h-2.5 2xl:w-2.5 h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: it.color }}
                    />
                    <span className="text-sm text-text-muted min-w-0 flex-1 truncate">
                      {it.label}
                    </span>
                    <span className="text-sm font-semibold text-text flex-shrink-0">
                      {Number(it.value) || 0}{" "}
                      <span className="text-xs font-normal text-text-subtle">({pct}%)</span>
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
