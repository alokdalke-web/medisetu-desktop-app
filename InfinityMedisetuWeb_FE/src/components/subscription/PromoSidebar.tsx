// src/components/subscription/PromoSidebar.tsx
import { useRef } from "react";
import { addToast, Button } from "@heroui/react";
import { FiShield } from "react-icons/fi";
import { useGetUserQuery, useActivateFreeTrialMutation } from "../../redux/api/authApi";
import { useGetMySubscriptionQuery } from "../../redux/api/subscriptionApi";

type PromoSidebarProps = {
  showFreeOffer: boolean;
  onShowSuccessModal: (expiryDate?: string | null) => void;
};

export const PromoSidebar = ({ showFreeOffer, onShowSuccessModal }: PromoSidebarProps) => {
  const BASE = import.meta.env.BASE_URL;
  const [activateFreeTrial, { isLoading: isActivating }] = useActivateFreeTrialMutation();
  const { refetch: refetchUser } = useGetUserQuery();
  const { refetch: refetchSubscription, data: mySubscription } = useGetMySubscriptionQuery();
  const hasActivatedRef = useRef(false);

  const handleActivateFreeTrial = async () => {
    // Prevent duplicate API calls
    if (hasActivatedRef.current || isActivating) return;
    
    try {
      hasActivatedRef.current = true;
      await activateFreeTrial().unwrap();
      
      // Refetch data in background
      await Promise.all([refetchUser(), refetchSubscription()]);
      
      // Get expiry date and show success modal
      const expiryDate = mySubscription?.data?.subscription?.expiresAt;
      onShowSuccessModal(expiryDate);
      
    } catch (error: any) {
      hasActivatedRef.current = false;
      // Show error toast
      const errorMessage = error?.data?.message || "Unable to activate free trial. Please try again.";
      addToast({
        title: "Error",
        description: errorMessage,
        color: "danger",
      });
      console.error("Free trial activation error:", error);
    }
  };

  // Only show the promo sidebar if the user is eligible for free offer
  if (!showFreeOffer) return null;

  return (
    <aside className="w-full sm:col-span-2 lg:col-span-1 shrink-0">
      {/* Single Card Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* ── Promotional Hero Section ── */}
        <div className="p-6 text-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
          {/* Gift Image with confetti */}
          <div className="flex justify-center">
            <img
              src={`${BASE}assets/images/gift.png`}
              alt="1 Month Free Gift"
              className="h-50 w-50 object-contain"
            />
          </div>

          {/* Heading */}
          <div className="space-y-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Special Welcome Offer!
            </p>
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-outfit">
              Get 1 Month Free
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">on all plans</p>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-outfit px-2">
            Kickstart your clinic with Infinity Medisetu and enjoy premium features.
          </p>

          {/* Features List */}
          <ul className="mt-6 space-y-3 text-left">
            {[
              "All Premium Features",
              "Unlimited Appointments",
              "Online Payments",
              "Patient App Access",
              "Priority Support",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 text-indigo-500 dark:text-indigo-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-outfit">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* ── How It Works Section ── */}
        <div className="p-6 space-y-6">
          <h4 className="font-bold text-slate-800 dark:text-white font-outfit text-base">
            How it works?
          </h4>

          <div className="space-y-5">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-slate-800 dark:text-white font-outfit mb-1">
                  1 Choose a plan
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit leading-relaxed">
                  Select the plan that suits your clinic.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-slate-800 dark:text-white font-outfit mb-1">
                  2 Get 1 month free
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit leading-relaxed">
                  We'll add 1 month free to your subscription.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-slate-800 dark:text-white font-outfit mb-1">
                  Start using
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit leading-relaxed">
                  Your subscription will be activated instantly.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            className="w-full h-12 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all font-outfit text-sm"
            onPress={handleActivateFreeTrial}
            isLoading={isActivating}
            isDisabled={isActivating}
          >
            {isActivating ? "Activating..." : "Subscribe Free for 1 Month"}
          </Button>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">
            <span className="flex items-center gap-1">
              <FiShield className="w-3 h-3" />
              Secure
            </span>
            <span>•</span>
            <span>Simple</span>
            <span>•</span>
            <span>Instant Activation</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
