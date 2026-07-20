import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  addToast,
  Button,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Skeleton,
  Accordion,
  AccordionItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  useDisclosure,
} from "@heroui/react";
import { format } from "date-fns";
import {
  FiInfo,
  FiUser,
  FiUsers,
  FiDatabase,
  FiCalendar,
  FiRefreshCw,
  FiCreditCard,
  FiArrowRight,
  FiDownload,
  FiAlertTriangle,
  FiCheck,
  FiPackage,
  FiPlus,
  FiMoreVertical,
  FiTrendingUp,
  FiTrendingDown,
  FiXCircle,
  FiZap,
  FiFileText,
} from "react-icons/fi";
import { PiCrownSimpleFill } from "react-icons/pi";

import {
  useGetAllPlansQuery,
  useGetBillingHistoryQuery,
  useGetAvailableAddonsQuery,
  useGetMySubscriptionQuery,
  useScheduleSubscriptionCancelMutation,
  useUndoSubscriptionCancelMutation,
  useGetAutoRenewStatusQuery,
  useEnableAutoRenewMutation,
  useDisableAutoRenewMutation,
  useScheduleAddonCancelMutation,
  useUndoAddonCancelMutation,
  useReduceAddonQuantityMutation,
  useRetrySubscriptionPaymentMutation,
  useVerifyRazorpayPaymentMutation,
  useSubscribeWithAutoPayMutation,
  type Plan,
} from "../../redux/api/subscriptionApi";
import { processRazorpayPayment } from "../../utils/razorpay";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetLimitationsOverviewQuery } from "../../redux/api/limitationsApi";
import {
  computeCheckoutTotals,
  getCyclePrice,
  safeFormatMoney,
  type BillingCycleType,
  type InvoiceData,
} from "../../utils/subscriptionHelpers";
import { useSubscriptionCheckout } from "../../hooks/useSubscriptionCheckout";
import { useCouponValidation } from "../../hooks/useCouponValidation";

import SubscriptionStatusBadge, { deriveSubscriptionStatus } from "../../components/subscription/SubscriptionStatusBadge";
import SubscriptionTimeline from "../../components/subscription/SubscriptionTimeline";
import AutoPayManagement from "../../components/subscription/AutoPayManagement";
import PlanComparison from "../../components/subscription/PlanComparison";
import PlanCheckoutModal from "../../components/subscription/PlanCheckoutModal";
import AddResourcesDrawer from "../../components/subscription/AddResourcesDrawer";
import InvoicePreviewModal from "../../components/subscription/InvoicePreviewModal";
import DowngradeModal from "../../components/subscription/DowngradeModal";
import { FALLBACK_ADDONS } from "../../components/subscription/subscriptionConstants";

/* ─── Pure helpers ─── */
const findPlan = (plans: Plan[], slugs: string[], names: string[]) =>
  plans.find((p) => slugs.includes(p.slug.toLowerCase()) || names.includes(p.name.toLowerCase()));

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
};

const fmtMoney = (a: number | string | null | undefined) => {
  const n = typeof a === "string" ? parseFloat(a) : (a ?? 0);
  if (isNaN(n) || n === 0) return "₹0";
  return `₹${n.toLocaleString("en-IN")}`;
};

const daysUntil = (d: string | null | undefined) => {
  if (!d) return null;
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
};

