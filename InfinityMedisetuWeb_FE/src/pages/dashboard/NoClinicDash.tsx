import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addToast, Spinner } from "@heroui/react";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
} from "../../redux/api/doctorApi";
import { useGetUserQuery, useUpdateOnboardingProgressMutation, useSubmitOnboardingMutation } from "../../redux/api/authApi";
import AnimatedFormStepper from "../../components/onboarding/AnimatedFormStepper";
import ClinicSetupPanels from "../../components/onboarding/ClinicSetupPanels";
import ApprovalPendingPanel from "../../components/onboarding/ApprovalPendingPanel";
import { OnboardingPageSkeleton } from "../../components/onboarding/OnboardingStepSkeleton";
import Confetti from "../../components/shared/Confetti";
import {
  steps as allSteps,
  type StepKey,
} from "../../components/onboarding/types";
import CompletionPopup from "../../components/onboarding/CompletionPopup";
import {
  getDoctorAvailabilityList,
  markClinicSetupComplete,
} from "../../utils/clinicSetupStatus";
import { useOnboardingStep } from "../../context/OnboardingContext";

interface NoClinicDashProps {
  onDashboardReady?: () => void;
  onProfileReady?: () => void;
}

type ApprovalProfile = {
  userStatus?: string | null;
  isAdminDoctorAccess?: boolean | null;
  mobile?: string | null;
  speciality?: string | null;
  onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  approvalRequestSent?: boolean;
  currentStep?: number;
};

const normalizeStatus = (status?: string | null) =>
  String(status || "").trim().toLowerCase();

