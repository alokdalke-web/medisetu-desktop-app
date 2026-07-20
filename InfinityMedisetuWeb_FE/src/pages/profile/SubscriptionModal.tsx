import { useMemo, useState } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  addToast,
} from "@heroui/react";
import { FiCheck } from "react-icons/fi";
import {
  useGetAllPlansQuery,
  useSubscribeMutation,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
} from "../../redux/api/subscriptionApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";

interface SubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ================= ENV ================= */
// ✅ If you're on Vite, you can do: const IS_PRODUCTION = import.meta.env.PROD;
const IS_PRODUCTION = true;

/* fallback paid plan (only used if API has no paid plan) */
const FALLBACK_COMING_SOON_PLAN = {
  id: "coming-soon",
  name: "Pro Plan",
  slug: "pro",
  description: "Advanced access for growing clinics",
  currency: "INR",
  price: 499,
  features: [
    { id: "cs-1", name: "Unlimited Patients", description: "No record limits" },
    { id: "cs-2", name: "Priority Support", description: "Faster resolutions" },
    { id: "cs-3", name: "Advanced Reports", description: "More insights & exports" },
  ],
};

const SubscriptionModal = ({ isOpen, onOpenChange }: SubscriptionModalProps) => {
  const { data: plansData, isLoading } = useGetAllPlansQuery();
  const { data: clinicData } = useGetAllClinicsQuery();
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeMutation();
  const [createRazorpayOrder] = useCreateRazorpayOrderMutation();
  const [verifyRazorpayPayment] = useVerifyRazorpayPaymentMutation();
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  const currentPlanSlug = String(
    clinicData?.subscription?.slug ?? "free"
  ).toLowerCase();

  const allPlans = plansData?.plans ?? [];

  const plansToRender = useMemo(() => {
    if (!IS_PRODUCTION) return allPlans;

    // ✅ Free plan from API
    const freePlan =
      allPlans.find((p: any) => String(p?.slug).toLowerCase() === "free") ||
      allPlans.find((p: any) => Number(p?.price || 0) === 0);

    // ✅ Pick one paid plan from API (cheapest)
    const paidPlans = allPlans
      .filter((p: any) => {
        const slug = String(p?.slug).toLowerCase();
        const price = Number(p?.price || 0);
        return slug !== "free" && price > 0;
      })
      .sort((a: any, b: any) => Number(a?.price || 0) - Number(b?.price || 0));

    const paidPlan = paidPlans[0] || FALLBACK_COMING_SOON_PLAN;

    // ✅ Always return 2 cards in production (Free + Paid/Trial)
    return [freePlan, paidPlan].filter(Boolean);
  }, [allPlans]);

  /** Free plan subscription (no payment needed) */
  const handleFreeSubscribe = async (planId: string, planName: string) => {
    try {
      await subscribe({ planId }).unwrap();
      addToast({
        title: "Success",
        description: `Successfully subscribed to ${planName}.`,
        color: "success",
      });
      onOpenChange(false);
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Something went wrong",
        color: "danger",
      });
    }
  };

  /** Paid plan subscription via Razorpay checkout */
  const handlePaidSubscribe = async (planId: string, planName: string) => {
    setIsPaymentProcessing(true);
    try {
      // Step 1: Create Razorpay order
      const orderRes = await createRazorpayOrder({ planId }).unwrap();

      // If free trial / no payment required, subscription is already created
      if (!orderRes.requiresPayment) {
        addToast({
          title: "Success",
          description: `Successfully subscribed to ${planName}.`,
          color: "success",
        });
        onOpenChange(false);
        setIsPaymentProcessing(false);
        return;
      }

      // Step 2: Open Razorpay checkout
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        addToast({
          title: "Error",
          description: "Payment gateway not loaded. Please refresh and try again.",
          color: "danger",
        });
        setIsPaymentProcessing(false);
        return;
      }

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        order_id: orderRes.orderId,
        name: "MediSetu",
        description: `${planName} Subscription`,
        handler: async (response: any) => {
          // Step 3: Verify payment
          try {
            await verifyRazorpayPayment({
              orderId: orderRes.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId,
            }).unwrap();

            addToast({
              title: "Payment Successful",
              description: `You're now subscribed to ${planName}.`,
              color: "success",
            });
            onOpenChange(false);
          } catch (verifyErr: any) {
            addToast({
              title: "Verification Failed",
              description:
                verifyErr?.data?.message ||
                "Payment received but verification failed. Please contact support.",
              color: "danger",
            });
          } finally {
            setIsPaymentProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaymentProcessing(false);
            addToast({
              title: "Payment Cancelled",
              description: "You cancelled the payment. No charges were made.",
              color: "warning",
            });
          },
        },
        theme: {
          color: "#0A6C74",
        },
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.failed", (failResponse: any) => {
        setIsPaymentProcessing(false);
        addToast({
          title: "Payment Failed",
          description:
            failResponse?.error?.description ||
            "Payment could not be processed. Please try again.",
          color: "danger",
        });
      });
      rzp.open();
    } catch (err: any) {
      setIsPaymentProcessing(false);
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to initiate payment",
        color: "danger",
      });
    }
  };

  /** Route to the right handler based on plan type */
  const handleSubscribe = (planId: string, planName: string, isPaid: boolean) => {
    if (isPaid) {
      handlePaidSubscribe(planId, planName);
    } else {
      handleFreeSubscribe(planId, planName);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="4xl"
      className="rounded-[32px]"
    >
      <ModalContent className="p-10">
        {() => (
          <ModalBody className="p-0">
            {/* ===== HEADER ===== */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">Choose your access</h2>
              <p className="text-default-500">
                Select a plan that best fits your clinic's needs
              </p>
            </div>

            {isLoading ? (
              <div className="py-20 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plansToRender.map((plan: any) => {
                  const slug = String(plan?.slug ?? "").toLowerCase();
                  const priceNum = Number(plan?.price || 0);

                  const isFree = slug === "free" || priceNum === 0;
                  const isPro = !isFree;
                  const isCurrentPlan = slug === currentPlanSlug;

                  // ================= PRODUCTION UI (Free + Pro Trial) =================
                  if (IS_PRODUCTION) {
                    // ✅ WORDING ONLY
                    const title = isFree ? "Free Plan" : "Pro";
                    const desc = isFree
                      ? "Basic access for small clinics"
                      : "15 days free trial ";
                    const currency = plan?.currency || "INR";

                    const isFallback = String(plan?.id) === "coming-soon";
                    const canSubscribePro = isPro && !isFallback && !isCurrentPlan;

                    return (
                      <Card
                        key={plan?.id || title}
                        className={[
                          "border-2 rounded-3xl shadow-none",
                          isPro ? "border-primary" : "border-default-200",
                        ].join(" ")}
                      >
                        <CardBody className="p-8 flex flex-col">
                          <div className="flex justify-between items-start mb-5">
                            <div>
                              <h3 className="text-2xl font-bold">{title}</h3>
                              <p className="text-default-500 text-sm">{desc}</p>
                            </div>

                            {/* ✅ WORDING ONLY */}
                            {isFree ? (
                              <Chip color="success" variant="flat" size="sm">
                                Lifetime Free
                              </Chip>
                            ) : (
                              <Chip color="warning" variant="flat" size="sm">
                                {isCurrentPlan
                                  ? "Trial Active (15 days)"
                                  : "15 days Free Trial"}
                              </Chip>
                            )}
                          </div>

                          <div className="mb-6">
                            <span className="text-4xl font-bold">
                              {currency} {isFree ? "0" : priceNum.toLocaleString()}
                            </span>
                            <span className="text-default-400 ml-1">/ month</span>
                          </div>

                          <div className="space-y-4 mb-10 flex-grow">
                            {(plan?.features || []).map((f: any) => (
                              <div key={f?.id || f?.name} className="flex gap-3">
                                <FiCheck className="text-success mt-1" />
                                <div>
                                  <p className="font-medium text-sm">{f?.name}</p>
                                  <p className="text-xs text-default-400">
                                    {f?.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            className="w-full font-semibold"
                            color={isPro ? "primary" : "default"}
                            variant={isPro ? "solid" : "flat"}
                            size="lg"
                            isDisabled={
                              isSubscribing || isPaymentProcessing ||
                              (isPro ? !canSubscribePro : false)
                            }
                            isLoading={
                              (isSubscribing || isPaymentProcessing) && (isPro ? canSubscribePro : true)
                            }
                            onPress={() => {
                              // Free plan flow
                              if (isFree) {
                                if (isCurrentPlan) {
                                  onOpenChange(false);
                                  return;
                                }
                                handleSubscribe(String(plan.id), "Free Plan", false);
                                return;
                              }

                              // Pro paid flow via Razorpay
                              if (!canSubscribePro) return;
                              handleSubscribe(String(plan.id), title, true);
                            }}
                          >
                            {/* ✅ WORDING ONLY */}
                            {isCurrentPlan
                              ? isFree
                                ? "Current Plan"
                                : "Trial Active (15 days)"
                              : isFree
                              ? "Continue with Free"
                              : isFallback
                              ? "Coming Soon"
                              : "Start 15 Days Free Trial"}
                          </Button>
                        </CardBody>
                      </Card>
                    );
                  }

                  // ================= DEVELOPMENT (REAL API UI) =================
                  const price =
                    plan.price !== undefined
                      ? Number(plan.price || 0).toLocaleString()
                      : "0.00";
                  const currency = plan.currency || "INR";

                  return (
                    <Card
                      key={plan.id}
                      className={`border-2 rounded-3xl shadow-none ${
                        isCurrentPlan ? "border-primary" : "border-default-200"
                      }`}
                    >
                      <CardBody className="p-8 flex flex-col">
                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                            <p className="text-default-500 text-sm">
                              {plan.description}
                            </p>
                          </div>

                          {isCurrentPlan && (
                            <Chip color="primary" variant="flat" size="sm">
                              Current Plan
                            </Chip>
                          )}
                        </div>

                        <div className="mb-6">
                          <span className="text-4xl font-bold">
                            {currency} {price}
                          </span>
                          <span className="text-default-400 ml-1">/ month</span>
                        </div>

                        <div className="space-y-4 mb-10 flex-grow">
                          {(plan.features || []).map((f: any) => (
                            <div key={f.id} className="flex gap-3">
                              <FiCheck className="text-success mt-1" />
                              <div>
                                <p className="font-medium text-sm">{f.name}</p>
                                <p className="text-xs text-default-400">
                                  {f.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          className="w-full font-semibold"
                          color={isCurrentPlan ? "default" : "primary"}
                          variant={isCurrentPlan ? "flat" : "solid"}
                          size="lg"
                          isDisabled={isCurrentPlan || isSubscribing || isPaymentProcessing}
                          isLoading={isSubscribing || isPaymentProcessing}
                          onPress={() => handleSubscribe(String(plan.id), plan.name, !isFree)}
                        >
                          {isCurrentPlan
                            ? "Current Plan"
                            : isFree
                            ? "Continue with Free"
                            : "Subscribe Now"}
                        </Button>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SubscriptionModal;
