import React, { useMemo } from "react";
import { Card, CardBody } from "@heroui/react";
import {
  FiX, FiDownload,
  FiUserPlus,
  FiCheckCircle
} from "react-icons/fi";
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import type { RequestCard } from "../types";

interface RequestListSidebarProps {
  cards: RequestCard[];
  isLoading?: boolean;
  selectedCount?: number;
  onBulkApprove?: () => void;
  onBulkReject?: () => void;
  onBulkAssign?: () => void;
  onExportReport?: () => void;
}

interface SidebarStats {
  total: number;
  pending: number;
  approved: number;
  reviewing: number;
  rejected: number;
}

/**
 * Sidebar component for Request List View showing overview and quick actions
 */
export const RequestListSidebar: React.FC<RequestListSidebarProps> = ({
  cards,
  isLoading = false,
  selectedCount = 0,
  onBulkApprove,
  onBulkReject,
  onBulkAssign,
  onExportReport,
}) => {
  const stats = useMemo<SidebarStats>(() => {
    const counts = {
      total: cards.length,
      pending: 0,
      approved: 0,
      reviewing: 0,
      rejected: 0,
    };

    cards.forEach((card) => {
      switch (card.status) {
        case "Pending":
          counts.pending += 1;
          break;
        case "Approved":
          counts.approved += 1;
          break;
        case "Reviewing":
          counts.reviewing += 1;
          break;
        case "Rejected":
          counts.rejected += 1;
          break;
      }
    });

    return counts;
  }, [cards]);

  const getPercentage = (value: number) => {
    if (stats.total === 0) return 0;
    return Math.round((value / stats.total) * 100);
  };

  // Calculate chart segments based on percentages
  const pendingPct = getPercentage(stats.pending);
  const reviewingPct = getPercentage(stats.reviewing);
  const approvedPct = getPercentage(stats.approved);
  const rejectedPct = getPercentage(stats.rejected);

  return (
    <div className="space-y-3">
      {/* Request Overview */}
      <Card className="shadow-sm">
        <CardBody className="gap-3 p-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Request Overview
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Donut Chart */}
            <div className=" grid grid-cols-2  items-center gap-2">
              <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center">                {/* Recharts Pie Chart */}
                <ResponsiveContainer width="100%" height="100%">                  <PieChart>
                  <Pie
                    data={[
                      { name: "Pending", value: stats.pending, color: "#F59E0B" },
                      { name: "Reviewing", value: stats.reviewing, color: "#3B82F6" },
                      { name: "Approved", value: stats.approved, color: "#10B981" },
                      { name: "Rejected", value: stats.rejected, color: "#EF4444" },
                    ]}
                    cx="40%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: "Pending", color: "#F59E0B" },
                      { name: "Reviewing", color: "#3B82F6" },
                      { name: "Approved", color: "#10B981" },
                      { name: "Rejected", color: "#EF4444" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                </ResponsiveContainer>

                {/* Center Text Overlay */}
                <div className="absolute left-8 flex flex-col items-center justify-center gap-0.5">
                  <p className="text-xl font-bold text-slate-900">
                    {stats.total}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    Total
                  </p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full flex-1 space-y-1">              {[
              {
                label: "Pending",
                value: stats.pending,
                percentage: pendingPct,
                color: "bg-amber-500",
              },
              {
                label: "Reviewing",
                value: stats.reviewing,
                percentage: reviewingPct,
                color: "bg-blue-500",
              },
              {
                label: "Approved",
                value: stats.approved,
                percentage: approvedPct,
                color: "bg-green-500",
              },
              {
                label: "Rejected",
                value: stats.rejected,
                percentage: rejectedPct,
                color: "bg-red-500",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                  <span className="text-xs font-medium text-slate-600">
                    {item.label}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 whitespace-nowrap">                    {item.value} ({item.percentage}%)
                </span>
              </div>
            ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Workload Overview */}
      <Card className="border border-slate-200 shadow-sm rounded-xl">
        <CardBody className="p-2.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Workload Overview
            </h3>
            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Last 7 Days
              <span className="text-xs">▼</span>
            </button>
          </div>

          {/* Stats */}
          <div>
            {[
              {
                label: "New Requests",
                value: `+${stats.pending}`,
                color: "text-emerald-500",
                lineColor: "#22C55E",
                data: [28, 30, 29, 35, 32, 39, 36],
              },
              {
                label: "Approved",
                value: `+${stats.approved}`,
                color: "text-emerald-500",
                lineColor: "#22C55E",
                data: [32, 25, 33, 24, 25, 38, 32],
              },
              {
                label: "Rejected",
                value: `+${stats.rejected}`,
                color: "text-red-500",
                lineColor: "#EF4444",
                data: [25, 28, 22, 30, 23, 36, 27],
              },
              {
                label: "Avg. Response Time",
                value: "1.2 Days",
                color: "text-violet-500",
                lineColor: "#A855F7",
                data: [14, 10, 15, 18, 20, 34, 24],
              },
            ].map((item, index, arr) => (
              <div key={item.label}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2">
                  {/* Left Section */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                    <span className="text-xs font-medium text-slate-600 truncate">
                      {item.label}
                    </span>
                    <span className={`text-xs font-semibold ${item.color} whitespace-nowrap`}>
                      {item.value}
                    </span>
                  </div>

                  {/* Sparkline */}
                  <div className="w-full sm:w-20 h-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={item.data.map((v) => ({ value: v }))}
                      >
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={item.lineColor}
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {index !== arr.length - 1 && (
                  <div className="border-b border-slate-100" />
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardBody className="gap-2 p-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Quick Actions
          </h3>

          {selectedCount > 0 && (
            <div className="mb-2 rounded-lg bg-blue-50 p-2">
              <p className="text-xs font-medium text-blue-700">
                {selectedCount} request{selectedCount !== 1 ? "s" : ""} selected
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            {[
              {
                label: "Assign Requests",
                icon: FiUserPlus,
                color: "text-slate-600",
                onClick: onBulkAssign,
                disabled: selectedCount === 0,
              },
              {
                label: "Bulk Approve",
                icon: FiCheckCircle,
                color: "text-green-600",
                onClick: onBulkApprove,
                disabled: selectedCount === 0,
              },
              {
                label: "Bulk Reject",
                icon: FiX,
                color: "text-red-600",
                onClick: onBulkReject,
                disabled: selectedCount === 0,
              },
              {
                label: "Export Report",
                icon: FiDownload,
                color: "text-slate-600",
                onClick: onExportReport,
                disabled: selectedCount === 0,
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white p-2 transition-all hover:border-slate-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={action.disabled || isLoading}
                  onClick={action.onClick}
                  title={action.disabled ? "Select items first" : action.label}
                >
                  <Icon className={`h-4 w-4 ${action.color}`} />
                  <span className="text-center text-xs font-medium text-slate-700 line-clamp-2">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default RequestListSidebar;
