import { useState } from "react";
import {
    Button,
    Chip,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
} from "@heroui/react";
import { format } from "date-fns";
import {
    FiRefreshCw,
    FiCreditCard,
    FiCalendar,
    FiShield,
    FiAlertTriangle,
    FiCheck,
    FiX,
} from "react-icons/fi";

interface AutoPayManagementProps {
    autoRenew: boolean;
    expiresAt?: string | null;
    canEnable?: boolean;
    reason?: string;
    cancelAtPeriodEnd?: boolean;
    isLoading?: boolean;
    onToggleAutoRenew: (enabled: boolean) => void;
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "N/A";
    try {
        return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
        return "N/A";
    }
}

const AutoPayManagement = ({
    autoRenew,
    expiresAt,
    canEnable = true,
    reason,
    cancelAtPeriodEnd,
    isLoading,
    onToggleAutoRenew,
}: AutoPayManagementProps) => {
    const confirmModal = useDisclosure();
    const [pendingValue, setPendingValue] = useState(false);

    const handleToggleClick = (enableOrDisable: boolean) => {
        setPendingValue(enableOrDisable);
        confirmModal.onOpen();
    };

    const handleConfirm = () => {
        confirmModal.onClose();
        onToggleAutoRenew(pendingValue);
    };

    return (
        <>
            <div className="rounded-2xl border border-default-200 dark:border-default-100 bg-background p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${autoRenew ? "bg-success-100 dark:bg-success-100/20" : "bg-default-100 dark:bg-default-50/50"}`}>
                        <FiRefreshCw className={`text-xs ${autoRenew ? "text-success-600" : "text-default-400"}`} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[13px] font-semibold text-default-700 dark:text-default-200">
                            AutoPay Management
                        </h3>
                    </div>
                    <Chip
                        size="sm"
                        color={autoRenew ? "success" : "default"}
                        variant="flat"
                        startContent={autoRenew ? <FiCheck className="text-[9px]" /> : <FiX className="text-[9px]" />}
                    >
                        {autoRenew ? "Active" : "Inactive"}
                    </Chip>
                </div>

                {/* Status Details */}
                <div className="rounded-xl bg-default-50 dark:bg-default-50/30 border border-default-100 dark:border-default-100/50 p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                        <FiCalendar className="text-default-400 text-xs shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] text-default-400">Next Automatic Payment</p>
                            <p className="text-[12px] font-medium text-default-700 dark:text-default-200">
                                {autoRenew && !cancelAtPeriodEnd ? formatDate(expiresAt) : "Not scheduled"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <FiCreditCard className="text-default-400 text-xs shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] text-default-400">Payment Method</p>
                            <p className="text-[12px] font-medium text-default-700 dark:text-default-200">
                                Razorpay (Card / UPI / NetBanking)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <FiShield className="text-default-400 text-xs shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] text-default-400">Status</p>
                            <p className="text-[12px] font-medium text-default-700 dark:text-default-200">
                                {autoRenew ? "Mandate authorized — charges auto-debited" : "Manual renewal required"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                    {autoRenew ? (
                        <Button
                            size="sm"
                            variant="flat"
                            color="warning"
                            isLoading={isLoading}
                            isDisabled={!canEnable}
                            onPress={() => handleToggleClick(false)}
                            startContent={<FiX className="text-xs" />}
                            className="rounded-xl w-full sm:w-auto"
                        >
                            Disable AutoPay
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            color="primary"
                            variant="solid"
                            isLoading={isLoading}
                            isDisabled={!canEnable || cancelAtPeriodEnd}
                            onPress={() => handleToggleClick(true)}
                            startContent={<FiRefreshCw className="text-xs" />}
                            className="rounded-xl w-full sm:w-auto"
                        >
                            Enable AutoPay
                        </Button>
                    )}
                    {!canEnable && reason && (
                        <p className="text-[10px] text-warning-600 dark:text-warning-400 mt-2">
                            {reason}
                        </p>
                    )}
                    {cancelAtPeriodEnd && (
                        <p className="text-[10px] text-warning-600 dark:text-warning-400 mt-2">
                            Undo cancellation first to enable AutoPay.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Confirmation Modal ── */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={confirmModal.onClose}
                size="sm"
                classNames={{
                    base: "rounded-2xl",
                    header: "border-b border-default-100 pb-3",
                    footer: "border-t border-default-100 pt-3",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-5">
                        <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${pendingValue ? "bg-primary/10" : "bg-warning-50"}`}>
                                <FiRefreshCw className={pendingValue ? "text-primary" : "text-warning-500"} />
                            </div>
                            <span className="text-base font-semibold text-default-900">
                                {pendingValue ? "Enable AutoPay" : "Disable AutoPay"}
                            </span>
                        </div>
                    </ModalHeader>

                    <ModalBody className="px-6 py-4">
                        {pendingValue ? (
                            <div className="space-y-3">
                                <p className="text-sm text-default-600">
                                    Your subscription and active add-ons will renew automatically before each billing period ends.
                                </p>
                                <div className="rounded-xl bg-primary-50 dark:bg-primary-100/5 border border-primary-100 dark:border-primary-200/20 px-4 py-3 space-y-1.5">
                                    <p className="text-xs font-medium text-primary-700 dark:text-primary-300">What happens next:</p>
                                    <ul className="text-xs text-primary-600 dark:text-primary-400 space-y-1">
                                        <li className="flex items-start gap-2">
                                            <FiCheck className="shrink-0 mt-0.5 text-[10px]" />
                                            <span>You'll authorize a payment mandate via Razorpay</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <FiCheck className="shrink-0 mt-0.5 text-[10px]" />
                                            <span>A small ₹5 verification charge will be shown (auto-refunded)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <FiCheck className="shrink-0 mt-0.5 text-[10px]" />
                                            <span>Your actual plan amount will be charged on renewal date</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <FiCheck className="shrink-0 mt-0.5 text-[10px]" />
                                            <span>Zero service interruption — seamless continuation</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <FiCheck className="shrink-0 mt-0.5 text-[10px]" />
                                            <span>You can disable anytime without penalty</span>
                                        </li>
                                    </ul>
                                </div>
                                <p className="text-[10px] text-default-400 italic">
                                    Note: Razorpay shows ₹5 on the authorization page to verify your payment method. This is refunded immediately. The full subscription amount is charged only at renewal.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-default-600">
                                    Automatic renewals will stop. Your current subscription stays active until the billing period ends.
                                </p>
                                <div className="rounded-xl bg-warning-50 dark:bg-warning-100/5 border border-warning-100 dark:border-warning-200/20 px-4 py-3 space-y-1.5">
                                    <p className="text-xs font-medium text-warning-700 dark:text-warning-300">Important:</p>
                                    <ul className="text-xs text-warning-600 dark:text-warning-400 space-y-1">
                                        <li className="flex items-start gap-2">
                                            <FiShield className="shrink-0 mt-0.5 text-[10px] text-success-500" />
                                            <span>Your plan stays active until {formatDate(expiresAt)}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <FiShield className="shrink-0 mt-0.5 text-[10px] text-success-500" />
                                            <span>No refunds for the current period — full access continues</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <FiAlertTriangle className="shrink-0 mt-0.5 text-[10px]" />
                                            <span>You'll need to manually renew before expiry</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <FiCheck className="shrink-0 mt-0.5 text-[10px] text-success-500" />
                                            <span>AutoPay can be re-enabled anytime before expiry</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </ModalBody>

                    <ModalFooter className="px-6 pb-5 gap-2">
                        <Button
                            variant="flat"
                            color="default"
                            onPress={confirmModal.onClose}
                            className="rounded-xl flex-1 sm:flex-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            color={pendingValue ? "primary" : "warning"}
                            variant="solid"
                            onPress={handleConfirm}
                            isLoading={isLoading}
                            className="rounded-xl flex-1 sm:flex-none"
                        >
                            {pendingValue ? "Enable AutoPay" : "Disable AutoPay"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default AutoPayManagement;
