import { FiArrowRight, FiPercent } from "react-icons/fi";
import type { Plan } from "../../redux/api/subscriptionApi";
import {
  getCyclePrice,
  type BillingCycleType,
} from "../../utils/subscriptionHelpers";
import { CUSTOM_PLAN } from "./subscriptionConstants";
import PlanCard, { type PlanCardData } from "./PlanCard";

interface PlanComparisonProps {
  freePlan?: Plan;
  proPlan?: Plan;
  currentSlug: string;
  billingCycle: BillingCycleType;
  onSelectPlan: (plan: Plan) => void;
  onContactSales?: () => void;
  onSwitchToYearly?: () => void;
  processingPlanId?: string | null;
}

const formatPrice = (amount: number) =>
  amount <= 0 ? "₹0" : `₹${amount.toLocaleString("en-IN")}`;

const PlanComparison = ({
  freePlan,
  proPlan,
  currentSlug,
  billingCycle,
  onSelectPlan,
  onContactSales,
  onSwitchToYearly,
  processingPlanId,
}: PlanComparisonProps) => {
  const suffix = billingCycle === "yearly" ? "/ year" : "/ month";
  const isCurrent = (plan?: Plan) =>
    !!plan && plan.slug.toLowerCase() === currentSlug.toLowerCase();

  // Show yearly promotion only when user is on free plan and monthly cycle
  const isMonthly = billingCycle === "monthly";

  const cards: PlanCardData[] = [];

  if (freePlan) {
    cards.push({
      key: freePlan.id,
      name: freePlan.name || "Free",
      tagline: freePlan.description || "Ideal for individual practitioners",
      priceLabel: formatPrice(getCyclePrice(freePlan.price, billingCycle)),
      priceSuffix: suffix,
      features: freePlan.features.map((f) => f.name),
      ctaLabel: isCurrent(freePlan) ? "Current Plan" : "Free Plan",
      isCurrent: isCurrent(freePlan),
      isDisabled: currentSlug !== "free",
      onCta: () => onSelectPlan(freePlan),
      isLoading: processingPlanId === freePlan.id,
    });
  }

  if (proPlan) {
    cards.push({
      key: proPlan.id,
      name: proPlan.name || "Pro",
      tagline: proPlan.description || "Best for growing clinics",
      priceLabel: formatPrice(getCyclePrice(proPlan.price, billingCycle)),
      priceSuffix: suffix,
      features: proPlan.features.map((f) => f.name),
      featuresLabel: freePlan ? `Everything in ${freePlan.name || "Free"}, plus` : undefined,
      priceNote:
        billingCycle === "yearly"
          ? `${formatPrice(Math.round(getCyclePrice(proPlan.price, "yearly") / 12))} / month, billed annually`
          : undefined,
      ctaLabel: isCurrent(proPlan) ? "Current Plan" : "Upgrade to Pro",
      isPopular: true,
      highlighted: true,
      isCurrent: isCurrent(proPlan),
      onCta: () => onSelectPlan(proPlan),
      isLoading: processingPlanId === proPlan.id,
    });
  }

  cards.push({
    key: "custom",
    name: CUSTOM_PLAN.name,
    tagline: CUSTOM_PLAN.tagline,
    priceLabel: CUSTOM_PLAN.priceLabel,
    features: CUSTOM_PLAN.features.slice(0, 6),
    ctaLabel: CUSTOM_PLAN.ctaLabel,
    isCustom: true,
    onCta: onContactSales,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Choose Your Plan</h2>
        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
          Change or cancel anytime — you keep access until the period ends.
        </p>
      </div>

      {/* Yearly savings banner — only show when on monthly cycle */}
      {isMonthly && proPlan && currentSlug === "free" && (
        <div className="relative overflow-hidden flex items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-emerald-500/10 dark:border-emerald-500/20 px-4 py-3">
          <div className="pointer-events-none absolute -top-10 -right-6 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 shadow-sm ring-1 ring-emerald-200/60 dark:bg-emerald-500/20 dark:ring-emerald-500/20">
            <FiPercent className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Save 20% with annual billing
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Pay yearly for Pro and keep{" "}
              <span className="font-semibold">
                {formatPrice(
                  Math.max(
                    0,
                    getCyclePrice(proPlan.price, "monthly") * 12 -
                      getCyclePrice(proPlan.price, "yearly"),
                  ),
                )}
              </span>{" "}
              a year.
            </p>
          </div>
          {onSwitchToYearly && (
            <button
              type="button"
              onClick={onSwitchToYearly}
              className="relative inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.97]"
            >
              Switch to Yearly <FiArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3 md:gap-4">
        {cards.map((plan) => (
          <PlanCard key={plan.key} plan={plan} billingCycle={billingCycle} />
        ))}
      </div>
    </div>
  );
};

export default PlanComparison;
