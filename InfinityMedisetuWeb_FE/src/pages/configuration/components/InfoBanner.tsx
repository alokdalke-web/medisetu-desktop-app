import React from "react";
import { FiInfo } from "react-icons/fi";

type InfoBannerProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const InfoBanner: React.FC<InfoBannerProps> = ({
  message,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <FiInfo className="mt-0.5 shrink-0 text-[16px] text-emerald-600 dark:text-emerald-400" />
      <p className="text-[13px] text-default-600 dark:text-default-300">{message}</p>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-lg border border-emerald-300 bg-background px-4 py-2 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default InfoBanner;
