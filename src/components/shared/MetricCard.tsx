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
  iconBgColor = "bg-primary/10",
  title,
  value,
  change,
  changeType = "increase",
  subtitle = "vs last 7 days",
}) => {
  return (
    <div className="bg-surface rounded-xl border border-line p-5 hover:shadow-md transition-shadow dark:hover:shadow-none">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`${iconBgColor} w-12 h-12 rounded-xl flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-text-muted">{title}</p>
        <div className="flex items-end justify-between">
          <h3 className="text-2xl font-semibold text-text">{value}</h3>
          {change && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                changeType === "increase"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              <span>{changeType === "increase" ? "↑" : "↓"}</span>
              <span>{change}</span>
            </div>
          )}
        </div>
        {change && (
          <p className="text-xs text-text-subtle">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
