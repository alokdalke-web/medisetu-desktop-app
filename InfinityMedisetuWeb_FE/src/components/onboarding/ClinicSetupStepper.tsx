import React from "react";
import { FiClock, FiCheck } from "react-icons/fi";
import { type Completion, type StepKey } from "./types";

type StepperProps = {
  completion: Completion;
  activeStep: StepKey;
  onStepChange: (step: StepKey) => void;
  steps: { key: StepKey; label: string; description?: string; icon: React.ElementType; timeEstimate?: string }[];
  isApprovalWait?: boolean;
};

const ClinicSetupStepper: React.FC<StepperProps> = ({
  completion,
  activeStep,
  onStepChange,
  steps,
  isApprovalWait = false,
}) => {
  const isStepEnabled = (key: StepKey) => {
    if (isApprovalWait) return false;
    const hasClinicStep = steps.some((s) => s.key === "clinic");

    switch (key) {
      case "clinic":
        return true;
      case "profile":
        return hasClinicStep ? completion.hasClinic : true;
      case "services":
        return completion.hasProfile;
      case "availability":
        return completion.hasServices;
      case "subscription": {
        const hasPrev = steps.some((s) => s.key === "availability")
          ? completion.hasAvailability
          : completion.hasProfile;
        return hasPrev;
      }
      default:
        return false;
    }
  };

  const isStepCompleted = (key: StepKey): boolean => {
    switch (key) {
      case "clinic":
        return completion.hasClinic;
      case "profile":
        return completion.hasProfile;
      case "services":
        return completion.hasServices;
      case "availability":
        return completion.hasAvailability;
      case "subscription":
        return completion.hasSubscription;
      default:
        return false;
    }
  };

  // Add the verification step at the end for visual completeness
  const displaySteps = [
    ...steps,
    {
      key: "verification" as StepKey,
      label: "Verification",
      description: "We'll verify your clinic",
      icon: FiCheck,
      timeEstimate: "Usually within 24 hrs",
    }
  ];

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 mb-6 overflow-x-auto hide-scrollbar">
      <div className="flex items-start min-w-max md:min-w-0 md:justify-between gap-4 md:gap-2">
        {displaySteps.map((step, index) => {
          const isVerification = (step.key as string) === "verification";
          const isActive = isVerification ? isApprovalWait : (!isApprovalWait && activeStep === step.key);
          const isDone = isVerification ? false : (isStepCompleted(step.key) || isApprovalWait);
          const enabled = isVerification ? false : isStepEnabled(step.key);
          const isLast = index === displaySteps.length - 1;

          return (
            <React.Fragment key={step.key}>
              {/* Step Item */}
              <div
                className={`flex items-start gap-3 w-[200px] md:w-auto md:flex-1 shrink-0 ${
                  enabled && !isVerification ? "cursor-pointer" : "cursor-default opacity-60"
                }`}
                onClick={() => {
                  if (enabled && !isVerification) onStepChange(step.key);
                }}
              >
                {/* Number / Check Circle */}
                <div
                  className={`relative z-10 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all mt-0.5
                    ${
                      isActive
                        ? "bg-[#0A6C74] text-white ring-[3px] ring-[#0A6C74]/20"
                        : isDone
                        ? "bg-[#0A6C74] text-white"
                        : "bg-white text-[#677294] border-2 border-[#ECECEC]"
                    }`}
                >
                  {isDone ? <FiCheck size={14} /> : index + 1}
                </div>

                {/* Text Content */}
                <div className="flex flex-col flex-1">
                  <h3
                    className={`text-[14px] font-semibold leading-tight ${
                      isActive || isDone ? "text-[#100E1C]" : "text-[#677294]"
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p
                    className={`text-[12px] mt-1 leading-tight ${
                      isActive ? "text-[#677294]" : "text-[#8A94A6]"
                    }`}
                  >
                    {step.description}
                  </p>
                  {step.timeEstimate && (
                    <div className="flex items-center gap-1.5 mt-2 text-[#8A94A6] text-[11px] font-medium">
                      <FiClock size={12} />
                      <span>{step.timeEstimate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="hidden md:block w-8 lg:w-12 h-[2px] mt-3 shrink-0 bg-[#ECECEC] rounded-full mx-1">
                  <div
                    className={`h-full bg-[#0A6C74] rounded-full transition-all duration-300 ${
                      isDone ? "w-full" : "w-0"
                    }`}
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

export default ClinicSetupStepper;
