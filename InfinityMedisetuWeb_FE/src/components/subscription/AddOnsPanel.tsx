import { Button, Input } from "@heroui/react";
import { FiLock, FiX } from "react-icons/fi";
import { PiShieldCheckFill } from "react-icons/pi";
import type { AddOn } from "../../redux/api/subscriptionApi";
import {
  getCyclePrice,
  type BillingCycleType,
} from "../../utils/subscriptionHelpers";
import AddOnRow from "./AddOnRow";

interface AddOnsPanelProps {
  addOns: AddOn[];
  selected: Record<string, number>;
  onQtyChange: (addOnId: string, quantity: number) => void;
  planName: string;
  planPrice: number;
  addOnTotal: number;
  subtotal: number;
  billingCycle: BillingCycleType;
  // Coupon props
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  appliedCode: string | null;
  appliedDiscountPct: number;
  discountAmount: number;
  couponError: string | null;
  couponDescription?: string | null;
  isValidatingCoupon?: boolean;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  // Checkout props
  totalPayable: number;
  onCheckout: () => void;
  isProcessing: boolean;
  isDisabled?: boolean;
}

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
 
const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-default-500">{label}</span>
    <span className="font-medium text-default-900">{value}</span>
  </div>
);

const AddOnsPanel = ({
  addOns,
  selected,
  onQtyChange,
  planName,
  planPrice,
  addOnTotal,
  subtotal,
  billingCycle,
  couponCode,
  onCouponCodeChange,
  appliedCode,
  appliedDiscountPct,
  discountAmount,
  couponError,
  couponDescription,
  isValidatingCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  totalPayable,
  onCheckout,
  isProcessing,
  isDisabled,
}: AddOnsPanelProps) => {
  const priceSuffix = billingCycle === "yearly" ? "/ year" : "/ month";
  const hasDiscount = !!appliedCode && discountAmount > 0;
  const hasSelectedAddOn = Object.values(selected).some((qty) => qty > 0);

  return (
    <div className="rounded-2xl border border-default-200 bg-background p-5">
      <h3 className="text-base font-semibold text-default-900">Add-Ons</h3>
      <p className="text-xs text-default-400">
        Enhance your plan with additional resources
      </p>

      {isDisabled && (
        <div className="mt-3 rounded-xl border border-warning-100 bg-warning-50 p-3 text-xs text-warning-800 flex items-start gap-2">
          <FiLock className="mt-0.5 shrink-0 text-sm" />
          <div>
            <p className="font-semibold">Add-Ons Locked</p>
            <p className="mt-0.5 text-warning-700">
              Add-ons are not available on the Free plan. Upgrade to Pro to configure add-ons.
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 divide-y divide-default-100">
        {addOns
          .filter((addOn) => (addOn.maxQuantity ?? 100) > 0)
          .map((addOn) => (
            <AddOnRow
              key={addOn.id}
              addOn={addOn}
              quantity={selected[addOn.id] ?? 0}
              unitPrice={billingCycle === "yearly" ? (addOn.yearlyPrice ?? getCyclePrice(addOn.unitPrice, billingCycle)) : addOn.unitPrice}
              priceSuffix={priceSuffix}
              onChange={(qty) => onQtyChange(addOn.id, qty)}
              isDisabled={isDisabled}
            />
          ))}
      </div>

      {/* Summary */}
      <div className="mt-4 space-y-2 border-t border-default-100 pt-4">
        <SummaryRow label={`Plan Price (${planName})`} value={money(planPrice)} />
        <SummaryRow label="Add-Ons Total" value={money(addOnTotal)} />
        <div className="flex items-center justify-between border-t border-default-100 pt-2 text-sm">
          <span className="font-semibold text-default-900">Subtotal</span>
          <span className="font-semibold text-default-900">{money(subtotal)}</span>
        </div>
      </div>

      {/* Coupon section */}
      <div className="mt-4 border-t border-default-100 pt-4">
        <h4 className="text-sm font-semibold text-default-900">Apply Coupon</h4>

        {!appliedCode ? (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <Input
                size="sm"
                value={couponCode}
                onValueChange={onCouponCodeChange}
                placeholder="Enter coupon code"
                classNames={{ inputWrapper: "rounded-xl" }}
                isDisabled={isDisabled}
              />
              <Button
                size="sm"
                color="primary"
                variant="bordered"
                className="rounded-xl"
                onPress={onApplyCoupon}
                isDisabled={isDisabled || !couponCode.trim()}
                isLoading={isValidatingCoupon}
              >
                Apply
              </Button>
            </div>
            {couponError && (
              <p className="text-xs text-danger-500">{couponError}</p>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-start justify-between gap-2 rounded-xl bg-success-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-success-700">
                🎉 {appliedDiscountPct ? `${appliedDiscountPct}% OFF` : `₹${discountAmount} OFF`} applied!
              </p>
              <p className="text-xs text-success-600">
                You saved {money(discountAmount)}
              </p>
              {couponDescription && (
                <p className="mt-0.5 text-xs text-success-500">{couponDescription}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Remove coupon"
              onClick={onRemoveCoupon}
              disabled={isDisabled}
              className="text-success-600 hover:text-success-800 disabled:opacity-50"
            >
              <FiX />
            </button>
          </div>
        )}
      </div>

      {/* Total + Checkout */}
      <div className="mt-4 border-t border-default-100 pt-4">
        <p className="text-sm text-default-500">Total Payable</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-default-900">
            {money(totalPayable)}
          </span>
          <span className="text-sm text-default-400">{priceSuffix}</span>
          {hasDiscount && (
            <span className="text-sm text-default-400 line-through">
              {money(subtotal)}
            </span>
          )}
        </div>
      </div>

      <Button
        color="primary"
        className="mt-4 w-full rounded-xl"
        size="lg"
        startContent={<FiLock className="text-sm" />}
        onPress={onCheckout}
        isLoading={isProcessing}
        isDisabled={isDisabled || !hasSelectedAddOn}
      >
        Proceed to Checkout
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-default-400">
        <PiShieldCheckFill className="text-success-500" />
        Secured payments powered by Razorpay
      </p>
    </div>
  );
};

export default AddOnsPanel;
