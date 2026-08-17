import React from "react";
import { FiGlobe } from "react-icons/fi";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import OnlineBookingSettingsCard from "../../components/appointment/OnlineBookingSettingsCard";
import DoctorOnlineBookingCard from "../../components/appointment/DoctorOnlineBookingCard";
import ManageDoctorsOnlineBookingCard from "../../components/appointment/ManageDoctorsOnlineBookingCard";
import RazorpayOnboardingCard from "../../components/appointment/razorpay-onboarding/RazorpayOnboardingCard";
import { useGetUserQuery } from "../../redux/api/authApi";

const OnlineBookingSettings: React.FC = () => {
  const { data: user } = useGetUserQuery();

  const userTypeKey =
    typeof (user as any)?.userType === "string"
      ? (user as any).userType.trim().toLowerCase()
      : undefined;
  const isAdmin = userTypeKey === "admin";
  const isAdminDoctorAccess = !!(user as any)?.isAdminDoctorAccess;
  const isDoctor = userTypeKey === "doctor" || (isAdmin && isAdminDoctorAccess);
  const userId = (user as any)?.id as string | undefined;

  return (
    <div className="space-y-0">
      <ProfilePageHeader
        icon={<FiGlobe className="h-4 w-4" />}
        title="Online Booking"
        description="Configure whether patients can book appointments with your clinic online."
      />

      <div className="px-5 sm:px-6 py-5 space-y-4">
        {isAdmin && <OnlineBookingSettingsCard />}
        {isAdmin && <RazorpayOnboardingCard />}
        {isDoctor && userId && <DoctorOnlineBookingCard doctorId={userId} />}
        {isAdmin && <ManageDoctorsOnlineBookingCard />}
      </div>
    </div>
  );
};

export default OnlineBookingSettings;
