import React from "react";
import { Card, Button } from "@heroui/react";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiArrowUpRight,
} from "react-icons/fi";
import { AiOutlineFile } from "react-icons/ai";

/**
 * Recent Activities Section showing latest platform events
 */
export const RecentActivitiesSection: React.FC = () => {
  const activities = [
    {
      icon: FiCheckCircle,
      color: "bg-green-100",
      textColor: "text-green-600",
      title: "New clinic registered",
      subtitle: "Green Medical Center",
      time: "2 mins ago",
    },
    {
      icon: FiCheckCircle,
      color: "bg-green-100",
      textColor: "text-green-600",
      title: "Payment received",
      subtitle: "₹5000 from Sunrise Medical Center",
      time: "15 mins ago",
    },
    {
      icon: FiAlertCircle,
      color: "bg-amber-100",
      textColor: "text-amber-600",
      title: "Pending approval",
      subtitle: "New Plan by Green Valley Clinic",
      time: "1 hour ago",
    },
    {
      icon: AiOutlineFile,
      color: "bg-blue-100",
      textColor: "text-blue-600",
      title: "Clinic verification pending",
      subtitle: "Health Plus Clinic",
      time: "3 hours ago",
    },
  ];

  return (
    <Card className="border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">
          Recent Activities
        </h3>
        <Button
          isIconOnly
          variant="light"
          className="text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
            >
              {/* Icon */}
              <div className={`rounded-lg p-2 flex-shrink-0 ${activity.color}`}>
                <Icon className={`h-4 w-4 ${activity.textColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {activity.subtitle}
                </p>
              </div>

              {/* Time */}
              <div className="flex-shrink-0">
                <p className="text-xs text-slate-500 whitespace-nowrap">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      <Button
        fullWidth
        variant="flat"
        className="mt-4 text-slate-700 font-medium"
        endContent={<FiArrowUpRight className="h-4 w-4" />}
      >
        View All Activities
      </Button>
    </Card>
  );
};
