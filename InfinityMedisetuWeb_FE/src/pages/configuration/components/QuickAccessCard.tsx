import React from "react";
import type { QuickAccessItem } from "../types";

type QuickAccessCardProps = {
  item: QuickAccessItem;
};

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ item }) => (
  <button
    type="button"
    onClick={item.onClick}
    className="group flex items-center gap-3 rounded-xl border border-default-200 bg-background px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-default-50/50 dark:border-default-100 dark:hover:bg-default-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
  >
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-default-100 text-default-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-default-50/50">
      {item.icon}
    </span>
    <div className="min-w-0">
      <div className="text-[12px] font-semibold text-default-800 dark:text-default-200 group-hover:text-primary">
        {item.label}
      </div>
      <div className="truncate text-[11px] text-default-400">
        {item.description}
      </div>
    </div>
  </button>
);

export default QuickAccessCard;
