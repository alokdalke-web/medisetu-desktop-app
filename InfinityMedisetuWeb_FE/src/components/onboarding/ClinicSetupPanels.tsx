import React from "react";
import Overview from "./Overview";
import ClinicDetails from "./ClinicDetails";
import ReviewSubmitStep from "./ReviewSubmitStep";
import { type StepKey, type Completion } from "./types";
import ServicesPricingStep from "./ServicesPricingStep";
import DoctorAvailabilityStep from "./DoctorAvailabilityStep";

type PanelsProps = {
  activeStep: StepKey;
  onStepChange: (step: StepKey) => void;
  completion: Completion;
  steps: { key: StepKey; label: string; icon: React.ElementType }[];
  onProfileComplete: () => void;
  onClinicComplete: () => void;
  onServicesComplete: () => void;
  onAvailabilityComplete: () => void;
  onSubscriptionComplete: () => boolean | void | Promise<boolean | void>;
  onTypeChange?: (isDoctor: boolean) => void;
  onClinicFormChange?: (data: ClinicLiveData) => void;
  isSubmitting?: boolean;
};

export type ClinicLiveData = {
  clinicName?: string;
  clinicPhone?: string;
  tagline?: string;
  clinicAddress?: string;
  city?: string;
  logoPreviewUrl?: string;
};

const STEP_META: Record<StepKey, { title: string; description: string }> = {
  profile: {
    title: "Your Profile",
    description: "Tell us a bit about yourself so patients can trust you.",
  },
  clinic: {
    title: "Clinic Details",
    description: "Set up your clinic's basic information and location. ",
  },
  services: {
    title: "Services & Pricing",
    description: "Add the consultation services you offer and your fees.",
  },
  availability: {
    title: "Availability & Schedule",
    description: "Define your working days, shifts, and appointment preferences.",
  },
  subscription: {
    title: "Review & Submit",
    description: "Review everything before submitting for admin approval.",
  },
};

const ClinicBuildingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <rect x="9" y="17" width="12" height="23" rx="2" fill="#0A6C74" />
    <rect x="21" y="9" width="18" height="31" rx="3" fill="#087F7B" />
    <rect x="27" y="14" width="6" height="6" rx="1" fill="white" />
    <rect x="29" y="12" width="2" height="10" rx="1" fill="white" />
    <rect x="25" y="16" width="10" height="2" rx="1" fill="white" />
    <rect x="13" y="23" width="4" height="4" rx="1" fill="#DDF3EF" />
    <rect x="25" y="25" width="4" height="4" rx="1" fill="#DDF3EF" />
    <rect x="32" y="25" width="4" height="4" rx="1" fill="#DDF3EF" />
    <rect x="13" y="32" width="4" height="8" rx="1" fill="#DDF3EF" />
    <rect x="27" y="32" width="6" height="8" rx="1.5" fill="#DDF3EF" />
    <path
      d="M7 40h34"
      stroke="#0A6C74"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const ServicesPricingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <rect x="9" y="15" width="30" height="22" rx="4" fill="#0A6C74" />
    <path
      d="M15 16v-2.5A4.5 4.5 0 0 1 19.5 9h9A4.5 4.5 0 0 1 33 13.5V16"
      stroke="#0A6C74"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <rect x="9" y="20" width="30" height="5" fill="#087F7B" />
    <rect x="28" y="27" width="7" height="4" rx="2" fill="#DDF3EF" />
    <path
      d="M16 31h8"
      stroke="#DDF3EF"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const ClinicSetupPanels: React.FC<PanelsProps> = ({
  activeStep,
  onStepChange,
  steps,
  onProfileComplete,
  onClinicComplete,
  onServicesComplete,
  onAvailabilityComplete,
  onSubscriptionComplete,
  onTypeChange,
  onClinicFormChange,
  isSubmitting = false,
}) => {
  const getNextStep = (current: StepKey): StepKey => {
    const idx = steps.findIndex((s) => s.key === current);
    if (idx !== -1 && idx < steps.length - 1) return steps[idx + 1].key;
    return current;
  };

  const getPrevStep = (current: StepKey): StepKey => {
    const idx = steps.findIndex((s) => s.key === current);
    if (idx > 0) return steps[idx - 1].key;
    return current;
  };

  const [adminProfileData, setAdminProfileData] = React.useState<any>(null);

  const activeStepData = steps.find((s) => s.key === activeStep);
  if (!activeStepData) return null;

  const meta = STEP_META[activeStep];
  const StepIcon = activeStepData.icon;

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col animate-[fadeIn_0.35s_ease-out] ">
      {/* Step content card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900 ">
        <div
          className={[
            "flex shrink-0 items-center gap-3 px-5 pt-4 sm:gap-4 sm:px-6 sm:pt-5  ",
            activeStep === "services"
              ? "border-b border-slate-100 pb-4 dark:border-slate-800 sm:pb-5"
              : "",
          ].join(" ")}
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#e9f4f3]  text-primary shadow-sm dark:bg-primary-hover/15 dark:text-primary-hover sm:h-14 sm:w-14 lg:h-8 lg:w-8">
            {activeStep === "clinic" ? (
              <ClinicBuildingIcon className="h-8 w-8 " />
            ) : activeStep === "services" ? (
              <ServicesPricingIcon className="h-8 w-8 " />
            ) : (
              <StepIcon className="h-4 w-4" strokeWidth={2.3} />
            )}
          </div>

          {/* Step header */}
          <div className="min-w-0 ">
            <h2 className="text-[18px] font-bold text-[#0F172A] font-outfit leading-tight dark:text-white">
              {meta.title}
            </h2>
            <p className="mt-1 text-[13px] text-[#64748B] font-outfit leading-relaxed">
              {meta.description}
            </p>
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="min-h-0 flex-1 overflow-hidden mt-4">
          {activeStep === "profile" && (
            <Overview
              onNext={() => onStepChange(getNextStep("profile"))}
              onBack={
                steps.findIndex((s) => s.key === "profile") > 0
                  ? () => onStepChange(getPrevStep("profile"))
                  : undefined
              }
              onComplete={onProfileComplete}
              onTypeChange={onTypeChange}
              onProfileDataChange={setAdminProfileData}
            />
          )}
          {activeStep === "clinic" && (
            <ClinicDetails
              adminProfileData={adminProfileData}
              onNext={() => {
                onClinicComplete();
                onStepChange(getNextStep("clinic"));
              }}
              onBack={
                steps.findIndex((s) => s.key === "clinic") > 0
                  ? () => onStepChange(getPrevStep("clinic"))
                  : undefined
              }
              onFormChange={onClinicFormChange}
            />
          )}
          {activeStep === "services" && (
            <ServicesPricingStep
              onNext={() => onStepChange(getNextStep("services"))}
              onComplete={onServicesComplete}
              onBack={() => onStepChange(getPrevStep("services"))}
            />
          )}
          {activeStep === "availability" && (
            <DoctorAvailabilityStep
              onNext={() => onStepChange(getNextStep("availability"))}
              onComplete={onAvailabilityComplete}
              onBack={() => onStepChange(getPrevStep("availability"))}
            />
          )}
          {activeStep === "subscription" && (
            <ReviewSubmitStep
              onNext={() => onSubscriptionComplete()}
              onBack={() => onStepChange(getPrevStep("subscription"))}
              onEdit={onStepChange}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
};

export default ClinicSetupPanels;
