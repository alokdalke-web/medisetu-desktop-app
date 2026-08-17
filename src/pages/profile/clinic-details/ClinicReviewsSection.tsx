import React from "react";
import { FiStar } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicReviewsSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicReviewsSection: React.FC<ClinicReviewsSectionProps> = ({ reviews }) => {
  if (!reviews || reviews.reviewCount === 0) return null;

  const maxCount = Math.max(...Object.values(reviews.distribution), 1);

  return (
    <SectionCard title="Reviews" icon={<FiStar className="h-4 w-4" />}>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-text">{reviews.averageRating.toFixed(1)}</div>
          <div className="flex items-center gap-0.5 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <FiStar
                key={i}
                className="h-3.5 w-3.5"
                fill={i < Math.round(reviews.averageRating) ? "currentColor" : "none"}
              />
            ))}
          </div>
          <div className="mt-1 text-[11px] text-text-muted">{reviews.reviewCount} reviews</div>
        </div>

        <div className="flex-1 space-y-1">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = reviews.distribution[String(star) as "1" | "2" | "3" | "4" | "5"] || 0;
            const pct = (count / maxCount) * 100;
            return (
              <div key={star} className="flex items-center gap-2 text-[11px] text-text-muted">
                <span className="w-3">{star}</span>
                <div className="h-1.5 flex-1 rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
};

export default ClinicReviewsSection;
