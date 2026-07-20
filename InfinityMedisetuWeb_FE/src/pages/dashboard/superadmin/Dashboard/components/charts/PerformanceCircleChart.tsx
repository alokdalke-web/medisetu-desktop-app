import React from "react";

interface PerformanceCircleChartProps {
  percentage: number;
  label: string;
  size?: "small" | "medium" | "large";
}

/**
 * Performance Circular Progress Chart
 */
const PerformanceCircleChart: React.FC<PerformanceCircleChartProps> = ({
  percentage,
  label,
  size = "medium",
}) => {
  const sizeMap = {
    small: { radius: 40, cx: 50, cy: 50, viewBox: "0 0 100 100" },
    medium: { radius: 50, cx: 60, cy: 60, viewBox: "0 0 120 120" },
    large: { radius: 60, cx: 80, cy: 80, viewBox: "0 0 160 160" },
  };

  const config = sizeMap[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return "rgb(16, 185, 129)";
    if (percentage >= 60) return "rgb(59, 130, 246)";
    if (percentage >= 40) return "rgb(251, 146, 60)";
    return "rgb(239, 68, 68)";
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        viewBox={config.viewBox}
        className="h-40 w-40"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background circle */}
        <circle
          cx={config.cx}
          cy={config.cy}
          r={config.radius}
          fill="none"
          stroke="rgb(226, 232, 240)"
          strokeWidth="8"
        />

        {/* Progress circle */}
        <circle
          cx={config.cx}
          cy={config.cy}
          r={config.radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: `${config.cx}px ${config.cy}px`,
            transition: "stroke-dashoffset 0.35s ease",
          }}
        />

        {/* Text */}
        <text
          x={config.cx}
          y={config.cy - 10}
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          fill="rgb(15, 23, 42)"
        >
          {percentage}%
        </text>
        <text
          x={config.cx}
          y={config.cy + 20}
          textAnchor="middle"
          fontSize="12"
          fill="rgb(100, 116, 139)"
        >
          {label}
        </text>
      </svg>
    </div>
  );
};

export default PerformanceCircleChart;
