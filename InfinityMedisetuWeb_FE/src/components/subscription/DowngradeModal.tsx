import {
    Button,
    Divider,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Progress
} from "@heroui/react";
import { useEffect, useState } from "react";
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiClock,
    FiDatabase,
    FiMinus,
    FiPlus,
    FiShield,
    FiUser,
    FiUsers,
} from "react-icons/fi";

interface ActiveAddOn {
    addOnName: string;
    featureKey: string;
    totalQuantity: number;
    billingCycle: string;
    latestExpiresAt: string;
    totalPrice: number;
    cancelAtPeriodEnd?: boolean;
}

interface DowngradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeAddOns: ActiveAddOn[];
    expiresAt?: string | null;
    onCancelAddOn: (featureKey: string) => Promise<void>;
    onUndoCancelAddOn: (featureKey: string) => Promise<void>;
    onReduceQuantity?: (featureKey: string, reduceBy: number) => Promise<void>;
}

const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getDaysRemaining = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const getAddOnIcon = (featureKey: string) => {
    if (featureKey.includes("doctor")) return <FiUser className="text-sm" />;
    if (featureKey.includes("staff")) return <FiUsers className="text-sm" />;
    if (featureKey.includes("storage")) return <FiDatabase className="text-sm" />;
    return <FiMinus className="text-sm" />;
};

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

type ChangeMap = Record<string, number>; // featureKey → new desired quantity

