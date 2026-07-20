import React from "react";
import { Button } from "@heroui/react";

export type ActivityItem = {
  title: string;
  time: string;
  icon: React.ReactNode;
};

const RecentActivitiesCard: React.FC<{
  title?: string;
  items: ActivityItem[];
  onViewAll?: () => void;
}> = ({ title = "Recent Activities", items}) => {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
      <div className="mb-3 font-semibold text-slate-900">{title}</div>

      <div className="flex-1 space-y-4">
        {items.map((a, idx) => (
          <div key={`${a.title}-${idx}`} className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              {a.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">{a.title}</div>
              <div className="text-xs text-slate-500">{a.time}</div>
            </div>
          </div>
        ))}
      </div>

      <Button
        className="mt-5 w-full"
        variant="bordered"
        radius="lg"
        // onPress={onViewAll}
      >
        View All Activities
      </Button>
    </div>
  );
};

export default RecentActivitiesCard;
