import { Button } from "@heroui/react";
import { FiCheck, FiSliders, FiUser } from "react-icons/fi";
import { PiCrownSimpleFill } from "react-icons/pi";
import type { BillingCycleType } from "../../utils/subscriptionHelpers";

export interface PlanCardData {
  key: string;
  name: string;
  tagline: string;
  priceLabel: string;
  priceSuffix?: string;
  features: string[];
  ctaLabel: string;
  isPopular?: boolean;
  isCurrent?: boolean;
  highlighted?: boolean;
  isCustom?: boolean;
  onCta?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** e.g. "₹833/mo billed annually" — shown under the price. */
  priceNote?: string;
  /** e.g. "Everything in Free, plus" — label above the feature list. */
  featuresLabel?: string;
}

interface PlanCardProps {
  plan: PlanCardData;
  billingCycle?: BillingCycleType;
}

const PlanCard = ({ plan, billingCycle }: PlanCardProps) => {
  const showYearlyDiscount = plan.highlighted && billingCycle === "yearly";

  return (
    <div
      className={[
        "relative flex flex-col rounded-2xl border bg-white dark:bg-[#111726] p-5 transition-all duration-200",
        plan.highlighted
          ? "border-primary/50 bg-gradient-to-b from-primary/[0.05] via-white to-white dark:from-primary/10 dark:via-[#111726] dark:to-[#111726] shadow-[0_10px_32px_rgba(10,108,116,0.16)] dark:shadow-[0_10px_32px_rgba(10,108,116,0.08)] md:-translate-y-1"
          : "border-slate-200 dark:border-[#273244] hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 dark:hover:border-[#334155]",
      ].join(" ")}
    >
      {/* Decorative glow for the highlighted plan */}
      {plan.highlighted && (
        <div className="pointer-events-none absolute -top-8 right-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
      )}

      {/* Popular badge */}
      {plan.isPopular && (
        <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-primary-active px-3 py-1.5 text-[10px] font-bold text-white shadow-[0_4px_14px_rgba(10,108,116,0.35)]">
          <PiCrownSimpleFill className="h-3 w-3" /> Most Popular
        </span>
      )}

      {/* Header */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              plan.highlighted
                ? "bg-gradient-to-br from-primary to-primary-active text-white shadow-sm"
                : plan.isCustom
                  ? "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
                  : "bg-slate-100 text-slate-500 dark:bg-[#172033] dark:text-slate-300",
            ].join(" ")}
          >
            {plan.highlighted ? (
              <PiCrownSimpleFill className="h-4 w-4" />
            ) : plan.isCustom ? (
              <FiSliders className="h-4 w-4" />
            ) : (
              <FiUser className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {plan.tagline}
            </p>
          </div>
        </div>
        {plan.isCurrent && (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary whitespace-nowrap shrink-0">
            Current
          </span>
        )}
      </div>

      {/* Price */}
      <div className="relative mt-4 pb-4 border-b border-slate-100 dark:border-[#273244]">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {plan.priceLabel}
          </span>
          {plan.priceSuffix && (
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {plan.priceSuffix}
            </span>
          )}
        </div>
        {plan.priceNote && (
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{plan.priceNote}</p>
        )}
        {showYearlyDiscount && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            20% OFF with yearly billing
          </span>
        )}
      </div>

      {/* Features */}
      {plan.featuresLabel && (
        <p className="relative mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {plan.featuresLabel}
        </p>
      )}
      <ul className={`relative flex-1 space-y-2.5 ${plan.featuresLabel ? "mt-2.5" : "mt-4"}`}>
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            {plan.highlighted ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                <FiCheck className="text-[10px] text-primary" />
              </span>
            ) : plan.isCustom ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-500/15 mt-0.5">
                <FiCheck className="text-[10px] text-violet-500" />
              </span>
            ) : (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-[#172033] mt-0.5">
                <FiCheck className="text-[10px] text-slate-400 dark:text-slate-500" />
              </span>
            )}
            <span className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        className={`relative mt-5 rounded-xl w-full font-semibold transition-all ${plan.highlighted && !plan.isCurrent && !plan.isDisabled ? "bg-gradient-to-r from-primary to-primary-active shadow-[0_4px_14px_rgba(10,108,116,0.3)] hover:shadow-[0_6px_18px_rgba(10,108,116,0.4)] active:scale-[0.98]" : ""}`}
        color={plan.highlighted ? "primary" : "default"}
        variant={plan.isCurrent ? "flat" : plan.highlighted ? "solid" : "bordered"}
        isDisabled={plan.isCurrent || plan.isDisabled}
        isLoading={plan.isLoading}
        onPress={plan.onCta}
      >
        {plan.ctaLabel}
      </Button>
    </div>
  );
};

export default PlanCard;
