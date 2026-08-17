// src/hooks/useFreeTrialActivation.ts
import { useRef } from "react";
import { addToast } from "@heroui/react";
import { useActivateFreeTrialMutation, useGetUserQuery } from "../redux/api/authApi";
import { useGetMySubscriptionQuery } from "../redux/api/subscriptionApi";
import { useGetAllClinicsQuery } from "../redux/api/clinicApi";

/**
 * Shared free-trial activation logic (mutation + refetch + duplicate-call guard
 * + error toast) so every surface that offers the trial (dashboard sidebar,
 * subscription page, ...) behaves identically without sharing UI.
 *
 * Refetches every query that a plan/subscription status is derived from
 * (user, subscription, clinics) so callers can show the updated plan state
 * immediately after activation succeeds.
 */
export function useFreeTrialActivation(onActivated: (expiryDate?: string | null) => void) {
  const [activateFreeTrial, { isLoading: isActivating }] = useActivateFreeTrialMutation();
  const { refetch: refetchUser } = useGetUserQuery();
  const { refetch: refetchSubscription, data: mySubscription } = useGetMySubscriptionQuery();
  const { refetch: refetchClinics } = useGetAllClinicsQuery();
  const hasActivatedRef = useRef(false);

  const activate = async () => {
    if (hasActivatedRef.current || isActivating) return;

    try {
      hasActivatedRef.current = true;
      await activateFreeTrial().unwrap();

      const [, subscriptionResult] = await Promise.all([
        refetchUser(),
        refetchSubscription(),
        refetchClinics(),
      ]);

      const expiryDate =
        subscriptionResult?.data?.data?.subscription?.expiresAt ??
        mySubscription?.data?.subscription?.expiresAt;
      onActivated(expiryDate);
    } catch (error: any) {
      hasActivatedRef.current = false;
      const errorMessage = error?.data?.message || "Unable to activate free trial. Please try again.";
      addToast({
        title: "Error",
        description: errorMessage,
        color: "danger",
      });
      console.error("Free trial activation error:", error);
    }
  };

  return { activate, isActivating };
}
