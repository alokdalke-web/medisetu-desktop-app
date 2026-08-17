// src/components/subscription/FreeTrialOfferCard.tsx
import { LuGift, LuSparkles } from "react-icons/lu";
import { FiCheck } from "react-icons/fi";
import { useFreeTrialActivation } from "../../hooks/useFreeTrialActivation";

type FreeTrialOfferCardProps = {
  showFreeOffer: boolean;
  onShowSuccessModal: (expiryDate?: string | null) => void;
};

const FEATURES = ["Unlimited Appointments", "Online Payments", "Priority Support"];

/**
 * Compact dashboard-sidebar version of the free trial offer.
 * Self-contained: owns its own activation call, loading/error state and
 * eligibility check, so dropping it into any layout can't break siblings.
 */
export const FreeTrialOfferCard = ({
  showFreeOffer,
  onShowSuccessModal,
}: FreeTrialOfferCardProps) => {
  const { activate, isActivating } = useFreeTrialActivation(onShowSuccessModal);

  if (!showFreeOffer) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(10,108,116,0.18)] bg-gradient-to-br from-[#e6fbf7] via-[#f2fdfb] to-white p-4 flex flex-col gap-3 shadow-[0_1px_2px_rgba(10,108,116,0.06)] dark:border-[#1f4b47] dark:from-[#0f2a2b] dark:via-[#0e2426] dark:to-[#111726]">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#0a6c74]/10 blur-2xl dark:bg-[#46beae]/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-24 w-24 rounded-full bg-[#0a6c74]/5 blur-2xl dark:bg-[#46beae]/5" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm ring-1 ring-[#0a6c74]/10 dark:bg-[#16352f] dark:ring-[#46beae]/20">
            <LuGift className="h-5 w-5 text-[#0a6c74] dark:text-[#9be7dc]" />
          </div>
          <span className="flex items-center gap-1.5 text-[16px] font-semibold text-[#100e1c] dark:text-white">
            Get 1 Month Free
            <LuSparkles className="h-3.5 w-3.5 text-[#f5b100]" />
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#0a6c74] px-2 py-1 text-[10px] font-semibold leading-none text-white shrink-0">
          Welcome Offer
        </span>
      </div>

      <p className="relative text-[12px] font-medium text-[#677294] dark:text-white/80 leading-normal">
        Kickstart your clinic on any plan — first month's on us.
      </p>

      <ul className="relative flex flex-col gap-1.5">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-[12px] font-medium text-[#100e1c] dark:text-white">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0a6c74]/10 shrink-0 dark:bg-[#46beae]/15">
              <FiCheck className="h-2.5 w-2.5 text-[#0a6c74] dark:text-[#9be7dc]" />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={activate}
        disabled={isActivating}
        className="relative w-full rounded-[10px] bg-gradient-to-r from-[#0a6c74] to-[#0d8a8f] px-3 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(10,108,116,0.25)] transition hover:shadow-[0_6px_16px_rgba(10,108,116,0.35)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:scale-100"
      >
        {isActivating ? "Activating..." : "Activate Free Trial"}
      </button>
    </div>
  );
};

export default FreeTrialOfferCard;
