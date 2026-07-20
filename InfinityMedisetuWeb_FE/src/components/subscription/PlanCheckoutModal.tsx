import { useState } from "react";
import {
    Button,
    Input,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Divider,
} from "@heroui/react";
import { FiTag, FiCheck, FiX, FiRefreshCw, FiCreditCard } from "react-icons/fi";
import { PiCrownSimpleFill } from "react-icons/pi";
import type { Plan } from "../../redux/api/subscriptionApi";
import { getCyclePrice, type BillingCycleType } from "../../utils/subscriptionHelpers";
import { useCouponValidation } from "../../hooks/useCouponValidation";

interface PlanCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: Plan | null;
    billingCycle: BillingCycleType;
    isProcessing: boolean;
    /** Called when the user confirms. coupon is null when none applied. */
    onConfirm: (args: {
        coupon: { code: string; couponId: number } | null;
        useAutoPay: boolean;
    }) => void;
}

const money = (n: number) => `₹${Math.max(0, Math.round(n)).toLocaleString("en-IN")}`;

const PlanCheckoutModal = ({
    isOpen,
    onClose,
    plan,
    billingCycle,
    isProcessing,
    onConfirm,
}: PlanCheckoutModalProps) => {
    const { couponState, validateCoupon, removeCoupon } = useCouponValidation();
    const [couponCode, setCouponCode] = useState("");

    if (!plan) return null;

    const basePrice = getCyclePrice(plan.price, billingCycle);
    const discount = couponState.applied ? couponState.discountAmount : 0;
    const total = Math.max(0, basePrice - discount);
    const hasCoupon = couponState.applied;

    const handleApply = () => {
        if (!couponCode.trim()) return;
        validateCoupon(couponCode, basePrice, {
            planId: plan.id,
            billingCycle: billingCycle === "yearly" ? "yearly" : "monthly",
        });
    };

    const handleRemove = () => {
        removeCoupon();
        setCouponCode("");
    };

    const handleClose = () => {
        handleRemove();
        onClose();
    };

    const handleConfirm = (useAutoPay: boolean) => {
        onConfirm({
            coupon:
                couponState.applied && couponState.couponId
                    ? { code: couponState.code, couponId: couponState.couponId }
                    : null,
            useAutoPay,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size="md"
            classNames={{
                base: "rounded-2xl",
                header: "border-b border-default-100 pb-3",
                footer: "border-t border-default-100 pt-3",
            }}
        >
            <ModalContent>
                <ModalHeader className="flex items-center gap-2 px-6 pt-5">
                    <PiCrownSimpleFill className="text-amber-500" />
                    <span className="text-[15px] font-semibold text-default-900 dark:text-white">
                        Subscribe to {plan.name}
                    </span>
                </ModalHeader>

                <ModalBody className="px-6 py-4 space-y-4">
                    {/* Price line */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[13px] font-medium text-default-800 dark:text-default-200">
                                {plan.name} Plan
                            </p>
                            <p className="text-[11px] text-default-400">
                                Billed {billingCycle === "yearly" ? "yearly" : "monthly"}
                            </p>
                        </div>
                        <p className="text-[15px] font-semibold text-default-900 dark:text-white">
                            {money(basePrice)}
                            <span className="text-[11px] font-normal text-default-400">
                                /{billingCycle === "yearly" ? "yr" : "mo"}
                            </span>
                        </p>
                    </div>

                    {/* Coupon input */}
                    <div>
                        <label className="text-[11px] font-medium text-default-500 flex items-center gap-1.5 mb-1.5">
                            <FiTag className="text-[11px]" /> Have a coupon?
                        </label>
                        {hasCoupon ? (
                            <div className="flex items-center justify-between rounded-lg border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/5 px-3 py-2">
                                <span className="flex items-center gap-1.5 text-[12px] font-medium text-success-700 dark:text-success-400">
                                    <FiCheck className="text-[11px]" /> {couponState.code} applied
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className="text-success-700 dark:text-success-400 hover:opacity-70"
                                    aria-label="Remove coupon"
                                >
                                    <FiX className="text-sm" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    size="sm"
                                    value={couponCode}
                                    onValueChange={(v) => setCouponCode(v.toUpperCase())}
                                    placeholder="Enter code"
                                    variant="bordered"
                                    classNames={{ inputWrapper: "h-9" }}
                                    isInvalid={!!couponState.error}
                                    errorMessage={couponState.error}
                                />
                                <Button
                                    size="sm"
                                    variant="flat"
                                    onPress={handleApply}
                                    isLoading={couponState.isValidating}
                                    className="h-9 rounded-lg"
                                >
                                    Apply
                                </Button>
                            </div>
                        )}
                        {hasCoupon && couponState.description && (
                            <p className="text-[10px] text-default-400 mt-1">{couponState.description}</p>
                        )}
                    </div>

                    <Divider className="bg-default-100" />

                    {/* Totals */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="text-default-500">Subtotal</span>
                            <span className="text-default-700 dark:text-default-200">{money(basePrice)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex items-center justify-between text-[12px]">
                                <span className="text-success-600">Discount ({couponState.code})</span>
                                <span className="text-success-600 font-medium">-{money(discount)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[13px] font-semibold text-default-900 dark:text-white">
                                Total due today
                            </span>
                            <span className="text-[16px] font-bold text-default-900 dark:text-white">
                                {money(total)}
                            </span>
                        </div>
                    </div>

                    {hasCoupon && (
                        <div className="rounded-lg bg-primary-50 dark:bg-primary-100/5 border border-primary-100 dark:border-primary-200/20 px-3 py-2">
                            <p className="text-[11px] text-primary-700 dark:text-primary-300">
                                Promo codes apply to a one-time payment. You can enable AutoPay afterward for automatic renewals.
                            </p>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter className="px-6 pb-5 flex-col gap-2">
                    {hasCoupon ? (
                        // Coupon applied → one-time discounted payment
                        <Button
                            color="primary"
                            className="w-full rounded-xl"
                            startContent={<FiCreditCard className="text-sm" />}
                            isLoading={isProcessing}
                            onPress={() => handleConfirm(false)}
                        >
                            Pay {money(total)} & Subscribe
                        </Button>
                    ) : (
                        // No coupon → AutoPay (recurring) is the default
                        <>
                            <Button
                                color="primary"
                                className="w-full rounded-xl"
                                startContent={<FiRefreshCw className="text-sm" />}
                                isLoading={isProcessing}
                                onPress={() => handleConfirm(true)}
                            >
                                Subscribe with AutoPay
                            </Button>
                            <Button
                                variant="light"
                                size="sm"
                                className="w-full rounded-xl text-default-500"
                                isDisabled={isProcessing}
                                onPress={() => handleConfirm(false)}
                            >
                                Pay once (no auto-renew)
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default PlanCheckoutModal;
