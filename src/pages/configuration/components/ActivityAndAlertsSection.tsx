import React from "react";
import { FiUser } from "react-icons/fi";
import { MdOutlineBiotech, MdOutlineMedication } from "react-icons/md";
import type { LabActivityItem, PharmacyActivityItem, PharmaLabActiveUser } from "../types";

type ActivityAndAlertsSectionProps = {
  labActivities: LabActivityItem[];
  pharmacyActivities: PharmacyActivityItem[];
  activeUsers: PharmaLabActiveUser[];
};

const ActivityAndAlertsSection: React.FC<ActivityAndAlertsSectionProps> = ({
  labActivities,
  pharmacyActivities,
  activeUsers,
}) => {
  const getLabStatusBadgeClass = (status: LabActivityItem["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";
      case "Pending":
        return "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-100";
    }
  };

  const getPharmStatusBadgeClass = (status: PharmacyActivityItem["status"]) => {
    switch (status) {
      case "In Stock":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";
      case "Low Stock":
        return "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-100";
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Recent Lab Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-default-100 dark:bg-background sm:p-6 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-default-100/50">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Recent Lab Activity
          </h3>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {labActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-default-400 text-xs">
              No recent activity
            </div>
          ) : (
            labActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${act.iconColor}`}>
                    <MdOutlineBiotech className="text-base" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-white truncate">
                      {act.title}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-default-400 mt-0.5 truncate">
                      {act.subtitle}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getLabStatusBadgeClass(act.status)}`}>
                    {act.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {act.timestamp.replace("Today, ", "").replace("Yesterday, ", "")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Pharmacy Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-default-100 dark:bg-background sm:p-6 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-default-100/50">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Recent Pharmacy Activity
          </h3>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {pharmacyActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-default-400 text-xs">
              No recent activity
            </div>
          ) : (
            pharmacyActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${act.iconColor}`}>
                    <MdOutlineMedication className="text-base" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-white truncate">
                      {act.title}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-default-400 mt-0.5 truncate">
                      {act.subtitle}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getPharmStatusBadgeClass(act.status)}`}>
                    {act.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {act.timestamp.replace("Today, ", "").replace("Yesterday, ", "")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lab and Pharma Active Users */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-default-100 dark:bg-background sm:p-6 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-default-100/50">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Lab and Pharma Active Users
          </h3>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {activeUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-default-400 text-xs">
              No active users found
            </div>
          ) : (
            activeUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-teal-500 bg-teal-50 border border-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/30">
                    <FiUser className="text-base" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-default-400 mt-0.5 truncate">
                      {user.email || user.mobile}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30">
                    {user.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {user.createdAt}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityAndAlertsSection;
