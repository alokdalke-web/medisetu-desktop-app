/**
 * BannerCarousel
 *
 * Display carousel for multiple banners (up to 5 per placement).
 * Features:
 * - Auto-play with configurable interval
 * - Manual navigation (prev/next)
 * - Dot indicators
 * - Pause on hover
 * - Keyboard navigation (arrow keys)
 * - Responsive design
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
      setCurrentIndex((prev) => (prev + 1) % totalBanners);
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, totalBanners, autoPlayInterval]);

  // Handle next slide
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalBanners);
    setIsAutoPlaying(false); // Stop auto-play on manual nav
  }, [totalBanners]);

  // Handle previous slide
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
    setIsAutoPlaying(false); // Stop auto-play on manual nav
  }, [totalBanners]);

  // Handle dot click
  const handleDotClick = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  }, []);

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

  const currentBanner = displayBanners[currentIndex];

  return (
    <div
      ref={containerRef}
      className={`space-y-3 ${className}`}
      role="region"
      aria-label="Banner carousel"
      aria-live="polite"
      tabIndex={0}
    >
      {/* Main carousel */}
      <div
        className="relative overflow-hidden rounded-xl transition-opacity duration-300"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Current banner display */}
        <BannerCard
          banner={currentBanner}
          onDismiss={onDismiss}
          onCtaClick={onCtaClick}
          compact={compact}
        />

        {/* Navigation buttons */}
        {showNavButtons && totalBanners > 1 && (
          <>
            <Button
              isIconOnly
              variant="flat"
              className="absolute top-1/2 left-2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white"
              aria-label="Previous banner"
              onPress={handlePrev}
            >
              <FiChevronLeft size={18} className="text-slate-700" />
            </Button>
            <Button
              isIconOnly
              variant="flat"
              className="absolute top-1/2 right-2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white"
              aria-label="Next banner"
              onPress={handleNext}
            >
              <FiChevronRight size={18} className="text-slate-700" />
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
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "bg-slate-700 w-6"
                  : "bg-slate-300 w-2 hover:bg-slate-400",
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
