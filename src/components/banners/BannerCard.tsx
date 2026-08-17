import React from "react";
import { Button } from "@heroui/react";
import {
  FiX,
  FiExternalLink,
  FiAlertTriangle,
  FiInfo,
  FiZap,
  FiTag,
  FiGift,
  FiSettings,
  FiStar,
} from "react-icons/fi";
import type { Banner } from "../../redux/api/bannerApi";
import type { BannerType } from "../../schemas/banner";

// ── Priority style map (drives severity accent + badge) ─────────────────────────

const PRIORITY_STYLES: Record<
  string,
  { accentVar: string; accentBgVar: string; icon: React.ReactNode }
> = {
  P0: {
    accentVar: "var(--color-banner-p0)",
    accentBgVar: "var(--color-banner-p0-bg)",
    icon: <FiAlertTriangle size={16} />,
  },
  P1: {
    accentVar: "var(--color-banner-p1)",
    accentBgVar: "var(--color-banner-p1-bg)",
    icon: <FiZap size={16} />,
  },
  P2: {
    accentVar: "var(--color-banner-p2)",
    accentBgVar: "var(--color-banner-p2-bg)",
    icon: <FiInfo size={16} />,
  },
  P3: {
    accentVar: "var(--color-banner-p3)",
    accentBgVar: "var(--color-banner-p3-bg)",
    icon: <FiTag size={16} />,
  },
};

const DEFAULT_STYLE = PRIORITY_STYLES["P2"];

