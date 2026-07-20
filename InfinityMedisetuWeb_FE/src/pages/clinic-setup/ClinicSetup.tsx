import React from "react";
import { useNavigate } from "react-router";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { normalizeStatus } from "../../utils/clinicSetupStatus";
import NoClinicDash from "../dashboard/NoClinicDash";
import NewClinicSetup from "../dashboard/OnboardingDash/pages/ClinicSetup";

const ClinicSetup = () => {
  const navigate = useNavigate();
  const { data: user } = useGetUserQuery();
  const { data: clinics } = useGetAllClinicsQuery(undefined, {
    skip: user?.userType !== "Admin" && user?.userType !== "Doctor",
  });

  const clinicProfile = clinics?.profile as any;
  const userStatus = clinicProfile?.userStatus ?? user?.userStatus;
  const normalizedStatus = normalizeStatus(userStatus);
  
  // ✅ BACKEND-DRIVEN: Use approvalRequestSent from API
  const approvalRequestSent = clinicProfile?.approvalRequestSent ?? false;

  // ✅ If user is already active, redirect to dashboard immediately (no need for setup)
  React.useEffect(() => {
    if (normalizedStatus === "active") {
      navigate("/dashboard", { replace: true });
    }
  }, [normalizedStatus, navigate]);

  // ✅ Check if user has already seen the waiting screen in this session
  const [hasSeenWaitingScreen, setHasSeenWaitingScreen] = React.useState(() => {
    if (approvalRequestSent && user?.id) {
      const sessionKey = `onboarding_submitted_${user.id}`;
      return sessionStorage.getItem(sessionKey) === 'true';
    }
    return false;
  });

  // Handle navigation from waiting screen to dashboard
  const handleDashboardNavigation = React.useCallback(() => {
    // Mark as seen
    if (user?.id) {
      const sessionKey = `onboarding_submitted_${user.id}`;
      sessionStorage.setItem(sessionKey, 'true');
      setHasSeenWaitingScreen(true);
    }
    navigate("/dashboard", { replace: true });
  }, [navigate, user?.id]);

  // ✅ CASE 1: Already submitted but not yet navigated away from waiting screen
  // This only happens if the user refreshes while on the waiting screen before clicking "Go to Dashboard"
  if (approvalRequestSent && !hasSeenWaitingScreen && normalizedStatus !== "active") {
    return (
      <NoClinicDash 
        onDashboardReady={handleDashboardNavigation}
        onProfileReady={() => {
          navigate("/profile", { replace: true });
        }}
      />
    );
  }

  // ✅ CASE 2: Already submitted and user has seen/clicked "Go to Dashboard" - show Clinic Setup Dashboard
  if (approvalRequestSent && normalizedStatus !== "active") {
    return <NewClinicSetup />;
  }

  // ✅ CASE 3: Show onboarding forms for users who haven't submitted approval
  return (
    <NoClinicDash 
      onDashboardReady={() => {
        navigate("/dashboard", { replace: true });
      }}
      onProfileReady={() => {
        navigate("/profile", { replace: true });
      }}
    />
  );
};

export default ClinicSetup;
