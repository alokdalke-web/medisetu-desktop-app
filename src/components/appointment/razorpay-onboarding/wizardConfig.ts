import type { OnboardingDocumentType } from "../../../types/razorpayOnboarding";

export const WIZARD_STEP_LABELS = [
  "Business Details",
  "Stakeholder & KYC",
  "Bank Account",
  "Documents",
  "Consent",
] as const;

export const TOTAL_WIZARD_STEPS = WIZARD_STEP_LABELS.length;

export type DocumentSlotConfig = {
  documentType: OnboardingDocumentType;
  label: string;
};

export const DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  { documentType: "pan", label: "PAN Card Copy" },
  { documentType: "aadhaar_front", label: "Aadhaar Front" },
  { documentType: "aadhaar_back", label: "Aadhaar Back" },
  { documentType: "cancelled_cheque", label: "Cancelled Cheque / Bank Statement" },
];

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_HINT = "PDF, PNG or JPG · max 5MB";
export const ACCEPTED_DOCUMENT_INPUT_ACCEPT =
  "application/pdf,image/png,image/jpeg";
