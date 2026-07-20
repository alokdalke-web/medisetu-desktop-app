import { Button } from "@heroui/react";
import { FiCheck } from "react-icons/fi";
import { PiCircleFill } from "react-icons/pi";
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
        "relative flex flex-col rounded-2xl border bg-white dark:bg-[#111726] p-5 transition-all",
        plan.highlighted
          ? "border-primary shadow-[0_4px_24px_rgba(13,148,136,0.12)] dark:shadow-[0_4px_24px_rgba(13,148,136,0.06)]"
          : "border-slate-200 dark:border-[#273244] hover:border-slate-300 dark:hover:border-[#334155]",
      ].join(" ")}
    >
      {/* Popular badge */}
      {plan.isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white shadow-sm">
          ★ Most Popular
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {plan.tagline}
          </p>
        </div>
        {plan.isCurrent && (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary whitespace-nowrap">
            Current
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mt-4 pb-4 border-b border-slate-100 dark:border-[#273244]">
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
        {showYearlyDiscount && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            20% OFF — Save 2 months
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="mt-4 flex-1 space-y-2.5">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            {plan.highlighted ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                <FiCheck className="text-[10px] text-primary" />
              </span>
            ) : plan.isCustom ? (
              <PiCircleFill className="mt-1.5 shrink-0 text-[5px] text-warning-500" />
            ) : (
              <PiCircleFill className="mt-1.5 shrink-0 text-[5px] text-slate-300 dark:text-slate-600" />
            )}
            <span className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        className="mt-5 rounded-xl w-full font-semibold"
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
