/**
 * BannerCarousel
 *
 * Display carousel for multiple banners (up to 5 per placement).
 * Features:
 * - Auto-play with configurable interval + visible progress bar
 * - Manual navigation (prev/next)
 * - Dot indicators
 * - Pause on hover
 * - Keyboard navigation (arrow keys)
 * - Responsive design
 * - Crossfade + slight slide transition between banners
 *
 * Usage:
 *   <BannerCarousel banners={banners} onCtaClick={trackClick} onDismiss={dismissBanner} />
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@heroui/react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import BannerCard from "./BannerCard";
import type { Banner } from "../../redux/api/bannerApi";

interface BannerCarouselProps {
  banners: Banner[];
  onDismiss: (id: string) => void;
  onCtaClick: (id: string) => void;
  autoPlayInterval?: number; // milliseconds (default 6000)
  showIndicators?: boolean;
  showNavButtons?: boolean;
  compact?: boolean;
  className?: string;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners,
  onDismiss,
  onCtaClick,
  autoPlayInterval = 6000,
  showIndicators = false,
  showNavButtons = false,
  compact = false,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Limit to 5 banners
  const displayBanners = banners.slice(0, 5);
  const totalBanners = displayBanners.length;

  if (totalBanners === 0) return null;

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || totalBanners <= 1) return;

    autoPlayTimerRef.current = setInterval(() => {
      setDirection("next");
      setCurrentIndex((prev) => (prev + 1) % totalBanners);
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, totalBanners, autoPlayInterval]);

  // Handle next slide
  const handleNext = useCallback(() => {
    setDirection("next");
    setCurrentIndex((prev) => (prev + 1) % totalBanners);
    setIsAutoPlaying(false);
  }, [totalBanners]);

  // Handle previous slide
  const handlePrev = useCallback(() => {
    setDirection("prev");
    setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
    setIsAutoPlaying(false);
  }, [totalBanners]);

  // Handle dot click
  const handleDotClick = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? "next" : "prev");
      setCurrentIndex(index);
      setIsAutoPlaying(false);
    },
    [currentIndex],
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("keydown", handleKeyDown);
      return () => container.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleNext, handlePrev]);

  // Resume auto-play after inactivity
  useEffect(() => {
    if (isAutoPlaying || totalBanners <= 1) return;

    const resumeTimer = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 10000); // Resume after 10 seconds of inactivity

    return () => clearTimeout(resumeTimer);
  }, [isAutoPlaying, totalBanners]);

  if (totalBanners === 0) return null;

  const currentBanner = displayBanners[currentIndex];

  return (
    <div
      ref={containerRef}
      className={`banner-anim space-y-2 ${className}`}
      role="region"
      aria-label="Banner carousel"
      aria-live="polite"
      tabIndex={0}
    >
      {/* Main carousel */}
      <div
        className="relative overflow-hidden rounded-xl"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Crossfade + slide: remount on index/direction change to replay the animation */}
        <div
          key={currentBanner.id}
          className={
            direction === "next"
              ? "animate-[bannerSlideInNext_320ms_ease-out]"
              : "animate-[bannerSlideInPrev_320ms_ease-out]"
          }
        >
          <BannerCard
            banner={currentBanner}
            onDismiss={onDismiss}
            onCtaClick={onCtaClick}
            compact={compact}
          />
        </div>

        {/* Autoplay progress bar */}
        {isAutoPlaying && totalBanners > 1 && (
          <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden rounded-b-xl bg-black/5 dark:bg-white/10">
            <div
              key={`progress-${currentBanner.id}`}
              className="h-full bg-[var(--color-primary)]"
              style={{
                animation: `bannerProgress ${autoPlayInterval}ms linear forwards`,
              }}
            />
          </div>
        )}

        {/* Navigation buttons */}
        {showNavButtons && totalBanners > 1 && (
          <>
            <Button
              isIconOnly
              variant="flat"
              className="absolute top-1/2 left-2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60"
              aria-label="Previous banner"
              onPress={handlePrev}
            >
              <FiChevronLeft size={18} className="text-gray-700" />
            </Button>
            <Button
              isIconOnly
              variant="flat"
              className="absolute top-1/2 right-2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60"
              aria-label="Next banner"
              onPress={handleNext}
            >
              <FiChevronRight size={18} className="text-gray-700" />
            </Button>
          </>
        )}
      </div>

      {/* Indicators / Dots */}
      {showIndicators && totalBanners > 1 && (
        <div className="flex items-center justify-center gap-2">
          {displayBanners.map((_, index) => (
            <button
              key={index}
              type="button"
              className={[
                "h-1.5 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                index === currentIndex
                  ? "bg-[var(--color-primary)] w-6"
                  : "bg-gray-300 w-1.5 hover:bg-gray-400",
              ].join(" ")}
              aria-label={`Go to banner ${index + 1}`}
              aria-current={index === currentIndex}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
