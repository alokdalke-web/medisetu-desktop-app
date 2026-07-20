import { useMemo, useRef, useState } from "react";
import { Button, Tooltip, addToast } from "@heroui/react";
import { useNavigate } from "react-router";
import { FiShield, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import SetupProgress from "../components/SetupProgress";
import SetupCard from "../components/SetupCard";
import { setupItems } from "../data/setupData";
import PageHeader from "../../../../components/common/PageHeader";
import { useGetAllClinicsQuery } from "../../../../redux/api/clinicApi";
import { useGetDoctorQuery } from "../../../../redux/api/doctorApi";
import { useGetUserQuery, useActivateFreeTrialMutation } from "../../../../redux/api/authApi";
import { useGetMySubscriptionQuery } from "../../../../redux/api/subscriptionApi";
import { getDoctorAvailabilityList, normalizeStatus } from "../../../../utils/clinicSetupStatus";
import FreeTrialSuccessModal from "../../../../components/subscription/FreeTrialSuccessModal";

const approvalLockedTooltip = (
  <div className="max-w-[230px] px-1 py-0.5">
    <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
      Wait for approval
    </p>
    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-300">
      Subscription actions unlock after your account is approved.
    </p>
  </div>
);

/* ─── Right-sidebar promo panel ─── */
function PromoSidebar({ 
  showFreeOffer, 
  onShowSuccessModal,
  isSubscriptionLocked = false,
}: { 
  showFreeOffer: boolean;
  onShowSuccessModal: (expiryDate?: string | null) => void;
  isSubscriptionLocked?: boolean;
}) {
  const BASE = import.meta.env.BASE_URL;
  const [activateFreeTrial, { isLoading: isActivating }] = useActivateFreeTrialMutation();
  const { refetch: refetchUser } = useGetUserQuery();
  const { refetch: refetchSubscription, data: mySubscription } = useGetMySubscriptionQuery();
  const hasActivatedRef = useRef(false);

  const handleActivateFreeTrial = async () => {
    // Prevent duplicate API calls
    if (isSubscriptionLocked || hasActivatedRef.current || isActivating) return;
    
    try {
      hasActivatedRef.current = true;
      await activateFreeTrial().unwrap();
      
      // Refetch data in background
      await Promise.all([refetchUser(), refetchSubscription()]);
      
      // Get expiry date and show success modal
      const expiryDate = mySubscription?.data?.subscription?.expiresAt;
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
          <Tooltip
            content={approvalLockedTooltip}
            isDisabled={!isSubscriptionLocked}
            showArrow
            placement="top"
            closeDelay={0}
          >
            <span className="block">
              <Button
                className="w-full h-12 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all font-outfit text-sm disabled:cursor-not-allowed disabled:opacity-55"
                onPress={handleActivateFreeTrial}
                isLoading={isActivating}
                isDisabled={isSubscriptionLocked || isActivating}
              >
                {isActivating ? "Activating..." : "Subscribe Free for 1 Month"}
              </Button>
            </span>
          </Tooltip>

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
  const userStatus = (clinics as any)?.profile?.userStatus ?? user?.userStatus;
  const isSubscriptionLocked = normalizeStatus(userStatus) === "pending";

  // Test modal state - accessible from main component
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalExpiryDate, setModalExpiryDate] = useState<string | undefined>(undefined);

  // Check if user is eligible for free trial offer
  const showFreeOffer = user?.noSubscriptionTakenTillNow === true;

  const handleShowSuccessModal = (expiryDate?: string | null) => {
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
        case 5: // Invite Doctors
          status = "pending"; // Can't determine from current APIs
          break;
        case 6: // Enable Payments
          status = user?.paymentVisible ? "completed" : "pending";
          break;
        case 7: // Invite Lab
        case 8: // Invite Pharmacy
          status = "skipped"; // Optional features
          break;
        case 9: // Profile Settings
          status = clinic?.clinicName && clinic?.clinicAddress ? "completed" : "pending";
          break;
        case 10: // Security & Access
          status = "pending"; // Can't determine from current APIs
          break;
      }

      return { ...item, status };
    });
  }, [clinics, doctorData, user]);

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
              <SetupCard key={item.id} item={item} />
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
                {mySubscription?.data?.hasActive && mySubscription.data.subscription?.expiresAt && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-3 py-0.5">
                    <FiCheckCircle size={10} className="text-green-600 dark:text-green-400" />
                    <span className="text-[11px] font-semibold text-green-700 dark:text-green-400 font-outfit">
                      Active until {new Date(mySubscription.data.subscription.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Tooltip
              content={approvalLockedTooltip}
              isDisabled={!isSubscriptionLocked}
              showArrow
              placement="top"
              closeDelay={0}
            >
              <span className="inline-flex shrink-0">
                <Button
                  className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[13px] font-outfit shadow-sm whitespace-nowrap flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-55"
                  onPress={() => navigate("/subscription")}
                  isDisabled={isSubscriptionLocked}
                >
                  {mySubscription?.data?.hasActive
                    ? "Manage Subscription"
                    : showFreeOffer
                      ? "Subscribe Free for 1 Month"
                      : "Choose Plans & Activate"}
                  <FiArrowRight size={14} />
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>

        {/* ── Right: promo sidebar ── */}
        <PromoSidebar 
          showFreeOffer={showFreeOffer} 
          onShowSuccessModal={handleShowSuccessModal}
          isSubscriptionLocked={isSubscriptionLocked}
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
