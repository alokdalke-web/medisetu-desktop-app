// src/pages/profile/ClinicDetails.tsx
import React from "react";
import { useNavigate } from "react-router";
import { useDisclosure } from "@heroui/react";
import { FiAlertTriangle } from "react-icons/fi";

import {
  useGetAllClinicsQuery,
  useGetClinicProfileOverviewQuery,
} from "../../redux/api/clinicApi";
import AddClinicModal from "./AddClinicModal";
import SubscriptionModal from "./SubscriptionModal";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import clinicuser from "../../../public/assets/icons/clinicuser.svg";
import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";

import ClinicDetailsSkeleton from "./clinic-details/ClinicDetailsSkeleton";
import ClinicHeroSection from "./clinic-details/ClinicHeroSection";
import ClinicQuickStats from "./clinic-details/ClinicQuickStats";
import ClinicContactSection from "./clinic-details/ClinicContactSection";
import ClinicAddressMapSection from "./clinic-details/ClinicAddressMapSection";
import ClinicDetailsSection from "./clinic-details/ClinicDetailsSection";
import ClinicWorkingHours from "./clinic-details/ClinicWorkingHours";
import ClinicServicesSection from "./clinic-details/ClinicServicesSection";
import ClinicDoctorsPreview from "./clinic-details/ClinicDoctorsPreview";
import ClinicFacilitiesSection from "./clinic-details/ClinicFacilitiesSection";
import ClinicInsuranceSection from "./clinic-details/ClinicInsuranceSection";
import ClinicGallerySection from "./clinic-details/ClinicGallerySection";
import ClinicReviewsSection from "./clinic-details/ClinicReviewsSection";
import ClinicSocialLinksSection from "./clinic-details/ClinicSocialLinksSection";

/* --------------- Main: ClinicDetails --------------- */
const ClinicDetails: React.FC = () => {
  const navigate = useNavigate();
  const effectiveUserType = useEffectiveUserType();
  const isPharmacistOrLabAssistant = effectiveUserType === "Pharmacist" || effectiveUserType === "Lab_Assistant";

  // Single source of truth for all page data — every section below receives
  // its slice via props, none of them call their own data-fetching hook.
  const {
    data: overview,
    isLoading,
    isError,
    refetch,
  } = useGetClinicProfileOverviewQuery();

  // `requireClinic` on the overview endpoint means a 4xx here is ambiguous
  // between "no clinic yet" and "a real fetch error" — kept this light,
  // already-cached v1 call (as the previous implementation did) purely to
  // gate the "no clinic" empty state / userType-based Add-Clinic action,
  // not to source any page content.
  const { data: clinics, refetch: refetchClinics } = useGetAllClinicsQuery();
  const profile = (clinics as any)?.profile;
  const clinicShow = profile?.userType === "Admin" || profile?.userType === "Super_Admin";
  const hasClinicFallback = !!((clinics as any)?.clinic?.id);

  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onOpenChange: onAddOpenChange,
  } = useDisclosure();

  const {
    isOpen: isSubsModalOpen,
    onOpen: onSubsModalOpen,
    onOpenChange: onSubsModalOpenChange,
  } = useDisclosure();

  const handleRetryAll = () => {
    refetch();
    refetchClinics();
  };

  const hasClinic = Boolean(overview?.clinic?.id) || hasClinicFallback;

  return (
    <>
      <ProfilePageHeader
        icon={<img src={clinicuser} alt="" className="w-4" />}
        title="Clinic Information"
        description="Your clinic's contact details, address and branding."
        actions={
          clinicShow && !overview ? (
            hasClinic ? undefined : (
              <button
                type="button"
                onClick={onAddOpen}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
              >
                + Add Clinic
              </button>
            )
          ) : undefined
        }
      />

      {isLoading ? (
        <ClinicDetailsSkeleton />
      ) : isError && !overview ? (
        hasClinic || !clinicShow ? (
          <div className="px-5 sm:px-6 py-10 flex flex-col items-center text-center gap-3">
            <FiAlertTriangle className="h-8 w-8 text-danger" />
            <p className="text-sm text-text-muted">
              Something went wrong while loading your clinic profile.
            </p>
            <button
              type="button"
              onClick={handleRetryAll}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-10 text-center text-sm text-text-muted">
            No clinic found yet. Use{" "}
            <button
              type="button"
              onClick={onAddOpen}
              className="font-medium text-primary hover:underline"
            >
              "Add Clinic"
            </button>{" "}
            to create one.
          </div>
        )
      ) : overview?.clinic ? (
        <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          {/* Header + stats span the full width so the page reads as a profile,
              with the detail sections in the two-column grid below. */}
          <ClinicHeroSection
            clinic={overview.clinic}
            admin={overview.admin}
            stats={overview.stats}
            subscription={overview.subscription}
            profileCompletion={overview.profileCompletion}
            onEdit={clinicShow ? () => navigate("/profile/clinic/edit") : undefined}
          />
          <ClinicQuickStats stats={overview.stats} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <ClinicContactSection contact={overview.contact} />
              <ClinicAddressMapSection clinic={overview.clinic} />
              {!isPharmacistOrLabAssistant && (
                <ClinicServicesSection services={overview.services} />
              )}
              {!isPharmacistOrLabAssistant && (
                <ClinicDoctorsPreview doctors={overview.doctorsPreview} />
              )}
              <ClinicFacilitiesSection facilities={overview.facilities} />
              <ClinicInsuranceSection insurance={overview.insurance} />
              <ClinicGallerySection gallery={overview.gallery} />
              <ClinicReviewsSection reviews={overview.reviews} />
              <ClinicSocialLinksSection socialLinks={overview.socialLinks} />
            </div>

            <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <ClinicDetailsSection clinic={overview.clinic} admin={overview.admin} />
              {!isPharmacistOrLabAssistant && (
                <ClinicWorkingHours workingHours={overview.workingHours} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 sm:px-6 py-10 text-center text-sm text-text-muted">
          No clinic found yet. Use{" "}
          <button
            type="button"
            onClick={onAddOpen}
            className="font-medium text-primary hover:underline"
          >
            "Add Clinic"
          </button>{" "}
          to create one.
        </div>
      )}

      <AddClinicModal
        isOpen={isAddOpen}
        onOpenChange={onAddOpenChange}
        onCreated={() => {
          refetch();
          refetchClinics();
        }}
        onSubsModalOpen={onSubsModalOpen}
      />

      <SubscriptionModal
        isOpen={isSubsModalOpen}
        onOpenChange={onSubsModalOpenChange}
      />
    </>
  );
};

export default ClinicDetails;
