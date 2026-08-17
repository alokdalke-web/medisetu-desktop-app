import React from "react";

interface GrowthMetric {
  label: string;
  value: string | number;
  change: string;
  changeType: "increase" | "decrease";
}

interface GrowthSummaryCardProps {
  title: string;
  metrics: GrowthMetric[];
  yearlyGrowth: {
    label: string;
    value: string;
    change: string;
  };
  insight?: {
    icon: React.ReactNode;
    title: string;
    description: string;
  };
  chartData?: number[];
}

// Simple sparkline SVG from data points
const Sparkline: React.FC<{ data: number[]; className?: string }> = ({
  data,
  className = "",
}) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 48;
  const w = 120;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`shrink-0 ${className}`}
      fill="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F766E" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path
        d={linePath}
        stroke="#0F766E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const GrowthSummaryCard: React.FC<GrowthSummaryCardProps> = ({
  title,
  metrics,
  yearlyGrowth,
  insight,
  chartData = [],
}) => {
  return (
    <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
      <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] mb-4 sm:mb-5 dark:text-white">
        {title}
      </h3>

      <div className="flex flex-col xl:flex-row xl:items-center gap-5">
        {/* Metrics */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-6 min-w-0">
          {metrics.map((metric, index) => (
            <div key={index} className="min-w-0">
              <p className="text-[11px] text-[#677294] whitespace-nowrap dark:text-white/60">
                {metric.label}
              </p>
              <p className="text-[20px] font-semibold text-[#100e1c] leading-7 mt-0.5 dark:text-white">
                {metric.value}
              </p>
              {metric.change && (
                <div
                  className={`flex items-center gap-0.5 text-[11px] font-medium mt-0.5 ${
                    metric.changeType === "increase"
                      ? "text-[#27b77a]"
                      : "text-[#e5484d]"
                  }`}
                >
                  <span>
                    {metric.changeType === "increase" ? "↑" : "↓"}
                  </span>
                  <span>{metric.change}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden xl:block w-px h-[56px] bg-[#e5e7ea] shrink-0 dark:bg-[#273244]" />

        {/* Yearly Growth + Sparkline */}
        <div className="flex items-center gap-4 shrink-0">
          <div>
            <p className="text-[11px] text-[#677294] whitespace-nowrap dark:text-white/60">
              {yearlyGrowth.label}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[22px] font-bold text-[#27b77a]">
                ↑ {yearlyGrowth.value}
              </span>
            </div>
            <p className="text-[11px] text-[#677294] mt-0.5 dark:text-white/60">
              {yearlyGrowth.change}
            </p>
          </div>

          {chartData.length > 0 && <Sparkline data={chartData} />}
        </div>

        {/* Divider */}
        {insight && (
          <div className="hidden xl:block w-px h-[56px] bg-[#e5e7ea] shrink-0 dark:bg-[#273244]" />
        )}

        {/* Insight */}
        {insight && (
          <div className="flex items-start gap-2.5 bg-[#e6fbf7] p-3 rounded-xl shrink-0 max-w-[240px] dark:bg-[#16352f]">
            <div className="text-[#0a6c74] mt-0.5 shrink-0 dark:text-[#9be7dc]">
              {insight.icon}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#100e1c] dark:text-white">
                {insight.title}
              </p>
              <p className="text-[11px] text-[#677294] mt-0.5 leading-[15px] dark:text-white/70">
                {insight.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrowthSummaryCard;
