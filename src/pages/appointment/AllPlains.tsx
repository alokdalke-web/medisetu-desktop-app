// src/components/.../AllPlains.tsx
import {
  addToast,
  Button,
  Card,
  CardBody,
  Radio,
  RadioGroup,
  Spinner
} from "@heroui/react";
import React from "react";
import {
  useCreateDoctorPlainMutation,
  useGetAllDoctorPlainsQuery,
} from "../../redux/api/doctorApi";

import Nosubscription from "../../../public/assets/images/Nosubscription.jpg";
import { isNetworkError } from "../../utils/getApiErrorText";

const EMPTY_PLANS_IMG = Nosubscription;

type AllPlainsProps = {
  doctorId: string;
  patientId: string;
  onPlanActivated?: () => void;
};

const AllPlains: React.FC<AllPlainsProps> = ({
  doctorId,
  patientId,
  onPlanActivated,
}) => {
  const {
    data,
    isLoading: isLoadingPlans,
    isError,
    error,
  } = useGetAllDoctorPlainsQuery(doctorId, {
    skip: !doctorId,
  });

  const [createDoctorPlain, { isLoading: isCreating }] =
    useCreateDoctorPlainMutation();

  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
    null,
  );
  const [selectedPaymentMode, setSelectedPaymentMode] = React.useState<
    string | null
  >(null);

  const plans: any[] = React.useMemo(() => {
    if (!data) return [];
    const src =
      (data as any)?.result?.plans ??
      (data as any)?.result?.plains ??
      (data as any)?.plans ??
      (data as any)?.plains ??
      (data as any)?.result ??
      (data as any)?.data ??
      [];
    return Array.isArray(src) ? src : [];
  }, [data]);

  React.useEffect(() => {
    if (isError && !isNetworkError(error)) {
      addToast({
        title: "Failed to load plans",
        description:
          (error as any)?.data?.message ||
          (error as any)?.message ||
          "Could not fetch doctor plans.",
        color: "danger",
        variant: "flat",
      });
    }
  }, [isError, error]);

  if (!doctorId) {
    return (
      <section className="mb-6 rounded-3xl border border-amber-100 bg-amber-50/70 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-900/20">
        <p className="text-sm text-amber-700 dark:text-amber-200">
          Please select a doctor to view available plans.
        </p>
      </section>
    );
  }

  const handleSelectPlan = async (plan: any, modeFromRadio: string) => {
    if (!doctorId || !patientId) {
      addToast({
        title: "Missing information",
        description: "Please select both doctor and patient first.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    if (!plan?.id) {
      addToast({
        title: "Invalid plan",
        description: "Selected plan is missing an id.",
        color: "danger",
        variant: "flat",
      });
      return;
    }

    const mode = modeFromRadio || "upi";
    const paymentStatus = mode === "cash" ? "paid" : "pending";
    const amount = plan.price ?? plan.amount ?? plan.fee ?? 0;

    const payload = {
      doctorId,
      patientId,

      // ✅ API requires plainId
      plainId: String(plan.id),

      doctorSubscriptionId: String(plan.id),
      status: "active",
      notes: plan.serviceName ?? plan.name ?? "First-time consultation plan",
      amount: String(amount),
      paymentStatus,
      paymentMode: mode,
    };

    const result = await createDoctorPlain(payload);

    if ("error" in result && result.error) {
      const err: any = result.error;
      const msg =
        err?.data?.message ||
        err?.message ||
        err?.error ||
        "Could not create doctor subscription.";

      addToast({
        title: "Failed to activate plan",
        description: msg,
        color: "danger",
        variant: "flat",
      });
      return;
    }

    const resp: any = (result as any).data;

    addToast({
      title: "Plan activated",
      description: resp?.message || "Subscription created successfully.",
      color: "success",
      variant: "flat",
    });

    onPlanActivated?.();
  };

  const handleCardClick = (planId: string) => {
    if (isCreating) return;
    setSelectedPlanId(planId);
    setSelectedPaymentMode((prev) => prev ?? "cash");
  };

  const showEmpty = !isLoadingPlans && plans.length === 0;

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:bg-[#111726] dark:border-[#273244] dark:shadow-none">
      {/* ---------------- Loading (centered) ---------------- */}
      {isLoadingPlans && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-2">
          <Spinner size="sm" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading plans...</p>
        </div>
      )}

      {showEmpty && (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
          <img
            src={EMPTY_PLANS_IMG}
            alt="No Subscription Plans"
            className="w-[260px] max-w-full select-none"
            draggable={false}
          />

          <h3 className="mt-6 text-[14px] font-semibold text-slate-900 dark:text-white">
            No Subscription Plans For This Doctor
          </h3>

          <p className="mt-2 max-w-[560px] text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            No Active Subscription Found For This Doctor And Patient. First
            Select A Plan, Then Choose Payment Mode To Activate It.
          </p>
        </div>
      )}

      {/* ---------------- Plans list UI ---------------- */}
      {!isLoadingPlans && plans.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#111726]">
          {/* Header */}
          <div className="mb-3">
            <h2 className=" font-semibold text-slate-900 dark:text-white">
              Select a subscription plan
            </h2>
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan: any, idx: number) => {
              const planId = String(plan?.id ?? idx);

              const title =
                plan.serviceName ??
                plan.name ??
                plan.planName ??
                plan.title ??
                `Plan ${idx + 1}`;

              const price = plan.price ?? plan.amount ?? plan.fee ?? null;
              const isSelected = selectedPlanId === planId;

              // ✅ Price display like screenshot (₹500)
              const priceLabel = price !== null ? `₹${price}` : "";

              return (
                <Card
                  key={planId}
                  shadow="sm"
                  isPressable={!isCreating}
                  onPress={() => handleCardClick(planId)}
                  className={
                    "rounded-2xl border bg-white dark:bg-[#0f1728] " +
                    (isSelected ? "border-teal-400 dark:border-[#46beae]" : "border-slate-200 dark:border-[#38445a]")
                  }
                >
                  <CardBody className="p-4">
                    {/* Title */}
                    <div className=" font-semibold text-slate-900 dark:text-white">
                      {title}
                    </div>

                    {/* Price */}
                    {price !== null && (
                      <div className="mt-1  font-bold text-teal-700 dark:text-[#46beae]">
                        {priceLabel}
                      </div>
                    )}

                    {/* Payment mode */}
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-[#111726]">
                      <div className=" font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        PAYMENT MODE
                      </div>

                      <RadioGroup
                        orientation="horizontal"
                        size="sm"
                        value={
                          isSelected
                            ? (selectedPaymentMode ?? "cash")
                            : undefined
                        }
                        onValueChange={(val) => {
                          // ✅ only select plan + store mode (NO API hit)
                          setSelectedPlanId(planId);
                          setSelectedPaymentMode(String(val));
                        }}
                        isDisabled={isCreating}
                        classNames={{
                          wrapper: "mt-2 flex flex-wrap gap-4",
                        }}
                      >
                        <Radio
                          value="cash"
                          classNames={{ label: "text-[14px] dark:text-slate-300" }}
                        >
                          Cash
                        </Radio>
                        <Radio
                          value="upi"
                          classNames={{ label: "text-[14px] dark:text-slate-300" }}
                        >
                          UPI
                        </Radio>
                        <Radio
                          value="card"
                          classNames={{ label: "text-[14px] dark:text-slate-300" }}
                        >
                          Card
                        </Radio>
                        <Radio
                          value="insurance"
                          classNames={{ label: "text-[14px] dark:text-slate-300" }}
                        >
                          Insurance
                        </Radio>
                      </RadioGroup>
                    </div>

                    {/* Select button */}
                    <div className="mt-3">
                      <Button
                        size="sm"
                        radius="full"
                        className="bg-secondary px-4 text-[16px] font-semibold text-white"
                        isDisabled={isCreating}
                        onPress={() => {
                          // ✅ button click pe API hit
                          setSelectedPlanId(planId);

                          const mode = isSelected
                            ? (selectedPaymentMode ?? "cash")
                            : "cash";

                          setSelectedPaymentMode(mode);

                          if (!isCreating) {
                            void handleSelectPlan(plan, mode);
                          }
                        }}
                      >
                        {isCreating && isSelected
                          ? "Selecting..."
                          : "Select Plan"}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default AllPlains;
