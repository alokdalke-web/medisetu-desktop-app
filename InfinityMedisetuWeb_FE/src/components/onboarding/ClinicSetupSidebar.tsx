import React from "react";
import ProgressCircle from "../shared/ProgressCircle";
import SectionCard from "../shared/SectionCard";
import { type Completion, type StepKey } from "./types";

type SidebarProps = {
  completion: Completion;
  activeStep: StepKey;
  onStepChange: (step: StepKey) => void;
  steps: { key: StepKey; label: string; description?: string; icon: React.ElementType }[];
  onSaveAndExit?: () => void;
};

const ClinicSetupSidebar: React.FC<SidebarProps> = ({
  completion,
  activeStep,
  onStepChange,
  steps,
}) => {
  const isStepEnabled = (key: StepKey) => {
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

  return (
    <aside className="w-full shrink-0 lg:w-[260px] lg:sticky lg:top-5 lg:self-start">
      {/* Progress Section */}
      <SectionCard padding="md" className="mb-0">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-[#100E1C]">Setup Progress</p>
          <ProgressCircle
            percent={completion.percent}
            size={120}
            sublabel={`${completion.completedCount}/${completion.total}`}
          />
          <p className="text-xs text-[#677294] text-center">
            {completion.completedCount} of {completion.total} completed
            <br />
            <span className="text-[#0A6C74] font-medium">
              {completion.percent === 100
                ? "All steps completed!"
                : "You're just a few steps away!"}
            </span>
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#ECECEC] my-4" />

        {/* Steps Timeline */}
        <div className="flex flex-col relative pl-1">
          {steps.map((step, index) => {
            const isActive = activeStep === step.key;
            const isDone = isStepCompleted(step.key);
            const enabled = isStepEnabled(step.key);
            const isLast = index === steps.length - 1;

            return (
              <div key={step.key} className="relative flex items-start">
                {/* Vertical connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-[15px] top-[32px] w-[2px] h-[calc(100%-16px)] ${
                      isDone ? "bg-[#0A6C74]" : "bg-[#ECECEC]"
                    }`}
                  />
                )}

                {/* Step button */}
                <button
                  type="button"
                  onClick={() => enabled && onStepChange(step.key)}
                  disabled={!enabled}
                  className={[
                    "flex items-center gap-3 w-full py-2.5 px-1 text-left rounded-lg transition-all",
                    enabled && !isActive ? "hover:bg-slate-50 cursor-pointer" : "",
                    !enabled ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                >
                  {/* Number circle */}
                  <div
                    className={[
                      "relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                      isActive
                        ? "bg-[#0A6C74] text-white ring-[3px] ring-[#0A6C74]/20"
                        : isDone
                        ? "bg-[#0A6C74] text-white"
                        : "bg-white text-[#677294] border-2 border-[#ECECEC]",
                    ].join(" ")}
                  >
                    {index + 1}
                  </div>

                  {/* Step text */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "text-[13px] font-semibold leading-tight",
                        isActive
                          ? "text-[#0A6C74]"
                          : isDone
                          ? "text-[#100E1C]"
                          : enabled
                          ? "text-[#100E1C]"
                          : "text-[#677294]",
                      ].join(" ")}
                    >
                      {step.label}
                    </p>
                    <p
                      className={[
                        "text-[11px] leading-tight mt-0.5",
                        isActive ? "text-[#0A6C74]/70" : "text-[#677294]",
                      ].join(" ")}
                    >
                      {getStepDescription(step.key)}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </aside>
  );
};

function getStepDescription(key: StepKey): string {
  switch (key) {
    case "clinic":
      return "Basic details about your clinic";
    case "profile":
      return "Your profile and clinic hours";
    case "services":
      return "Add services and consultation fees";
    case "availability":
      return "Set doctor schedules";
    case "subscription":
      return "Select your subscription";
    default:
      return "";
  }
}

export default ClinicSetupSidebar;