const DowngradeModal = ({
    isOpen,
    onClose,
    activeAddOns,
    expiresAt,
    onCancelAddOn,
    onUndoCancelAddOn,
    onReduceQuantity,
}: DowngradeModalProps) => {
    // Local state: tracks desired quantities (not yet saved)
    const [desiredQuantities, setDesiredQuantities] = useState<ChangeMap>({});
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    // Reset local state when modal opens/closes or add-ons change
    useEffect(() => {
        if (isOpen) {
            const initial: ChangeMap = {};
            activeAddOns.forEach((a) => {
                initial[a.featureKey] = a.totalQuantity;
            });
            setDesiredQuantities(initial);
            setShowConfirmation(false);
        }
    }, [isOpen, activeAddOns]);

    const getDesiredQty = (featureKey: string, originalQty: number) =>
        desiredQuantities[featureKey] ?? originalQty;

    const setQty = (featureKey: string, qty: number) => {
        setDesiredQuantities((prev) => ({ ...prev, [featureKey]: Math.max(0, qty) }));
    };

    // Calculate what changed
    const changes = activeAddOns
        .filter((a) => !a.cancelAtPeriodEnd)
        .map((a) => ({
            ...a,
            desiredQty: getDesiredQty(a.featureKey, a.totalQuantity),
            reduceBy: a.totalQuantity - getDesiredQty(a.featureKey, a.totalQuantity),
        }))
        .filter((a) => a.reduceBy > 0);

    const hasChanges = changes.length > 0;
    const totalSavings = changes.reduce((sum, c) => {
        const pricePerUnit = c.totalPrice / c.totalQuantity;
        return sum + pricePerUnit * c.reduceBy;
    }, 0);

    // Apply all changes
    const handleApplyChanges = async () => {
        setIsApplying(true);
        try {
            for (const change of changes) {
                if (change.desiredQty === 0) {
                    // Remove entirely
                    await onCancelAddOn(change.featureKey);
                } else if (onReduceQuantity) {
                    // Reduce quantity
                    await onReduceQuantity(change.featureKey, change.reduceBy);
                }
            }
            setShowConfirmation(false);
            onClose();
        } catch {
            // Error toasts are handled by parent handlers
        } finally {
            setIsApplying(false);
        }
    };

    const hasActiveAddOns = activeAddOns.length > 0;
    const pendingCancellations = activeAddOns.filter((a) => a.cancelAtPeriodEnd);
    const daysRemaining = getDaysRemaining(expiresAt);

    // ─── Confirmation Step ───
    if (showConfirmation) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={() => setShowConfirmation(false)}
                size="md"
                classNames={{
                    base: "rounded-2xl",
                    header: "border-b border-default-100",
                    footer: "border-t border-default-100",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-5 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-50">
                                <FiAlertTriangle className="text-warning-500" />
                            </div>
                            <span className="text-base font-semibold text-default-900">Confirm Changes</span>
                        </div>
                    </ModalHeader>

                    <ModalBody className="px-6 py-4">
                        <div className="space-y-4">
                            <p className="text-sm text-default-600">
                                The following changes will take effect immediately:
                            </p>

                            <div className="rounded-xl border border-default-200 divide-y divide-default-100 overflow-hidden">
                                {changes.map((c) => (
                                    <div key={c.featureKey} className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-default-500">{getAddOnIcon(c.featureKey)}</span>
                                            <span className="text-sm font-medium text-default-900">{c.addOnName}</span>
                                        </div>
                                        <div className="text-right">
                                            {c.desiredQty === 0 ? (
                                                <span className="text-xs font-semibold text-danger-500">Remove</span>
                                            ) : (
                                                <span className="text-xs text-default-600">
                                                    {c.totalQuantity} → <span className="font-semibold text-warning-600">{c.desiredQty}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalSavings > 0 && (
                                <div className="flex items-center justify-between rounded-lg bg-success-50 border border-success-100 px-4 py-2.5">
                                    <span className="text-xs text-success-700 font-medium">You'll save</span>
                                    <span className="text-sm font-bold text-success-700">{money(Math.round(totalSavings))}/mo</span>
                                </div>
                            )}

                            <div className="flex items-start gap-2 rounded-lg bg-warning-50 border border-warning-100 px-3 py-2.5">
                                <FiAlertTriangle className="text-warning-500 shrink-0 mt-0.5 text-xs" />
                                <p className="text-xs text-warning-700">
                                    This action takes effect immediately. Staff or doctors exceeding new limits may be deactivated.
                                </p>
                            </div>
                        </div>
                    </ModalBody>

                    <ModalFooter className="px-6 pb-5 gap-2">
                        <Button
                            variant="flat"
                            color="default"
                            onPress={() => setShowConfirmation(false)}
                            className="rounded-xl"
                        >
                            Go Back
                        </Button>
                        <Button
                            color="danger"
                            variant="solid"
                            onPress={handleApplyChanges}
                            isLoading={isApplying}
                            className="rounded-xl"
                        >
                            Confirm & Apply
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        );
    }

    // ─── Main Modal ───
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
            classNames={{
                base: "rounded-2xl max-h-[90vh]",
                header: "border-b border-default-100",
                footer: "border-t border-default-100",
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                    <h2 className="text-lg font-semibold text-default-900">
                        Manage Your Add-Ons
                    </h2>
                    <p className="text-sm font-normal text-default-500">
                        Adjust quantities or remove add-ons. Changes apply when you confirm.
                    </p>
                </ModalHeader>

                <ModalBody className="px-6 py-4">
                    {!hasActiveAddOns ? (
                        <div className="flex flex-col items-center gap-4 py-12 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
                                <FiCheckCircle className="text-3xl text-success-500" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-default-900">You're on the base plan</p>
                                <p className="mt-1 text-sm text-default-500 max-w-sm">
                                    No active add-ons to manage.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Billing period */}
                            {expiresAt && (
                                <div className="rounded-xl bg-default-50 border border-default-100 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100">
                                                <FiClock className="text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-default-900">Current billing period</p>
                                                <p className="text-xs text-default-500">
                                                    Ends on {formatDate(expiresAt)}
                                                    {daysRemaining !== null && ` • ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left`}
                                                </p>
                                            </div>
                                        </div>
                                        {daysRemaining !== null && (
                                            <div className="w-20 hidden sm:block">
                                                <Progress
                                                    size="sm"
                                                    value={Math.max(5, 100 - (daysRemaining / 30) * 100)}
                                                    color="primary"
                                                    className="max-w-full"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pending cancellations (already scheduled) */}
                            {pendingCancellations.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-default-500 uppercase tracking-wide">Pending removal</p>
                                    {pendingCancellations.map((addon) => (
                                        <div key={addon.featureKey} className="flex items-center justify-between rounded-xl border border-warning-200 bg-warning-50/50 p-3 sm:p-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-600">
                                                    {getAddOnIcon(addon.featureKey)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-default-900 truncate">{addon.addOnName}</p>
                                                    <p className="text-xs text-warning-600">Removing after {formatDate(addon.latestExpiresAt)}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="bordered"
                                                color="success"
                                                className="rounded-lg text-xs shrink-0"
                                                onPress={() => onUndoCancelAddOn(addon.featureKey)}
                                            >
                                                Keep
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Active add-ons with quantity controls */}
                            {activeAddOns.filter((a) => !a.cancelAtPeriodEnd).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-default-500 uppercase tracking-wide">Active add-ons</p>
                                    {activeAddOns
                                        .filter((a) => !a.cancelAtPeriodEnd)
                                        .map((addon) => {
                                            const currentQty = getDesiredQty(addon.featureKey, addon.totalQuantity);
                                            const originalQty = addon.totalQuantity;
                                            const isChanged = currentQty !== originalQty;
                                            const pricePerUnit = addon.totalPrice / addon.totalQuantity;

                                            return (
                                                <div
                                                    key={addon.featureKey}
                                                    className={`rounded-xl border p-3 sm:p-4 transition-all ${isChanged
                                                        ? "border-warning-200 bg-warning-50/30"
                                                        : "border-default-200 bg-background"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-default-100 text-default-600">
                                                                {getAddOnIcon(addon.featureKey)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-default-900 truncate">
                                                                    {addon.addOnName}
                                                                </p>
                                                                <p className="text-xs text-default-500">
                                                                    {money(Math.round(pricePerUnit))}/unit • {money(Math.round(pricePerUnit * currentQty))}/mo
                                                                    {isChanged && (
                                                                        <span className="ml-1 text-warning-600 font-medium">
                                                                            (was {originalQty})
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Quantity stepper */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setQty(addon.featureKey, currentQty - 1)}
                                                                disabled={currentQty <= 0}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-default-200 bg-background text-default-600 transition hover:bg-danger-50 hover:text-danger-500 hover:border-danger-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            >
                                                                <FiMinus className="text-xs" />
                                                            </button>
                                                            <span className={`w-8 text-center text-sm font-bold ${isChanged ? "text-warning-600" : "text-default-900"
                                                                }`}>
                                                                {currentQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setQty(addon.featureKey, Math.min(currentQty + 1, originalQty))}
                                                                disabled={currentQty >= originalQty}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-default-200 bg-background text-default-600 transition hover:bg-success-50 hover:text-success-500 hover:border-success-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            >
                                                                <FiPlus className="text-xs" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}

                            {/* Change summary */}
                            {hasChanges && (
                                <>
                                    <Divider />
                                    <div className="rounded-xl bg-warning-50/50 border border-warning-100 p-4 space-y-2">
                                        <p className="text-sm font-medium text-default-700">Pending changes</p>
                                        <ul className="space-y-1">
                                            {changes.map((c) => (
                                                <li key={c.featureKey} className="flex items-center justify-between text-xs">
                                                    <span className="text-default-600">{c.addOnName}</span>
                                                    <span className="font-semibold text-default-900">
                                                        {c.totalQuantity} → {c.desiredQty === 0 ? <span className="text-danger-500">Remove</span> : c.desiredQty}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        {totalSavings > 0 && (
                                            <p className="text-xs text-success-600 font-medium pt-1">
                                                Estimated savings: {money(Math.round(totalSavings))}/mo
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Info note */}
                            <div className="flex items-start gap-2.5 rounded-lg bg-default-50 border border-default-100 px-3 py-2.5">
                                <FiShield className="text-primary shrink-0 mt-0.5 text-sm" />
                                <p className="text-xs text-default-500">
                                    Quantity reductions take effect immediately. Staff exceeding new limits may be temporarily deactivated.
                                </p>
                            </div>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter className="px-6 py-4 gap-2">
                    <Button
                        variant="flat"
                        color="default"
                        onPress={onClose}
                        className="rounded-xl"
                    >
                        {hasChanges ? "Discard" : "Close"}
                    </Button>
                    {hasChanges && (
                        <Button
                            color="primary"
                            variant="solid"
                            onPress={() => setShowConfirmation(true)}
                            className="rounded-xl"
                        >
                            Apply Changes ({changes.length})
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default DowngradeModal;
