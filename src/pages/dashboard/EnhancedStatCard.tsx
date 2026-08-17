// src/pages/dashboard/EnhancedStatCard.tsx
import React, { useMemo } from "react";
import { Card, CardBody } from "@heroui/react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export type SparklinePoint = {
  value: number;
};

type Props = {
  id?: string;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: number;
  comparisonText?: string;
  sparklineData?: SparklinePoint[];
  tileBg: string;
  iconColor: string;
  trendColor?: string;
  isComingSoon?: boolean;
};

const EnhancedStatCard: React.FC<Props> = ({
  id,
  icon,
  label,
  value,
  delta,
  comparisonText = "vs last 7 days",
  sparklineData = [],
  tileBg,
  iconColor,
  trendColor,
  isComingSoon,
}) => {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = (delta ?? 0) >= 0;

  const deltaAbs = showDelta ? Math.round(Math.abs(delta as number)) : 0;
  const deltaClass = trendColor || (isUp ? "text-emerald-600" : "text-rose-600");

  // Determine sparkline color based on trend
  const sparklineColor = useMemo(() => {
    if (trendColor) {
      if (trendColor.includes("emerald")) return "#10B981";
      if (trendColor.includes("rose")) return "#F43F5E";
      if (trendColor.includes("amber")) return "#F59E0B";
      if (trendColor.includes("purple")) return "#A855F7";
      if (trendColor.includes("blue")) return "#3B82F6";
    }
    return isUp ? "#10B981" : "#F43F5E";
  }, [trendColor, isUp]);

  const hasSparklineData = sparklineData && sparklineData.length > 0;

  return (
    <Card
      id={id}
      radius="lg"
      shadow="none"
      className="
        relative overflow-hidden border border-slate-200/80 bg-white
        rounded-2xl transition-all duration-200 hover:border-slate-300
        hover:shadow-md
      "
    >
      <CardBody className="space-y-2">
        {/* Header: Icon + Label */}
        <div className="flex items-center gap-4">
          <div
            className={[
              "2xl:h-10 2xl:w-10 h-5 w-5 rounded-xl",
              "flex items-center justify-center shrink-0",
              "transition-transform duration-200",
              tileBg,
              iconColor,
            ].join(" ")}
          >
            <span className="text-xl">{icon}</span>
          </div>

          <div className="text-xs 2xl:text-sm font-medium text-slate-500 uppercase tracking-wider leading-snug">
            {label}
          </div>
        </div>

        {/* Main Value */} 
        <div className="">
          <div className="text-xl font-bold text-slate-900 truncate">
            {value}
          </div>
        </div>

        {/* Delta + Comparison Text */}
        <div className="flex items-center gap-2 flex-wrap">
          {showDelta && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${deltaClass}`}>
              <span className="translate-y-[2px]">{isUp ? "↑" : "↓"}</span>
              <span>{deltaAbs}%</span>
            </div>
          )}
          {comparisonText && (
            <span className="text-xs text-slate-500">{comparisonText}</span>
          )}
        </div>

        {/* Sparkline Chart */}
        {hasSparklineData && (
          <div className="2xl:h-10  h-6 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`sparklineGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  fill={`url(#sparklineGrad-${id})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>

      {isComingSoon && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            Coming Soon
          </div>
        </div>
      )}
    </Card>
  );
};

export default EnhancedStatCard;
