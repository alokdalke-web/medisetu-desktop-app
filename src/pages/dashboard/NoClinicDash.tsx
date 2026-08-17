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

const getDoctorSubmissionKey = (userId?: string | null) =>
  userId ? `onboarding_submitted_${userId}` : null;

const hasStoredDoctorSubmission = (key: string | null) => {
  if (!key || typeof window === "undefined") return false;

  try {
    return (
      window.sessionStorage.getItem(key) === "true" ||
      window.localStorage.getItem(key) === "true"
    );
  } catch {
    return false;
  }
};

const storeDoctorSubmission = (key: string | null) => {
  if (!key || typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, "true");
    window.localStorage.setItem(key, "true");
  } catch {
    // The waiting screen still appears from React state when storage is unavailable.
  }
};

const NoClinicDash: React.FC<NoClinicDashProps> = ({
  onDashboardReady,
  onProfileReady,
}) => {
  // Get context to update sidebar
  const { setActiveStep: setContextActiveStep } = useOnboardingStep();
  
  const {
    data: user,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useGetUserQuery(undefined, {
    // ✅ OPTIMIZED: Prevent unnecessary refetches during onboarding
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const [activeStep, setActiveStep] = useState<StepKey>(
    () => allSteps[0]?.key || "clinic",
  );
  const [hasRestoredActiveStep, setHasRestoredActiveStep] = useState(false);
  const hasInitialized = React.useRef(false);
  const [isDoctorOverride, setIsDoctorOverride] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isEditingAfterRejection, setIsEditingAfterRejection] = useState(false);
  const [showWaitingScreenAfterSubmit, setShowWaitingScreenAfterSubmit] = useState(false);

  const userProfile = user as
    | (ApprovalProfile & {
        id?: string;
        userStatus?: string | null;
        userType?: string | null;
        profile?: ApprovalProfile & {
          id?: string;
          userStatus?: string | null;
          userType?: string | null;
        };
        result?: ApprovalProfile & {
          id?: string;
          userStatus?: string | null;
          userType?: string | null;
        };
      })
    | undefined;
  const resolvedUserType =
    userProfile?.userType ??
    userProfile?.profile?.userType ??
    userProfile?.result?.userType;
  const isAdminUser = resolvedUserType === "Admin";
  const isDoctorUser = resolvedUserType === "Doctor";
  const doctorSubmissionStorageKey = getDoctorSubmissionKey(
    userProfile?.id ?? userProfile?.profile?.id ?? userProfile?.result?.id ?? user?.id ?? null,
  );

  const shouldFetchClinics = Boolean(user) && isAdminUser;

  const {
    data: clinics,
    isLoading: isClinicsLoading,
    isFetching: isClinicsFetching,
    refetch: refetchClinics,
  } = useGetAllClinicsQuery(undefined, {
    skip: !shouldFetchClinics,
    // ✅ OPTIMIZED: Prevent unnecessary refetches during onboarding
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const clinicProfile = clinics?.profile as ApprovalProfile | undefined;

  // ✅ BACKEND-DRIVEN: Get all state from API only
  const profileStatus = clinicProfile?.userStatus ?? userProfile?.userStatus;
  const normalizedStatus = normalizeStatus(profileStatus);
  const isStatusActive = normalizedStatus === "active";

  // ✅ NEW: Use backend fields
  const approvalRequestSent =
    clinicProfile?.approvalRequestSent ?? userProfile?.approvalRequestSent ?? false;
  const onboardingStatus =
    clinicProfile?.onboardingStatus ?? userProfile?.onboardingStatus ?? 'NOT_STARTED';
  const backendCurrentStep =
    clinicProfile?.currentStep ?? userProfile?.currentStep ?? 0;
  const shouldShowApprovalWait =
    (approvalRequestSent || showWaitingScreenAfterSubmit) &&
    !isStatusActive &&
    !isEditingAfterRejection;

  useEffect(() => {
    if (!isDoctorUser || isStatusActive) return;

    if (hasStoredDoctorSubmission(doctorSubmissionStorageKey)) {
      setShowWaitingScreenAfterSubmit(true);
    }
  }, [doctorSubmissionStorageKey, isDoctorUser, isStatusActive]);

  const isAdminActingAsDoctor = isAdminUser ? (isDoctorOverride ?? true) : false;
  const isDoctorSetupFlow = isDoctorUser || isAdminActingAsDoctor;
  const shouldFetchDoctorData =
    !shouldShowApprovalWait &&
    (isDoctorUser ||
      ((isAdminUser && isAdminActingAsDoctor) &&
        (activeStep === "services" ||
          activeStep === "availability" ||
          activeStep === "subscription")));

  const {
    data: doctorData,
    isLoading: isDoctorLoading,
    refetch: refetchDoctor,
  } = useGetDoctorQuery(undefined, {
    skip: !shouldFetchDoctorData,
    // Reduce polling frequency - only refetch when truly necessary
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const doctorSetupState = useMemo(() => {
    const doctor = doctorData?.result;
    const doctorProfile = doctor?.doctorProfile as any;
    const registrationNumber =
      doctorProfile?.registrationNumber ||
      doctorProfile?.licenseNumber ||
      (userProfile as any)?.registrationNumber ||
      (userProfile as any)?.licenseNumber ||
      "";
    const speciality =
      doctorProfile?.speciality || (userProfile as any)?.speciality || "";
    const services = Array.isArray(doctor?.services) ? doctor.services : [];
    const availability = getDoctorAvailabilityList(doctor);

    return {
      hasProfile: Boolean(speciality && registrationNumber),
      hasServices: services.length > 0,
      hasAvailability: Boolean(availability && availability.length > 0),
      registrationNumber,
      speciality,
    };
  }, [doctorData, userProfile]);

  const [updateDoctor] = useUpdateDoctorMutation();
  const [updateOnboardingProgress] = useUpdateOnboardingProgressMutation();
  const [submitOnboarding, { isLoading: isSubmittingOnboarding }] = useSubmitOnboardingMutation();

  // ✅ ONLY loading and UI states (no persistence states)

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

  const shouldWaitForDoctorData =
    shouldFetchDoctorData;
  const isInitialOnboardingLoading =
    isUserLoading ||
    (shouldFetchClinics && isClinicsLoading) ||
    (shouldWaitForDoctorData && isDoctorLoading);

  const getBackendStep = useCallback((): StepKey => {
    if (isDoctorUser) {
      if (!doctorSetupState.hasProfile) return "profile";
      if (!doctorSetupState.hasServices) return "services";
      if (!doctorSetupState.hasAvailability) return "availability";
      return "subscription";
    }

    if (backendCurrentStep >= 0 && backendCurrentStep < steps.length) {
      return steps[backendCurrentStep].key;
    }
    return steps[0]?.key || "clinic";
  }, [
    backendCurrentStep,
    doctorSetupState.hasAvailability,
    doctorSetupState.hasProfile,
    doctorSetupState.hasServices,
    isDoctorUser,
    steps,
  ]);

  // ✅ BACKEND-DRIVEN: Restore active step after API data is available
  const activeStepStorageKey = user?.id
    ? `onboarding_active_step_${user.id}`
    : null;

  const setActiveStepAndPersist = useCallback(
    (step: StepKey) => {
      setActiveStep(step);

      if (!activeStepStorageKey || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(activeStepStorageKey, step);
      } catch {
        // Backend/current doctor data still restores progress when storage is unavailable.
      }
    },
    [activeStepStorageKey],
  );

  useEffect(() => {
    if (steps.length > 0 && !steps.some((step) => step.key === activeStep)) {
      setActiveStepAndPersist(getBackendStep());
    }
  }, [activeStep, getBackendStep, setActiveStepAndPersist, steps]);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (isInitialOnboardingLoading || shouldShowApprovalWait || steps.length === 0) {
      return;
    }

    const backendStep = getBackendStep();
    let restoredStep: StepKey | null = null;
    if (activeStepStorageKey && typeof window !== "undefined") {
      try {
        const storedStep = window.localStorage.getItem(activeStepStorageKey);
        if (steps.some((step) => step.key === storedStep)) {
          const typedStoredStep = storedStep as StepKey;

          if (isDoctorUser) {
            const storedIndex = steps.findIndex(
              (step) => step.key === typedStoredStep,
            );
            const backendIndex = steps.findIndex(
              (step) => step.key === backendStep,
            );
            restoredStep =
              storedIndex <= backendIndex ? typedStoredStep : backendStep;
          } else {
            restoredStep = typedStoredStep;
          }
        }
      } catch {
        restoredStep = null;
      }
    }

    setActiveStepAndPersist(restoredStep ?? backendStep);
    hasInitialized.current = true;
    setHasRestoredActiveStep(true);
  }, [
    activeStepStorageKey,
    getBackendStep,
    isInitialOnboardingLoading,
    isDoctorUser,
    setActiveStepAndPersist,
    shouldShowApprovalWait,
    steps,
  ]);

  useEffect(() => {
    if (!hasInitialized.current || !activeStepStorageKey) return;
    if (!steps.some((step) => step.key === activeStep)) return;

    try {
      window.localStorage.setItem(activeStepStorageKey, activeStep);
    } catch {
      // Ignore storage failures; backend currentStep still restores progress.
    }
  }, [activeStep, activeStepStorageKey, steps]);

  const refreshOnboardingData = useCallback(async () => {
    const refreshTasks: PromiseLike<unknown>[] = [refetchUser()];
    if (shouldFetchClinics) {
      refreshTasks.push(refetchClinics());
    }
    if (shouldWaitForDoctorData) {
      refreshTasks.push(refetchDoctor());
    }

    await Promise.allSettled(refreshTasks);
  }, [
    refetchClinics,
    refetchUser,
    refetchDoctor,
    shouldFetchClinics,
    shouldWaitForDoctorData,
  ]);

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
    const doctorRegistrationNumber =
      (clinicProfile as any)?.registrationNumber ||
      (clinicProfile as any)?.licenseNumber ||
      doctorSetupState.registrationNumber;
    const doctorSpeciality =
      clinicProfile?.speciality || doctorSetupState.speciality;
    const hasRequiredDoctorProfile = Boolean(
      doctorSpeciality && doctorRegistrationNumber,
    );

    let hasProfile = Boolean(clinics?.profile);
    if (isAdminUser) {
      hasProfile = hasRequiredAdminProfile && (!isDoctorSetupFlow || hasRequiredDoctorProfile);
    } else if (isDoctorSetupFlow) {
      hasProfile = hasRequiredDoctorProfile;
    }

    const hasClinic = Boolean(clinics?.clinic);
    const hasServices = !isDoctorSetupFlow || doctorSetupState.hasServices;
    const hasAvailability = !isDoctorSetupFlow || doctorSetupState.hasAvailability;
    const hasSubscription =
      approvalRequestSent ||
      showWaitingScreenAfterSubmit ||
      onboardingStatus === 'COMPLETED';

    // ✅ FIX: A step is only completed if the user has progressed PAST it
    // currentStep indicates the NEXT step to complete, so previous steps are done
    const getStepIndex = (key: StepKey) => steps.findIndex(s => s.key === key);
    const isStepCompleted = (key: StepKey) => {
      if (isDoctorUser) {
        switch (key) {
          case "profile":
            return doctorSetupState.hasProfile;
          case "services":
            return doctorSetupState.hasServices;
          case "availability":
            return doctorSetupState.hasAvailability;
          case "subscription":
            return hasSubscription;
          default:
            return false;
        }
      }

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
    doctorSetupState,
    isAdminUser,
    isDoctorSetupFlow,
    isDoctorUser,
    steps,
    approvalRequestSent,
    showWaitingScreenAfterSubmit,
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

  if (
    isInitialOnboardingLoading ||
    (!hasRestoredActiveStep && !shouldShowApprovalWait)
  ) {
    return (
      <OnboardingPageSkeleton
        variant={shouldShowApprovalWait ? "verification" : activeStep}
        stepCount={steps.length + 1}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden font-outfit">
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
      <div className="flex min-h-0 w-full flex-col gap-3 overflow-hidden sm:gap-4 lg:gap-5">


        {/* ── Dots stepper ── */}
        <div
          id="onboarding-stepper"
          className="relative z-30 -mx-3 shrink-0 overflow-x-auto  bg-white px-3 py-1 hide-scrollbar dark:border-slate-800 dark:bg-[#111726] sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 2xl:-mx-8 2xl:px-8"
        >
          <AnimatedFormStepper
            completion={completion}
            activeStep={activeStep}
            onStepChange={(step) => {
              setActiveStepAndPersist(step);
              setIsEditingAfterRejection(true);
            }}
            steps={steps}
            isApprovalWait={shouldShowApprovalWait}
          />
        </div>

        {/* ── Main content ── */}
        <div
          id="onboarding-form-content"
          className="relative min-h-0 flex flex-1 flex-col overflow-hidden overscroll-contain dark:border-slate-800"
        >
          {shouldShowApprovalWait ? (
            <ApprovalPendingPanel
              isChecking={isClinicsFetching}
              onCheckStatus={() => { void refetchClinics(); }}
              status={profileStatus}
              onUpdateProfile={() => {
                setIsEditingAfterRejection(true);
                setActiveStepAndPersist("profile");
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
              onGoToDashboard={
                !onDashboardReady
                  ? undefined
                  : () => { onDashboardReady(); }
              }
            />
          ) : (
            <ClinicSetupPanels
              activeStep={activeStep}
              onStepChange={setActiveStepAndPersist}
              completion={completion}
              steps={steps}
              shouldLoadClinicData={shouldFetchClinics}
              onTypeChange={setIsDoctorOverride}
              onDataRefresh={refreshOnboardingData}
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
                      setActiveStepAndPersist("services");
                      addToast({
                        title: "Save services first",
                        description: "Services & Pricing must be saved before opening the dashboard.",
                        color: "warning",
                      });
                      setIsSubmitting(false);
                      return false;
                    }

                    if (!doctorAvailability || doctorAvailability.length === 0) {
                      setActiveStepAndPersist("availability");
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
                      setActiveStepAndPersist("availability");
                      setIsSubmitting(false);
                      return false;
                    }
                  }

                  // ✅ FIXED: Different flow for doctor-only users vs admin/clinic users
                  if (isDoctorUser) {
                    // Doctor-only flow: Skip all backend onboarding APIs
                    console.log('[Onboarding] Doctor-only user completing onboarding - skipping backend submission');
                    
                    storeDoctorSubmission(doctorSubmissionStorageKey);

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

                    storeDoctorSubmission(doctorSubmissionStorageKey);

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
        .onboarding-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #b7c7d7 transparent;
        }
        .onboarding-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .onboarding-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .onboarding-scrollbar::-webkit-scrollbar-thumb {
          background: #b7c7d7;
          border: 2px solid transparent;
          border-radius: 999px;
          background-clip: content-box;
        }
        .onboarding-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #8da1b6;
          background-clip: content-box;
        }
      `}</style>
    </div>
  );
};

export default NoClinicDash;
