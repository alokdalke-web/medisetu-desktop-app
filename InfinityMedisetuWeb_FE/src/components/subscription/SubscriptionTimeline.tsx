import { format } from "date-fns";
import {
    FiCheck,
    FiArrowUp,
    FiPackage,
    FiRefreshCw,
    FiAlertTriangle,
    FiCalendar,
    FiXCircle,
    FiPlus,
} from "react-icons/fi";
import type { BillingHistoryItem } from "../../redux/api/subscriptionApi";

type TimelineEventType =
    | "subscription_created"
    | "payment_success"
    | "payment_failed"
    | "plan_upgraded"
    | "addon_added"
    | "addon_removed"
    | "autopay_enabled"
    | "autopay_disabled"
    | "cancel_scheduled"
    | "cancel_undone"
    | "renewal_upcoming"
    | "subscription_expired";

interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    title: string;
    description: string;
    date: string;
    amount?: number;
}

interface SubscriptionTimelineProps {
    billingHistory: BillingHistoryItem[];
    cancelAtPeriodEnd?: boolean;
    expiresAt?: string | null;
    cancelledAt?: string | null;
    autoRenew?: boolean;
    maxEvents?: number;
}

const EVENT_CONFIG: Record<
    TimelineEventType,
    { icon: React.ReactNode; color: string; bgColor: string }
> = {
    subscription_created: {
        icon: <FiPlus className="text-[10px]" />,
        color: "text-primary",
        bgColor: "bg-primary-50 dark:bg-primary-100/10",
    },
    payment_success: {
        icon: <FiCheck className="text-[10px]" />,
        color: "text-success-600",
        bgColor: "bg-success-50 dark:bg-success-100/10",
    },
    payment_failed: {
        icon: <FiAlertTriangle className="text-[10px]" />,
        color: "text-danger-500",
        bgColor: "bg-danger-50 dark:bg-danger-100/10",
    },
    plan_upgraded: {
        icon: <FiArrowUp className="text-[10px]" />,
        color: "text-primary",
        bgColor: "bg-primary-50 dark:bg-primary-100/10",
    },
    addon_added: {
        icon: <FiPackage className="text-[10px]" />,
        color: "text-secondary-600",
        bgColor: "bg-secondary-50 dark:bg-secondary-100/10",
    },
    addon_removed: {
        icon: <FiXCircle className="text-[10px]" />,
        color: "text-default-500",
        bgColor: "bg-default-100 dark:bg-default-50/50",
    },
    autopay_enabled: {
        icon: <FiRefreshCw className="text-[10px]" />,
        color: "text-success-600",
        bgColor: "bg-success-50 dark:bg-success-100/10",
    },
    autopay_disabled: {
        icon: <FiRefreshCw className="text-[10px]" />,
        color: "text-warning-600",
        bgColor: "bg-warning-50 dark:bg-warning-100/10",
    },
    cancel_scheduled: {
        icon: <FiCalendar className="text-[10px]" />,
        color: "text-warning-600",
        bgColor: "bg-warning-50 dark:bg-warning-100/10",
    },
    cancel_undone: {
        icon: <FiCheck className="text-[10px]" />,
        color: "text-success-600",
        bgColor: "bg-success-50 dark:bg-success-100/10",
    },
    renewal_upcoming: {
        icon: <FiCalendar className="text-[10px]" />,
        color: "text-primary",
        bgColor: "bg-primary-50 dark:bg-primary-100/10",
    },
    subscription_expired: {
        icon: <FiXCircle className="text-[10px]" />,
        color: "text-danger-500",
        bgColor: "bg-danger-50 dark:bg-danger-100/10",
    },
};

/**
 * Extended billing history item shape — the backend returns more fields
 * than the base BillingHistoryItem type declares.
 */
interface ExtendedBillingItem extends BillingHistoryItem {
    paymentMode?: string;
    paymentStatus?: string;
    transactionId?: string;
    planDescription?: string;
}

/**
 * Derives timeline events from billing history and current subscription state.
 */
