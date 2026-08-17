import { Chip } from "@heroui/react";
import {
    FiCheck,
    FiClock,
    FiAlertTriangle,
    FiXCircle,
    FiPause,
    FiZap,
} from "react-icons/fi";

/**
 * Subscription lifecycle states with visual representation.
 * Each state has a badge color, icon, description, and allowed actions.
 */
export type SubscriptionStatus =
    | "trial"
    | "active"
    | "renewal_due"
    | "payment_pending"
    | "payment_failed"
    | "grace_period"
    | "cancel_scheduled"
    | "cancelled"
    | "expired"
    | "paused";

interface StatusConfig {
    label: string;
    color: "success" | "primary" | "warning" | "danger" | "default" | "secondary";
    icon: React.ReactNode;
    description: string;
}

const STATUS_MAP: Record<SubscriptionStatus, StatusConfig> = {
    trial: {
        label: "Trial",
        color: "primary",
        icon: <FiZap className="text-[10px]" />,
        description: "You're on a free trial period",
    },
    active: {
        label: "Active",
        color: "success",
        icon: <FiCheck className="text-[10px]" />,
        description: "Your subscription is active and running",
    },
    renewal_due: {
        label: "Renewal Due",
        color: "warning",
        icon: <FiClock className="text-[10px]" />,
        description: "Your subscription is due for renewal soon",
    },
    payment_pending: {
        label: "Payment Pending",
        color: "warning",
        icon: <FiClock className="text-[10px]" />,
        description: "We're processing your payment",
    },
    payment_failed: {
        label: "Payment Failed",
        color: "danger",
        icon: <FiAlertTriangle className="text-[10px]" />,
        description: "Your last payment attempt failed",
    },
    grace_period: {
        label: "Grace Period",
        color: "warning",
        icon: <FiAlertTriangle className="text-[10px]" />,
        description: "Your plan expired but you still have temporary access",
    },
    cancel_scheduled: {
        label: "Cancels at Period End",
        color: "warning",
        icon: <FiClock className="text-[10px]" />,
        description: "Your subscription will not renew after the current period",
    },
    cancelled: {
        label: "Cancelled",
        color: "danger",
        icon: <FiXCircle className="text-[10px]" />,
        description: "Your subscription has been cancelled",
    },
    expired: {
        label: "Expired",
        color: "default",
        icon: <FiXCircle className="text-[10px]" />,
        description: "Your subscription has expired",
    },
    paused: {
        label: "Paused",
        color: "secondary",
        icon: <FiPause className="text-[10px]" />,
        description: "Your subscription is temporarily paused",
    },
};

interface SubscriptionStatusBadgeProps {
    status: SubscriptionStatus;
    size?: "sm" | "md" | "lg";
    showDescription?: boolean;
    className?: string;
}

/**
 * Derives the subscription lifecycle status from raw data.
 */
export function deriveSubscriptionStatus(opts: {
    isActive: boolean;
    cancelAtPeriodEnd: boolean;
    expiresAt: string | null | undefined;
    paymentStatus?: string;
    autoRenew?: boolean;
    isTrial?: boolean;
}): SubscriptionStatus {
    const { isActive, cancelAtPeriodEnd, expiresAt, paymentStatus, isTrial } = opts;

    if (isTrial) return "trial";

    if (!isActive) {
        if (expiresAt && new Date(expiresAt) > new Date()) {
            return "grace_period";
        }
        return "expired";
    }

    if (paymentStatus === "pending") return "payment_pending";
    if (paymentStatus === "failed") return "payment_failed";

    if (cancelAtPeriodEnd) return "cancel_scheduled";

    if (expiresAt) {
        const daysRemaining = Math.ceil(
            (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysRemaining <= 0) return "expired";
        if (daysRemaining <= 3) return "renewal_due";
    }

    return "active";
}

const SubscriptionStatusBadge = ({
    status,
    size = "sm",
    showDescription = false,
    className = "",
}: SubscriptionStatusBadgeProps) => {
    const config = STATUS_MAP[status];

    return (
        <div className={`inline-flex flex-col gap-0.5 ${className}`}>
            <Chip
                color={config.color}
                variant="flat"
                size={size}
                startContent={config.icon}
                classNames={{
                    base: "gap-1",
                    content: "font-medium",
                }}
            >
                {config.label}
            </Chip>
            {showDescription && (
                <span className="text-[11px] text-default-400 ml-1">
                    {config.description}
                </span>
            )}
        </div>
    );
};

export default SubscriptionStatusBadge;
export { STATUS_MAP };
