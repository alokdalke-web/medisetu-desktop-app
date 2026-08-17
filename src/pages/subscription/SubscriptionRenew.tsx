// src/pages/subscription/SubscriptionRenew.tsx
// Auto-triggers payment flow from email link: /subscription/renew?planId=xxx&cycle=monthly&clinicId=yyy
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { Card, CardBody, Spinner } from "@heroui/react";
import { FiCheckCircle, FiAlertTriangle, FiChevronRight } from "react-icons/fi";

import { useSubscriptionCheckout } from "../../hooks/useSubscriptionCheckout";
import { useGetAllPlansQuery } from "../../redux/api/subscriptionApi";
import AppButton from "../../components/shared/AppButton";

type RenewState = "loading" | "processing" | "success" | "error";

const SubscriptionRenew = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { subscribeToPlan } = useSubscriptionCheckout();
  const { data: plansData, isLoading: plansLoading } = useGetAllPlansQuery();

  const planId = searchParams.get("planId");
  const cycle = searchParams.get("cycle") as "monthly" | "yearly" | null;

  const [state, setState] = useState<RenewState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!planId || !cycle) {
      setState("error");
      setErrorMsg("Invalid renewal link. Missing plan or cycle information.");
      return;
    }

    if (plansLoading || !plansData?.plans) return;

    // Find the plan to get name and price
    const plan = plansData.plans.find((p) => p.id === planId);
    if (!plan) {
      setState("error");
      setErrorMsg("Plan not found. It may have been removed or changed.");
      return;
    }

    // Only trigger once
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    setState("processing");

    // Auto-trigger the payment flow
    const triggerPayment = async () => {
      try {
        const success = await subscribeToPlan({
          id: plan.id,
          name: plan.name,
          price: plan.price,
        });

        if (success) {
          setState("success");
        } else {
          // User cancelled Razorpay or payment failed
          setState("error");
          setErrorMsg("Payment was not completed. You can try again.");
        }
      } catch (err: any) {
        setState("error");
        setErrorMsg(
          err?.data?.message || err?.message || "Something went wrong during payment."
        );
      }
    };

    triggerPayment();
  }, [planId, cycle, plansData, plansLoading, subscribeToPlan]);

  return (
    <div className="p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
        <Link to="/subscription" className="hover:text-slate-900 hover:underline underline-offset-4">
          Subscription
        </Link>
        <FiChevronRight className="opacity-60" />
        <span className="font-semibold text-teal-700">Renew</span>
      </div>

      <div className="mx-auto max-w-lg">
        {/* Loading */}
        {(state === "loading" || state === "processing") && (
          <Card className="border border-slate-200">
            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <Spinner size="lg" color="primary" />
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {state === "loading" ? "Preparing renewal..." : "Processing payment..."}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {state === "loading"
                    ? "Loading plan details"
                    : "Razorpay payment window should open shortly"}
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Success */}
        {state === "success" && (
          <Card className="border border-emerald-200 bg-emerald-50">
            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <FiCheckCircle className="text-3xl text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-900">
                  Subscription Renewed!
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  Your plan has been successfully renewed. All features are now active.
                </p>
              </div>
              <AppButton
                text="Go to Dashboard"
                buttonVariant="primary"
                onPress={() => navigate("/dashboard")}
                className="mt-4"
              />
            </CardBody>
          </Card>
        )}

        {/* Error */}
        {state === "error" && (
          <Card className="border border-amber-200 bg-amber-50">
            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <FiAlertTriangle className="text-3xl text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-amber-900">
                  Renewal Failed
                </p>
                <p className="mt-1 max-w-sm text-sm text-amber-700">
                  {errorMsg}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <AppButton
                  text="Try Again"
                  buttonVariant="primary"
                  onPress={() => {
                    hasTriggered.current = false;
                    setState("loading");
                  }}
                />
                <AppButton
                  text="Go to Subscription"
                  buttonVariant="outlined"
                  onPress={() => navigate("/subscription")}
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SubscriptionRenew;
