/**
 * BannerDisplay
 *
 * Reusable placement-based banner renderer.
 * - Single banner: renders as-is
 * - Multiple banners (2-5): renders carousel
 * - P0 critical banners: always rendered separately (never in carousel)
 *
 * Usage:
 *   <BannerDisplay placement="DASHBOARD_TOP" />
 *   <BannerDisplay placement="DASHBOARD_SIDEBAR" compact />
 */

import React, { useMemo } from "react";
import { useBanners } from "../../hooks/useBanners";
import BannerCard from "./BannerCard";
import BannerCarousel from "./BannerCarousel";
import type { BannerPlacement } from "../../schemas/banner";

interface BannerDisplayProps {
  placement: BannerPlacement;
  compact?: boolean;
  topBar?: boolean;
  className?: string;
  showCarouselIndicators?: boolean;
}

const BannerDisplay: React.FC<BannerDisplayProps> = ({
  placement,
  compact = false,
  topBar = false,
  className = "",
  showCarouselIndicators = true,
}) => {
  const { banners, dismissBanner, trackClick } = useBanners(placement);

  // Separate critical and non-critical banners
  const { criticalBanners, normalBanners } = useMemo(() => {
    return {
      criticalBanners: banners.filter((b) => b.isCritical && b.priority === "P0"),
      normalBanners: banners.filter((b) => !b.isCritical || b.priority !== "P0"),
    };
  }, [banners]);

  if (banners.length === 0) return null;

  return (
    <div
      className={`${topBar ? "w-full" : "space-y-2"} ${className}`}
      aria-live="polite"
      aria-label="System notifications"
    >
      {/* Critical banners (always displayed, not in carousel) */}
      {criticalBanners.map((banner) => (
        <BannerCard
          key={banner.id}
          banner={banner}
          onDismiss={dismissBanner}
          onCtaClick={trackClick}
          compact={compact}
          topBar={topBar}
        />
      ))}

      {/* Normal banners */}
      {normalBanners.length === 1 ? (
        // Single banner: render directly
        <BannerCard
          banner={normalBanners[0]}
          onDismiss={dismissBanner}
          onCtaClick={trackClick}
          compact={compact}
          topBar={topBar}
        />
      ) : normalBanners.length > 1 ? (
        // Multiple banners: use carousel
        <BannerCarousel
          banners={normalBanners}
          onDismiss={dismissBanner}
          onCtaClick={trackClick}
          compact={compact}
          showIndicators={showCarouselIndicators}
        />
      ) : null}
    </div>
  );
};

export default BannerDisplay;
