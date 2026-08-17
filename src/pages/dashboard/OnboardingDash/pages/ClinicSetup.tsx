import { useEffect, useMemo, useRef, useState } from "react";
import { Button, addToast } from "@heroui/react";
import { useNavigate } from "react-router";
import { FiShield, FiArrowRight, FiAlertCircle } from "react-icons/fi";
import SetupProgress from "../components/SetupProgress";
import SetupCard from "../components/SetupCard";
import { setupItems } from "../data/setupData";
import PageHeader from "../../../../components/common/PageHeader";
import { useGetAllClinicsQuery } from "../../../../redux/api/clinicApi";
import { useGetDoctorQuery } from "../../../../redux/api/doctorApi";
import { useGetUserQuery, useActivateFreeTrialMutation } from "../../../../redux/api/authApi";
import { useGetMySubscriptionQuery } from "../../../../redux/api/subscriptionApi";
import { useGetLabsByClinicIdQuery } from "../../../../redux/api/labApi";
import { useGetPharmaciesQuery } from "../../../../redux/api/pharmacyApi";
import { useGetAllUsersQuery } from "../../../../redux/api/usersApi";
import { getDoctorAvailabilityList } from "../../../../utils/clinicSetupStatus";
import FreeTrialSuccessModal from "../../../../components/subscription/FreeTrialSuccessModal";

const freeTrialRequiredSetupIds = new Set([7, 8]);
const FREE_TRIAL_CTA_ID = "clinic-setup-free-trial-cta";

type FreeTrialPrompt = {
  title: string;
  description: string;
};

