import React from "react";

interface ProgressCircleProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  percent,
  size = 133,
  strokeWidth = 8,
  label,
  sublabel,
  className = "",
}) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashArray = `${(percent / 100) * circumference} ${circumference}`;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="absolute h-full w-full -rotate-90 transform"
        viewBox="0 0 100 100"
      >
        <circle
          className="text-[#E8F6F4]"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          className="text-[#0A6C74] transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
      </svg>
      <div className="relative flex flex-col items-center">
        {label !== undefined ? (
          <span className="text-2xl font-bold text-[#0A6C74]">{label}</span>
        ) : (
          <span className="text-2xl font-bold text-[#0A6C74]">{percent}%</span>
        )}
        {sublabel && (
          <span className="text-sm font-medium text-[#100E1C]">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressCircle;
