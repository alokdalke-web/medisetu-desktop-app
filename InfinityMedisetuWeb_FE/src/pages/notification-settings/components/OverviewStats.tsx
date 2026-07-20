import React from "react";
import { FiBell, FiCheckCircle, FiLink, FiFileText } from "react-icons/fi";

type OverviewStatsProps = {
  totalEvents: number;
  activeChannels: number;
  connectedProviders: number;
  templates: number;
};

const OverviewStats: React.FC<OverviewStatsProps> = ({
  totalEvents,
  activeChannels,
  connectedProviders,
  templates,
}) => {
  const stats = [
    { label: "Notification Types", value: totalEvents, icon: <FiBell className="text-[18px]" />, color: "bg-blue-50 text-blue-600" },
    { label: "Active Channels", value: activeChannels, icon: <FiCheckCircle className="text-[18px]" />, color: "bg-emerald-50 text-emerald-600" },
    { label: "Connected Providers", value: connectedProviders, icon: <FiLink className="text-[18px]" />, color: "bg-purple-50 text-purple-600" },
    { label: "Templates Configured", value: templates, icon: <FiFileText className="text-[18px]" />, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="stats-scroll">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
        >
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${stat.color}`}>
            {stat.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[18px] font-bold text-slate-900">{stat.value}</div>
            <div className="truncate text-[11px] text-slate-500">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OverviewStats;
