import { useGetLimitationsOverviewQuery } from "../redux/api/limitationsApi";
import { useGetMySubscriptionQuery } from "../redux/api/subscriptionApi";
import type { FeatureKey, FeatureGateResult, FeatureStatus } from "../redux/api/limitationsApi.types";

/**
 * Derives the feature status from a FeatureLimit entry.
 * Pure function — extracted for testability.
 */
export function deriveFeatureStatus(limit: {
  enabled: boolean;
  remaining: number | null;
  totalLimit: number | null;
}): FeatureStatus {
  if (!limit.enabled) return "disabled";
  if (limit.totalLimit === null) return "enabled"; // unlimited
  if (limit.remaining !== null && limit.remaining <= 0) return "limit_reached";
  return "enabled";
}

/**
 * Hook that gates a feature by its key.
 *
 * For doctor_accounts and staff_accounts, prefers the `usage` field from
 * the my-subscription API (always fresh), falling back to limitations overview.
 */
export function useFeatureGate(featureKey: FeatureKey): FeatureGateResult {
  const { featureLimit, isLimitationsLoading } = useGetLimitationsOverviewQuery(undefined, {
    selectFromResult: ({ data, isLoading }) => {
      let limit = data?.limits.find((l) => l.featureKey === featureKey);

      // Unified staff limit: prefer staff_accounts, fallback to receptionist_accounts
      if (!limit && featureKey === "staff_accounts") {
        limit = data?.limits.find((l) => l.featureKey === "receptionist_accounts");
      } else if (!limit && featureKey === "receptionist_accounts") {
        limit = data?.limits.find((l) => l.featureKey === "staff_accounts");
      }

      return { featureLimit: limit, isLimitationsLoading: isLoading };
    },
  });

  const { myUsage, isSubLoading } = useGetMySubscriptionQuery(undefined, {
    selectFromResult: ({ data, isLoading }) => ({
      myUsage: data?.data?.usage,
      isSubLoading: isLoading,
    }),
  });

  const isLoading = isLimitationsLoading && isSubLoading;

  // For doctor_accounts: prefer my-subscription usage.doctors
  if (featureKey === "doctor_accounts" && myUsage?.doctors) {
    const { current, limit, isUnlimited, remaining } = myUsage.doctors;
    let status: FeatureStatus = "enabled";
    if (!isUnlimited && remaining <= 0) status = "limit_reached";
    return {
      status,
      description: "",
      totalLimit: isUnlimited ? null : limit,
      currentUsage: current,
      remaining: isUnlimited ? null : remaining,
      isLoading: false,
    };
  }

  // For staff_accounts / receptionist_accounts: prefer my-subscription usage.staff
  if (
    (featureKey === "staff_accounts" || featureKey === "receptionist_accounts") &&
    myUsage?.staff
  ) {
    const { current, limit, isUnlimited, remaining } = myUsage.staff;
    let status: FeatureStatus = "enabled";
    if (!isUnlimited && remaining <= 0) status = "limit_reached";
    return {
      status,
      description: "",
      totalLimit: isUnlimited ? null : limit,
      currentUsage: current,
      remaining: isUnlimited ? null : remaining,
      isLoading: false,
    };
  }

  // Fallback to limitations overview API
  if (isLoading || !featureLimit) {
    return {
      status: "enabled",
      description: "",
      totalLimit: null,
      currentUsage: 0,
      remaining: null,
      isLoading,
    };
  }

  return {
    status: deriveFeatureStatus(featureLimit),
    description: featureLimit.description,
    totalLimit: featureLimit.totalLimit,
    currentUsage: featureLimit.currentUsage,
    remaining: featureLimit.remaining,
    isLoading: false,
  };
}