function deriveTimelineEvents(
    billingHistory: BillingHistoryItem[],
    cancelAtPeriodEnd?: boolean,
    expiresAt?: string | null,
    cancelledAt?: string | null,
    autoRenew?: boolean,
): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const items = billingHistory as ExtendedBillingItem[];

    // Track plan names to detect upgrades
    let previousPlanName: string | null = null;

    // Process billing history in chronological order (oldest first) to detect upgrades
    const chronological = [...items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const item of chronological) {
        const amount = Number(item.price || 0);
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`;
        const paymentMode = item.paymentMode || "online";
        const planName = item.planName || "Plan";

        // Detect if this is an add-on (add-on names typically don't match standard plan names)
        // The backend returns both subscription and add-on history merged together
        const isAddOn = item.planDescription?.toLowerCase().includes("add-on") ||
            item.planDescription?.toLowerCase().includes("addon") ||
            planName.toLowerCase().includes("additional") ||
            planName.toLowerCase().includes("extra");

        if (isAddOn) {
            events.push({
                id: `addon-${item.id}`,
                type: "addon_added",
                title: `Add-on purchased: ${planName}`,
                description: `${formattedAmount} charged via ${paymentMode}`,
                date: item.createdAt || item.startsAt,
                amount,
            });
        } else {
            // Determine if this is an upgrade or first subscription
            const isUpgrade = previousPlanName !== null && previousPlanName !== planName;

            if (isUpgrade) {
                events.push({
                    id: `upgrade-${item.id}`,
                    type: "plan_upgraded",
                    title: `Plan upgraded to ${planName}`,
                    description: `${formattedAmount} charged via ${paymentMode}`,
                    date: item.createdAt || item.startsAt,
                    amount,
                });
            } else if (previousPlanName === null) {
                // First subscription
                events.push({
                    id: `created-${item.id}`,
                    type: "subscription_created",
                    title: `Subscribed to ${planName}`,
                    description: `${formattedAmount} charged via ${paymentMode}`,
                    date: item.createdAt || item.startsAt,
                    amount,
                });
            } else {
                // Renewal payment (same plan)
                events.push({
                    id: `payment-${item.id}`,
                    type: "payment_success",
                    title: `Renewal payment — ${planName}`,
                    description: `${formattedAmount} charged via ${paymentMode}`,
                    date: item.createdAt || item.startsAt,
                    amount,
                });
            }

            previousPlanName = planName;
        }
    }

    // Add expired subscription events for items that have expired
    for (const item of items) {
        if (item.expiresAt && !item.active && new Date(item.expiresAt) < new Date()) {
            const isAddOn = item.planDescription?.toLowerCase().includes("add-on") ||
                item.planDescription?.toLowerCase().includes("addon");

            if (isAddOn) {
                events.push({
                    id: `addon-expired-${item.id}`,
                    type: "addon_removed",
                    title: `Add-on expired: ${item.planName || "Add-On"}`,
                    description: `Expired on ${format(new Date(item.expiresAt), "dd MMM yyyy")}`,
                    date: item.expiresAt,
                });
            }
        }
    }

    // Add cancellation scheduled event
    if (cancelAtPeriodEnd && cancelledAt) {
        events.push({
            id: "cancel-scheduled",
            type: "cancel_scheduled",
            title: "Cancellation scheduled",
            description: `Subscription will end on ${expiresAt ? format(new Date(expiresAt), "dd MMM yyyy") : "period end"}`,
            date: cancelledAt,
        });
    }

    // Add subscription expired event if applicable
    if (expiresAt && new Date(expiresAt) < new Date() && !cancelAtPeriodEnd) {
        events.push({
            id: "subscription-expired",
            type: "subscription_expired",
            title: "Subscription expired",
            description: `Plan expired on ${format(new Date(expiresAt), "dd MMM yyyy")}`,
            date: expiresAt,
        });
    }

    // Add AutoPay status event
    if (autoRenew) {
        events.push({
            id: "autopay-enabled",
            type: "autopay_enabled",
            title: "AutoPay enabled",
            description: "Subscription will renew automatically",
            date: new Date().toISOString(),
        });
    }

    // Add upcoming renewal event (future — within 7 days)
    if (!cancelAtPeriodEnd && expiresAt && new Date(expiresAt) > new Date()) {
        const daysUntil = Math.ceil(
            (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7 && daysUntil > 0) {
            events.push({
                id: "renewal-upcoming",
                type: "renewal_upcoming",
                title: "Upcoming renewal",
                description: `${daysUntil} day${daysUntil !== 1 ? "s" : ""} until next billing${autoRenew ? " (AutoPay)" : ""}`,
                date: expiresAt,
            });
        }
    }

    // Sort by date descending (most recent first)
    events.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return events;
}

const SubscriptionTimeline = ({
    billingHistory,
    cancelAtPeriodEnd,
    expiresAt,
    cancelledAt,
    autoRenew,
    maxEvents = 10,
}: SubscriptionTimelineProps) => {
    const events = deriveTimelineEvents(
        billingHistory,
        cancelAtPeriodEnd,
        expiresAt,
        cancelledAt,
        autoRenew,
    ).slice(0, maxEvents);

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-default-100 dark:bg-default-50 flex items-center justify-center mb-3">
                    <FiCalendar className="text-default-400" />
                </div>
                <p className="text-[12px] text-default-500">No subscription activity yet</p>
                <p className="text-[11px] text-default-400 mt-1">
                    Events will appear here as you manage your subscription
                </p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-default-200 dark:bg-default-100" />

            <div className="space-y-4">
                {events.map((event, idx) => {
                    const config = EVENT_CONFIG[event.type];
                    const isLast = idx === events.length - 1;

                    return (
                        <div key={event.id} className="relative flex gap-3 pl-0">
                            {/* Icon dot */}
                            <div
                                className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-background ${config.bgColor}`}
                            >
                                <span className={config.color}>{config.icon}</span>
                            </div>

                            {/* Content */}
                            <div className={`flex-1 min-w-0 ${isLast ? "" : "pb-1"}`}>
                                <p className="text-[12px] font-medium text-default-800 dark:text-default-200 leading-snug">
                                    {event.title}
                                </p>
                                <p className="text-[11px] text-default-400 mt-0.5 leading-snug">
                                    {event.description}
                                </p>
                                <p className="text-[10px] text-default-300 mt-1">
                                    {event.date ? format(new Date(event.date), "dd MMM yyyy, hh:mm a") : "—"}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SubscriptionTimeline;
