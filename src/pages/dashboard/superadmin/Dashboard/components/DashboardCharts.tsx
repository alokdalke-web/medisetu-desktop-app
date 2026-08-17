import React from "react";
import { Card } from "@heroui/react";
import { FiTrendingUp, FiFilter } from "react-icons/fi";
import RevenueChart from "./charts/RevenueChart";
import ClinicTrendsChart from "./charts/ClinicTrendsChart";

interface DashboardChartsProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Dashboard Charts Section with Revenue, Trends, and Performance data
 */
export const DashboardCharts: React.FC<DashboardChartsProps> = () => {
  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Revenue Overview</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">₹4,256</p>
              <p className="mt-1 text-xs text-slate-500">Total Revenue</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600 mb-2">This Week</p>
              <p className="flex items-center gap-1 text-sm font-medium text-green-600">
                <FiTrendingUp className="h-4 w-4" />
                +12.4% vs last week
              </p>
            </div>
          </div>
          <RevenueChart />
        </div>
      </Card>

      {/* Clinic Registration Trends */}
      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Clinic Registration Trends
            </h3>
            <button className="rounded-lg bg-slate-100 p-2 hover:bg-slate-200 transition-colors">
              <FiFilter className="h-4 w-4 text-slate-600" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-teal-500" />
              <span className="text-xs font-medium text-slate-600">On Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-slate-600">Delay</span>
            </div>
          </div>
          <ClinicTrendsChart />
        </div>
      </Card>
    </div>
  );
};
