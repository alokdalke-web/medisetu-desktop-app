import React from "react";
import { FiLock, FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router";

const PREMIUM_CROWN_ICON = `${import.meta.env.BASE_URL}assets/icons/premium-crown-icon.svg`;

interface PremiumUpgradeBannerProps {
  /** Feature name shown in the banner, e.g. "Lab & Pharmacy", "Reports" */
  featureName: string;
  /** Short description of what the user gets by upgrading */
  description?: string;
}

/**
 * A prominent but theme-consistent banner shown when a free-plan user
 * navigates to a premium-only feature (Lab, Pharmacy, Reports).
 *
 * Matches the existing purple/indigo premium styling used across the app.
 */
const PremiumUpgradeBanner: React.FC<PremiumUpgradeBannerProps> = ({
  featureName,
  description,
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e0d9f7] bg-gradient-to-br from-[#f8f5ff] via-[#f3eeff] to-[#ede8ff] p-5 sm:p-6 dark:border-[#3a315b] dark:from-[#1a1530] dark:via-[#171230] dark:to-[#141028]">
      {/* Decorative gradient orb */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#7c3aed]/10 blur-3xl dark:bg-[#7c3aed]/5" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-[#0F766E]/8 blur-2xl dark:bg-[#0F766E]/5" />

      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
        {/* Crown icon */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e8e4f7] dark:bg-[#26213f] dark:ring-[#3a315b]">
          <img
            src={PREMIUM_CROWN_ICON}
            alt=""
            className="h-7 w-8"
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] font-semibold text-[#1a1145] dark:text-white">
              {featureName} is a Premium Feature
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0ebff] px-2.5 py-1 text-[11px] font-semibold text-[#5a47c9] dark:bg-[#282043] dark:text-[#c8b6ff]">
              <FiLock className="h-3 w-3" />
              Premium
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#52476b] dark:text-[#c4bdd8]">
            {description ??
              `Upgrade your plan to unlock ${featureName} and get access to advanced features that help you grow your practice.`}
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate("/subscription")}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#5a47c9] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#5a47c9]/20 transition-all hover:bg-[#4a38b5] hover:shadow-lg hover:shadow-[#5a47c9]/30 focus:ring-2 focus:ring-[#8d7de8]/40 focus:outline-none active:scale-[0.97] cursor-pointer dark:bg-[#6b5bd6] dark:shadow-[#6b5bd6]/20 dark:hover:bg-[#5a47c9]"
        >
          Upgrade Plan
          <FiArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PremiumUpgradeBanner;