/* ─── Right-sidebar promo panel ─── */
function PromoSidebar({ 
  showFreeOffer, 
  onShowSuccessModal,
  freeTrialPrompt,
  isFreeTrialHighlighted = false,
}: { 
  showFreeOffer: boolean;
  onShowSuccessModal: (expiryDate?: string | null) => void;
  freeTrialPrompt?: FreeTrialPrompt | null;
  isFreeTrialHighlighted?: boolean;
}) {
  const BASE = import.meta.env.BASE_URL;
  const [activateFreeTrial, { isLoading: isActivating }] = useActivateFreeTrialMutation();
  const { refetch: refetchUser } = useGetUserQuery();
  const { refetch: refetchSubscription, data: mySubscription } = useGetMySubscriptionQuery();
  const { refetch: refetchClinics } = useGetAllClinicsQuery();
  const hasActivatedRef = useRef(false);

  const handleActivateFreeTrial = async () => {
    // Prevent duplicate API calls
    if (hasActivatedRef.current || isActivating) return;
    
    try {
      hasActivatedRef.current = true;
      await activateFreeTrial().unwrap();
      
      const [, subscriptionResult] = await Promise.all([
        refetchUser(),
        refetchSubscription(),
        refetchClinics(),
      ]);
      
      // Get expiry date and show success modal
      const expiryDate =
        subscriptionResult?.data?.data?.subscription?.expiresAt ??
        mySubscription?.data?.subscription?.expiresAt;
      onShowSuccessModal(expiryDate);
      
    } catch (error: any) {
      hasActivatedRef.current = false;
      // Show error toast
      const errorMessage = error?.data?.message || "Unable to activate free trial. Please try again.";
      addToast({
        title: "Error",
        description: errorMessage,
        color: "danger",
      });
      console.error("Free trial activation error:", error);
    }
  };

  // Only show the promo sidebar if the user is eligible for free offer
  if (!showFreeOffer) return null;

  const freeTrialButtonClassName = [
    "w-full h-12 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all font-outfit text-sm disabled:cursor-not-allowed disabled:opacity-55",
    isFreeTrialHighlighted
      ? "animate-pulse ring-4 ring-amber-300 ring-offset-2 ring-offset-white shadow-lg shadow-indigo-500/30 dark:ring-amber-400 dark:ring-offset-slate-800"
      : "",
  ].join(" ");

  return (
    <aside className="w-full lg:w-[280px] xl:w-[320px] shrink-0">
      {/* Single Card Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* ── Promotional Hero Section ── */}
        <div className="p-6 text-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
          {/* Gift Image with confetti */}
          <div className="flex justify-center">
            <img
              src={`${BASE}assets/images/gift.png`}
              alt="1 Month Free Gift"
              className="h-50 w-50 object-contain"
            />
          </div>

          {/* Heading */}
          <div className="space-y-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Special Welcome Offer!
            </p>
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-outfit">
              Get 1 Month Free
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">on all plans</p>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-outfit px-2">
            Kickstart your clinic with Infinity Medisetu and enjoy premium features.
          </p>

          {/* Features List */}
          <ul className="mt-6 space-y-3 text-left">
            {[
              "All Premium Features",
              "Unlimited Appointments",
              "Online Payments",
              "Patient App Access",
              "Priority Support",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 text-indigo-500 dark:text-indigo-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-outfit">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* ── How It Works Section ── */}
        <div className="p-6 space-y-6">
          <h4 className="font-bold text-slate-800 dark:text-white font-outfit text-base">
            How it works?
          </h4>

          <div className="space-y-5">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-slate-800 dark:text-white font-outfit mb-1">
                  1 Choose a plan
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit leading-relaxed">
                  Select the plan that suits your clinic.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-slate-800 dark:text-white font-outfit mb-1">
                  2 Get 1 month free
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit leading-relaxed">
                  We'll add 1 month free to your subscription.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-slate-800 dark:text-white font-outfit mb-1">
                  Start using
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit leading-relaxed">
                  Your subscription will be activated instantly.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div
            id={FREE_TRIAL_CTA_ID}
            className={`space-y-3 rounded-2xl transition-all duration-300 ${
              isFreeTrialHighlighted
                ? "bg-amber-50/70 p-2 ring-2 ring-amber-200 dark:bg-amber-900/10 dark:ring-amber-500/40"
                : ""
            }`}
          >
            {freeTrialPrompt && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left shadow-sm dark:border-amber-500/40 dark:bg-amber-900/20">
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                <div>
                  <p className="text-[12px] font-bold text-amber-800 dark:text-amber-100">
                    {freeTrialPrompt.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-amber-700 dark:text-amber-200">
                    {freeTrialPrompt.description}
                  </p>
                </div>
              </div>
            )}

            <Button
              className={freeTrialButtonClassName}
              onPress={handleActivateFreeTrial}
              isLoading={isActivating}
              isDisabled={isActivating}
            >
              {isActivating ? "Activating..." : "Subscribe Free for 1 Month"}
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">
            <span className="flex items-center gap-1">
              <FiShield className="w-3 h-3" />
              Secure
            </span>
            <span>•</span>
            <span>Simple</span>
            <span>•</span>
            <span>Instant Activation</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Main page ─── */
export default function ClinicSetup() {
  const navigate = useNavigate();

  // Fetch data to determine completion status
  const { data: user } = useGetUserQuery();
  const { data: clinics } = useGetAllClinicsQuery();
  const { data: doctorData } = useGetDoctorQuery(undefined, {
    skip: user?.userType !== "Doctor" && user?.userType !== "Admin",
  });
  const { data: mySubscription } = useGetMySubscriptionQuery();
  const clinicId = useMemo(() => {
    const data: any = clinics;

    return (
      data?.clinic?.id ||
      data?.clinic?._id ||
      data?.result?.clinic?.id ||
      data?.result?.clinic?._id ||
      ""
    ).toString();
  }, [clinics]);

  const { data: labsData } = useGetLabsByClinicIdQuery(clinicId, {
    skip: !clinicId,
  });
  const { data: pharmacyData } = useGetPharmaciesQuery({
    page: 1,
    pageSize: 50,
  });
  const { data: receptionistsData } = useGetAllUsersQuery({
    page: 1,
    pageSize: 1,
    userType: "Receptionist",
  });
  const { data: invitedDoctorsData } = useGetAllUsersQuery({
    page: 1,
    pageSize: 1,
    userType: "Doctor",
  });

  const labs = useMemo(
    () => (labsData ?? []).filter((lab: any) => lab?.deletedAt == null),
    [labsData],
  );
  const pharmacies = useMemo(
    () =>
      (pharmacyData?.pharmacies ?? []).filter(
        (pharmacy: any) =>
          pharmacy?.deletedAt == null && pharmacy?.isDeleted !== true,
      ),
    [pharmacyData],
  );
  const hasConfiguredLab = labs.length > 0;
  const hasConfiguredPharmacy = pharmacies.length > 0;
  const hasReceptionist =
    (receptionistsData?.pagination?.totalRecords ??
      receptionistsData?.users?.length ??
      0) > 0;
  const hasInvitedDoctor =
    (invitedDoctorsData?.pagination?.totalRecords ??
      invitedDoctorsData?.users?.length ??
      0) > 0;
  // Test modal state - accessible from main component
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalExpiryDate, setModalExpiryDate] = useState<string | undefined>(undefined);
  const [freeTrialPrompt, setFreeTrialPrompt] = useState<FreeTrialPrompt | null>(null);
  const [freeTrialPromptVersion, setFreeTrialPromptVersion] = useState(0);
  const [isFreeTrialHighlighted, setIsFreeTrialHighlighted] = useState(false);

  // Check if user is eligible for free trial offer
  const showFreeOffer = user?.noSubscriptionTakenTillNow === true;
  const shouldBlockPartnerInvites = user?.noSubscriptionTakenTillNow === true;

  useEffect(() => {
    if (freeTrialPromptVersion === 0) return;

    setIsFreeTrialHighlighted(true);
    const timeoutId = window.setTimeout(() => {
      setIsFreeTrialHighlighted(false);
    }, 6500);

    return () => window.clearTimeout(timeoutId);
  }, [freeTrialPromptVersion]);

  const getFreeTrialPromptForSetup = (item: { id: number; title: string }): FreeTrialPrompt => {
    if (item.id === 7) {
      return {
        title: "Activate subscription first",
        description:
          "Please take your subscription before inviting lab partners.",
      };
    }

    if (item.id === 8) {
      return {
        title: "Activate subscription first",
        description:
          "Please take your subscription before inviting pharmacy partners.",
      };
    }

    return {
      title: "Activate subscription first",
      description:
        `Please take your subscription before using ${item.title}.`,
    };
  };

  const showFreeTrialRequiredMessage = (item: { id: number; title: string }) => {
    setFreeTrialPrompt(getFreeTrialPromptForSetup(item));
    setFreeTrialPromptVersion((version) => version + 1);

    window.requestAnimationFrame(() => {
      document
        .getElementById(FREE_TRIAL_CTA_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleShowSuccessModal = (expiryDate?: string | null) => {
    setFreeTrialPrompt(null);
    setIsFreeTrialHighlighted(false);
    setModalExpiryDate(expiryDate || undefined);
    setShowSuccessModal(true);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    
    // Show a small success toast after modal closes
    setTimeout(() => {
      addToast({
        title: "Success",
        description: "Free Trial Activated Successfully!",
        color: "success",
      });
    }, 300);
  };

  // Calculate completion status for each setup item
  const enhancedSetupItems = useMemo(() => {
    const doctor = doctorData?.result;
    const clinic = clinics?.clinic;
    const profile = clinics?.profile;

    return setupItems.map((item) => {
      let status: "completed" | "pending" | "skipped" = item.status as any;
      let button = item.button;
      let path = item.path;

      switch (item.id) {
        case 1: // Add Yourself as Doctor
          status = profile?.speciality || doctor?.doctorProfile?.speciality ? "completed" : "pending";
          break;
        case 2: // Add First Service
          status = doctor?.services && doctor.services.length > 0 ? "completed" : "pending";
          break;
        case 3: { // Set Working Hours
          const availability = getDoctorAvailabilityList(doctor);
          status = availability && availability.length > 0 ? "completed" : "pending";
          break;
        }
        case 4: // Invite Receptionist
          status = hasReceptionist ? "completed" : "pending";
          path = hasReceptionist ? "/users?type=Receptionist" : item.path;
          break;
        case 5: // Invite Doctors
          status = hasInvitedDoctor ? "completed" : "pending";
          path = hasInvitedDoctor ? "/users?role=Doctor&type=Doctor" : item.path;
          break;
        case 6: // Enable Payments
          status = user?.paymentVisible ? "completed" : "pending";
          break;
        case 7: // Invite Lab
          status = hasConfiguredLab ? "completed" : "pending";
          button = hasConfiguredLab ? "Manage Lab" : "Start Setup";
          path = hasConfiguredLab
            ? "/users?type=Lab_Assistant&role=Lab_Assistant"
            : item.path;
          break;
        case 8: // Invite Pharmacy
          status = hasConfiguredPharmacy ? "completed" : "pending";
          button = hasConfiguredPharmacy ? "Manage Pharmacy" : "Start Setup";
          path = hasConfiguredPharmacy
            ? "/users?type=Pharmacist&role=Pharmacist"
            : item.path;
          break;
        case 9: // Profile Settings
          status = clinic?.clinicName && clinic?.clinicAddress ? "completed" : "pending";
          break;
        case 10: // Security & Access
          status = "pending"; // Can't determine from current APIs
          break;
      }

      return { ...item, status, button, path };
    });
  }, [
    clinics,
    doctorData,
    hasConfiguredLab,
    hasConfiguredPharmacy,
    hasInvitedDoctor,
    hasReceptionist,
    user,
  ]);

  // Calculate overall progress
  const progress = useMemo(() => {
    const completed = enhancedSetupItems.filter((item) => item.status === "completed").length;
    const total = enhancedSetupItems.filter((item) => item.status !== "skipped").length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, [enhancedSetupItems]);

  return (
    <div className=" bg-slate-50 dark:bg-[#111726] font-outfit min-h-screen">
      <PageHeader
        className="mb-4"
        title="Setup Center"
        description="Complete these steps to set up your clinic and start managing your practice smoothly."
      />

      {/* Test Buttons for Animations */}
      {/* <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              🧪 Test Animations
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-300">
              Test the new modern loading experience and success modal
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="h-10 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl text-sm"
              onPress={() => handleShowSuccessModal(mySubscription?.data?.subscription?.expiresAt)}
            >
              Test Modal
            </Button>
            <Button
              className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm"
              onPress={() => {
                setShowTestLoader(true);
                setTimeout(() => setShowTestLoader(false), 5000);
              }}
            >
              Test Loader (5s)
            </Button>
          </div>
        </div>
      </div> */}

      {/* Two-column layout: main + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
        {/* ── Left: main content ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Progress bar */}
          <SetupProgress 
            completed={progress.completed} 
            total={progress.total} 
            percentage={progress.percentage} 
          />

          {/* Setup cards grid */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {enhancedSetupItems.map((item) => (
              <SetupCard
                key={item.id}
                item={item}
                isActionBlocked={
                  shouldBlockPartnerInvites &&
                  freeTrialRequiredSetupIds.has(item.id)
                }
                onBlockedAction={() => showFreeTrialRequiredMessage(item)}
              />
            ))}
          </div>

          {/* Activate subscription banner */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Crown icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-2xl">
                👑
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#0F172A] dark:text-white font-outfit leading-tight">
                  {mySubscription?.data?.hasActive
                    ? "Your Subscription is Active"
                    : "Activate Your Subscription"}
                </h4>
                <p className="text-[12px] text-[#64748B] dark:text-slate-400 font-outfit mt-0.5">
                  {mySubscription?.data?.hasActive
                    ? `You're on the ${mySubscription.data.subscription?.planName || "Free"} plan`
                    : "Choose a plan to activate your clinic and start using all features."}
                </p>
                {!mySubscription?.data?.hasActive && showFreeOffer && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-0.5">
                    <span className="text-[10px]">🎁</span>
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 font-outfit">
                      You are getting 1 MONTH FREE on any plan!
                    </span>
                  </div>
                )}
  
              </div>
            </div>

            {mySubscription?.data?.hasActive ? (
              !user?.noSubscriptionTakenTillNow ? (
                <span className="text-[13px] font-semibold text-purple-600 dark:text-purple-400 font-outfit bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-xl border border-purple-100 dark:border-purple-800/30 text-center sm:text-right">
                  Once approved, your subscription will start from the same day.
                </span>
              ) : null
            ) : (
              <Button
                className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[13px] font-outfit shadow-sm whitespace-nowrap flex items-center gap-2"
                onPress={() => navigate("/subscription")}
              >
                {showFreeOffer
                  ? "Subscribe Free for 1 Month"
                  : "Choose Plans & Activate"}
                <FiArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* ── Right: promo sidebar ── */}
        <PromoSidebar 
          showFreeOffer={showFreeOffer} 
          onShowSuccessModal={handleShowSuccessModal}
          freeTrialPrompt={freeTrialPrompt}
          isFreeTrialHighlighted={isFreeTrialHighlighted}
        />
      </div>

      {/* Success Modal - Outside the PromoSidebar component */}
      <FreeTrialSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        expiryDate={modalExpiryDate}
      />
    </div>
  );
}
