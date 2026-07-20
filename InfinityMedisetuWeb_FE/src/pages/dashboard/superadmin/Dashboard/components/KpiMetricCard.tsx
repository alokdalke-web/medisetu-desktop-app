import React from "react";
import { Card } from "@heroui/react";
import { FiArrowUpRight, FiArrowDownRight } from "react-icons/fi";

interface KpiMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  change: string;
  changeType: "positive" | "negative";
  period: string;
  chartColor: string;
}

/**
 * Individual KPI Metric Card with icon, value, and change indicator
 */
const KpiMetricCard: React.FC<KpiMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  change,
  changeType,
  period,
  chartColor,
}) => {
  return (
    <Card className="border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header: Icon and Title */}
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-2.5 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">{title}</p>
          </div>
        </div>

        {/* Value */}
        <div className="space-y-0.5">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>

        {/* Change and Period */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{period}</span>
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              changeType === "positive"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {changeType === "positive" ? (
              <FiArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <FiArrowDownRight className="h-3.5 w-3.5" />
            )}
            {change}
          </div>
        </div>

        {/* Mini Chart/Progress Bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full w-2/3 ${chartColor}`} />
        </div>
      </div>
    </Card>
  );
};

export default KpiMetricCard;
