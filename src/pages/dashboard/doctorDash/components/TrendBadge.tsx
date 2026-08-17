// src/pages/dashboard/doctorDash/components/TrendBadge.tsx
import React from "react";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

export const TrendBadge: React.FC<{ percent?: number }> = ({ percent }) => {
  if (typeof percent !== "number" || !Number.isFinite(percent)) return null;
  const isDown = percent < 0;
  const Icon = isDown ? FiTrendingDown : FiTrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
        isDown ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(percent)}%
    </span>
  );
};
