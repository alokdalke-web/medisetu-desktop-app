// src/types/clinicProfileOverview.ts
// Types for the clinic profile aggregation endpoints (backend API v2): GET /clinic/profile-overview, PUT /clinic/profile.

export interface ClinicProfileOverviewClinic {
  id: string;
  name: string;
  logo: string | null;
  tagline: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  registrationNumber: string | null;
  onboardingStatus?: string;
}

export interface ClinicProfileOverviewAdmin {
  name: string | null;
  speciality: string | null;
  qualification: string | null;
  yearsOfExperience: number | null;
}

export interface ClinicProfileOverviewSubscription {
  active: boolean;
  expiresAt: string;
  planName: string;
  price: number;
  slug: string;
}

export interface ClinicProfileOverviewStats {
  rating: number | null;
  reviewCount: number;
  doctorCount: number;
  departmentCount: number;
  yearsOfExperience: number | null;
  isOpenNow: boolean;
}

export interface ClinicProfileOverviewContact {
  phone: string | null;
  emergencyNumber?: string | null;
  whatsapp: string | null;
  email: string | null;
  website?: string | null;
}

export interface ClinicHourInterval {
  startTime: string;
  endTime: string;
}

export interface ClinicWorkingHourDay {
  dayOfWeek: string;
  /** Ascending, non-overlapping open windows; a day can have gaps between shifts. */
  intervals: ClinicHourInterval[];
  isAvailable: boolean;
}

export interface ClinicProfileOverviewWorkingHours {
  today: {
    intervals: ClinicHourInterval[];
    isAvailable: boolean;
  } | null;
  week: ClinicWorkingHourDay[];
  isOpenNow: boolean;
}

export interface ClinicProfileOverviewService {
  serviceName: string;
  price?: number | null;
  currency?: string | null;
  durationDays?: number | null;
  canBeBookedByPatient?: boolean;
}

export interface ClinicProfileOverviewDoctorPreview {
  id: string;
  name: string;
  profileImage: string | null;
  speciality: string | null;
  yearsOfExperience: number | null;
  availability?: string | null;
}

export interface ClinicProfileOverviewReviews {
  averageRating: number;
  reviewCount: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ClinicProfileOverview {
  clinic: ClinicProfileOverviewClinic;
  admin: ClinicProfileOverviewAdmin;
  subscription: ClinicProfileOverviewSubscription;
  stats: ClinicProfileOverviewStats;
  contact: ClinicProfileOverviewContact;
  workingHours: ClinicProfileOverviewWorkingHours | null;
  services: ClinicProfileOverviewService[];
  doctorsPreview: ClinicProfileOverviewDoctorPreview[];
  facilities: string[] | null;
  insurance: string[] | null;
  gallery: string[] | null;
  reviews: ClinicProfileOverviewReviews | null;
  socialLinks: Record<string, string> | null;
  profileCompletion: number;
}
