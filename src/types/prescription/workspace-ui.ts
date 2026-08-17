import type React from "react";
import type {
  PrescriptionWorkspaceProps,
  SelectedMed,
} from "../../components/prescription/workspace/types";
import type { PrescriptionDetailsValue } from "../../components/prescription/details/types";
import type { PrescriptionHistoryItem } from "../../pages/patient/PrescriptionsHistory";
import type { ParsedToken } from "../../components/prescription/workspace/helpers/prescriptionSyntax";

/**
 * The saved report card behind a completed prescription.
 *
 * Callers pass this straight from the API (`reportResult.reportCard`), so the
 * list fields can arrive as either an array or a comma-separated string —
 * normalize with `toArray` before rendering.
 */
export type CompletedReportCard = {
  vitals?: {
    bp?: string | null;
    pulse?: number | null;
    temperature?: number | null;
  } | null;
  comorbidities?: string[] | string;
  habits?: string[] | string;
  allergies?: string[] | string;
  generalExamination?: string[] | string;
  systemExamination?: string;
  provisionalDiagnosis?: string;
  differentialDiagnosis?: string;
  finalDiagnosis?: string;
  investigations?: string;
  advice?: string;
  clinicalNotes?: string;
  followUpInDays?: number | string | null;
  followUpDate?: string | null;
  additionalInformation?: Record<string, string> | null;
};

export type PrescriptionPreviewSummaryProps = {
  reportCard?: CompletedReportCard | null;
  patient?: { name?: string | null; age?: number | null; gender?: string | null };
  adviceText?: string;
  /** Opens the completed-prescription edit modal on the clinical-details step. */
  onEdit?: () => void;
  /** Disables the edit affordance while a save is in flight. */
  isEditDisabled?: boolean;
  /**
   * Drops the card chrome (border/background/padding) so the summary can sit
   * inside a band that already draws its own card — the completed view pairs it
   * with the action buttons in one container rather than two side-by-side cards.
   */
  bare?: boolean;
};

export type PrescriptionWorkspaceHeaderProps = {
  hasManualPrescription: boolean;
  patientId: string;
  appointmentId: string;
  editSaveInProgress: boolean;
  onEditPrescription: () => void;
  onOpenHistory: () => void;
  hasHistory?: boolean;
  onViewDownload?: () => void;
  isViewDownloadLoading?: boolean;
  isViewDownloadDisabled?: boolean;
  /** When supplied, the primary button becomes a View / Download / Print menu. */
  onDownload?: () => void;
  onPrint?: () => void;
  /** Attribution line under the actions. */
  prescribedByName?: string | null;
  prescribedAt?: string | null;
  /**
   * `reportCard.updatedAt`. Shown in place of the written-at time once an edit
   * has moved it, since "when was this last changed" is the question the line is
   * actually asked.
   */
  updatedAt?: string | null;
};

export type PrescriptionCompletedListProps = {
  selectedMeds: SelectedMed[];
  hasManualPrescription: boolean;
  onViewManualPrescription?: () => void;
  onReuploadManualPrescription?: () => void;
  /** Per-row edit affordance — opens the same completed-prescription edit modal. */
  onEditPrescription?: () => void;
  isEditDisabled?: boolean;
  /**
   * When the prescription was written. Used to turn a medicine's duration in
   * days into a real calendar range, which is what a patient actually reads.
   */
  prescribedAt?: string | null;
};

export type PrescriptionNoteBarProps = {
  /** Free-text advice the doctor left with the prescription. */
  note?: string | null;
  followUpDate?: string | null;
  followUpInDays?: number | string | null;
};

/** Quick dose values collected inline in the picker before a medicine is added. */
export type QuickDoseDraft = {
  pattern: string;
  days: number;
  timing: string;
  frequency: "daily" | "weekly";
  instruction: string;
};

/** The `quick` argument accepted by `addMedicineDirect` — every field optional. */
export type QuickDoseArg = Partial<QuickDoseDraft>;

/** A row in the global (non-clinic) medicine database results. */
export type GlobalMedicineItem = {
  medicine_name?: string;
  composition?: string;
  manufacturer_name?: string;
};

/** Shared by every row-rendering component in the picker. */
export type MedicineRowCallbacks = {
  canEditPrescription: boolean;
  lockMessage: string;
  isAlreadySelected: (m: { id?: unknown; name?: unknown; medicineId?: unknown }) => boolean;
  canonicalizeMedicineId: (rawId: string, name?: string, strength?: string) => string;
  addMedicineDirect: (m: unknown, quick?: QuickDoseArg) => void;
  removeMedicineDirect: (m: unknown) => void;
  showToast: (msg: string) => void;
};

