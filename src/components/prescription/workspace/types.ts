import type { PrescriptionDetailsValue } from "../PrescriptionDetails";

export type DoseFrequency = "daily" | "weekly" | "every_n_days";

export type Dose = {
  morning: boolean;
  noon: boolean;
  night: boolean;
  morningCount?: number;
  noonCount?: number;
  nightCount?: number;

  /** Always store duration in DAYS (payload/backward-compat) */
  days: number;

  frequency: DoseFrequency;
  intervalDays?: number;
  weekDays?: number[];
  targetDoses?: number;

  /** UI memory for each tab */
  dailyDays?: number;
  weeklyWeeks?: number;
  customIntervalDays?: number;
  customTargetDoses?: number;
};

export type MedicineUses = {
  fever?: string;
  pain?: string;
  [key: string]: string | undefined;
};

export type MedicineDetails = {
  medicineId?: string;
  medicineName?: string;
  composition?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  manufacturer?: string;
  medicineCount?: string;
  marketer?: string;
  imageUrl?: string;
  notes?: string; // ✅ we will use this as Before/After Food
  uses?: MedicineUses;

  /** ✅ UI helpers (for Completed card subtitle) */
  category?: string;
  form?: string;
};

export type SelectedMed = {
  id: string; // ✅ MUST be medicineId (not prescription row id)
  name: string;
  image?: string | null;
  dose: Dose;
  details?: MedicineDetails;
};

export type PrescriptionWorkspaceProps = {
  embedded?: boolean;
  ui?: "classic" | "tab" | "collapse";

  defaultSelected?: any[];
  defaultDetails?: PrescriptionDetailsValue;

  onMedicinesChange?: (hasMedicines: boolean) => void;
  /** Called on every state change with current medicines and details for live preview */
  onLiveStateChange?: (meds: SelectedMed[], details: PrescriptionDetailsValue) => void;

  onDone?: (meds: SelectedMed[], details: PrescriptionDetailsValue) => void;

  patientId: string;
  appointmentId: string;
  doctorId?: string;
  onRefreshAfterSave?: () => void;

  onReuploadManualPrescription?: () => void;

  keepEditingAfterSave?: boolean;
  appointmentStatus?: string;
  onAddTest?: () => void;
  addedTests?: string[];

  onCompletionStateChange?: (payload: {
    isProcessing: boolean;
    isSuccess: boolean;
    error?: string | null;
  }) => void;

  hasManualPrescription?: boolean;
  onViewManualPrescription?: () => void;

  patient?: {
    id?: string;
    patientId?: string | null;
    name?: string | null;
    age?: number | null;
    gender?: string | null;
    mobile?: string | null;
    email?: string | null;
    address?: string | null;
  };

  doctor?: {
    id?: string;
    name?: string | null;
    speciality?: string | null;
    qualification?: string | null;
    licenseNumber?: string | null;
    mobile?: string | null;
    email?: string | null;
  };

  clinic?: {
    name?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    phone?: string | null;
    timing?: string | null;
    logoUrl?: string | null;
    isPharmacyAvailable?: boolean | null;
  };

  /** Callback for View/Download Prescription button (rendered in workspace header) */
  onViewDownload?: () => void;
  isViewDownloadLoading?: boolean;
  isViewDownloadDisabled?: boolean;
  /**
   * Opens the doctor's prescription-section preferences. Rendered in the
   * clinical-details drawer header, beside the very sections it configures.
   * Omit to hide the shortcut (e.g. for non-doctor roles).
   */
  onOpenPreference?: () => void;

  /** When supplied, the header's primary button gains a View/Download/Print menu. */
  onDownloadPrescription?: () => void;
  onPrintPrescription?: () => void;

  /**
   * When the saved prescription was written (`reportCard.createdAt`). Drives
   * the completed view's attribution line and each medicine's date range.
   */
  prescribedAt?: string | null;

  /**
   * When the saved prescription was last edited (`reportCard.updatedAt`). The
   * completed view's attribution line prefers this over `prescribedAt`.
   */
  updatedAt?: string | null;
};
