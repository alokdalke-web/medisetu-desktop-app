import React from "react";
import type { ConfigurationStat } from "../types";

type ConfigurationSummaryProps = {
  title: string;
  stats: ConfigurationStat[];
};

const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({
  title,
  stats,
}) => (
  <div className="rounded-2xl border border-default-200 bg-background p-5 dark:border-default-100 sm:p-6">
    <h3 className="mb-4 text-[13px] font-semibold text-default-700 dark:text-default-200">{title}</h3>
    <div className="stats-scroll">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl bg-default-50 px-3 py-2.5 dark:bg-default-50/30"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            {stat.icon}
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-default-900 dark:text-white">
              {stat.value}
            </div>
            <div className="truncate text-[11px] text-default-400">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ConfigurationSummary;
