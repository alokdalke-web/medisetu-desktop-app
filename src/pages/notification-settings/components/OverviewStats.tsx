import React from "react";
import { FiBell, FiCheckCircle, FiLink } from "react-icons/fi";

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
}) => {
  // Alpha backgrounds rather than `bg-{color}-50`, which has no dark remap and
  // renders as a bright patch on a dark page (UI_CONVENTIONS.md §2).
  const stats = [
    {
      label: "Notification Types",
      value: totalEvents,
      icon: <FiBell className="h-[18px] w-[18px]" />,
      tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active Channels",
      value: activeChannels,
      icon: <FiCheckCircle className="h-[18px] w-[18px]" />,
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Connected Providers",
      value: connectedProviders,
      icon: <FiLink className="h-[18px] w-[18px]" />,
      tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5"
        >
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${stat.tone}`}
          >
            {stat.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[18px] font-bold text-text">{stat.value}</div>
            <div className="truncate text-[11px] text-text-muted">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OverviewStats;
