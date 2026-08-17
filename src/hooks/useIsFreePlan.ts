import { useMemo } from "react";
import { useGetAllClinicsQuery } from "../redux/api/clinicApi";

/**
 * Returns `true` when the current clinic is on a Free plan (or has no subscription data yet).
 */
export function useIsFreePlan(): { isFreePlan: boolean; isLoading: boolean } {
  const { data: clinicData, isLoading } = useGetAllClinicsQuery(undefined);

  const isFreePlan = useMemo(() => {
    const subscription = (clinicData as any)?.subscription;
    if (!subscription) return true; // default to locked when unknown

    const planName = String(subscription.planName ?? "").trim().toLowerCase();
    const slug = String(subscription.slug ?? "").trim().toLowerCase();
    const price = Number(subscription.price);

    return (
      planName === "free" ||
      planName === "free plan" ||
      slug === "free" ||
      slug === "free-plan" ||
      (!Number.isNaN(price) && price === 0)
    );
  }, [clinicData]);

  return { isFreePlan, isLoading };
}
