import { Spinner } from "@heroui/react";
import { type FC } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router";

import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import type { RootState } from "../../redux/store";
import { normalizeStatus } from "../../utils/clinicSetupStatus";

import AdminDash from "./AdminDash";
import DoctorDash from "./DoctorDash";
import LabDash from "./LabDash";
import ReceptionistDash from "./ReceptionistDash";
import SuperAdminDash from "./SuperAdminDash";
import { useConnectivityState } from "../../hooks/useConnectivityState";
import { FiWifiOff } from "react-icons/fi";

const pickUser = (data: any) => data?.user ?? data;

const Dashboard: FC = () => {
  const authUser = useSelector((s: RootState) => s.auth.user);

  const { data: userData, isLoading: isUserLoading } = useGetUserQuery();
  const apiUser = pickUser(userData);

  const user = apiUser ?? authUser;

  // Determine whether we should show revenue metrics for this user
  const showRevenueCard = user?.paymentVisible !== false;

  // ✅ Get actual user type for admin check
  const actualUserType = user?.userType;
  const isAdmin = actualUserType === "Admin";
  const isDoctor = actualUserType === "Doctor";

  // ✅ Use effective user type for dashboard rendering (respects role switching)
  const effectiveUserType = useEffectiveUserType();
  const connectionState = useConnectivityState();
  const isOffline = connectionState !== 'online';

  const { data: clinicsData, isLoading: isClinicsLoading } = useGetAllClinicsQuery(undefined, {
    skip: !isAdmin && !isDoctor,
  });

  const isLoading = isUserLoading || ((isAdmin || isDoctor) && isClinicsLoading);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner label="Loading dashboard..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // ✅ BACKEND-DRIVEN: Redirect based on approvalRequestSent from API
  const userStatus = user?.userStatus;
  const normalizedUserStatus = normalizeStatus(userStatus);

  // An "active" user must NEVER be redirected to clinic-setup — prevents the
  // dashboard ↔ clinic-setup infinite redirect loop where NoClinicDash fires
  // onDashboardReady() (because isStatusActive=true) while Dashboard keeps
  // sending the user back because approvalRequestSent is stale/false.
  const isUserActive = normalizedUserStatus === "active";

  if (!isUserActive && (isAdmin || isDoctor) && clinicsData?.profile) {
    const approvalRequestSent = clinicsData.profile.approvalRequestSent ?? false;
    const isActiveUser = normalizeStatus(clinicsData.profile.userStatus) === "active";
    
    // ✅ CASE 1: If approval NOT requested AND not active, redirect to onboarding
    // Don't redirect if user is already active (prevents loop)
    if (!approvalRequestSent && !isActiveUser) {
      return <Navigate to="/clinic-setup" replace />;
    }

    // CASE 2 & 3: Approval requested but not yet active → AdminDash/DoctorDash
    // show a limited view internally (no redirect needed here)
  }

  // FALLBACK: clinicsData not yet loaded and user is clearly new/pending → onboarding
  // Guard: skip this if userStatus is active to avoid a stale-data loop
  if (!isUserActive && (isAdmin || isDoctor) && !clinicsData && (normalizedUserStatus === 'new' || normalizedUserStatus === 'pending')) {
    return <Navigate to="/clinic-setup" replace />;
  }

  const renderDashboard = (Component: JSX.Element) => {
    const isDisableTarget = actualUserType === 'Admin' || actualUserType === 'Doctor' || actualUserType === 'Receptionist';
    
    if (isOffline && isDisableTarget) {
      return (
        <div className="relative w-full h-full min-h-screen overflow-hidden bg-slate-50/50 dark:bg-[#0b1321]">
          {/* Blur the actual dashboard in the background directly */}
          <div className="pointer-events-none select-none h-full w-full blur-[4px] opacity-60 dark:opacity-40 transition-all duration-300 scale-[0.98]">
             {Component}
          </div>
          {/* Centered Offline Card */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-[340px] rounded-2xl border border-red-200 bg-red-50/95 px-6 py-8 text-center shadow-[0_20px_60px_rgba(239,68,68,0.15)] backdrop-blur-xl dark:border-red-900/40 dark:bg-red-950/90">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 shadow-sm">
                <FiWifiOff className="h-7 w-7 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-[18px] font-bold text-red-950 dark:text-red-50 mb-2">
                Dashboard Unavailable
              </h2>
              <p className="text-[13px] font-medium leading-5 text-red-900/80 dark:text-red-200/80">
                Analytical insights and dashboard overviews require an active connection. You can still manage patients and appointments from the sidebar.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return Component;
  };

  // ✅ Super Admin gets their own dashboard
  if (actualUserType === "Super_Admin") return <SuperAdminDash />;

  // ✅ Non-admin users get their specific dashboards
  if (actualUserType === "Receptionist") {
    return renderDashboard(<ReceptionistDash />);
  }
  if (actualUserType === "Pharmacist") {
    return <Navigate to="/pharmacy/dashboard" replace />;
  }

  // ✅ Use effectiveUserType for dashboard selection (respects admin role switching)
  if (effectiveUserType === "Lab_Assistant") return renderDashboard(<LabDash />);
  if (effectiveUserType === "Doctor") return renderDashboard(<DoctorDash />);
  if (effectiveUserType === "Receptionist") return renderDashboard(<ReceptionistDash />);
  if (effectiveUserType === "Pharmacist") {
    return <Navigate to="/pharmacy/dashboard" replace />;
  }

  // ✅ Admin (no role switch active) gets AdminDash
  if (isAdmin) {
    const hasAdminDoctorAccess = !!user?.isAdminDoctorAccess;
    return renderDashboard(
      <AdminDash
        showDoctorStats={hasAdminDoctorAccess}
        showRevenue={showRevenueCard}
      />
    );
  }

  return null;
};

export default Dashboard;
