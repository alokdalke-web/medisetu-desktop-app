import React from "react";
import { Chip } from "@heroui/react";
import type { NoShowAction } from "../../../../types/noshow";

// Same dot-chip visual language as the shared StatusChip
// (components/shared/StatusChip.tsx) used for every other table's status
// column — no border, colored fill, small leading dot — not a bordered
// outline pill. See UI_REMEDIATION_LOG.md #32.
const getConfig = (action: NoShowAction) => {
  switch (action) {
    case "warning":
      return {
        classes: "!bg-yellow-500/10 !text-yellow-700 dark:!text-yellow-400",
        label: "Warning Issued",
      };
    case "penalty":
      return {
        classes: "!bg-orange-500/10 !text-orange-700 dark:!text-orange-400",
        label: "Penalty Applied",
      };
    case "advance_required":
      return {
        classes: "!bg-primary/10 !text-primary",
        label: "Advance Required",
      };
    case "blocked":
      return {
        classes: "!bg-red-500/10 !text-red-700 dark:!text-red-400",
        label: "Patient Blocked",
      };
    case "no-show":
    default:
      return {
        classes: "!bg-surface-muted !text-text-muted",
        label: "No-Show",
      };
  }
};

const ActionStatusChip: React.FC<{ action: NoShowAction }> = ({ action }) => {
  const config = getConfig(action);
  return (
    <Chip
      variant="dot"
      classNames={{
        base: ["h-auto rounded-md border-none px-3 py-1.5", config.classes].join(" "),
        content: "text-xs font-medium",
        dot: "w-1.5 h-1.5 !bg-current",
      }}
    >
      {config.label}
    </Chip>
  );
};

export default ActionStatusChip;
