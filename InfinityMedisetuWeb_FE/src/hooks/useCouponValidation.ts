import { useState, useCallback } from "react";
import {
  useValidateCouponMutation,
  type ValidateCouponResponse,
  type BillingCycle,
} from "../redux/api/subscriptionApi";

/** Error code → user-friendly message map */
const INVALID_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Invalid coupon code",
  INACTIVE: "This coupon is no longer active",
  NOT_STARTED: "This coupon is not valid yet",
  EXPIRED: "This coupon has expired",
  GLOBAL_LIMIT_REACHED: "This coupon has been fully redeemed",
  CLINIC_LIMIT_REACHED: "You have already used this coupon",
  NOT_FIRST_TIME: "This coupon is only for first-time subscribers",
  MIN_ORDER_NOT_MET: "Minimum order value not met",
  NOT_APPLICABLE: "This coupon is not valid for this plan/add-on",
};

export interface CouponValidationState {
  applied: boolean;
  code: string;
  couponId: number | null;
  discountAmount: number;
  finalAmount: number;
  description: string | null;
  discountType: string | null;
  discountValue: string | null;
  error: string | null;
  isValidating: boolean;
}

const INITIAL_STATE: CouponValidationState = {
  applied: false,
  code: "",
  couponId: null,
  discountAmount: 0,
  finalAmount: 0,
  description: null,
  discountType: null,
  discountValue: null,
  error: null,
  isValidating: false,
};

/**
 * Hook for validating coupons against the backend.
 * Replaces the previous hardcoded client-side coupon map.
 */
export function useCouponValidation() {
  const [state, setState] = useState<CouponValidationState>(INITIAL_STATE);
  const [validateCouponApi] = useValidateCouponMutation();

  const validateCoupon = useCallback(
    async (
      code: string,
      orderValue: number,
      options?: {
        planId?: string;
        addOnId?: string;
        billingCycle?: BillingCycle;
      },
    ) => {
      if (!code.trim()) {
        setState((s) => ({ ...s, error: "Please enter a coupon code" }));
        return;
      }

      setState((s) => ({ ...s, isValidating: true, error: null }));

      try {
        const result: ValidateCouponResponse = await validateCouponApi({
          code: code.trim(),
          orderValue,
          planId: options?.planId,
          addOnId: options?.addOnId,
          billingCycle: options?.billingCycle,
        }).unwrap();

        if (result.valid && result.coupon) {
          setState({
            applied: true,
            code: result.coupon.code,
            couponId: result.coupon.id,
            discountAmount: result.discountAmount,
            finalAmount: result.finalAmount,
            description: result.coupon.description,
            discountType: result.coupon.discountType,
            discountValue: result.coupon.discountValue,
            error: null,
            isValidating: false,
          });
        } else {
          // Coupon invalid — show user-friendly error
          const errorMsg =
            (result.code && INVALID_CODE_MESSAGES[result.code]) ||
            result.message ||
            "Invalid coupon code";
          setState({
            ...INITIAL_STATE,
            error: errorMsg,
          });
        }
      } catch (err: any) {
        setState({
          ...INITIAL_STATE,
          error:
            err?.data?.message || "Failed to validate coupon. Please try again.",
        });
      }
    },
    [validateCouponApi],
  );

  const removeCoupon = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    couponState: state,
    validateCoupon,
    removeCoupon,
  };
}
