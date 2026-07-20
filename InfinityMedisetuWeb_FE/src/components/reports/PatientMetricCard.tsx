import React from "react";

interface PatientMetricCardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  label: string;
  value: string | number;
  change: string;
  changeType: "increase" | "decrease";
  subtitle?: string;
  tooltip?: string;
}

const PatientMetricCard: React.FC<PatientMetricCardProps> = ({
  icon,
  iconBgColor,
  label,
  value,
  change,
  changeType,
  subtitle = "vs last 7 days",
}) => {
  const isUp = changeType === "increase";

  return (
    <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] px-3 py-3 sm:px-4 sm:py-3.5 hover:shadow-md transition-shadow flex flex-col gap-2 min-h-[104px] dark:bg-[#111726] dark:border-[#273244]">
      <div className="flex items-center gap-2.5">
        <div
          className={`${iconBgColor} h-9 w-9 rounded-lg flex items-center justify-center shrink-0 dark:bg-opacity-20`}
        >
          {icon}
        </div>
        <span className="text-[13px] font-medium text-[#677294] leading-tight dark:text-white/70">
          {label}
        </span>
      </div>

      <div className="flex items-end justify-between mt-auto">
        <span className="text-[20px] sm:text-[22px] font-semibold text-[#100e1c] leading-7 truncate dark:text-white">
          {value}
        </span>
        <div
          className={`flex items-center gap-0.5 text-[11px] font-medium shrink-0 ${
            isUp ? "text-[#27b77a]" : "text-[#e5484d]"
          }`}
        >
          <span>{isUp ? "↑" : "↓"}</span>
          <span>{change}</span>
        </div>
      </div>

      <p className="text-[10px] text-[rgba(103,114,148,0.6)] dark:text-white/50">
        {subtitle}
      </p>
    </div>
  );
};

export default PatientMetricCard;