const normalizeAvailabilityTime = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const existing12h = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (existing12h) {
    return `${existing12h[1].padStart(2, "0")}:${existing12h[2]} ${existing12h[3].toUpperCase()}`;
  }

  const time24h = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!time24h) return raw;

  const hours24 = Number(time24h[1]);
  const minutes = time24h[2];
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${String(hours12).padStart(2, "0")}:${minutes} ${period}`;
};

const getAvailabilityBreaks = (slot: any) => {
  const breaks =
    slot?.aivblityBreak ?? slot?.availabilityBreak ?? slot?.breaks ?? [];
  return Array.isArray(breaks) ? breaks : [];
};

const buildDoctorAvailabilitySetupPayload = (doctorResult: any) => {
  const availability = getDoctorAvailabilityList(doctorResult) ?? [];
  const dateAvailability = Array.isArray(doctorResult?.dateAvailability)
    ? doctorResult.dateAvailability
    : [];

  return {
    aivblity: availability.map((slot: any) => {
      const noOfPatients =
        slot?.noOfPatients !== undefined && slot?.noOfPatients !== null
          ? Number(slot.noOfPatients)
          : undefined;

      return {
        dayOfWeek: slot?.dayOfWeek,
        isAvailable: Boolean(slot?.isAvailable),
        startTime: normalizeAvailabilityTime(slot?.startTime),
        endTime: normalizeAvailabilityTime(slot?.endTime),
        slotMinutes: Number(slot?.slotMinutes) || 30,
        stepMinutes: Number(slot?.stepMinutes) || 0,
        notes: slot?.notes ?? "",
        ...(Number.isFinite(noOfPatients) ? { noOfPatients } : {}),
        aivblityBreak: getAvailabilityBreaks(slot).map((breakItem: any) => ({
          breakType: breakItem?.breakType || "Break",
          startTime: normalizeAvailabilityTime(breakItem?.startTime),
          endTime: normalizeAvailabilityTime(breakItem?.endTime),
          status:
            typeof breakItem?.status === "boolean" ? breakItem.status : true,
          notes: breakItem?.notes ?? "",
        })),
      };
    }),
    dateAvailability: dateAvailability.map((dateItem: any) => ({
      date: dateItem?.date,
      isAvailable: Boolean(dateItem?.isAvailable),
      notes: dateItem?.notes ?? "",
      ...(dateItem?.isAvailable
        ? {
            slotMinutes: Number(dateItem?.slotMinutes) || 30,
            stepMinutes: Number(dateItem?.stepMinutes) || 0,
            timeSlots: Array.isArray(dateItem?.timeSlots)
              ? dateItem.timeSlots.map((slot: any) => ({
                  startTime: normalizeAvailabilityTime(slot?.startTime),
                  endTime: normalizeAvailabilityTime(slot?.endTime),
                  isAvailable:
                    typeof slot?.isAvailable === "boolean"
                      ? slot.isAvailable
                      : true,
                  notes: slot?.notes ?? "",
                }))
              : [],
          }
        : {}),
    })),
  };
};

const NoClinicDash: React.FC<NoClinicDashProps> = ({
  onDashboardReady,
  onProfileReady,
}) => {
  // Get context to update sidebar
  const { setActiveStep: setContextActiveStep } = useOnboardingStep();
  
  const { data: user, isLoading: isUserLoading } = useGetUserQuery(undefined, {
    // ✅ OPTIMIZED: Prevent unnecessary refetches during onboarding
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });
  const {
    data: clinics,
    isLoading: isClinicsLoading,
    isFetching: isClinicsFetching,
    refetch: refetchClinics,
  } = useGetAllClinicsQuery(undefined, {
    // ✅ OPTIMIZED: Prevent unnecessary refetches during onboarding
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const clinicProfile = clinics?.profile as ApprovalProfile | undefined;
  const isAdminUser = user?.userType === "Admin";
  const isDoctorUser = user?.userType === "Doctor";
  const [isDoctorOverride, setIsDoctorOverride] = useState<boolean | null>(null);

  // ✅ BACKEND-DRIVEN: Get all state from API only
  const profileStatus = clinicProfile?.userStatus ?? user?.userStatus;
  const normalizedStatus = normalizeStatus(profileStatus);
  const isStatusActive = normalizedStatus === "active";

  // ✅ NEW: Use backend fields
  const approvalRequestSent = clinicProfile?.approvalRequestSent ?? false;
  const onboardingStatus = clinicProfile?.onboardingStatus ?? 'NOT_STARTED';
  const backendCurrentStep = clinicProfile?.currentStep ?? 0;

  const isAdminActingAsDoctor = isAdminUser ? (isDoctorOverride ?? true) : false;
  const isDoctorSetupFlow = isDoctorUser || isAdminActingAsDoctor;

  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(undefined, {
    skip: !isDoctorUser && !(isAdminUser && isAdminActingAsDoctor),
    // Reduce polling frequency - only refetch when truly necessary
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const [updateDoctor] = useUpdateDoctorMutation();
  const [updateOnboardingProgress] = useUpdateOnboardingProgressMutation();
  const [submitOnboarding, { isLoading: isSubmittingOnboarding }] = useSubmitOnboardingMutation();

  // ✅ ONLY loading and UI states (no persistence states)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isEditingAfterRejection, setIsEditingAfterRejection] = useState(false);
  const [showWaitingScreenAfterSubmit, setShowWaitingScreenAfterSubmit] = useState(false);

  // ✅ Helper function to update onboarding progress
  const updateProgress = useCallback(async (completedStepIndex: number) => {
    try {
      const nextStepIndex = completedStepIndex + 1;
      
      // ✅ FIXED: Skip onboarding progress API calls for doctor-only users
      // Doctors don't have clinic context, so backend APIs will fail
      if (isDoctorUser) {
        console.log('[Onboarding] Skipping progress update for doctor-only user');
        return;
      }
      
      // Only call API for admin users with clinic
      const clinicId = clinics?.clinic?.id;
      
      if (!clinicId) {
        console.log('[Onboarding] Skipping progress update - no clinic ID available');
        return;
      }
      
      await updateOnboardingProgress({
        currentStep: nextStepIndex,
        onboardingStatus: 'IN_PROGRESS',
      }).unwrap();
      // ✅ OPTIMIZED: Only refetch when necessary - RTK Query will auto-update cache
    } catch (err: any) {
      // ✅ Silently handle 404 errors
      if (err?.status === 404) {
        console.log('[Onboarding] Progress tracking not available:', err?.data?.message);
        return;
      }
      
      console.error("Failed to update onboarding progress:", err);
      addToast({
        title: "Progress Update Failed",
        description: err?.data?.message || "Failed to save progress. Please try again.",
        color: "danger",
      });
    }
  }, [updateOnboardingProgress, isDoctorUser, clinics?.clinic]);

  const steps = useMemo(() => {
    if (isDoctorUser) {
      return allSteps.filter((s) => {
        if (s.key === "clinic") return false;
        return true;
      });
    }
    if (isAdminActingAsDoctor) return allSteps;
    return allSteps.filter(
      (s) => s.key !== "services" && s.key !== "availability",
    );
  }, [isDoctorUser, isAdminActingAsDoctor]);

  // ✅ CASE 2: Show approval waiting screen
  const shouldShowApprovalWait = (approvalRequestSent || showWaitingScreenAfterSubmit) && !isStatusActive && !isEditingAfterRejection;

  // ✅ BACKEND-DRIVEN: Initialize activeStep from backend currentStep
  const [activeStep, setActiveStep] = useState<StepKey>(() => {
    const nextStepIndex = backendCurrentStep;
    if (nextStepIndex >= 0 && nextStepIndex < steps.length) {
      return steps[nextStepIndex].key;
    }
    return steps[0]?.key || "clinic";
  });

  useEffect(() => {
    if (steps.length > 0 && !steps.some((step) => step.key === activeStep)) {
      setActiveStep(steps[0].key);
    }
  }, [activeStep, steps]);

  // ✅ Sync activeStep with OnboardingContext for dynamic sidebar updates
  useEffect(() => {
    // If showing approval wait screen, set context to 'verification' for sidebar
    if (shouldShowApprovalWait) {
      setContextActiveStep('verification' as StepKey);
    } else {
      setContextActiveStep(activeStep);
    }
  }, [activeStep, shouldShowApprovalWait, setContextActiveStep]);

  // ✅ Sync with backend ONLY on initial load
  const hasInitialized = React.useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (backendCurrentStep >= 0 && backendCurrentStep < steps.length) {
      const expectedStep = steps[backendCurrentStep].key;
      if (!isEditingAfterRejection && activeStep !== expectedStep) {
        setActiveStep(expectedStep);
      }
    }
    hasInitialized.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // ✅ BACKEND-DRIVEN: Calculate completion based on API data AND currentStep
  const completion = useMemo(() => {
    const hasRequiredAdminProfile = Boolean(clinicProfile?.mobile);
    const hasRequiredDoctorProfile = Boolean(
      clinicProfile?.speciality || doctorData?.result?.doctorProfile?.speciality
    );

    let hasProfile = Boolean(clinics?.profile);
    if (isAdminUser) {
      hasProfile = hasRequiredAdminProfile && (!isDoctorSetupFlow || hasRequiredDoctorProfile);
    } else if (isDoctorSetupFlow) {
      hasProfile = hasRequiredDoctorProfile;
    }

    const hasClinic = Boolean(clinics?.clinic);
    const doctor = doctorData?.result;
    const hasServices = !isDoctorSetupFlow || Boolean(doctor?.services && doctor.services.length > 0);
    const doctorAvailability = getDoctorAvailabilityList(doctor);
    const hasAvailability = !isDoctorSetupFlow || Boolean(doctorAvailability && doctorAvailability.length > 0);
    const hasSubscription = approvalRequestSent || onboardingStatus === 'COMPLETED';

    // ✅ FIX: A step is only completed if the user has progressed PAST it
    // currentStep indicates the NEXT step to complete, so previous steps are done
    const getStepIndex = (key: StepKey) => steps.findIndex(s => s.key === key);
    const isStepCompleted = (key: StepKey) => {
      const stepIndex = getStepIndex(key);
      // Step is completed only if backend currentStep is greater than this step's index
      return stepIndex >= 0 && backendCurrentStep > stepIndex;
    };

    let completedCount = 0;
    const activeKeys = steps.map((s) => s.key);

    // Count completed steps based on backend currentStep, not just data existence
    if (activeKeys.includes("profile") && isStepCompleted("profile")) completedCount++;
    if (activeKeys.includes("clinic") && isStepCompleted("clinic")) completedCount++;
    if (activeKeys.includes("services") && isStepCompleted("services")) completedCount++;
    if (activeKeys.includes("availability") && isStepCompleted("availability")) completedCount++;
    if (activeKeys.includes("subscription") && isStepCompleted("subscription")) completedCount++;

    return {
      // Data existence checks (for enabling next steps)
      hasProfile,
      hasClinic,
      hasServices,
      hasAvailability,
      hasSubscription,
      // Completion status (for visual checkmarks) - based on currentStep
      isProfileCompleted: isStepCompleted("profile"),
      isClinicCompleted: isStepCompleted("clinic"),
      isServicesCompleted: isStepCompleted("services"),
      isAvailabilityCompleted: isStepCompleted("availability"),
      isSubscriptionCompleted: isStepCompleted("subscription"),
      completedCount,
      total: steps.length,
      percent: steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0,
    };
  }, [
    clinics,
    clinicProfile,
    doctorData,
    isAdminUser,
    isDoctorSetupFlow,
    steps,
    approvalRequestSent,
    onboardingStatus,
    backendCurrentStep,
  ]);

  // ✅ CASE 4: User is Active (Approved) - Redirect to real dashboard
  useEffect(() => {
    if (isStatusActive) {
      setIsRedirecting(true);
      const timer = setTimeout(() => {
        markClinicSetupComplete({ userId: user?.id, clinicId: clinics?.clinic?.id });
        if (onDashboardReady) onDashboardReady();
      }, 800);
      return () => {
        clearTimeout(timer);
        setIsRedirecting(false);
      };
    }
  }, [isStatusActive, user?.id, clinics?.clinic?.id, onDashboardReady]);

  // Debug logging
  React.useEffect(() => {
    console.log('[Onboarding] shouldShowApprovalWait:', shouldShowApprovalWait);
    console.log('[Onboarding] approvalRequestSent:', approvalRequestSent);
    console.log('[Onboarding] showWaitingScreenAfterSubmit:', showWaitingScreenAfterSubmit);
    console.log('[Onboarding] isStatusActive:', isStatusActive);
    console.log('[Onboarding] isEditingAfterRejection:', isEditingAfterRejection);
  }, [shouldShowApprovalWait, approvalRequestSent, showWaitingScreenAfterSubmit, isStatusActive, isEditingAfterRejection]);

  // Auto-refresh status while waiting for approval - REDUCED FREQUENCY
  useEffect(() => {
    if (!shouldShowApprovalWait) return;
    // ✅ OPTIMIZED: Reduced from 15s to 30s to minimize API calls
    const timer = window.setInterval(() => {
      void refetchClinics();
    }, 30000); // 30 seconds instead of 15
    return () => window.clearInterval(timer);
  }, [shouldShowApprovalWait, refetchClinics]);

  // Navigate to first incomplete step ONLY on initial mount
  const getFirstIncompleteStep = useCallback(() => {
    const completionByStep: Record<StepKey, boolean> = {
      clinic: completion.isClinicCompleted,
      profile: completion.isProfileCompleted,
      services: completion.isServicesCompleted,
      availability: completion.isAvailabilityCompleted,
      subscription: completion.isSubscriptionCompleted,
    };
    return steps.find((step) => !completionByStep[step.key])?.key;
  }, [completion, steps]);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (shouldShowApprovalWait) return;
    if (showWaitingScreenAfterSubmit) return; // Don't navigate away if showing verification
    if (!clinics) return;
    const firstIncomplete = getFirstIncompleteStep();
    if (firstIncomplete && steps.some((step) => step.key === activeStep)) {
      setActiveStep(firstIncomplete);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps



  const shouldWaitForDoctorData =
    !shouldShowApprovalWait &&
    (isDoctorUser || (isAdminUser && isAdminActingAsDoctor));
  const isInitialOnboardingLoading =
    isUserLoading ||
    isClinicsLoading ||
    (shouldWaitForDoctorData && isDoctorLoading);

  if (isInitialOnboardingLoading) {
    return (
      <OnboardingPageSkeleton
        variant={shouldShowApprovalWait ? "verification" : activeStep}
        stepCount={steps.length + 1}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full font-outfit">
      {/* ✅ Loading Overlay for Auto-Redirect */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <Spinner
              size="lg"
              color="primary"
              classNames={{
                circle1: "border-b-[#0A6C74]",
                circle2: "border-b-[#0A6C74]",
              }}
            />
            <div className="text-center space-y-1">
              <h3 className="text-[17px] font-semibold text-[#0F172A] font-outfit">
                Opening Your Dashboard
              </h3>
              <p className="text-[13px] text-[#64748B] font-outfit">
                Please wait a moment…
              </p>
            </div>
          </div>
        </div>
      )}

      <Confetti isActive={showConfetti} />

      {/* ── Page layout ── */}
      <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden sm:gap-5 lg:gap-6">


        {/* ── Dots stepper ── */}
        <div id="onboarding-stepper" className="shrink-0 overflow-x-auto hide-scrollbar">
          <AnimatedFormStepper
            completion={completion}
            activeStep={activeStep}
            onStepChange={(step) => {
              setActiveStep(step);
              setIsEditingAfterRejection(true);
            }}
            steps={steps}
            isApprovalWait={shouldShowApprovalWait}
          />
        </div>

        {/* ── Main content ── */}
        <div id="onboarding-form-content" className="flex min-h-0 flex-1 flex-col">
          {shouldShowApprovalWait ? (
            <ApprovalPendingPanel
              isChecking={isClinicsFetching}
              onCheckStatus={() => { void refetchClinics(); }}
              status={profileStatus}
              onUpdateProfile={() => {
                setIsEditingAfterRejection(true);
                setActiveStep("profile");
              }}
              isRequestingReview={isSubmittingOnboarding}
              onRequestReview={async () => {
                const userId = (user as any)?.id ?? (user as any)?.result?.id;
                if (!userId) {
                  addToast({
                    title: "Error",
                    description: "Unable to identify your account. Please try again.",
                    color: "danger",
                  });
                  return;
                }
                try {
                  await submitOnboarding().unwrap();
                  addToast({
                    title: "Re-review requested",
                    description: "Your application has been resubmitted for admin review.",
                    color: "success",
                  });
                  setIsEditingAfterRejection(false);
                  // ✅ OPTIMIZED: RTK Query auto-updates, no manual refetch needed
                } catch (err: any) {
                  addToast({
                    title: "Failed to request re-review",
                    description: err?.data?.message || "Something went wrong. Please try again.",
                    color: "danger",
                  });
                }
              }}
              onGoToDashboard={() => { if (onDashboardReady) onDashboardReady(); }}
            />
          ) : (
            <ClinicSetupPanels
              activeStep={activeStep}
              onStepChange={setActiveStep}
              completion={completion}
              steps={steps}
              onTypeChange={setIsDoctorOverride}
              isSubmitting={isSubmitting}
              onProfileComplete={async () => {
                if (isEditingAfterRejection) setIsEditingAfterRejection(false);
                const stepIndex = steps.findIndex(s => s.key === "profile");
                if (stepIndex !== -1) await updateProgress(stepIndex);
              }}
              onClinicComplete={async () => {
                if (isEditingAfterRejection) setIsEditingAfterRejection(false);
                const stepIndex = steps.findIndex(s => s.key === "clinic");
                if (stepIndex !== -1) await updateProgress(stepIndex);
              }}
              onServicesComplete={async () => {
                if (isEditingAfterRejection) setIsEditingAfterRejection(false);
                const stepIndex = steps.findIndex(s => s.key === "services");
                if (stepIndex !== -1) await updateProgress(stepIndex);
              }}
              onAvailabilityComplete={async () => {
                if (isEditingAfterRejection) {
                  setIsEditingAfterRejection(false);
                } else if (isDoctorUser && !steps.some((s) => s.key === "subscription")) {
                  setShowConfetti(true);
                }
                const stepIndex = steps.findIndex(s => s.key === "availability");
                if (stepIndex !== -1) await updateProgress(stepIndex);
              }}
              onSubscriptionComplete={async () => {
                setIsSubmitting(true);
                try {
                  if (
                    isDoctorSetupFlow &&
                    steps.some((step) => step.key === "availability")
                  ) {
                    // ✅ OPTIMIZED: Use cached doctor data instead of refetching
                    const doctorResult = doctorData?.result;
                    const doctorServices = doctorResult?.services;
                    const doctorAvailability = getDoctorAvailabilityList(doctorResult);

                    if (!doctorServices || doctorServices.length === 0) {
                      setActiveStep("services");
                      addToast({
                        title: "Save services first",
                        description: "Services & Pricing must be saved before opening the dashboard.",
                        color: "warning",
                      });
                      setIsSubmitting(false);
                      return false;
                    }

                    if (!doctorAvailability || doctorAvailability.length === 0) {
                      setActiveStep("availability");
                      addToast({
                        title: "Save availability first",
                        description: "Doctor availability must be saved before opening the dashboard.",
                        color: "warning",
                      });
                      setIsSubmitting(false);
                      return false;
                    }

                    const payload = buildDoctorAvailabilitySetupPayload(doctorResult);
                    const res = await updateDoctor(payload as any).unwrap();

                    if (!res?.success) {
                      addToast({
                        title: "Availability not saved",
                        description: res?.message || "Could not finalize doctor availability.",
                        color: "danger",
                      });
                      setActiveStep("availability");
                      setIsSubmitting(false);
                      return false;
                    }
                  }

                  // ✅ FIXED: Different flow for doctor-only users vs admin/clinic users
                  if (isDoctorUser) {
                    // Doctor-only flow: Skip all backend onboarding APIs
                    console.log('[Onboarding] Doctor-only user completing onboarding - skipping backend submission');
                    
                    // Store submission in session FIRST
                    if (user?.id) {
                      const sessionKey = `onboarding_submitted_${user.id}`;
                      sessionStorage.setItem(sessionKey, 'true');
                      console.log('[Onboarding] Stored submission in session:', sessionKey);
                    }

                    // Show the approval waiting screen BEFORE other UI updates
                    console.log('[Onboarding] Setting showWaitingScreenAfterSubmit to true');
                    setShowWaitingScreenAfterSubmit(true);
                    
                    // Then show visual feedback
                    addToast({
                      title: "Profile Submitted",
                      description: "Your profile has been submitted for review!",
                      color: "success",
                    });

                    setShowConfetti(true);
                    setIsSubmitting(false);
                    
                    console.log('[Onboarding] All states set, verification page should render');
                    
                    return true;
                  }

                  // Admin/Clinic owner flow: Use onboarding progress tracking
                  const clinicId = clinics?.clinic?.id;
                  
                  if (!clinicId) {
                    console.log('[Onboarding] No clinicId available for admin user');
                    addToast({
                      title: "Submission Error",
                      description: "Unable to submit - clinic information not found.",
                      color: "danger",
                    });
                    setIsSubmitting(false);
                    return false;
                  }

                  try {
                    const finalStepIndex = steps.length - 1;
                    await updateOnboardingProgress({
                      currentStep: finalStepIndex,
                      onboardingStatus: 'COMPLETED',
                    }).unwrap();
                  } catch (err: any) {
                    console.error("Failed to update onboarding progress:", err);
                    // Continue with submission even if progress update fails
                  }

                  try {
                    await submitOnboarding().unwrap();
                    addToast({
                      title: "Submitted Successfully",
                      description: "Your application has been submitted for review.",
                      color: "success",
                    });

                    setShowConfetti(true);

                    if (user?.id) {
                      const sessionKey = `onboarding_submitted_${user.id}`;
                      sessionStorage.setItem(sessionKey, 'true');
                    }

                    setShowWaitingScreenAfterSubmit(true);
                    // ✅ OPTIMIZED: RTK Query auto-updates from mutations, no manual refetch
                  } catch (err: any) {
                    console.error("Failed to submit approval:", err);
                    addToast({
                      title: "Submission Failed",
                      description: err?.data?.message || "Failed to submit approval request. Please try again.",
                      color: "danger",
                    });
                    setShowConfetti(false);
                    setIsSubmitting(false);
                    return false;
                  }

                  if (isStatusActive) {
                    markClinicSetupComplete({
                      userId: user?.id,
                      clinicId: clinics?.clinic?.id,
                    });
                    setShowCompletionPopup(true);
                  }

                  setIsSubmitting(false);
                  return true;
                } catch (error) {
                  console.error("Subscription complete error:", error);
                  setIsSubmitting(false);
                  return false;
                }
              }}
            />
          )}
        </div>
      </div>

     

      <CompletionPopup
        isOpen={showCompletionPopup}
        completedCount={completion.completedCount}
        total={completion.total}
        onClose={() => setShowCompletionPopup(false)}
        onViewDashboard={() => {
          setShowCompletionPopup(false);
          onDashboardReady?.();
        }}
        onViewProfile={() => {
          setShowCompletionPopup(false);
          onProfileReady?.();
        }}
      />

      <style>{`
        @keyframes wave {
          0%   { transform: rotate(0deg); }
          10%  { transform: rotate(14deg); }
          20%  { transform: rotate(-8deg); }
          30%  { transform: rotate(14deg); }
          40%  { transform: rotate(-4deg); }
          50%  { transform: rotate(10deg); }
          60%, 100% { transform: rotate(0deg); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default NoClinicDash;
