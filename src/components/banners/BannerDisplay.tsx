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
import { usePlacementBanners } from "../../hooks/BannerProvider";
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
  const { banners, isLoading, dismissBanner, trackClick } = usePlacementBanners(placement);

  // Separate critical and non-critical banners
  const { criticalBanners, normalBanners } = useMemo(() => {
    return {
      criticalBanners: banners.filter((b) => b.isCritical && b.priority === "P0"),
      normalBanners: banners.filter((b) => !b.isCritical || b.priority !== "P0"),
    };
  }, [banners]);

  if (isLoading && banners.length === 0) {
    return (
      <div className={`${topBar ? "w-full" : ""} ${className}`} aria-hidden="true">
        {topBar ? (
          <div
            className="banner-anim h-11 w-full bg-gray-200"
            style={{ animation: "bannerSkeletonPulse 1.6s ease-in-out infinite" }}
          />
        ) : (
          <div
            className={`banner-anim rounded-xl border border-gray-200 bg-gray-100 ${compact ? "h-16" : "h-20"}`}
            style={{ animation: "bannerSkeletonPulse 1.6s ease-in-out infinite" }}
          />
        )}
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div
      className={`banner-anim ${topBar ? "w-full" : "space-y-2"} ${className}`}
      style={topBar ? undefined : { animation: "bannerEnter 280ms ease-out" }}
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
