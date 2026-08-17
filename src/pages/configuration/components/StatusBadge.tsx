import React from "react";
import type { ConfigurationStatus } from "../types";

type StatusBadgeProps = {
  status: ConfigurationStatus;
};

const statusConfig: Record<
  ConfigurationStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  active: {
    label: "Active",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  inactive: {
    label: "Inactive",
    dotClass: "bg-default-400",
    textClass: "text-default-500",
  },
  pending: {
    label: "Pending",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-400",
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-default-100 px-2.5 py-0.5 text-[11px] font-semibold dark:bg-default-50/50 ${config.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
