import React from "react";
import { Card, CardBody } from "@heroui/react";
import { FiArrowUpRight, FiArrowDownRight } from "react-icons/fi";

interface KpiCardsProps {
  title: string;
  value: number | string;
  description?: string;
  percentage?: number;
  icon: React.ReactNode;
  iconBg?: string;
  progressColor?: string;
  loading?: boolean;
  showProgress?: boolean;
  className?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  chartData?: number[]; // Array of values for mini chart
  /** When true, renders a compact horizontal layout with a right chevron arrow */
  compact?: boolean;
}

const KpiCards: React.FC<KpiCardsProps> = ({
  title,
  value,
  description,
  percentage = 0,
  icon,
  iconBg = "bg-warning-50",
  progressColor = "bg-warning",
  loading = false,
  showProgress = true,
  className = "",
  change,
  chartData,
  compact = false,
}) => {
  // Generate SVG sparkline chart
  const renderSparkline = (data: number[]) => {
    if (!data || data.length < 2) return null;

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    const pointWidth = 100 / (data.length - 1);

    const points = data.map((val, idx) => {
      const x = idx * pointWidth;
      const y = 100 - ((val - minValue) / range) * 80 - 10;
      return `${x},${y}`;
    });

    return (
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full">
        <defs>
          <linearGradient id={`grad-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M ${points.join(" L ")}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${points[0]} L ${points.join(" L ")} L 100,30 L 0,30 Z`}
          fill={`url(#grad-${title})`}
        />
      </svg>
    );
  };

  return (
    <Card
      shadow="sm"
      className={`
        w-full
        rounded-xl
        border border-slate-200
        bg-white
        shadow-sm
        hover:shadow-md
        transition-shadow
        ${className}
      `}
    >
      <CardBody>
        {loading ? (
          <div className="animate-pulse">
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-6 w-12 rounded bg-slate-200" />
              </div>
            </div>
            {showProgress && (
              <div className="mt-3 h-1 w-full rounded-full bg-slate-200" />
            )}
          </div>
        ) : compact ? (
          /* ── Compact horizontal layout ── */
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
            >
              {icon}
            </div>

            {/* Content: Title, Value, Description */}
            <div className="flex-1 min-w-0">
              <p className="text-xs 2xl:text-sm font-medium text-slate-500 truncate">
                {title}
              </p>
              <h3 className="text-lg 2xl:text-2xl font-bold leading-tight text-slate-900 mt-0.5">
                {value}
              </h3>
              {description && (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ── Default vertical layout with progress bar ── */
          <div className="flex flex-col gap-2">
            {/* Top Section: Icon on left, Title and Value on right */}
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={`
                  flex h-10 w-10 shrink-0 items-center justify-center
                  rounded-lg ${iconBg}
                `}
              >
                {icon}
              </div>

              {/* Content: Title and Value on the right */}
              <div className="flex-1 space-y-1">
                <p className="text-xs 2xl:text-sm font-medium text-slate-500">
                  {title}
                </p>
                <h3 className="text-lg 2xl:text-2xl font-bold leading-none text-slate-900">
                  {value}
                </h3>
              </div>
            </div>

            {/* Right side content: Description and Progress */}
            <div className="space-y-1">
              {/* Description */}
              {description && (
                <p className="text-xs text-slate-500">
                  {description}
                </p>
              )}

              {/* Mini Chart */}
              {chartData && (
                <div className="text-blue-500">
                  {renderSparkline(chartData)}
                </div>
              )}

              {/* Progress Bar and Percentage */}
              {showProgress && !chartData && (
                <div className="space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Change indicator */}
              {change && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${change.isPositive ? "text-green-600" : "text-red-600"
                    }`}
                >
                  {change.isPositive ? (
                    <FiArrowUpRight className="h-3 w-3" />
                  ) : (
                    <FiArrowDownRight className="h-3 w-3" />
                  )}
                  {change.value}%
                </div>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default KpiCards;
