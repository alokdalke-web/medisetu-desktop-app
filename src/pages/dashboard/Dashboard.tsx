import { Spinner } from "@heroui/react";
import { type FC } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router";
import { FiWifiOff } from "react-icons/fi";

import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { useConnectivityState } from "../../hooks/useConnectivityState";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import type { RootState } from "../../redux/store";
import { normalizeStatus } from "../../utils/clinicSetupStatus";

import AdminDash from "./adminDash/AdminDash";
import DoctorDash from "./doctorDash/DoctorDash";
import DoctorDashboardPending from "./doctorDash/DoctorDashboardPending";
import LabDash from "./LabDash";
import ReceptionistDash from "./receptionistDash/ReceptionistDash";
import SuperAdminDash from "./SuperAdminDash";
import ReceptionistDashboardPending from "./receptionistDash/ReceptionistDashboardPending";

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

  if (isOffline) {
    return (
      <div className="w-full min-w-0 pb-4 sm:pb-6 antialiased dark:bg-[#0b1321] min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1a2535] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm max-w-md text-center">
          <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
            <FiWifiOff className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard Unavailable Offline</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are currently disconnected from the network. The Dashboard relies on live analytics from the cloud and cannot be displayed offline. Please restore your connection to view your metrics.
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // ✅ BACKEND-DRIVEN: Redirect based on approvalRequestSent from API
  const userStatus = user?.userStatus;
  const normalizedUserStatus = normalizeStatus(userStatus);
  const normalizedClinicStatus = normalizeStatus(clinicsData?.profile?.userStatus);

  // An "active" user must NEVER be redirected to clinic-setup — prevents the
  // dashboard ↔ clinic-setup infinite redirect loop where NoClinicDash fires
  // onDashboardReady() (because isStatusActive=true) while Dashboard keeps
  // sending the user back because approvalRequestSent is stale/false.
  const isUserActive =
    normalizedUserStatus === "active" || normalizedClinicStatus === "active";
  const isPending =
    normalizedUserStatus === "pending" || normalizedClinicStatus === "pending";
  const approvalRequestSent =
    (clinicsData?.profile as any)?.approvalRequestSent ??
    (user as any)?.approvalRequestSent ??
    false;

  if (!isUserActive && (isAdmin || isDoctor) && clinicsData?.profile) {
    const isActiveUser = normalizeStatus(clinicsData.profile.userStatus) === "active";
    
    // ✅ CASE 1: If approval NOT requested AND not active, redirect to onboarding
    // Don't redirect if user is already active (prevents loop)
    if (!approvalRequestSent && !isActiveUser && !isPending) {
      return <Navigate to="/clinic-setup" replace />;
    }

    // CASE 2 & 3: Approval requested but not yet active → AdminDash/DoctorDash
    // show a limited view internally (no redirect needed here)
  }

  // FALLBACK: clinicsData not yet loaded and user is clearly new/pending → onboarding
  // Guard: skip this if userStatus is active to avoid a stale-data loop
  if (!isUserActive && isAdmin && !clinicsData && (normalizedUserStatus === 'new' || normalizedUserStatus === 'pending')) {
    return <Navigate to="/clinic-setup" replace />;
  }

  if (!isUserActive && isDoctor && !clinicsData && normalizedUserStatus === 'new') {
    return <Navigate to="/clinic-setup" replace />;
  }

  // ✅ Super Admin gets their own dashboard
  if (actualUserType === "Super_Admin") return <SuperAdminDash />;

  // ✅ Non-admin users get their specific dashboards
  if (actualUserType === "Doctor") {
    if (isPending) {
      return <DoctorDashboardPending />;
    }
    return <DoctorDash />;
  }
  if (actualUserType === "Receptionist") {
    if (isPending) {
      return <ReceptionistDashboardPending />;
    }
    return <ReceptionistDash />;
  }
  if (actualUserType === "Pharmacist") {
    return <Navigate to="/pharmacy/dashboard" replace />;
  }

  // ✅ Use effectiveUserType for dashboard selection (respects admin role switching)
  if (effectiveUserType === "Lab_Assistant") return <LabDash />;
  if (effectiveUserType === "Doctor") return <DoctorDash />;
  if (effectiveUserType === "Receptionist") {
    if (isPending) {
      return <ReceptionistDashboardPending />;
    }
    return <ReceptionistDash />;
  }
  if (effectiveUserType === "Pharmacist") {
    return <Navigate to="/pharmacy/dashboard" replace />;
  }

  // ✅ Admin (no role switch active) gets AdminDash
  if (isAdmin) {
    const hasAdminDoctorAccess = !!user?.isAdminDoctorAccess;
    return (
      <AdminDash
        showDoctorStats={hasAdminDoctorAccess}
        showRevenue={showRevenueCard}
      />
    );
  }

  return null;
};

export default Dashboard;
