/** Clinic-level online appointment booking + payment-method settings. */
export type ClinicOnlineBookingSettings = {
  onlineBookingEnabled: boolean;
  payOnlineEnabled: boolean;
  payAtClinicEnabled: boolean;
  showClinicNumberPublicly: boolean;
};

/** Payload for PATCH /clinic/doctors/:doctorId/online-booking. */
export type SetDoctorOnlineBookingPayload = {
  doctorId: string;
  enabled?: boolean;
  maxAdvanceBookingDays?: number;
};

/** Response for GET /clinic/doctors/:doctorId/online-booking. */
export type GetDoctorOnlineBookingResponse = {
  success: boolean;
  data?: { onlineBookingEnabled: boolean; maxAdvanceBookingDays: number };
};

/** Response for PATCH /clinic/doctors/:doctorId/online-booking. */
export type SetDoctorOnlineBookingResponse = {
  success: boolean;
  data?: {
    id: string;
    onlineBookingEnabled: boolean;
    maxAdvanceBookingDays: number;
  };
};

/** Props for DoctorOnlineBookingCard.tsx (self-toggle, own-profile card). */
export type DoctorOnlineBookingCardProps = {
  doctorId: string;
};

/** Props for the per-row switch in ManageDoctorsOnlineBookingCard.tsx (Admin managing any doctor). */
export type DoctorOnlineBookingRowProps = {
  doctorId: string;
  name: string;
  enabled: boolean;
};

/**
 * Razorpay Route onboarding state of a clinic (`clinic.routeStatus` on the backend).
 * INACTIVE            — never onboarded; offer the "Start Setup" action.
 * PENDING             — submitted, awaiting Razorpay's KYC/bank verification.
 * NEEDS_CLARIFICATION — KYC or bank details were rejected; must be resubmitted.
 * ACTIVE              — onboarding complete; appointment payments split to the clinic.
 * SUSPENDED           — suspended by Razorpay; clinic must contact platform support.
 */
export type ClinicRouteStatus =
  | "INACTIVE"
  | "PENDING"
  | "NEEDS_CLARIFICATION"
  | "ACTIVE"
  | "SUSPENDED";

export interface BankDetails {
  beneficiaryName: string | null;
  bankName: string | null;
  maskedAccountNumber: string | null;
  ifscCode: string | null;
  isActive: boolean;
}

export interface GetClinicBankDetailsResponse {
  success: boolean;
  message: string;
  data: BankDetails | null;
}
