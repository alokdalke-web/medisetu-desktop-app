/**
 * QueueDelayBanner.tsx
 *
 * Displays the cumulative queue delay at the top of the appointment queue.
 * Shows a banner like "Queue running 12 min late" when there's delay.
 */

import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { formatDurationLabel } from "../../pages/appointment/new-appointment/helpers/dateTimeHelpers";

interface QueueDelayBannerProps {
  cumulativeDelay: number;
  hasData: boolean;
}

const QueueDelayBanner: React.FC<QueueDelayBannerProps> = ({
  cumulativeDelay,
  hasData,
}) => {
  if (!hasData || cumulativeDelay <= 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-700/50 dark:bg-amber-900/20">
      <FiAlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400" size={16} />
      <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300">
        Queue running{" "}
        <span className="font-bold">{formatDurationLabel(cumulativeDelay)}</span> late
      </p>
    </div>
  );
};

export default QueueDelayBanner;