// bannerType → icon override, used whenever the banner isn't a critical alert
// (severity icon takes precedence for P0/critical so danger is unmistakable)
const TYPE_ICONS: Partial<Record<BannerType, React.ReactNode>> = {
  PromotionalOffer: <FiGift size={16} />,
  MedicineSpotlight: <FiStar size={16} />,
  FeatureAnnouncement: <FiZap size={16} />,
  OperationalAlert: <FiAlertTriangle size={16} />,
  SystemAlert: <FiSettings size={16} />,
  Referral: <FiTag size={16} />,
};

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
  const isCriticalBanner = banner.isCritical && banner.priority === "P0";
  const typeIcon = TYPE_ICONS[banner.bannerType as BannerType];
  const displayIcon = isCriticalBanner || !typeIcon ? style.icon : typeIcon;
  const thumb = compact ? banner.thumbnailUrl || banner.imageUrl : banner.imageUrl;
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = !!thumb && !imageFailed;

  // ── Top bar variant (LOGIN_PAGE) ──────────────────────────────────────────
  if (topBar) {
    return (
      <div
        role="alert"
        className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-active)] text-white px-4 py-3 flex items-center justify-center gap-4 flex-wrap shadow-md"
      >
        {!showImage && <span className="shrink-0 text-white/90">{displayIcon}</span>}

        {showImage && (
          <div className="shrink-0 h-8 w-8 rounded-md overflow-hidden bg-white/20 ring-1 ring-white/30">
            <img
              src={thumb}
              alt={banner.imageAlt || banner.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap justify-center flex-1">
          <span className="text-sm font-semibold tracking-tight">{banner.title}</span>
          {banner.description && (
            <span className="text-sm text-white/80">{banner.description}</span>
          )}
        </div>

        {banner.ctaText && banner.ctaUrl && (
          <a
            href={banner.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onCtaClick(banner.id)}
            className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-white/90 whitespace-nowrap"
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

  // ── Default card variant ───────────────────────────────────────────────────
  const accentToken = isCriticalBanner ? PRIORITY_STYLES.P0.accentVar : style.accentVar;
  const accentBgToken = isCriticalBanner ? PRIORITY_STYLES.P0.accentBgVar : style.accentBgVar;

  const ctaButton = banner.ctaText && banner.ctaUrl && (
    <Button
      as="a"
      href={banner.ctaUrl}
      target="_blank"
      rel="noopener noreferrer"
      onPress={() => onCtaClick(banner.id)}
      size="sm"
      variant="solid"
      color={isCriticalBanner ? "danger" : "primary"}
      endContent={<FiExternalLink size={12} />}
      className={`h-auto shrink-0 font-semibold ${compact ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]"}`}
    >
      {banner.ctaText}
    </Button>
  );

  const dismissButton = banner.isDismissible && (
    <Button
      isIconOnly
      size="sm"
      variant="light"
      className="relative shrink-0 text-gray-400 hover:text-gray-600 opacity-60 group-hover:opacity-100 transition-opacity dark:text-slate-500 dark:hover:text-slate-300"
      aria-label="Dismiss banner"
      onPress={() => onDismiss(banner.id)}
    >
      <FiX size={14} />
    </Button>
  );

  const haloShadow = `0 0 0 6px ${accentBgToken}`;

  const mediaChip = showImage ? (
    <div
      className={[
        "relative shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10",
        compact ? "w-10 h-10 p-1" : "w-14 h-14 p-1.5",
      ].join(" ")}
      style={{ boxShadow: haloShadow }}
    >
      <img
        src={thumb}
        alt={banner.imageAlt || banner.title}
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    </div>
  ) : (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full text-white ${compact ? "h-9 w-9" : "h-11 w-11"}`}
      style={{ backgroundColor: accentToken, boxShadow: haloShadow }}
    >
      {displayIcon}
    </span>
  );

  // ── Compact (sidebar / widget) — stacked layout, CTA below text ───────────
  if (compact) {
    return (
      <div
        role="alert"
        className="group relative flex items-start gap-3 overflow-hidden rounded-xl border bg-white border-gray-200 pl-3 pr-2.5 py-2.5 text-sm shadow-sm transition-all hover:shadow-md dark:bg-[#111726] dark:border-[#273244]"
      >
        <span
          className="absolute inset-0 opacity-60 dark:opacity-30"
          style={{ background: `linear-gradient(to right, ${accentBgToken}, transparent 60%)` }}
          aria-hidden="true"
        />
        <span className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: accentToken }} aria-hidden="true" />

        {mediaChip}

        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-gray-900 break-words dark:text-white">{banner.title}</p>
            {banner.isSponsored && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                <FiStar size={10} />
                Sponsored
              </span>
            )}
            {isCriticalBanner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                <FiAlertTriangle size={10} />
                Critical
              </span>
            )}
          </div>
          {banner.description && (
            <p className="mt-0.5 text-[12px] text-gray-600 line-clamp-1 break-words dark:text-slate-400">
              {banner.description}
            </p>
          )}
          {ctaButton && <div className="mt-2">{ctaButton}</div>}
        </div>

        {dismissButton}
      </div>
    );
  }

  // ── Default (full-width) — reflows based on available space, not viewport,
  // so it looks right both in a wide dashboard-top slot and a narrow widget ──
  return (
    <div
      role="alert"
      className="group relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden rounded-2xl border bg-white border-gray-200 px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-[#111726] dark:border-[#273244]"
    >
      <span
        className="absolute inset-0 opacity-60 dark:opacity-30"
        style={{ background: `linear-gradient(to right, ${accentBgToken}, transparent 70%)` }}
        aria-hidden="true"
      />
      <span className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: accentToken }} aria-hidden="true" />

      {/* Icon/image + text — kept together, wraps as a unit, never squeezed below a readable width */}
      <div className="relative flex min-w-[200px] flex-1 items-center gap-3">
        {mediaChip}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold tracking-tight text-gray-900 break-words dark:text-white">{banner.title}</p>
            {banner.isSponsored && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                <FiStar size={10} />
                Sponsored
              </span>
            )}
            {isCriticalBanner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                <FiAlertTriangle size={10} />
                Critical
              </span>
            )}
          </div>
          {banner.description && (
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-gray-600 line-clamp-2 break-words dark:text-slate-400">
              {banner.description}
            </p>
          )}
        </div>
      </div>

      {/* CTA + dismiss — anchored right when there's room, wraps to its own row otherwise */}
      <div className="relative ml-auto flex shrink-0 items-center gap-2">
        {ctaButton}
        {dismissButton}
      </div>
    </div>
  );
};

export default BannerCard;
