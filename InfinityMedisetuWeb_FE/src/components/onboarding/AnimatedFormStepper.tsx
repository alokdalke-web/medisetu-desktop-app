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


  return (
    <div className="w-full">


      {/* Horizontal Stepper with Responsive Circles and Lines */}
      <div className="mx-auto flex max-w-[1040px] items-center px-2 sm:px-4">
        {displaySteps.map((step, index) => {
          const isVerification = (step.key as string) === "verification";
          const isActive = isVerification
            ? isApprovalWait
            : !isApprovalWait && activeStep === step.key;
          const isDone = isVerification ? false : (isStepCompleted(step.key) || isApprovalWait);
          const enabled = isVerification ? false : isStepEnabled(step.key);
          const isLast = index === displaySteps.length - 1;

          return (
            <React.Fragment key={step.key}>
              {/* Step Circle */}
              <div id={`step-${step.key}`} className="flex flex-col items-center shrink-0">
                <button
                  type="button"
                  disabled={!enabled || isVerification}
                  onClick={() => {
                    if (enabled && !isVerification && !isApprovalWait) onStepChange(step.key);
                  }}
                  className="relative flex flex-col items-center focus:outline-none group"
                >
                  {/* Circle Container */}
                  <div className="relative flex items-center justify-center">
                    {/* Active Ring */}
                    {isActive && (
                      <span className="absolute h-[42px] w-[42px] rounded-full border-[3px] border-primary/15 sm:h-[44px] sm:w-[44px]" />
                    )}

                    {/* Main Circle */}
                    <div className={[
                      "relative flex items-center justify-center rounded-full transition-all duration-300 font-bold",
                      isActive
                        ? "h-9 w-9 bg-primary text-white shadow-[0_8px_18px_rgba(10,108,116,0.25)] sm:h-10 sm:w-10"
                        : isDone
                          ? "h-9 w-9 bg-primary text-white sm:h-10 sm:w-10"
                          : enabled
                            ? "h-9 w-9 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 sm:h-10 sm:w-10"
                            : "h-9 w-9 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 sm:h-10 sm:w-10",
                      enabled && !isVerification && !isActive && !isDone
                        ? "group-hover:bg-slate-200 dark:group-hover:bg-slate-600"
                        : "",
                    ].join(" ")}>
                      {isDone && !isActive ? (
                        <FiCheck size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
                      ) : (
                        <span className="text-[13px] sm:text-[14px]">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Label below circle */}
                  <span className={[
                    "mt-2.5 text-center font-outfit text-[11px] font-semibold leading-tight whitespace-nowrap sm:text-[12px]",
                    isActive ? "text-primary" :
                      isDone ? "text-slate-700 dark:text-white" :
                        enabled ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600",
                  ].join(" ")}>
                    {step.label}
                  </span>
                </button>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="relative mx-3 h-[2px] min-w-10 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 sm:mx-6" style={{ maxWidth: 138 }}>
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: isDone ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default AnimatedFormStepper;
