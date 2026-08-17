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
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-default-100 dark:bg-background sm:p-6">
    <h3 className="mb-4 text-[13px] font-semibold text-slate-700 dark:text-default-200">{title}</h3>
    <div className="stats-scroll">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-default-100 dark:bg-background"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            {stat.icon}
          </span>
          <div className="min-w-0">
            <div className="text-[18px] font-bold text-slate-900 dark:text-white">
              {stat.value}
            </div>
            <div className="truncate text-[11px] text-slate-500">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ConfigurationSummary;
