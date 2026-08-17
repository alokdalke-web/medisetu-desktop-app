import type { ClinicRouteStatus } from "../clinicOnlineBooking";

export type OnboardingBusinessType =
  | "individual"
  | "partnership"
  | "proprietorship"
  | "public_limited"
  | "private_limited";

export type BankAccountType = "savings" | "current";

/** Upload slot keys for Step 4 — matches the backend's `documentType` field. */
export type OnboardingDocumentType =
  | "pan"
  | "aadhaar_front"
  | "aadhaar_back"
  | "cancelled_cheque";

export type OnboardingAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

export type OnboardingStakeholder = {
  name: string;
  email: string;
  phone: string;
  pan: string;
  /** YYYY-MM-DD */
  dob: string;
};

export type OnboardingBankDetails = {
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
};

/** Body for POST /clinic/onboard-route. */
export type OnboardRouteRequestDto = {
  legalBusinessName: string;
  businessType: OnboardingBusinessType;
  address: OnboardingAddress;
  stakeholder: OnboardingStakeholder;
  bankDetails: OnboardingBankDetails;
  tncAccepted: boolean;
};

export type OnboardRouteResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    clinicName: string;
    userId: string;
    razorpayAccountId: string | null;
    routeStatus: ClinicRouteStatus | null;
    routeOnboardedAt: string | null;
  };
};

export type OnboardingDocumentStatus = {
  documentType: OnboardingDocumentType;
  uploaded: boolean;
  fileName?: string | null;
  url?: string | null;
};

/** GET /clinic/onboarding-status payload. */
export type OnboardingStatusData = {
  status: ClinicRouteStatus;
  rejectionReasons?: string[] | null;
  draft?: Partial<OnboardRouteRequestDto> | null;
  documents?: OnboardingDocumentStatus[] | null;
  razorpayAccountId?: string | null;
  onboardedAt?: string | null;
};

export type OnboardingStatusResponse = {
  success: boolean;
  message: string;
  data: OnboardingStatusData;
};

/** Body for POST /clinic/onboard-documents (multipart/form-data: file + documentType). */
export type UploadOnboardingDocumentResponse = {
  success: boolean;
  message: string;
  data?: {
    documentType: OnboardingDocumentType;
    url?: string;
  };
};

/** Body for PATCH /clinic/bank-details. */
export type UpdateBankDetailsRequestDto = {
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
};

export type UpdateBankDetailsResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

/** Shape returned by the public `https://ifsc.razorpay.com/{code}` directory lookup. */
export type IfscLookupResult = {
  BANK: string;
  BRANCH: string;
  ADDRESS?: string;
  CITY?: string;
  STATE?: string;
  IFSC: string;
};
