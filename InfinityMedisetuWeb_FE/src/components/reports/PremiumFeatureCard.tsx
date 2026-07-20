import React from "react";
import { FiLock } from "react-icons/fi";

const PREMIUM_CROWN_ICON = `${import.meta.env.BASE_URL}assets/icons/premium-crown-icon.svg`;

interface PremiumFeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon?: React.ReactNode;
  isLocked: boolean;
  onAction?: () => void;
  onUpgrade: () => void;
}

const PremiumFeatureCard: React.FC<PremiumFeatureCardProps> = ({
  icon,
  iconBg,
  title,
  description,
  buttonLabel,
  buttonIcon,
  isLocked,
  onAction,
  onUpgrade,
}) => {
  if (!isLocked) {
    return (
      <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}
          >
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
              {title}
            </h3>
            <p className="text-[13px] text-[#677294] mt-1 dark:text-white/70">
              {description}
            </p>
            <button
              type="button"
              onClick={onAction}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-[rgba(207,207,207,0.6)] rounded-[10px] text-[13px] font-medium text-[#100e1c] hover:bg-[#f8f9fb] transition dark:border-[#273244] dark:text-white dark:hover:bg-[#172033]"
            >
              {buttonIcon}
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Locked state
  return (
    <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center shrink-0 opacity-40`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
              {title}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f1ff] px-2 py-0.5 text-[10px] font-semibold text-[#5a47c9] dark:bg-[#26213f] dark:text-[#c8b6ff]">
              <FiLock className="h-2.5 w-2.5" />
              Premium
            </span>
          </div>
          <p className="text-[13px] text-[#677294] mt-1 dark:text-white/70">
            {description}
          </p>

          {/* Upgrade CTA */}
          <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-[#f5f1ff] border border-[#e8e4f7] dark:bg-[#1d1a2e] dark:border-[#3a315b]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm shrink-0 dark:bg-[#26213f]">
              <img
                src={PREMIUM_CROWN_ICON}
                alt=""
                className="h-5 w-6"
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#101828] dark:text-white">
                Upgrade to Premium
              </p>
              <p className="text-[11px] text-[#445176] mt-0.5 dark:text-[#d7def5]">
                Unlock this feature with a Premium subscription.
              </p>
            </div>
            <button
              type="button"
              onClick={onUpgrade}
              className="shrink-0 rounded-lg bg-[#5a47c9] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#4a38b5] focus:ring-2 focus:ring-[#8d7de8]/30 focus:outline-none cursor-pointer dark:bg-[#6b5bd6] dark:hover:bg-[#5a47c9]"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumFeatureCard;
