import React from "react";

interface MetricCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  title: string;
  value: string | number;
  change?: string;
  changeType?: "increase" | "decrease";
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  iconBgColor = "bg-teal-50",
  title,
  value,
  change,
  changeType = "increase",
  subtitle = "vs last 7 days",
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`${iconBgColor} w-12 h-12 rounded-xl flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-slate-600">{title}</p>
        <div className="flex items-end justify-between">
          <h3 className="text-2xl font-semibold text-slate-900">{value}</h3>
          {change && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                changeType === "increase" ? "text-green-600" : "text-red-600"
              }`}
            >
              <span>{changeType === "increase" ? "↑" : "↓"}</span>
              <span>{change}</span>
            </div>
          )}
        </div>
        {change && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
