import { useGetLimitationsOverviewQuery } from "../redux/api/limitationsApi";
import type { PlanInfo } from "../redux/api/limitationsApi.types";

/**
 * Hook to access the current plan metadata (planId, planSlug).
 */
export function usePlanInfo(): { plan: PlanInfo | null; isLoading: boolean } {
  const { plan, isLoading } = useGetLimitationsOverviewQuery(undefined, {
    selectFromResult: ({ data, isLoading }) => ({
      plan: data?.plan ?? null,
      isLoading,
    }),
  });

  return { plan, isLoading };
}
