import React from "react";
import { KPI_CARD_CONFIG } from "../constants";
import { getKpiIcon } from "../iconUtils";
import type { RequestCard } from "../types";
import KpiCards from "../../../../../components/KpiCards";

interface KpiCardSectionProps {
  requestCards: RequestCard[];
  isLoading: boolean;
}

interface KpiStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * Calculate KPI statistics from request cards
 */
const calculateKpiStats = (cards: RequestCard[]): KpiStats => {
  const stats: KpiStats = {
    total: cards.length,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  cards.forEach((card) => {
    switch (card.status) {
      case "Pending":
        stats.pending += 1;
        break;
      case "Approved":
        stats.approved += 1;
        break;
      case "Rejected":
        stats.rejected += 1;
        break;
      default:
        break;
    }
  });

  return stats;
};

/**
 * Calculate percentage relative to total
 */
const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Displays KPI cards showing request statistics
 */
export const KpiCardSection: React.FC<KpiCardSectionProps> = ({
  requestCards,
  isLoading,
}) => {
  const stats = calculateKpiStats(requestCards);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {KPI_CARD_CONFIG.map((config) => {
        const value = stats[config.key];
        const percentage = calculatePercentage(value, stats.total);
        const icon = getKpiIcon(config.iconName);

        return (
          <KpiCards
            key={config.key}
            description={config.description}
            title={config.title}
            value={value}
            icon={icon}
            iconBg={config.iconBg}
            progressColor={config.progressColor}
            percentage={percentage}
            loading={isLoading}
          />
        );
      })}
    </div>
  );
};
