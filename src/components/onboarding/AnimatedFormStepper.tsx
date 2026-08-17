import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { FiCheck } from "react-icons/fi";
import { type Completion, type StepKey } from "./types";

export type StepperProps = {
  completion: Completion;
  activeStep: StepKey;
  onStepChange: (step: StepKey) => void;
  steps: {
    key: StepKey;
    label: string;
    description?: string;
    icon: React.ElementType;
    timeEstimate?: string;
  }[];
  isApprovalWait?: boolean;
};

const AnimatedFormStepper: React.FC<StepperProps> = ({
  completion,
  activeStep,
  onStepChange,
  steps,
  isApprovalWait = false,
}) => {
  const displaySteps = useMemo(() => {
    return [
      ...steps,
      {
        key: "verification" as StepKey,
        label: "Verification",
        description: "Admin review",
        icon: FiCheck,
        timeEstimate: "Within 24 hrs",
      },
    ];
  }, [steps]);



  const isStepEnabled = (key: StepKey) => {
    const hasClinicStep = steps.some((s) => s.key === "clinic");
    switch (key) {
      case "clinic": return true;
      case "profile": return hasClinicStep ? completion.hasClinic : true;
      case "services": return completion.hasProfile;
      case "availability": return completion.hasServices;
      case "subscription": return steps.some((s) => s.key === "availability")
        ? completion.hasAvailability
        : completion.hasProfile;
      default: return false;
    }
  };

  const isStepCompleted = (key: StepKey): boolean => {
    switch (key) {
      case "clinic": return completion.isClinicCompleted;
      case "profile": return completion.isProfileCompleted;
      case "services": return completion.isServicesCompleted;
      case "availability": return completion.isAvailabilityCompleted;
      case "subscription": return completion.isSubscriptionCompleted;
      default: return false;
    }
  };

  const activeStepIndex = steps.findIndex((step) => step.key === activeStep);

  return (
    <nav className="w-full" aria-label="Onboarding progress">
      <div
        className="mx-auto grid w-full min-w-[720px] max-w-[1400px] px-3 py-0.5 sm:min-w-[860px] sm:px-6 lg:min-w-0 lg:px-8"
        style={{
          gridTemplateColumns: `repeat(${displaySteps.length}, minmax(0, 1fr))`,
        }}
      >
        {displaySteps.map((step, index) => {
          const isVerification = (step.key as string) === "verification";
          const isActive = isVerification
            ? isApprovalWait
            : !isApprovalWait && activeStep === step.key;
          const isDoneByPosition =
            !isVerification && activeStepIndex !== -1 && index < activeStepIndex;
          const isDone = isVerification
            ? false
            : isStepCompleted(step.key) || isDoneByPosition || isApprovalWait;
          const enabled = isVerification ? false : isStepEnabled(step.key);
          const isLast = index === displaySteps.length - 1;

          return (
            <div
              id={`step-${step.key}`}
              key={step.key}
              className="relative flex min-w-0 justify-center"
            >
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="absolute top-[16px] h-[2px] overflow-hidden rounded-full bg-[#DCE5EF] dark:bg-slate-700"
                  style={{
                    left: "calc(50% + 32px)",
                    right: "calc(-50% + 32px)",
                  }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: isDone ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              )}

              <button
                type="button"
                aria-disabled="true"
                tabIndex={-1}
                className={[
                  "group relative z-10 flex min-w-0 flex-col items-center rounded-md focus:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-4",
                  "cursor-default",
                ].join(" ")}
              >
                <div
                  className={[
                    "grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold transition-all duration-300 sm:h-9 sm:w-9",
                    isActive
                      ? "bg-primary text-white ring-[4px] ring-primary/15"
                      : isDone
                        ? "bg-primary text-white"
                        : enabled
                          ? "bg-[#F1F5F9] text-[#53627B] group-hover:bg-[#E7EDF4] dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-slate-600"
                          : "bg-[#F1F5F9] text-[#6F7D94] opacity-70 dark:bg-slate-800 dark:text-slate-500",
                  ].join(" ")}
                >
                  {isDone && !isActive ? (
                    <FiCheck size={17} strokeWidth={3} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <span
                  className={[
                    "mt-1.5 max-w-[112px] text-center font-outfit text-[10px] font-semibold leading-tight sm:text-[11px]",
                    isActive
                      ? "text-primary"
                      : isDone
                        ? "text-[#344054] dark:text-white"
                        : enabled
                          ? "text-[#8A98AE] dark:text-slate-400"
                          : "text-[#C8D2DF] dark:text-slate-600",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default AnimatedFormStepper;
