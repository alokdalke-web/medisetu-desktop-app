import { FiPercent } from "react-icons/fi";
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
      name: "Free",
      tagline: freePlan.description || "Ideal for individual practitioners",
      priceLabel: formatPrice(0),
      priceSuffix: suffix,
      features: freePlan.features.slice(0, 6).map((f) => f.name),
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
      name: "Pro",
      tagline: proPlan.description || "Best for growing clinics",
      priceLabel: formatPrice(getCyclePrice(proPlan.price, billingCycle)),
      priceSuffix: suffix,
      features: proPlan.features.slice(0, 8).map((f) => f.name),
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
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Choose Your Plan</h2>
      </div>

      {/* Yearly savings banner — only show when on monthly cycle */}
      {isMonthly && proPlan && currentSlug === "free" && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/5 dark:to-teal-500/5 dark:border-emerald-500/20 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <FiPercent className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Save 20% with annual billing
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Switch to yearly and get 2 months free on the Pro plan.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((plan) => (
          <PlanCard key={plan.key} plan={plan} billingCycle={billingCycle} />
        ))}
      </div>
    </div>
  );
};

export default PlanComparison;
