import React from "react";
import { Card } from "@heroui/react";
import PerformanceCircleChart from "./charts/PerformanceCircleChart";

interface PerformanceSummarySectionProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Performance Summary Section with circular progress indicators
 */
export const PerformanceSummarySection: React.FC<
  PerformanceSummarySectionProps
> = () => {
  return (
    <div className="space-y-4">
      {/* Overall Growth */}
      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Performance Summary
        </h3>

        <div className="flex flex-col items-center justify-center gap-6">
          <PerformanceCircleChart
            percentage={78}
            label="Overall Growth"
            size="medium"
          />

          <div className="w-full space-y-3">
            {[
              {
                label: "Revenue",
                value: "↑ 6.4%",
                color: "text-red-600",
              },
              {
                label: "Clinics",
                value: "↑ 4.6%",
                color: "text-green-600",
              },
              {
                label: "Subscriptions",
                value: "↑ 8.7%",
                color: "text-green-600",
              },
              {
                label: "Users",
                value: "↑ 12.3%",
                color: "text-green-600",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className={`text-sm font-medium ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Users by Role */}
      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Users by Role
        </h3>
        <div className="space-y-3">
          {[
            { role: "Super Admin", count: 1, percentage: 3.5 },
            { role: "Clinic Admins", count: 23, percentage: 29.5 },
            { role: "Doctors", count: 27, percentage: 34.2 },
            { role: "Receptionists", count: 28, percentage: 35.4 },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.role}</span>
                <span className="text-slate-500">{item.count}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
                  style={{ width: `${item.percentage * 3}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Subscription Plan Distribution */}
      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Subscription by Plan
        </h3>
        <div className="space-y-3">
          {[
            { plan: "Basic", count: 76, percentage: 96.2 },
            { plan: "Pro", count: 5, percentage: 3.8 },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.plan}</span>
                <span className="text-slate-500">{item.count}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
