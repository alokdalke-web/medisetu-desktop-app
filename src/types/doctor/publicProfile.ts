export interface PublicDoctorQualification {
  qualificationType: string;
  qualificationTitle: string;
  specialization: string | null;
  boardOrUniversity: string | null;
  yearOfCompletion: number | null;
}

export interface PublicClinicTimingBreak {
  startTime: string | null;
  endTime: string | null;
}

export interface PublicClinicTiming {
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
  breaks: PublicClinicTimingBreak[];
}

export interface PublicClinicService {
  id: string;
  serviceName: string;
  price: number | null;
  currency: string;
  durationDays: number | null;
}

export interface PublicClinic {
  id: string;
  clinicName: string;
  tagline: string | null;
  clinicAddress: string | null;
  clinicPhone: string | null;
  city: string | null;
  state: string | null;
  zipCode: number | null;
  clinicLogo: string | null;
  latitude: number | null;
  longitude: number | null;
  onlineBookingEnabled: boolean;
  maxAdvanceBookingDays: number;
  payOnlineEnabled: boolean;
  payAtClinicEnabled: boolean;
  services: PublicClinicService[];
  timings: PublicClinicTiming[];
}

export interface PublicDoctorReview {
  id: string;
  rating: number;
  reviewText: string | null;
  replyText: string | null;
  replyAt: string | null;
  createdAt: string;
  patientName: string;
}

export interface PublicDoctorProfile {
  doctor: {
    id: string;
    name: string | null;
    gender: string | null;
    profileImage: string | null;
    speciality: string | null;
    qualification: string | null;
    yearsOfExperience: number | null;
    about: string | null;
    isVerified: boolean;
    registrationNumber: string | null;
    qualifications: PublicDoctorQualification[];
  };
  rating: { average: number; count: number };
  totalPatients: number;
  clinics: PublicClinic[];
  reviews: { total: number; items: PublicDoctorReview[] };
}
