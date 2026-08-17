// src/components/subscription/FreeTrialOfferBanner.tsx
import { LuGift, LuSparkles } from "react-icons/lu";
import { FiCheck } from "react-icons/fi";
import { useFreeTrialActivation } from "../../hooks/useFreeTrialActivation";

type FreeTrialOfferBannerProps = {
  showFreeOffer: boolean;
  onShowSuccessModal: (expiryDate?: string | null) => void;
};

const FEATURES = ["Unlimited Appointments", "Online Payments", "Priority Support"];

/**
 * Wide banner version of the free trial offer for the Subscription/Billing
 * page. Uses the page's semantic `primary`/`default-*` tokens (rather than
 * hardcoded hex) so it stays in lockstep with the app theme automatically,
 * including dark mode. Self-contained like FreeTrialOfferCard — safe to drop
 * in without touching the rest of the page.
 */
export const FreeTrialOfferBanner = ({
  showFreeOffer,
  onShowSuccessModal,
}: FreeTrialOfferBannerProps) => {
  const { activate, isActivating } = useFreeTrialActivation(onShowSuccessModal);

  if (!showFreeOffer) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent px-5 py-5 sm:px-6">
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-primary/15">
            <LuGift className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-default-900 dark:text-white">
                Get 1 Month Free
                <LuSparkles className="h-3.5 w-3.5 text-amber-400" />
              </h3>
              <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
                Welcome Offer
              </span>
            </div>
            <p className="max-w-md text-[12px] text-default-500">
              Kickstart your clinic on any plan — first month's on us.
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-1.5 text-[11px] font-medium text-default-600 dark:text-default-300">
                  <FiCheck className="h-3 w-3 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={activate}
          disabled={isActivating}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-primary-active px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(10,108,116,0.25)] transition hover:shadow-[0_6px_16px_rgba(10,108,116,0.35)] hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:scale-100"
        >
          {isActivating ? "Activating..." : "Activate Free Trial"}
        </button>
      </div>
    </section>
  );
};

export default FreeTrialOfferBanner;
