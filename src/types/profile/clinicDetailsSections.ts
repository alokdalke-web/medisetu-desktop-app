// Prop shapes for the presentational sections under
// src/pages/profile/clinic-details/, each consuming a slice of
// ClinicProfileOverview (fetched once in ClinicDetails.tsx).

import type {
  ClinicProfileOverview,
  ClinicProfileOverviewClinic,
  ClinicProfileOverviewAdmin,
  ClinicProfileOverviewContact,
  ClinicProfileOverviewStats,
  ClinicProfileOverviewSubscription,
  ClinicProfileOverviewWorkingHours,
  ClinicProfileOverviewService,
  ClinicProfileOverviewDoctorPreview,
  ClinicProfileOverviewReviews,
} from "../clinicProfileOverview";

export type ClinicHeroSectionProps = {
  clinic: ClinicProfileOverviewClinic;
  admin: ClinicProfileOverviewAdmin | null | undefined;
  stats: ClinicProfileOverviewStats;
  subscription: ClinicProfileOverviewSubscription | null | undefined;
  profileCompletion: number;
  onEdit?: () => void;
};

export type ClinicQuickStatsProps = {
  stats: ClinicProfileOverviewStats;
};

export type ClinicContactSectionProps = {
  contact: ClinicProfileOverviewContact | null | undefined;
};

export type ClinicAddressMapSectionProps = {
  clinic: ClinicProfileOverviewClinic;
};

export type ClinicWorkingHoursProps = {
  workingHours: ClinicProfileOverviewWorkingHours | null | undefined;
};

export type ClinicServicesSectionProps = {
  services: ClinicProfileOverviewService[] | null | undefined;
};

export type ClinicDoctorsPreviewProps = {
  doctors: ClinicProfileOverviewDoctorPreview[] | null | undefined;
};

export type ClinicFacilitiesSectionProps = {
  facilities: string[] | null | undefined;
};

export type ClinicInsuranceSectionProps = {
  insurance: string[] | null | undefined;
};

export type ClinicGallerySectionProps = {
  gallery: string[] | null | undefined;
};

export type ClinicReviewsSectionProps = {
  reviews: ClinicProfileOverviewReviews | null | undefined;
};

export type ClinicSocialLinksSectionProps = {
  socialLinks: Record<string, string> | null | undefined;
};

export type ClinicDetailsSectionProps = {
  clinic: ClinicProfileOverviewClinic;
  admin: ClinicProfileOverviewAdmin | null | undefined;
};

export type ClinicProfileOverviewData = ClinicProfileOverview;
