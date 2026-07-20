import {
  addToast,
  Button,
  Card,
  CardBody,
  Skeleton,
} from "@heroui/react";
import { useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import {
  type Plan,
  useGetAllPlansQuery,
  useGetBillingHistoryQuery,
} from "../../redux/api/subscriptionApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { PiCrownSimpleFill } from "react-icons/pi";

const normalizePlanText = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

const formatPlanPrice = (price?: number | string | null) => {
  const amount = Number(price);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `₹ ${safeAmount.toFixed(0)} / month`;
};

const isFreePlan = (plan: Plan) => {
  const slug = normalizePlanText(plan.slug);
  const name = normalizePlanText(plan.name);

  return slug === "free" || name === "free" || name === "free plan";
};

const isProPlan = (plan: Plan) => {
  const slug = normalizePlanText(plan.slug);
  const name = normalizePlanText(plan.name);

  return (
    slug === "pro-monthly" ||
    slug === "premium" ||
    name === "pro" ||
    name === "premium plan"
  );
};

const Subscription = ({
  onNext,
}: {
  onNext?: () => boolean | void | Promise<boolean | void>;
}) => {
  const [isSelectingPlan, setIsSelectingPlan] = useState(false);
  const {
    data: clinics,
    isLoading: isClinicsLoading,
  } = useGetAllClinicsQuery();
  const { isLoading: isBillingLoading } =
    useGetBillingHistoryQuery();
  const { data: plansData } = useGetAllPlansQuery();

  const subscription = clinics?.subscription;
  const plans = plansData?.plans || [];

  // Find Free and Pro plans from the API response
  const freePlan = plans.find(isFreePlan);
  const proPlan = plans.find(isProPlan);

  const handleCurrentPlan = async () => {
    if (isSelectingPlan) return;

    try {
      setIsSelectingPlan(true);
      const didComplete = await onNext?.();

      if (didComplete === false) return;
    } catch (error: any) {
      addToast({
        title: "Setup not completed",
        description: error?.data?.message || "Could not finalize setup.",
        color: "danger",
      });
    } finally {
      setIsSelectingPlan(false);
    }
  };

  if (isClinicsLoading || isBillingLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 sm:h-8 w-40 sm:w-48 rounded-lg" />
        <Card className="w-full">
          <CardBody className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardBody>
        </Card>
        <Skeleton className="h-56 sm:h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-base sm:text-lg font-semibold mb-2 text-yellow-700">
          No Clinic Found
        </h2>
        <p className="text-sm sm:text-base text-yellow-800">
          Please create a clinic first, then proceed with subscription.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-xl font-semibold">Plan & Billings</h2>
        <p className="text-sm text-gray-500">
          View your subscription plan, billings information.
        </p>
      </div>

      {/* Subscription Plan Section */}
      <div className="mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan Card */}
        {freePlan && (
          <Card className="border border-default-200 shadow-md bg-white rounded-[24px] overflow-hidden">
            <CardBody className="p-6">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[20px] font-semibold text-slate-900 dark:text-white">{freePlan.name}</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{freePlan.description}</span>
                    </div>
                    <div className="bg-primary/10 dark:bg-primary/20 px-3 py-1 rounded-[6px] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-primary dark:text-primary-hover text-xs font-medium">Lifetime Free</span>
                    </div>
                  </div>
                  <div className="text-[24px] font-bold text-slate-900 dark:text-white">
                    {formatPlanPrice(freePlan.price)}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {freePlan.features?.filter((f: any) => f.name || f.isMarketingFeature).slice(0, 3).map((feature: any) => (
                    <div key={feature.id} className="flex items-start gap-3">
                      <FiCheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{feature.name || feature.displayName || feature.featureKey}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{feature.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  className="w-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-hover font-medium rounded-full hover:bg-primary hover:text-white dark:hover:bg-primary-hover"
                  onPress={handleCurrentPlan}
                  isLoading={isSelectingPlan}
                  isDisabled={isSelectingPlan}
                >
                   Select Plan
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Pro Plan Card */}
        {proPlan && (
          <div className="relative opacity-60 pointer-events-none">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-amber-500 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-sm">
                Coming Soon
              </div>
            </div>
            <Card className={`border border-default-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800 rounded-[24px] overflow-hidden h-full`}>
              <CardBody className="p-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[20px] font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                          <PiCrownSimpleFill className="text-yellow-500 text-2xl" />
                          {proPlan.name}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{proPlan.description}</span>
                      </div>
                      <div className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-[6px] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-600" />
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-medium">Coming Soon</span>
                      </div>
                    </div>
                    <div className="text-[24px] font-bold text-slate-900 dark:text-white">
                      {formatPlanPrice(proPlan.price)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {proPlan.features?.filter((f: any) => f.name || f.isMarketingFeature).slice(0, 3).map((feature: any) => (
                      <div key={feature.id} className="flex items-start gap-3">
                        <FiCheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{feature.name || feature.displayName || feature.featureKey}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">{feature.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full bg-default-200 dark:bg-slate-700 text-default-500 dark:text-slate-400 font-medium rounded-full cursor-not-allowed"
                    isDisabled
                  >
                    Coming Soon
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