/* ─── Compact usage widget ─── */
const UsageCard = ({ label, current, total, icon, onUpgrade }: {
  label: string; current: number; total: number | null; icon: React.ReactNode; onUpgrade?: () => void;
}) => {
  const unlimited = total === null;
  const pct = unlimited ? 0 : total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const nearLimit = !unlimited && total !== null && pct >= 80;
  const atLimit = !unlimited && total !== null && current >= total;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-default-500">{icon}{label}</span>
        {atLimit && onUpgrade && (
          <button type="button" onClick={onUpgrade} className="text-[10px] font-semibold text-primary hover:underline">Upgrade</button>
        )}
      </div>
      <p className="text-[15px] font-bold text-default-900 dark:text-white">
        {current}<span className="text-default-300 dark:text-default-500 font-normal text-[12px]"> / {unlimited ? "∞" : total}</span>
      </p>
      {!unlimited ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-default-100 dark:bg-default-50">
          <div className={`h-full rounded-full transition-all ${atLimit ? "bg-danger-400" : nearLimit ? "bg-warning-400" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </div>
      ) : (
        <p className="text-[10px] text-success-500 font-medium">Unlimited</p>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
const Subscription = () => {
  const navigate = useNavigate();
  const invoiceModal = useDisclosure();
  const downgradeModal = useDisclosure();
  const addResourcesDrawer = useDisclosure();
  const autoPayModal = useDisclosure();
  const autoPayCheckoutConfirm = useDisclosure();
  const cancelConfirmModal = useDisclosure();
  const planCheckoutModal = useDisclosure();
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const plansRef = useRef<HTMLDivElement>(null);

  const [billingCycle, setBillingCycle] = useState<BillingCycleType>("monthly");
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  const { data: clinicsData, isLoading: isClinicsLoading, error: clinicsError, refetch: refetchClinics } = useGetAllClinicsQuery();
  const { data: billingData, isLoading: isBillingLoading, error: billingError } = useGetBillingHistoryQuery();
  const { data: plansData, isLoading: isPlansLoading } = useGetAllPlansQuery();
  const { data: limitations } = useGetLimitationsOverviewQuery();
  const { data: addonsData } = useGetAvailableAddonsQuery();
  const { data: mySubData, isLoading: isMySubLoading, refetch: refetchMySubscription } = useGetMySubscriptionQuery();

  const { subscribeToPlan, previewAddonPurchase, confirmAddonPayment, isProcessing } = useSubscriptionCheckout();
  const { couponState, validateCoupon, removeCoupon } = useCouponValidation();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const [scheduleCancel] = useScheduleSubscriptionCancelMutation();
  const [undoCancel] = useUndoSubscriptionCancelMutation();
  const [retryPayment, { isLoading: isRetrying }] = useRetrySubscriptionPaymentMutation();
  const [verifyPayment] = useVerifyRazorpayPaymentMutation();
  const [subscribeWithAutoPay] = useSubscribeWithAutoPayMutation();
  const [scheduleAddonCancel] = useScheduleAddonCancelMutation();
  const [undoAddonCancel] = useUndoAddonCancelMutation();
  const [reduceAddonQuantity] = useReduceAddonQuantityMutation();

  const { data: autoRenewData } = useGetAutoRenewStatusQuery();
  const [enableAutoRenew, { isLoading: isEnabling }] = useEnableAutoRenewMutation();
  const [disableAutoRenew, { isLoading: isDisabling }] = useDisableAutoRenewMutation();
  const autoRenewStatus = autoRenewData?.data;

  /* ─── Derived ─── */
  const mySub = mySubData?.data;
  const subscription = clinicsData?.subscription;
  const billingHistory = billingData?.data || [];
  const availablePlans = plansData?.plans || [];

  const hasActive = mySub?.hasActive ?? subscription?.active === true;
  const currentSlug = String(mySub?.subscription?.planSlug ?? subscription?.slug ?? "free").toLowerCase();
  const currentPlanName = mySub?.subscription?.planName ?? subscription?.planName ?? (currentSlug === "free" ? "Free" : "Plan");
  const expiresAt = mySub?.subscription?.expiresAt || subscription?.expiresAt;
  const cancelAtPeriodEnd = !!mySub?.subscription?.cancelAtPeriodEnd;
  const isFreePlan = currentSlug === "free";
  const remaining = daysUntil(expiresAt);
  const autoRenew = mySub?.subscription?.autoRenew ?? autoRenewStatus?.autoRenew ?? false;
  const autoPayPending = !autoRenew && !!autoRenewStatus?.pendingAuthorization;
  const activeAddOns = useMemo(() => mySub?.addOns || [], [mySub?.addOns]);
  const price = mySub?.subscription?.price;
  const paymentMethod = mySub?.subscription?.paymentMode || "Razorpay";
  const isYearlyCycle = mySub?.subscription?.providerSubscriptionId === "pro-yearly";
  const scheduledPlanId = mySub?.subscription?.scheduledPlanId ?? null;
  const scheduledPlanChangeAt = mySub?.subscription?.scheduledPlanChangeAt ?? null;

  const status = deriveSubscriptionStatus({
    isActive: hasActive, cancelAtPeriodEnd, expiresAt,
    paymentStatus: mySub?.subscription?.paymentStatus, autoRenew,
  });

  const freePlan = findPlan(availablePlans, ["free"], ["free", "free plan"]);
  const proPlan = findPlan(availablePlans, ["pro-monthly", "premium", "pro"], ["pro", "premium plan"]);
  const currentPlanObj = availablePlans.find((p) => p.slug.toLowerCase() === currentSlug);
  const cartPlan = proPlan ?? freePlan;
  const cartPlanName = cartPlan?.name ?? "Pro";
  const isOnCartPlan = cartPlan ? cartPlan.slug.toLowerCase() === currentSlug : false;
  const cartPlanPrice = isOnCartPlan ? 0 : cartPlan ? getCyclePrice(cartPlan.price, billingCycle) : 0;

  const addOns = addonsData?.data?.length ? addonsData.data : FALLBACK_ADDONS;
  const addOnsAreReal = !!addonsData?.data?.length;
  const myUsage = mySub?.usage;

  // Renewal amount = base + non-cancelled add-ons
  const renewalAmount = useMemo(() => {
    const base = Number(price || 0);
    const addOnSum = activeAddOns.filter((a) => !a.cancelAtPeriodEnd).reduce((s, a) => s + Number(a.totalPrice || 0), 0);
    return base + addOnSum;
  }, [price, activeAddOns]);

  const scheduledPlanName = scheduledPlanId
    ? (availablePlans.find((p) => p.id === scheduledPlanId)?.name ?? "a new plan")
    : null;

  const pendingChanges = useMemo(() => {
    const changes: { icon: React.ReactNode; text: string }[] = [];
    if (scheduledPlanName) changes.push({ icon: <FiTrendingDown className="text-warning-500" />, text: `Downgrading to ${scheduledPlanName} on ${fmtDate(scheduledPlanChangeAt)}` });
    if (cancelAtPeriodEnd) changes.push({ icon: <FiXCircle className="text-danger-400" />, text: `Subscription cancels on ${fmtDate(expiresAt)}` });
    activeAddOns.filter((a) => a.cancelAtPeriodEnd).forEach((a) =>
      changes.push({ icon: <FiTrendingDown className="text-warning-500" />, text: `${a.addOnName} scheduled for removal on ${fmtDate(a.latestExpiresAt)}` })
    );
    return changes;
  }, [cancelAtPeriodEnd, expiresAt, activeAddOns, scheduledPlanName, scheduledPlanChangeAt]);

  const totals = useMemo(() => {
    const lines = addOns.filter((a) => (selectedAddOns[a.id] ?? 0) > 0).map((a) => ({
      unitPrice: billingCycle === "yearly" ? (a.yearlyPrice ?? getCyclePrice(a.unitPrice, billingCycle)) : a.unitPrice, quantity: selectedAddOns[a.id],
    }));
    const base = computeCheckoutTotals({ planPrice: cartPlanPrice, selectedAddOns: lines, discountPct: 0 });
    if (couponState.applied && couponState.discountAmount > 0) {
      const disc = Math.min(couponState.discountAmount, base.subtotal);
      return { ...base, discount: disc, totalPayable: Math.max(0, base.subtotal - disc) };
    }
    return base;
  }, [addOns, selectedAddOns, billingCycle, cartPlanPrice, couponState]);

  /* ─── Handlers ─── */
  const scrollToPlans = () => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.slug.toLowerCase() === currentSlug) return;
    const isFreePlanTarget = plan.price <= 0 || plan.slug.toLowerCase() === "free";

    if (isFreePlanTarget) {
      // Free plan — no payment, no mandate, no coupon.
      setProcessingPlanId(plan.id);
      const success = await subscribeToPlan({ id: plan.id, name: plan.name, price: plan.price });
      if (success) await Promise.all([refetchMySubscription(), refetchClinics()]);
      setProcessingPlanId(null);
      return;
    }

    // Paid plan → open the checkout modal (coupon entry + AutoPay vs pay-once).
    setCheckoutPlan(plan);
    planCheckoutModal.onOpen();
  };

  /** Confirm from the plan checkout modal: routes to coupon/one-time or AutoPay. */
  const handlePlanCheckoutConfirm = async ({
    coupon,
    useAutoPay,
  }: {
    coupon: { code: string; couponId: number } | null;
    useAutoPay: boolean;
  }) => {
    const plan = checkoutPlan;
    if (!plan) return;
    setProcessingPlanId(plan.id);
    try {
      if (useAutoPay && !coupon) {
        // Recurring AutoPay subscription (Razorpay mandate). Coupons are not
        // supported on recurring, so this path is only used without a coupon.
        const res = await subscribeWithAutoPay({
          planId: plan.id,
          billingCycle: billingCycle === "yearly" ? "yearly" : "monthly",
        }).unwrap();
        if (res.data?.shortUrl) {
          window.open(res.data.shortUrl, "_blank");
          addToast({
            title: "Complete Your Subscription",
            description:
              "A new tab opened — pay the first cycle and authorize AutoPay. Your plan activates once payment is confirmed.",
            color: "primary",
          });
          planCheckoutModal.onClose();
        } else {
          addToast({ title: "Error", description: "Could not start the subscription.", color: "danger" });
        }
      } else {
        // One-time payment (optionally with a coupon discount).
        const success = await subscribeToPlan(
          { id: plan.id, name: plan.name, price: plan.price },
          coupon ?? undefined,
        );
        if (success) {
          await Promise.all([refetchMySubscription(), refetchClinics()]);
          planCheckoutModal.onClose();
        }
      }
    } catch (err: any) {
      addToast({
        title: "Subscription Failed",
        description:
          err?.data?.message ||
          "Unable to process the subscription. Please try again.",
        color: "danger",
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const hasSelectedAddOns = addOns.some((a) => (selectedAddOns[a.id] ?? 0) > 0);

  /** The actual checkout logic — called directly or after user confirms the AutoPay notice. */
  const executeCheckout = async () => {
    if (!cartPlan) return;
    const cycle: "monthly" | "yearly" = billingCycle === "yearly" ? "yearly" : "monthly";
    const coupon = couponState.applied && couponState.couponId ? { code: couponState.code, couponId: couponState.couponId } : undefined;
    if (cartPlan.slug.toLowerCase() !== currentSlug) {
      const ok = await subscribeToPlan({ id: cartPlan.id, name: cartPlan.name, price: cartPlan.price }, coupon);
      if (!ok) return;
      await Promise.all([refetchMySubscription(), refetchClinics()]);
    }
    if (hasSelectedAddOns) {
      if (!addOnsAreReal) { addToast({ title: "Add-ons coming soon", color: "primary" }); return; }
      const selections = addOns.filter((a) => (selectedAddOns[a.id] ?? 0) > 0).map((a) => ({ addOnId: a.id, name: a.name, quantity: selectedAddOns[a.id] }));
      const order = await previewAddonPurchase(selections, cycle, coupon);
      if (order) {
        const items = selections.map((s) => ({ addOnId: s.addOnId, billingCycle: cycle, quantity: s.quantity }));
        const success = await confirmAddonPayment(order as any, items, coupon);
        if (success) { setSelectedAddOns({}); addResourcesDrawer.onClose(); }
      }
    }
  };

  /** Gate: if AutoPay is enabled, show a confirmation popup first. */
  const handleCheckout = async () => {
    if (autoRenew && hasSelectedAddOns) {
      autoPayCheckoutConfirm.onOpen();
    } else {
      await executeCheckout();
    }
  };

  const handleToggleAutoRenew = async (enabled: boolean) => {
    try {
      if (enabled) {
        const res = await enableAutoRenew().unwrap();
        if (res.data?.shortUrl) {
          window.open(res.data.shortUrl, "_blank");
          addToast({
            title: "Authorization Required",
            description: "A new tab opened — authorize the mandate to activate AutoPay. It stays 'Pending' until you complete it.",
            color: "primary",
          });
        } else addToast({ title: "AutoPay Enabled", color: "success" });
      } else {
        await disableAutoRenew().unwrap();
        addToast({ title: "AutoPay Disabled", description: "Renew manually before expiry.", color: "success" });
      }
      refetchMySubscription();
    } catch (err: any) { addToast({ title: "Error", description: err?.data?.message || "Failed.", color: "danger" }); }
  };

  const [isCancelling, setIsCancelling] = useState(false);
  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      await scheduleCancel({ reason: "User requested cancellation" }).unwrap();
      addToast({ title: "Cancellation Scheduled", description: `Active until ${fmtDate(expiresAt)}. You can undo anytime before then.`, color: "success" });
      refetchMySubscription();
      cancelConfirmModal.onClose();
    } catch (err: any) {
      addToast({ title: "Error", description: err?.data?.message || "Failed.", color: "danger" });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUndoCancellation = async () => {
    try {
      await undoCancel().unwrap();
      addToast({ title: "Cancellation Reversed", color: "success" });
      refetchMySubscription();
    } catch (err: any) { addToast({ title: "Error", description: err?.data?.message || "Failed.", color: "danger" }); }
  };

  const handleRetryPayment = async () => {
    try {
      const order = await retryPayment().unwrap();
      if (!order.requiresPayment) {
        addToast({ title: "Subscription Active", color: "success" });
        refetchMySubscription();
        return;
      }
      const result = await processRazorpayPayment({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        description: `${currentPlanName} Subscription`,
        planId: order.planId,
        planName: currentPlanName,
      });
      if (!result.success) {
        addToast({ title: "Payment Cancelled", description: result.error || "Payment was not completed.", color: "warning" });
        return;
      }
      await verifyPayment({
        orderId: order.orderId,
        paymentId: result.paymentId!,
        signature: result.signature!,
        planId: order.planId,
        providerSubscriptionId: order.providerSubscriptionId,
        paymentMethod: result.paymentMethod,
      }).unwrap();
      addToast({ title: "Payment Successful", description: `${currentPlanName} is now active.`, color: "success" });
      refetchMySubscription();
    } catch (err: any) {
      addToast({ title: "Retry Failed", description: err?.data?.message || "Unable to retry payment.", color: "danger" });
    }
  };

  const handleCancelAddOn = async (featureKey: string) => {
    const addon = activeAddOns.find((a) => a.featureKey === featureKey);
    if (!addon?.id) return;
    try {
      await scheduleAddonCancel({ clinicAddOnId: addon.id }).unwrap();
      addToast({ title: "Scheduled for removal", description: `"${addon.addOnName}" active until period ends.`, color: "success" });
      refetchMySubscription();
    } catch (err: any) { addToast({ title: "Error", description: err?.data?.message || "Failed.", color: "danger" }); }
  };

  const handleUndoCancelAddOn = async (featureKey: string) => {
    const addon = activeAddOns.find((a) => a.featureKey === featureKey);
    if (!addon?.id) return;
    try {
      await undoAddonCancel(addon.id).unwrap();
      addToast({ title: "Restored", color: "success" });
      refetchMySubscription();
    } catch (err: any) { addToast({ title: "Error", description: err?.data?.message || "Failed.", color: "danger" }); }
  };

  const handleReduceAddOnQuantity = async (featureKey: string, reduceBy: number) => {
    const addon = activeAddOns.find((a) => a.featureKey === featureKey);
    if (!addon?.id) return;
    try {
      const res = await reduceAddonQuantity({ clinicAddOnId: addon.id, reduceBy }).unwrap();
      addToast({ title: res.data?.removed ? "Removed" : "Reduced", color: "success" });
      refetchMySubscription();
    } catch (err: any) { addToast({ title: "Error", description: err?.data?.message || "Failed.", color: "danger" }); }
  };

  const handleViewInvoice = (item: any) => {
    try {
      setSelectedInvoice({
        id: item.id, transactionId: item.transactionId, planName: item.planName,
        planDescription: item.planDescription || "Clinic Subscription Plan", price: item.price,
        startsAt: item.startsAt, expiresAt: item.expiresAt, createdAt: item.createdAt,
        paymentMode: item.paymentMode, paymentStatus: item.paymentStatus, clinicName: item.clinicName,
        clinicAddress: item.clinicAddress, clinicPhone: item.clinicPhone, clinicState: item.clinicState,
        clinicCity: item.clinicCity, zipCode: item.ZipCode, currency: item.currency || "INR",
        adminName: item.adminName, adminEmail: item.adminEmail, adminMobile: item.adminMobile,
      });
      invoiceModal.onOpen();
    } catch { addToast({ title: "Error", description: "Failed to load invoice.", color: "danger" }); }
  };

  const handleApplyCoupon = () => {
    const lines = addOns.filter((a) => (selectedAddOns[a.id] ?? 0) > 0).map((a) => ({
      unitPrice: billingCycle === "yearly" ? (a.yearlyPrice ?? getCyclePrice(a.unitPrice, billingCycle)) : a.unitPrice, quantity: selectedAddOns[a.id],
    }));
    const orderValue = cartPlanPrice + lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    validateCoupon(couponCode, orderValue, { billingCycle: billingCycle === "yearly" ? "yearly" : "monthly" });
  };
  const handleRemoveCoupon = () => { removeCoupon(); setCouponCode(""); };

  /* ─── Loading / Error / Empty ─── */
  if (isClinicsLoading || isBillingLoading || isPlansLoading || isMySubLoading) {
    return (
      <div id="tour-admin-subscription-page" className="mx-auto w-full space-y-6 p-1">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (clinicsError || billingError) {
    return (
      <div id="tour-admin-subscription-page" className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-sm border border-danger-200 bg-danger-50 dark:bg-danger-100/10">
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <FiInfo className="text-danger-500 text-xl" />
            <p className="text-sm text-danger-700 dark:text-danger-300">Unable to load subscription data.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div id="tour-admin-subscription-page" className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-sm border border-warning-200 bg-warning-50 dark:bg-warning-100/10">
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <FiInfo className="text-warning-500 text-xl" />
            <p className="text-sm text-warning-700 dark:text-warning-300">Create a clinic first to manage billing.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const recentInvoices = billingHistory.slice(0, 5);
  const planFeatures = currentPlanObj?.features?.slice(0, 6) ?? [];

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div id="tour-admin-subscription-page" className="mx-auto w-full space-y-6 pb-24 sm:pb-6">

      {/* ─── HEADER ─── */}
      <header className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-default-900 dark:text-white sm:text-[24px] md:text-[26px]">
          Subscription &amp; Billing
        </h1>
        <p className="mt-1 text-[12px] font-medium text-default-500 sm:text-[13px]">
          Manage your plan, payments, add-ons, and billing history
        </p>
      </header>

      {/* Payment failed / pending — highest-priority banner */}
      {(status === "payment_failed" || status === "payment_pending") && (
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 dark:bg-danger-100/5 border border-danger-100 dark:border-danger-200/20 px-4 py-2.5">
          <FiAlertTriangle className="text-danger-500 shrink-0" />
          <p className="text-[12px] text-danger-700 dark:text-danger-300 flex-1">
            <span className="font-medium">
              {status === "payment_failed" ? "Your last payment failed." : "Payment is being processed."}
            </span>{" "}
            {status === "payment_failed"
              ? "Retry to keep your subscription active."
              : "This may take a moment to confirm via your bank."}
          </p>
          {status === "payment_failed" && (
            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={isRetrying}
              className="text-[11px] font-semibold text-danger-700 dark:text-danger-300 underline underline-offset-2 shrink-0 disabled:opacity-50"
            >
              {isRetrying ? "Processing..." : "Retry Payment"}
            </button>
          )}
        </div>
      )}

      {/* ═══ SECTION 1: HERO — Subscription Summary ═══ */}
      <section className="rounded-2xl border border-default-200 dark:border-default-100 bg-background px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          {/* Identity + meta */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              {!isFreePlan && <PiCrownSimpleFill className="text-amber-500 text-lg" />}
              <h2 className="text-lg font-bold text-default-900 dark:text-white">{currentPlanName}</h2>
              <SubscriptionStatusBadge status={status} />
            </div>
            {!isFreePlan ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-default-400">
                <span>Renews <span className="text-default-700 dark:text-default-200 font-medium">{fmtDate(expiresAt)}</span></span>
                <span>Billed <span className="text-default-700 dark:text-default-200 font-medium">{isYearlyCycle ? "Yearly" : "Monthly"}</span></span>
                <span className="flex items-center gap-1">
                  <FiRefreshCw className="text-[10px]" /> AutoPay
                  <span className={`font-medium ${autoRenew ? "text-success-600" : autoPayPending ? "text-warning-600" : "text-default-500"}`}>
                    {autoRenew ? "On" : autoPayPending ? "Pending" : "Off"}
                  </span>
                </span>
                <span className="flex items-center gap-1"><FiCreditCard className="text-[10px]" /> {paymentMethod}</span>
              </div>
            ) : (
              <p className="text-[12px] text-default-400">Basic features for individual practitioners.</p>
            )}
            {pendingChanges.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-warning-600 dark:text-warning-400">
                <FiAlertTriangle className="text-[10px]" />
                {pendingChanges.length} pending change{pendingChanges.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Amount + primary CTA */}
          <div className="flex items-center justify-between gap-4 sm:justify-start sm:gap-5 md:flex-col md:items-end md:justify-start md:gap-2">
            {!isFreePlan && (
              <div className="md:text-right">
                <p className="text-xl font-bold text-default-900 dark:text-white leading-none sm:text-2xl">{fmtMoney(renewalAmount)}</p>
                <p className="text-[11px] text-default-400 mt-1">next charge{remaining !== null ? ` · ${remaining}d` : ""}</p>
              </div>
            )}
            {isFreePlan ? (
              <button type="button" onClick={scrollToPlans} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-primary-600 transition active:scale-[0.97]">
                Upgrade Plan <FiArrowRight className="text-[11px]" />
              </button>
            ) : cancelAtPeriodEnd ? (
              <button type="button" onClick={handleUndoCancellation} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-success-500 px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-success-600 transition active:scale-[0.97]">
                Resume Plan
              </button>
            ) : (
              <button type="button" onClick={scrollToPlans} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-default-200 dark:border-default-100 px-4 py-2 text-[13px] font-medium text-default-700 dark:text-default-200 hover:bg-default-50 dark:hover:bg-default-50/30 transition">
                Manage Plan
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: Usage ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-default-900 dark:text-white">Usage</h3>
          {!isFreePlan && (
            <button type="button" onClick={addResourcesDrawer.onOpen} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
              <FiPlus className="text-[10px]" /> Add resources
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          <UsageCard label="Doctors" icon={<FiUser className="text-[11px]" />} onUpgrade={scrollToPlans}
            current={myUsage?.doctors?.current ?? 0}
            total={myUsage?.doctors?.isUnlimited ? null : (myUsage?.doctors?.limit ?? null)} />
          <UsageCard label="Staff" icon={<FiUsers className="text-[11px]" />} onUpgrade={scrollToPlans}
            current={myUsage?.staff?.current ?? 0}
            total={myUsage?.staff?.isUnlimited ? null : (myUsage?.staff?.limit ?? null)} />
          <UsageCard label="Storage" icon={<FiDatabase className="text-[11px]" />} onUpgrade={scrollToPlans}
            current={limitations?.limits.find((l) => l.featureKey === "storage_months")?.currentUsage ?? 0}
            total={limitations?.limits.find((l) => l.featureKey === "storage_months")?.totalLimit ?? null} />
          <UsageCard label="Patient Data" icon={<FiCalendar className="text-[11px]" />}
            current={0}
            total={limitations?.limits.find((l) => l.featureKey === "payment_history_months")?.totalLimit ?? null} />
        </div>
      </section>

      {/* ═══ SECTION 3: Current Subscription ═══ */}
      {!isFreePlan && (
        <section className="space-y-5">
          <h3 className="text-[15px] font-semibold text-default-900 dark:text-white">Current Subscription</h3>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left: Add-ons list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-default-400 uppercase tracking-wide">Add-ons</p>
                <button type="button" onClick={addResourcesDrawer.onOpen} className="text-[11px] font-medium text-primary hover:underline">+ Add</button>
              </div>
              {activeAddOns.length === 0 ? (
                <div className="rounded-lg border border-dashed border-default-200 dark:border-default-100 px-4 py-6 text-center">
                  <FiPackage className="text-default-300 mx-auto mb-1.5" />
                  <p className="text-[12px] text-default-400">No add-ons yet</p>
                  <button type="button" onClick={addResourcesDrawer.onOpen} className="text-[11px] font-medium text-primary hover:underline mt-1">Browse add-ons</button>
                </div>
              ) : (
                <div className="divide-y divide-default-100 dark:divide-default-50 rounded-lg border border-default-100 dark:border-default-50">
                  {activeAddOns.map((addon) => (
                    <div key={addon.featureKey} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-default-100 dark:bg-default-50/50">
                        <FiPackage className="text-default-400 text-[11px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-default-800 dark:text-default-200 truncate">
                          {addon.addOnName}{addon.totalQuantity > 1 && <span className="text-default-400 ml-1">×{addon.totalQuantity}</span>}
                        </p>
                        <p className="text-[10px] text-default-400">
                          {fmtMoney(addon.totalPrice)}/{addon.billingCycle === "yearly" ? "yr" : "mo"} · renews {fmtDate(addon.latestExpiresAt)}
                        </p>
                      </div>
                      {addon.cancelAtPeriodEnd ? (
                        <Chip size="sm" color="warning" variant="flat" classNames={{ content: "text-[9px]" }}>Removing</Chip>
                      ) : (
                        <Dropdown placement="bottom-end">
                          <DropdownTrigger>
                            <button type="button" className="p-1 rounded hover:bg-default-100 dark:hover:bg-default-50 transition" aria-label="Add-on actions">
                              <FiMoreVertical className="text-[13px] text-default-400" />
                            </button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="Add-on actions" onAction={(key) => {
                            if (key === "add") addResourcesDrawer.onOpen();
                            else if (key === "reduce") handleReduceAddOnQuantity(addon.featureKey, 1);
                            else if (key === "remove") handleCancelAddOn(addon.featureKey);
                          }}>
                            <DropdownItem key="add" startContent={<FiTrendingUp className="text-xs" />}>Increase quantity</DropdownItem>
                            <DropdownItem key="reduce" startContent={<FiTrendingDown className="text-xs" />}>Decrease quantity</DropdownItem>
                            <DropdownItem key="remove" className="text-danger" color="danger" startContent={<FiXCircle className="text-xs" />}>Schedule removal</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Upcoming renewal + pending changes */}
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-medium text-default-400 uppercase tracking-wide mb-2">Upcoming Invoice</p>
                <div className="rounded-lg border border-default-100 dark:border-default-50 px-4 py-3 space-y-2">
                  {cancelAtPeriodEnd ? (
                    <p className="text-[12px] text-default-400">No upcoming charge — subscription is cancelling.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-default-500">{currentPlanName} plan</span>
                        <span className="text-default-700 dark:text-default-200 font-medium">{fmtMoney(price)}</span>
                      </div>
                      {activeAddOns.filter((a) => !a.cancelAtPeriodEnd).map((a) => (
                        <div key={a.featureKey} className="flex items-center justify-between text-[12px]">
                          <span className="text-default-500">{a.addOnName}{a.totalQuantity > 1 ? ` ×${a.totalQuantity}` : ""}</span>
                          <span className="text-default-700 dark:text-default-200 font-medium">{fmtMoney(a.totalPrice)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-default-100 dark:border-default-50 pt-2 mt-1">
                        <span className="text-[12px] font-semibold text-default-900 dark:text-white">Total on {fmtDate(expiresAt)}</span>
                        <span className="text-[13px] font-bold text-default-900 dark:text-white">{fmtMoney(renewalAmount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {pendingChanges.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-default-400 uppercase tracking-wide mb-2">Pending Changes</p>
                  <div className="space-y-1.5">
                    {pendingChanges.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-default-600 dark:text-default-300">
                        <span className="shrink-0">{c.icon}</span>{c.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plan features — subtle */}
          {planFeatures.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
              {planFeatures.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1.5 text-[11px] text-default-500">
                  <FiCheck className="text-success-500 text-[10px]" />{f.name}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ SECTION 4: Manage Subscription ═══ */}
      {!isFreePlan && (
        <section className="space-y-4">
          <h3 className="text-[15px] font-semibold text-default-900 dark:text-white">Manage Subscription</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { key: "upgrade", label: "Upgrade Plan", desc: "Move to a higher tier", icon: <FiTrendingUp />, onClick: scrollToPlans },
              { key: "addons", label: "Manage Add-ons", desc: "Adjust resources", icon: <FiPackage />, onClick: () => downgradeModal.onOpen() },
              { key: "autopay", label: "Manage AutoPay", desc: autoRenew ? "Enabled" : "Disabled", icon: <FiRefreshCw />, onClick: autoPayModal.onOpen },
              { key: "add", label: "Add Resources", desc: "Buy add-ons", icon: <FiPlus />, onClick: addResourcesDrawer.onOpen },
              cancelAtPeriodEnd
                ? { key: "resume", label: "Resume Plan", desc: "Re-enable renewal", icon: <FiRefreshCw />, onClick: handleUndoCancellation, danger: false }
                : { key: "cancel", label: "Cancel Plan", desc: "End at period close", icon: <FiXCircle />, onClick: () => cancelConfirmModal.onOpen(), danger: true },
            ].map((a: any) => (
              <button key={a.key} type="button" onClick={a.onClick}
                className="flex items-start gap-2.5 rounded-xl border border-default-100 dark:border-default-50 px-3 py-3 text-left transition hover:border-default-200 hover:bg-default-50/50 dark:hover:bg-default-50/20 active:scale-[0.98]">
                <span className={`mt-0.5 text-sm ${a.danger ? "text-danger-500" : "text-default-500"}`}>{a.icon}</span>
                <span className="min-w-0">
                  <span className={`block text-[12px] font-medium ${a.danger ? "text-danger-500" : "text-default-800 dark:text-default-200"}`}>{a.label}</span>
                  <span className="block text-[10px] text-default-400 truncate">{a.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SECTION 5: Billing ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-default-900 dark:text-white">Billing History</h3>
          {billingHistory.length > 5 && (
            <button type="button" onClick={() => navigate("/subscription/invoices")} className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
              View all <FiArrowRight className="text-[10px]" />
            </button>
          )}
        </div>
        {recentInvoices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-default-200 dark:border-default-100 bg-background px-4 py-10 text-center">
            <FiFileText className="text-default-300 mx-auto mb-2 text-lg" />
            <p className="text-[13px] font-medium text-default-600 dark:text-default-300">No invoices yet</p>
            <p className="text-[12px] text-default-400 mt-0.5">Invoices appear here after your first payment.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="space-y-2 sm:hidden">
              {recentInvoices.map((item: any) => {
                const isActive = item.active && item.expiresAt ? new Date(item.expiresAt) > new Date() : item.active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleViewInvoice(item)}
                    className="flex w-full items-center gap-3 rounded-xl border border-default-100 dark:border-default-50 bg-background px-3.5 py-3 text-left transition active:scale-[0.99] active:bg-default-50/60 dark:active:bg-default-50/10"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-default-100 dark:bg-default-50/50">
                      <FiFileText className="text-default-400 text-[13px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-default-800 dark:text-default-200 truncate">{item.planName || "—"}</p>
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${isActive ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400" : "border-default-200 bg-default-50 text-default-500 dark:border-default-100 dark:bg-default-50/50"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-success-500" : "bg-default-400"}`} />
                          {isActive ? "Paid" : "Expired"}
                        </span>
                      </div>
                      <p className="text-[11px] text-default-400 mt-0.5">{fmtDate(item.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[14px] font-bold text-default-900 dark:text-white">{safeFormatMoney(Number(item.price || 0), item.currency || "INR")}</span>
                      <FiDownload className="text-default-300 text-[13px]" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tablet+: table */}
            <div className="hidden overflow-hidden rounded-lg border border-default-100 bg-background shadow-sm dark:border-default-50 sm:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-[14px] text-left">
                  <thead className="border-b border-default-100 bg-default-50 dark:border-default-50 dark:bg-default-50/50">
                    <tr className="text-left text-[13px] font-semibold text-default-500">
                      <th className="px-5 py-3.5">Invoice</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((item: any, idx: number) => {
                      const isActive = item.active && item.expiresAt ? new Date(item.expiresAt) > new Date() : item.active;
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors hover:bg-default-50/60 dark:hover:bg-default-50/20 ${idx !== recentInvoices.length - 1 ? "border-b border-default-100 dark:border-default-50" : ""}`}
                        >
                          <td className="px-5 py-3.5 text-[13px] font-medium text-default-800 dark:text-default-200">{item.planName || "—"}</td>
                          <td className="px-5 py-3.5 text-[13px] text-default-500">{fmtDate(item.createdAt)}</td>
                          <td className="px-5 py-3.5 text-[13px] font-semibold text-default-800 dark:text-default-200">{safeFormatMoney(Number(item.price || 0), item.currency || "INR")}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold leading-none ${isActive ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400" : "border-default-200 bg-default-50 text-default-500 dark:border-default-100 dark:bg-default-50/50"}`}>
                              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-success-500" : "bg-default-400"}`} />
                              {isActive ? "Paid" : "Expired"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button type="button" onClick={() => handleViewInvoice(item)} className="inline-grid h-8 w-8 place-items-center rounded-lg border border-default-200 bg-background text-default-500 shadow-sm transition hover:bg-primary/5 hover:text-primary hover:border-primary/30 dark:border-default-100" aria-label="Download receipt">
                              <FiDownload className="text-[12px]" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ═══ SECTION 6: Plan Comparison (collapsed by default for active subs) ═══ */}
      <section ref={plansRef} className="scroll-mt-6">
        <Accordion
          variant="bordered"
          defaultExpandedKeys={isFreePlan ? ["plans"] : []}
          className="rounded-lg border-default-100 bg-background shadow-sm dark:border-default-50 px-0"
        >
          <AccordionItem
            key="plans"
            aria-label="Compare plans"
            classNames={{ trigger: "py-3.5 px-5", title: "text-[15px] font-semibold text-default-900 dark:text-white", content: "px-5 pb-4" }}
            title={
              <div className="flex items-center gap-2">
                <FiZap className="text-primary text-sm" />
                {isFreePlan ? "Choose a Plan" : "Compare Plans & Pricing"}
              </div>
            }
            subtitle={<span className="text-[12px] text-default-500">View available plans and pricing</span>}
          >
            {/* Billing cycle toggle inside plans */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-1 rounded-full bg-default-100 dark:bg-default-50 p-1">
                <button type="button" onClick={() => setBillingCycle("monthly")}
                  className={`rounded-full px-4 py-1 text-[12px] font-medium transition ${billingCycle === "monthly" ? "bg-background shadow-sm text-default-900 dark:text-white" : "text-default-500"}`}>Monthly</button>
                <button type="button" onClick={() => setBillingCycle("yearly")}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1 text-[12px] font-medium transition ${billingCycle === "yearly" ? "bg-background shadow-sm text-default-900 dark:text-white" : "text-default-500"}`}>
                  Yearly <span className="rounded-full bg-success-100 dark:bg-success-500/20 px-1.5 text-[9px] font-semibold text-success-700 dark:text-success-400">-20%</span>
                </button>
              </div>
            </div>
            <PlanComparison
              freePlan={freePlan}
              proPlan={proPlan}
              currentSlug={currentSlug}
              billingCycle={billingCycle}
              onSelectPlan={handleSelectPlan}
              onContactSales={() => addToast({ title: "Contact Sales", description: "Coming soon.", color: "primary" })}
              processingPlanId={processingPlanId}
            />
          </AccordionItem>
        </Accordion>
      </section>

      {/* ═══ SECTION 7: Activity Timeline (collapsed) ═══ */}
      <section>
        <Accordion
          variant="bordered"
          className="rounded-lg border-default-100 bg-background shadow-sm dark:border-default-50 px-0"
        >
          <AccordionItem
            key="timeline"
            aria-label="Activity timeline"
            classNames={{ trigger: "py-3.5 px-5", title: "text-[15px] font-semibold text-default-900 dark:text-white", content: "px-5 pb-4" }}
            title={
              <div className="flex items-center gap-2">
                <FiCalendar className="text-primary text-sm" />
                Activity Timeline
              </div>
            }
            subtitle={<span className="text-[12px] text-default-500">View subscription history</span>}
          >
            <SubscriptionTimeline
              billingHistory={billingHistory}
              cancelAtPeriodEnd={cancelAtPeriodEnd}
              expiresAt={expiresAt}
              cancelledAt={mySub?.subscription?.cancelledAt}
              autoRenew={autoRenew}
            />
          </AccordionItem>
        </Accordion>
      </section>

      {/* ══════════════ DRAWERS & MODALS ══════════════ */}
      <AddResourcesDrawer
        isOpen={addResourcesDrawer.isOpen}
        onClose={addResourcesDrawer.onClose}
        addOns={addOns}
        selected={selectedAddOns}
        onQtyChange={(id, qty) => setSelectedAddOns((p) => ({ ...p, [id]: qty }))}
        planName={cartPlanName}
        planPrice={cartPlanPrice}
        addOnTotal={totals.addOnTotal}
        subtotal={totals.subtotal}
        billingCycle={billingCycle}
        couponCode={couponCode}
        onCouponCodeChange={setCouponCode}
        appliedCode={couponState.applied ? couponState.code : null}
        appliedDiscountPct={couponState.discountType === "percentage" && couponState.discountValue ? parseFloat(couponState.discountValue) : 0}
        discountAmount={totals.discount}
        couponError={couponState.error}
        couponDescription={couponState.description}
        isValidatingCoupon={couponState.isValidating}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        totalPayable={totals.totalPayable}
        onCheckout={handleCheckout}
        isProcessing={isProcessing}
        isDisabled={isFreePlan}
      />

      {/* AutoPay management modal */}
      {autoPayModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={autoPayModal.onClose}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <AutoPayManagement
              autoRenew={autoRenew}
              expiresAt={expiresAt}
              canEnable={autoRenewStatus?.canEnable ?? true}
              reason={autoRenewStatus?.reason}
              cancelAtPeriodEnd={cancelAtPeriodEnd}
              isLoading={isEnabling || isDisabling}
              onToggleAutoRenew={(enabled) => { handleToggleAutoRenew(enabled); autoPayModal.onClose(); }}
            />
          </div>
        </div>
      )}

      {/* AutoPay add-on checkout confirmation */}
      <Modal
        isOpen={autoPayCheckoutConfirm.isOpen}
        onClose={autoPayCheckoutConfirm.onClose}
        size="sm"
        classNames={{ base: "rounded-2xl", header: "border-b border-default-100 pb-3", footer: "border-t border-default-100 pt-3" }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2 px-6 pt-5">
            <FiRefreshCw className="text-primary" />
            <span className="text-[15px] font-semibold text-default-900 dark:text-white">AutoPay Active</span>
          </ModalHeader>
          <ModalBody className="px-6 py-4">
            <p className="text-[13px] text-default-600 dark:text-default-300">
              AutoPay is enabled on your account. After purchasing these add-ons:
            </p>
            <ul className="mt-3 space-y-2 text-[12px] text-default-500">
              <li className="flex items-start gap-2">
                <FiCheck className="text-success-500 shrink-0 mt-0.5 text-[11px]" />
                <span>You'll be charged the <span className="font-medium text-default-700 dark:text-default-200">pro-rated amount</span> for the current billing period now.</span>
              </li>
              <li className="flex items-start gap-2">
                <FiRefreshCw className="text-primary shrink-0 mt-0.5 text-[11px]" />
                <span>Your <span className="font-medium text-default-700 dark:text-default-200">next AutoPay renewal</span> will automatically include the add-on costs going forward.</span>
              </li>
              <li className="flex items-start gap-2">
                <FiCalendar className="text-default-400 shrink-0 mt-0.5 text-[11px]" />
                <span>The updated recurring amount takes effect from your next billing cycle — no mid-cycle changes.</span>
              </li>
            </ul>
          </ModalBody>
          <ModalFooter className="px-6 pb-5 gap-2">
            <Button variant="flat" color="default" onPress={autoPayCheckoutConfirm.onClose} className="rounded-xl flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button color="primary" variant="solid" className="rounded-xl flex-1 sm:flex-none" onPress={async () => {
              autoPayCheckoutConfirm.onClose();
              await executeCheckout();
            }}>
              Continue & Purchase
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Cancel subscription confirmation */}
      <Modal
        isOpen={cancelConfirmModal.isOpen}
        onClose={cancelConfirmModal.onClose}
        size="md"
        classNames={{
          base: "rounded-2xl",
          header: "border-b border-default-100 pb-3",
          footer: "border-t border-default-100 pt-3",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2 px-6 pt-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-50 dark:bg-danger-100/10">
              <FiAlertTriangle className="text-danger-500" />
            </div>
            <span className="text-[15px] font-semibold text-default-900 dark:text-white">
              Cancel Subscription?
            </span>
          </ModalHeader>
          <ModalBody className="px-6 py-4 space-y-3">
            <p className="text-[13px] text-default-600 dark:text-default-300 leading-relaxed">
              Your subscription stays <span className="font-medium text-default-800 dark:text-default-200">fully active until {fmtDate(expiresAt)}</span>. After that it won't renew.
            </p>
            <div className="rounded-xl bg-default-50 dark:bg-default-50/30 border border-default-100 dark:border-default-100/50 px-4 py-3">
              <p className="text-[11px] font-semibold text-default-700 dark:text-default-300 mb-2">What happens after {fmtDate(expiresAt)}</p>
              <ul className="space-y-1.5 text-[11px] text-default-500">
                <li className="flex items-start gap-2"><FiCheck className="text-success-500 shrink-0 mt-0.5 text-[10px]" /> Your data stays safe — nothing is deleted</li>
                <li className="flex items-start gap-2"><FiCheck className="text-success-500 shrink-0 mt-0.5 text-[10px]" /> Full access continues until {fmtDate(expiresAt)}</li>
                <li className="flex items-start gap-2"><FiAlertTriangle className="text-warning-500 shrink-0 mt-0.5 text-[10px]" /> Account reverts to Free plan limits</li>
                <li className="flex items-start gap-2"><FiAlertTriangle className="text-warning-500 shrink-0 mt-0.5 text-[10px]" /> Staff/doctors beyond Free limits are temporarily deactivated</li>
              </ul>
            </div>
            <p className="text-[11px] text-default-400 text-center">You can undo this anytime before {fmtDate(expiresAt)}.</p>
          </ModalBody>
          <ModalFooter className="px-6 pb-5 gap-2">
            <Button variant="flat" color="default" className="rounded-xl flex-1 sm:flex-none" onPress={cancelConfirmModal.onClose}>
              Keep My Plan
            </Button>
            <Button color="danger" variant="solid" className="rounded-xl flex-1 sm:flex-none" isLoading={isCancelling} onPress={handleCancelSubscription}>
              Confirm Cancellation
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Plan checkout (coupon + AutoPay vs pay-once) */}
      <PlanCheckoutModal
        isOpen={planCheckoutModal.isOpen}
        onClose={() => { planCheckoutModal.onClose(); setCheckoutPlan(null); }}
        plan={checkoutPlan}
        billingCycle={billingCycle}
        isProcessing={!!processingPlanId}
        onConfirm={handlePlanCheckoutConfirm}
      />

      {selectedInvoice && (
        <InvoicePreviewModal isOpen={invoiceModal.isOpen} onClose={() => { invoiceModal.onClose(); setSelectedInvoice(null); }} invoiceData={selectedInvoice} />
      )}

      <DowngradeModal
        isOpen={downgradeModal.isOpen}
        onClose={downgradeModal.onClose}
        activeAddOns={activeAddOns}
        expiresAt={expiresAt}
        onCancelAddOn={handleCancelAddOn}
        onUndoCancelAddOn={handleUndoCancelAddOn}
        onReduceQuantity={handleReduceAddOnQuantity}
      />

      {/* ═══ Mobile sticky action bar ═══ */}
      {isFreePlan && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-default-200 dark:border-default-100 bg-background/95 backdrop-blur px-4 py-3 sm:hidden">
          <button type="button" onClick={scrollToPlans} className="w-full rounded-lg bg-primary py-2.5 text-[13px] font-medium text-white">
            Upgrade Plan
          </button>
        </div>
      )}
    </div>
  );
};

export default Subscription;
