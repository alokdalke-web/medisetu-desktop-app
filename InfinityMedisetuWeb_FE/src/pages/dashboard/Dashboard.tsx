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

  // ✅ Super Admin gets their own dashboard
  if (actualUserType === "Super_Admin") return <SuperAdminDash />;

  // ✅ Non-admin users get their specific dashboards
  if (actualUserType === "Receptionist") {
    return <ReceptionistDash />;
  }
  if (actualUserType === "Pharmacist") {
    return <Navigate to="/pharmacy/dashboard" replace />;
  }

  // ✅ Use effectiveUserType for dashboard selection (respects admin role switching)
  if (effectiveUserType === "Lab_Assistant") return <LabDash />;
  if (effectiveUserType === "Doctor") return <DoctorDash />;
  if (effectiveUserType === "Receptionist") return <ReceptionistDash />;
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
