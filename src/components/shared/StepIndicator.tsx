import React from "react";
import { FiCheck } from "react-icons/fi";

export type StepStatus = "completed" | "active" | "upcoming" | "disabled";

interface Step {
  key: string;
  label: string;
  description?: string;
  icon?: React.ElementType;
}

interface StepIndicatorProps {
  steps: Step[];
  activeStep: string;
  completedSteps: string[];
  disabledSteps?: string[];
  onStepClick?: (key: string) => void;
  className?: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  activeStep,
  completedSteps,
  disabledSteps = [],
  onStepClick,
  className = "",
}) => {
  const getStepStatus = (key: string): StepStatus => {
    if (disabledSteps.includes(key)) return "disabled";
    if (completedSteps.includes(key)) return "completed";
    if (key === activeStep) return "active";
    return "upcoming";
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(step.key);
        const isClickable = status !== "disabled";
        const stepNumber = index + 1;

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => isClickable && onStepClick?.(step.key)}
            disabled={!isClickable}
            className={[
              "flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 rounded-xl group",
              status === "active"
                ? "bg-[#E8F6F4] text-[#0A6C74]"
                : status === "completed"
                ? "text-slate-700 hover:bg-slate-50"
                : status === "disabled"
                ? "text-slate-300 cursor-not-allowed opacity-50"
                : "text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {/* Step number / check circle */}
            <div
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                status === "completed"
                  ? "bg-[#0A6C74] text-white"
                  : status === "active"
                  ? "bg-[#0A6C74] text-white ring-4 ring-[#0A6C74]/20"
                  : status === "disabled"
                  ? "bg-slate-100 text-slate-300 border border-slate-200"
                  : "bg-white text-slate-500 border border-slate-300 group-hover:border-[#0A6C74]/40",
              ].join(" ")}
            >
              {status === "completed" ? (
                <FiCheck className="h-4 w-4" />
              ) : (
                <span>{stepNumber}</span>
              )}
            </div>

            {/* Step text */}
            <div className="min-w-0 flex-1">
              <div
                className={[
                  "text-sm font-semibold leading-tight",
                  status === "active"
                    ? "text-[#0A6C74]"
                    : status === "completed"
                    ? "text-slate-800"
                    : status === "disabled"
                    ? "text-slate-300"
                    : "text-slate-700",
                ].join(" ")}
              >
                {step.label}
              </div>
              {step.description && (
                <div
                  className={[
                    "text-xs mt-0.5 leading-tight",
                    status === "active"
                      ? "text-[#0A6C74]/70"
                      : status === "disabled"
                      ? "text-slate-200"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {step.description}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default StepIndicator;
