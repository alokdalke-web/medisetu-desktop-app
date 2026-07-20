import React from "react";
import { FiActivity } from "react-icons/fi";
import type { ActivityItem } from "../types";

type RecentActivityCardProps = {
  activities: ActivityItem[];
  onViewAll?: () => void;
};

const badgeColors: Record<string, string> = {
  lab: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  pharmacy: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  system: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
};

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  activities,
  onViewAll,
}) => (
  <div className="rounded-2xl border border-default-200 bg-background p-5 dark:border-default-100 sm:p-6">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[13px] font-semibold text-default-700 dark:text-default-200">
        Recent Activity
      </h3>
      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View All
        </button>
      )}
    </div>

    {activities.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-default-100 dark:bg-default-50">
          <FiActivity className="text-default-400" />
        </div>
        <p className="text-[12px] font-medium text-default-500">No recent activity</p>
        <p className="mt-0.5 text-[11px] text-default-400">
          Activity will appear here as you configure your lab and pharmacy.
        </p>
      </div>
    ) : (
      <div className="space-y-1">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-default-50/50 dark:hover:bg-default-50/20"
          >
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-default-800 dark:text-default-200 line-clamp-1">
                  {activity.title}
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColors[activity.badgeColor] ?? badgeColors.system
                    }`}
                >
                  {activity.badge}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-default-400 line-clamp-1">
                {activity.description}
              </p>
              <span className="mt-1 block text-[10px] text-default-300 dark:text-default-500">
                {activity.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default RecentActivityCard;
