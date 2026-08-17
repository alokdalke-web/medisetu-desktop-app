import React from "react";
import { Chip } from "@heroui/react";

const getClasses = (count: number) => {
  if (count === 1) return "!bg-surface-muted !text-text-muted";
  if (count === 2) return "!bg-yellow-500/10 !text-yellow-700 dark:!text-yellow-400";
  if (count === 3) return "!bg-orange-500/10 !text-orange-700 dark:!text-orange-400";
  return "!bg-red-500/10 !text-red-700 dark:!text-red-400";
};

const NoShowCountBadge: React.FC<{ count: number }> = ({ count }) => (
  <Chip
    variant="dot"
    classNames={{
      base: ["h-auto rounded-md border-none px-3 py-1.5", getClasses(count)].join(" "),
      content: "text-xs font-medium",
      dot: "w-1.5 h-1.5 !bg-current",
    }}
  >
    {count} No-Show{count > 1 ? "s" : ""}
  </Chip>
);

export default NoShowCountBadge;
