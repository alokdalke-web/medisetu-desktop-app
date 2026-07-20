import { useState } from "react";
import { addToast } from "@heroui/react";
import {
  useSubscribeMutation,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
  usePurchaseAddonMutation,
  useVerifyAddonPurchaseMutation,
  useSubscribeWithAddOnsMutation,
  useVerifyCombinedPurchaseMutation,
  type BillingCycle,
  type CombinedAddOnSelection,
  type CouponDiscountInfo,
} from "../redux/api/subscriptionApi";
import { processRazorpayPayment } from "../utils/razorpay";

export interface CheckoutPlan {
  id: string;
  name: string;
  price: number;
}

export interface AddOnSelection {
  addOnId: string;
  name: string;
  quantity: number;
}

/** Optional coupon data to pass through the checkout flow. */
export interface CheckoutCoupon {
  code: string;
  couponId: number;
}

/**
 * Encapsulates the subscription + add-on payment side-effects so the page and
 * its presentational components stay dumb. Mirrors the existing SubscriptionModal
 * Razorpay flow and reuses the shared `processRazorpayPayment` utility.
 */
export function useSubscriptionCheckout() {
  const [subscribe] = useSubscribeMutation();
  const [createRazorpayOrder] = useCreateRazorpayOrderMutation();
  const [verifyRazorpayPayment] = useVerifyRazorpayPaymentMutation();
  const [purchaseAddon] = usePurchaseAddonMutation();
  const [verifyAddonPurchase] = useVerifyAddonPurchaseMutation();
  const [subscribeWithAddOns] = useSubscribeWithAddOnsMutation();
  const [verifyCombinedPurchase] = useVerifyCombinedPurchaseMutation();

  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Subscribe to a plan. Free plans skip payment; paid plans run Razorpay.
   * Optionally pass a validated coupon to apply a discount.
   */
  const subscribeToPlan = async (
    plan: CheckoutPlan,
    coupon?: CheckoutCoupon,
  ): Promise<boolean> => {
    setIsProcessing(true);
    try {
      // Free plan — no payment required
      if (!plan.price || plan.price <= 0) {
        await subscribe({ planId: plan.id }).unwrap();
        addToast({
          title: "Success",
          description: `Successfully subscribed to ${plan.name}.`,
          color: "success",
        });
        return true;
      }

      // Paid plan — create order (pass couponCode if provided)
      const order = await createRazorpayOrder({
        planId: plan.id,
        ...(coupon?.code ? { couponCode: coupon.code } : {}),
      }).unwrap();

      // Trial / no payment needed (100% off coupon or trial)
      if (!order.requiresPayment) {
        addToast({
          title: "Success",
          description: `Successfully subscribed to ${plan.name}.`,
          color: "success",
        });
        return true;
      }

      const result = await processRazorpayPayment({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        description: `${plan.name} Subscription`,
        planId: plan.id,
        planName: plan.name,
      });

      if (!result.success) {
        addToast({
          title: "Payment Cancelled",
          description: result.error || "Payment was not completed.",
          color: "warning",
        });
        return false;
      }

      // Pass coupon tracking data to verify endpoint
      const discount: CouponDiscountInfo | undefined = order.discount;
      const verifyResult = await verifyRazorpayPayment({
        orderId: order.orderId,
        paymentId: result.paymentId!,
        signature: result.signature!,
        planId: plan.id,
        paymentMethod: result.paymentMethod,
        ...(discount
          ? {
            couponId: String(discount.couponId),
            originalAmount: String(discount.originalAmount),
            discountAmount: String(discount.discountAmount),
          }
          : {}),
      }).unwrap();

      // Show reactivation info if staff/doctors were reactivated
      const staffReactivated = verifyResult.staffReactivated ?? 0;
      const doctorsReactivated = verifyResult.doctorsReactivated ?? 0;

      if (staffReactivated > 0 || doctorsReactivated > 0) {
        addToast({
          title: "Subscription Activated",
          description: `You're now subscribed to ${plan.name}. ${doctorsReactivated} doctor(s) and ${staffReactivated} staff member(s) have been reactivated.`,
          color: "success",
        });
      } else {
        addToast({
          title: "Payment Successful",
          description: `You're now subscribed to ${plan.name}.`,
          color: "success",
        });
      }
      return true;
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to process subscription.",
        color: "danger",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Purchase one or more add-ons in a single Razorpay order.
   * Backend returns pro-rated pricing — frontend just displays and pays.
   * Returns the order data so the UI can show a confirmation before payment.
   */
  const purchaseAddons = async (
    selections: AddOnSelection[],
    billingCycle: BillingCycle,
    coupon?: CheckoutCoupon,
  ): Promise<boolean> => {
    if (selections.length === 0) return false;
    setIsProcessing(true);
    try {
      const addOnItems = selections.map((s) => ({
        addOnId: s.addOnId,
        billingCycle,
        quantity: s.quantity,
      }));

      const orderRes = await purchaseAddon({
        addOns: addOnItems,
        ...(coupon?.code ? { couponCode: coupon.code } : {}),
      }).unwrap();
      const order = orderRes.data;

      const description = selections.length === 1
        ? `${selections[0].name} (x${selections[0].quantity})`
        : `${selections.length} Add-Ons`;

      const result = await processRazorpayPayment({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        description,
      });

      if (!result.success) {
        addToast({
          title: "Payment Cancelled",
          description: result.error || "Add-on payment was not completed.",
          color: "warning",
        });
        return false;
      }

      // Pass coupon tracking data if coupon was applied
      await verifyAddonPurchase({
        orderId: order.orderId,
        paymentId: result.paymentId!,
        signature: result.signature!,
        addOns: addOnItems,
        ...(coupon
          ? {
            couponId: String(coupon.couponId),
            // originalAmount and discountAmount come from the order response
            // The backend already calculated these during purchase
          }
          : {}),
      }).unwrap();

      addToast({
        title: "Add-ons Activated",
        description: "Your add-ons have been activated successfully.",
        color: "success",
      });
      return true;
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to purchase add-ons.",
        color: "danger",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Preview add-on purchase — calls the API to get pricing but does NOT open Razorpay.
   * Returns the order data so the UI can display a confirmation card inline.
   */
  const previewAddonPurchase = async (
    selections: AddOnSelection[],
    billingCycle: BillingCycle,
    coupon?: CheckoutCoupon,
  ) => {
    if (selections.length === 0) return null;
    try {
      const addOnItems = selections.map((s) => ({
        addOnId: s.addOnId,
        billingCycle,
        quantity: s.quantity,
      }));

      const orderRes = await purchaseAddon({
        addOns: addOnItems,
        ...(coupon?.code ? { couponCode: coupon.code } : {}),
      }).unwrap();

      return orderRes.data;
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to get add-on pricing.",
        color: "danger",
      });
      return null;
    }
  };

  /**
   * Complete add-on payment using a previously created order (from previewAddonPurchase).
   * Opens Razorpay and verifies payment.
   */
  const confirmAddonPayment = async (
    order: { orderId: string; amount: number; currency: string; keyId: string },
    addOnItems: { addOnId: string; billingCycle: BillingCycle; quantity: number }[],
    coupon?: CheckoutCoupon,
  ): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const result = await processRazorpayPayment({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        description: "Add-On Purchase",
      });

      if (!result.success) {
        addToast({
          title: "Payment Cancelled",
          description: result.error || "Payment was not completed.",
          color: "warning",
        });
        return false;
      }

      await verifyAddonPurchase({
        orderId: order.orderId,
        paymentId: result.paymentId!,
        signature: result.signature!,
        addOns: addOnItems,
        ...(coupon ? { couponId: String(coupon.couponId) } : {}),
      }).unwrap();

      addToast({
        title: "Add-ons Activated",
        description: "Your add-ons have been activated successfully.",
        color: "success",
      });
      return true;
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to complete payment.",
        color: "danger",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Combined checkout: subscribe to plan + purchase add-ons in a single Razorpay order.
   * Uses the new `/subscribe-with-addons` and `/verify-combined-purchase` endpoints.
   */
  const combinedCheckout = async (
    planId: string,
    planName: string,
    billingCycle: BillingCycle,
    addOns: CombinedAddOnSelection[],
  ): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const orderRes = await subscribeWithAddOns({
        planId,
        billingCycle,
        addOns,
      }).unwrap();

      const orderData = orderRes.data;

      // No payment required (free plan / trial)
      if (!orderData.requiresPayment) {
        addToast({
          title: "Success",
          description: `Successfully subscribed to ${planName}.`,
          color: "success",
        });
        return true;
      }

      // Open Razorpay with the combined amount
      const addOnCount = orderData.breakdown.addOns.length;
      const description = addOnCount > 0
        ? `${planName} + ${addOnCount} Add-On${addOnCount > 1 ? "s" : ""}`
        : `${planName} Subscription`;

      const result = await processRazorpayPayment({
        keyId: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        orderId: orderData.orderId,
        description,
        planId,
        planName,
      });

      if (!result.success) {
        addToast({
          title: "Payment Cancelled",
          description: result.error || "Payment was not completed.",
          color: "warning",
        });
        return false;
      }

      // Verify the combined purchase
      await verifyCombinedPurchase({
        orderId: orderData.orderId,
        paymentId: result.paymentId!,
        signature: result.signature!,
        planId: orderData.breakdown.plan.id,
        billingCycle: orderData.breakdown.plan.billingCycle,
        addOns: orderData.breakdown.addOns.map((a) => ({
          addOnId: a.addOnId,
          quantity: a.quantity,
        })),
      }).unwrap();

      addToast({
        title: "Payment Successful",
        description: `${planName} subscription and add-ons activated successfully.`,
        color: "success",
      });
      return true;
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to process checkout.",
        color: "danger",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return { subscribeToPlan, purchaseAddons, previewAddonPurchase, confirmAddonPayment, combinedCheckout, isProcessing };
}
