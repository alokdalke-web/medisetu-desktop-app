import React from "react";
import { Button } from "@heroui/react";
import { FiX, FiExternalLink, FiAlertTriangle, FiInfo, FiZap, FiTag } from "react-icons/fi";
import type { Banner } from "../../redux/api/bannerApi";

// ── Priority style map ────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<
  string,
  { bg: string; border: string; icon: React.ReactNode; iconColor: string; badge: string }
> = {
  P0: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <FiAlertTriangle size={16} />,
    iconColor: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
  P1: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: <FiZap size={16} />,
    iconColor: "text-orange-600",
    badge: "bg-orange-100 text-orange-700",
  },
  P2: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <FiInfo size={16} />,
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  P3: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <FiTag size={16} />,
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

const DEFAULT_STYLE = PRIORITY_STYLES["P2"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface BannerCardProps {
  banner: Banner;
  onDismiss: (id: string) => void;
  onCtaClick: (id: string) => void;
  compact?: boolean; // sidebar / widget variant
  topBar?: boolean; // top banner bar variant (for LOGIN_PAGE)
}

// ── Component ─────────────────────────────────────────────────────────────────

const BannerCard: React.FC<BannerCardProps> = ({
  banner,
  onDismiss,
  onCtaClick,
  compact = false,
  topBar = false,
}) => {
  const style = PRIORITY_STYLES[banner.priority] ?? DEFAULT_STYLE;
  
  // Apply critical styling for P0 critical banners
  const isCriticalBanner = banner.isCritical && banner.priority === "P0";
  const bgClass = isCriticalBanner ? "bg-red-100" : style.bg;
  const borderClass = isCriticalBanner ? "border-red-300 border-2" : style.border;

  // Top bar variant (for LOGIN_PAGE)
  if (topBar) {
    return (
      <div
        role="alert"
        className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-3 flex items-center justify-center gap-4 flex-wrap"
      >
        {/* Icon (if no image) */}
        {!banner.imageUrl && (
          <span className="shrink-0 text-white">{style.icon}</span>
        )}

        {/* Image (if available) */}
        {banner.imageUrl && (
          <div className="shrink-0 h-8 w-8 rounded overflow-hidden bg-white/20">
            <img
              src={banner.imageUrl}
              alt={banner.imageAlt || banner.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap justify-center flex-1">
          <span className="text-sm font-medium">{banner.title}</span>
          {banner.description && (
            <span className="text-sm text-teal-100">{banner.description}</span>
          )}
        </div>
        {banner.ctaText && banner.ctaUrl && (
          <a
            href={banner.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onCtaClick(banner.id)}
            className="text-sm font-semibold text-white underline hover:text-teal-100 transition whitespace-nowrap"
          >
            {banner.ctaText}
          </a>
        )}
        {banner.isDismissible && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="shrink-0 text-white hover:bg-white/20"
            aria-label="Dismiss banner"
            onPress={() => onDismiss(banner.id)}
          >
            <FiX size={16} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={[
        "relative flex items-start gap-3 rounded-xl border px-4 py-3 transition-all",
        bgClass,
        borderClass,
        compact ? "text-sm" : "",
      ].join(" ")}
    >
      {/* Image (if available) */}
      {banner.imageUrl && !compact && (
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-200">
          <img
            src={banner.imageUrl}
            alt={banner.imageAlt || banner.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Icon (if no image in compact mode) */}
      {!banner.imageUrl && (
        <span className={`mt-0.5 shrink-0 ${style.iconColor}`}>{style.icon}</span>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold text-slate-900 ${compact ? "text-[13px]" : "text-[14px]"}`}>
            {banner.title}
          </p>
          {banner.isSponsored && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              Sponsored
            </span>
          )}
          {isCriticalBanner && (
            <span className="rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-semibold">
              Critical
            </span>
          )}
          {!isCriticalBanner && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
              {banner.priority}
            </span>
          )}
        </div>

        {banner.description && !compact && (
          <p className="mt-0.5 text-[13px] text-slate-600">{banner.description}</p>
        )}

        {banner.ctaText && banner.ctaUrl && (
          <a
            href={banner.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onCtaClick(banner.id)}
            className={[
              "mt-2 inline-flex items-center gap-1 rounded-lg font-semibold transition hover:underline",
              isCriticalBanner ? "text-red-600 hover:text-red-700" : style.iconColor,
              compact ? "text-[12px]" : "text-[13px]",
            ].join(" ")}
          >
            {banner.ctaText}
            <FiExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Dismiss button */}
      {banner.isDismissible && (
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="shrink-0 text-slate-400 hover:text-slate-600"
          aria-label="Dismiss banner"
          onPress={() => onDismiss(banner.id)}
        >
          <FiX size={14} />
        </Button>
      )}
    </div>
  );
};

export default BannerCard;