export type StockAvailability = {
  showStockAvailability?: boolean;
  stockAvailabilityByName?: Map<string, number>;
  stockCacheLoading?: boolean;
};

export type MedicineSearchInputProps = {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  canEditPrescription: boolean;
  lockMessage: string;
  onSearchFocus: () => void;
  onKeyDownSearch: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** id of the highlighted result row, for `aria-activedescendant`. */
  activeDescendantId?: string;
  isPickerOpen: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  historyCount: number;
  onOpenHistory: () => void;
};

export type PrescriptionMedicineSidebarProps = MedicineRowCallbacks &
  StockAvailability & {
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    isSearchActive: boolean;
    onSearchFocus: () => void;
    onSearchClose: () => void;
    onKeyDownSearch: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    queryReady: boolean;
    medicinesLoading: boolean;
    medicinesError: unknown;
    filteredMedicines: unknown[];
    debouncedQuery: string;

    /** Index of the keyboard-highlighted row within `filteredMedicines`. */
    highlight: number;
    setHighlight: React.Dispatch<React.SetStateAction<number>>;

    openAddNew: (
      nameForPrefill?: string,
      compositionForPrefill?: string,
      manufacturerForPrefill?: string,
    ) => void;
    createGlobalMedicineDirect?: (item: GlobalMedicineItem) => Promise<void> | void;
    isCreatingGlobalMedicine?: boolean;
    autoConfigureMedicineName?: string | null;
    onAutoConfigureMedicineHandled?: () => void;
    refetchMedicines: () => void;

    topUsedLoading: boolean;
    topUsedIsError: boolean;
    refetchTopUsed: () => void;
    topUsedMedicines: unknown[];
    toggleFavorite: (id: string) => { unwrap: () => Promise<unknown> };

    isPrescriptionHistoryOpen: boolean;
    setIsPrescriptionHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
    rxHistory: PrescriptionHistoryItem[];

    /** Scopes the per-medicine dose memory to the prescribing doctor. */
    doctorId?: string;

    /** Opens the clinical-details drawer. */
    onOpenClinical?: () => void;

    /** Opens the "save as favourite prescription" dialog. */
    onOpenFavourite?: () => void;
    /** Current favourite name, if this prescription is already saved as one. */
    favouriteName?: string;

    /** Dose modifiers parsed out of the one-line search syntax. */
    parsedQuick?: QuickDoseArg;
    /** Those modifiers as display chips for the interpretation bar. */
    parsedTokens?: ParsedToken[];
    isRxHistoryLoading: boolean;

    patient?: PrescriptionWorkspaceProps["patient"];
    doctor?: PrescriptionWorkspaceProps["doctor"];
    clinic?: PrescriptionWorkspaceProps["clinic"];
  };

/** A field in the always-visible clinical context strip above the medicine table. */
export type ClinicalContextItemProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "danger" | "warning" | "default";
};

export type PrescriptionClinicalContextBarProps = {
  details: PrescriptionDetailsValue;
  /** Opens the clinical-details drawer so the doctor can fill/correct a field. */
  onOpenClinical: () => void;
  isLocked?: boolean;
};

export type VisitingDayCalendarProps = {
  isLocked: boolean;
  visitingDays: string[];
  addVisitingDay: (rawDate: string) => void;
  removeVisitingDay: (rawDate: string) => void;
};

export type ClinicalDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: React.ReactNode;
  /**
   * Controls affecting the drawer's own content, rendered left of the close
   * button — e.g. the shortcut to choose which of these sections appear.
   */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
};

/** Visual weight for a clinical section's icon. `danger` is reserved for allergies. */
export type SectionTone = "default" | "danger";

export type SectionCardProps = {
  title: string | React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconTooltip?: string;
  tone?: SectionTone;
  showTooltip?: boolean;
  tooltipText?: string;
  subtitle?: string;
  /** Live one-line preview of the section's own content. */
  summary?: string;
  defaultOpen?: boolean;
  openStateKey?: string;
  filled?: boolean;
  headerAction?: React.ReactNode;
};

export type ActionRowProps = {
  title: string;
  subtitle?: string;
  summary?: string;
  onClick: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconTooltip?: string;
  tone?: SectionTone;
  filled?: boolean;
};

export type RightDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
};
