import type React from "react";
import type { NavigateFunction } from "react-router";

import type { ManualPrescriptionModalVariant } from "../../pages/appointment/hooks/useManualPrescription";

/* ── AppointmentSummaryCard ── */
export type AppointmentSummaryCardProps = {
  isSummaryAccordionOpen: boolean;
  onSummaryAccordionToggle: () => void;
  patient: any;
  appointment: any;
  doctor: any;
  id: string;
  navigate: NavigateFunction;
  safe: (value: any, fallback?: string) => string;
  canShowConsentFormButton: boolean;
  canShowUploadConsentButton: boolean;
  canShowDownloadConsentButton: boolean;
  canShowReferFormButton: boolean;
  setIsEditingConsent: (open: boolean) => void;
  setShowConsentForm: (open: boolean) => void;
  setActiveFormType: (type: "consent" | "refer") => void;
  setIsConsentUploadModalOpen: (open: boolean) => void;
  handleDownloadConsent: () => void;
  setIsReferModalOpen: (open: boolean) => void;
  isPendingStatus: boolean;
  canCancel: boolean;
  canShowConfirm: boolean;
  isPaid: any;
  handleOpenInvoice: () => void;
  expireText: string;
  isCompletedStatus: boolean;
  setIsMedicalCertificateModalOpen: (open: boolean) => void;
  refetchMedicalCertificate: () => any;
  isFetchingCertificate: boolean;
  canShowRescheduleButton: boolean;
  canMarkNoShow: boolean | undefined;
  isCancelledStatus: boolean;
  isNoShowStatus?: boolean;
  appointmentData: any;
  clinicService?: any;
  additionalServices: any[];
  priceText?: string;
  additionalServicesTotal?: number;
  totalAmountText?: string | null;
  setIsAddServiceModalOpen?: (open: boolean) => void;
  isActionBusy?: boolean;
  canShowPatientArrived: boolean;
  isPayLaterPaymentPending?: boolean;
  handlePatientArrived: () => void | Promise<void>;
  actionsDisabled: boolean;
  actionLoading: "cancel" | "confirm" | null;
  showConfirmHint: boolean;
  handleConfirm: () => void | Promise<void>;
  canShowMarkAsCompleted: boolean;
  handleMarkAsCompleted: () => void | Promise<void>;
  setIsNoShowModalOpen: (open: boolean) => void;
  setIsCancelConfirmOpen: (open: boolean) => void;
  showCancelHint: boolean;
  setIsRefundModalOpen: (open: boolean) => void;
  /** Next active (non-terminal) appointment in this doctor's queue for the day, if any. */
  nextPatientInfo?: {
    patientName?: string | null;
    time?: string | null;
    tokenNo?: number | null;
    status?: string | null;
  } | null;
  onGoToNextPatient?: () => void;
  onCollapseDetails?: () => void;
};

/* ── AppointmentVitalsSection ── */
export type AppointmentVitalsSectionProps = {
  canUpdateVitals: boolean;
  vitals: any;
  vitalErrors: Record<string, string | null>;
  isSavingVitals: boolean;
  isActionBusy: boolean;
  fieldClassNames: any;
  handleAutoFillVitals: () => void;
  handleVitalChange: (key: any, value: string) => void;
  handleSaveVitals: () => void | Promise<void>;
};

/* ── AppointmentServicesCard ── */
export type AppointmentServicesCardProps = {
  appointmentData: any;
  clinicService: any;
  priceText: string;
  additionalServices: any[];
  additionalServicesTotal: number;
  setIsAddServiceModalOpen: (open: boolean) => void;
  isConfirmedStatus: boolean;
  isCompletedStatus: boolean;
  isCancelledStatus: boolean;
  isActionBusy: boolean;
  showReasonColumn: boolean;
  hasSymptoms: boolean;
  symptoms?: any[];
  primaryServicePriceText: string;
  expireText: string;
  paymentModeDisplay: string;
  reasonLabel: string;
  reasonText: string;
};

/* ── ConsentFormSection ── */
export type ConsentFormSectionProps = {
  isOpen: boolean;
  setShowConsentForm: (open: boolean) => void;
  isEditingConsent: boolean;
  setIsEditingConsent: (open: boolean) => void;
  consentNotes: string;
  setConsentNotes: (value: string) => void;
  appointmentData: any;
  clinicData: any;
  clinic: any;
  patient: any;
  doctor: any;
  hasConsentNotes: boolean;
  isConsentPrinting: boolean;
  handleSaveAndPrintConsent: () => void | Promise<void>;
  handlePrintConsentForm: () => void | Promise<void>;
};

/* ── ReferFormSection ── */
export type ReferFormSectionProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinicData: any;
  clinic: any;
  doctor: any;
  patient: any;
  referredName: string;
  setReferredName: (value: string) => void;
  referredAddress: string;
  setReferredAddress: (value: string) => void;
  referredDoctorClinic: string;
  setReferredDoctorClinic: (value: string) => void;
  referredPhone: string;
  setReferredPhone: (value: string) => void;
  referNotes: string;
  setReferNotes: (value: string) => void;
  addToast: (toast: any) => void;
  handleOpenReferPreview: () => void;
};

/* ── AppointmentDetailsTabs / AppointmentFlowStepper ── */
export type AppointmentDetailsTabsProps = {
  activeTab: string;
  onTabChange: (key: string) => void;
  isDoctor: boolean;
  isAdmin: boolean;
  isReceptionist: boolean;
  reportsLoading: boolean;
  apptLoading: boolean;
  appointment: any;
  meds: any[];
  details: any;
  onPrescriptionChange: (meds: any[], details: any) => void;
  onSavePrescription: () => void | Promise<void>;
  onClearPrescription: () => void;
  doctorId: string;
  isSavingPrescription: boolean;
  canEditPrescription: boolean;
  isConfirmedStatus: boolean;
  isPastAppointment: boolean;
  patientId: string;
  appointmentTime: string;
  patient: any;
  doctor: any;
  clinic: any;
  reportResult: any;
  onRefreshAfterSave: () => any;
  onAddTest: () => void;
  addedTests: string[];
  prescriptionProcessing: boolean;
  onCompletionStateChange: (state: any) => void;
  hasManualPrescription: boolean;
  onViewManualPrescription: () => void;
  onReuploadManualPrescription: () => void;
  onMedicinesChange: (hasMedicines: boolean) => void;
  currentDoctorId: string;
  hasAddedPrescriptionMeds: boolean;
  hasLocalMedicines: boolean;
  openManualPrescriptionModal: () => void;
  showFlowStepper?: boolean;

  doctorPrescriptionType?: "Digital" | "Manual" | "";
  isDoctorPrescriptionTypeFetching?: boolean;
};

export type AppointmentFlowStepperProps = {
  isConfirmedStatus: boolean;
  hasPrescriptionStarted: boolean;
  isCompletedStatus: boolean;
  isCancelledStatus?: boolean;
};

/* ── AppointmentDetailsModals ── */
export type AppointmentDetailsModalsProps = {
  appointment: any;
  appointmentData: any;
  addTestOpen: boolean;
  onAddTestOpenChange: (open: boolean) => void;
  clinicId?: string;
  isClinicLoading: boolean;
  addTestModalOptions: any[];
  assignedTestIds?: string[];
  selectedTestIds: string[];
  setSelectedTestIds: (value: string[]) => void;
  ensureTestsLoadedFromModal: () => void;
  handleAddTestFromPrescription: () => void | Promise<void>;
  isAddTestDisabled: boolean;
  isAssigning: boolean;
  handleCreateTestFromPrescription: (payload: any) => Promise<any>;
  isCreatingTest: boolean;
  isNoShowModalOpen: boolean;
  setIsNoShowModalOpen: (open: boolean) => void;
  handleNoShowSuccess: () => void;
  isRefundModalOpen: boolean;
  setIsRefundModalOpen: (open: boolean) => void;
  handleRefundSubmit: (data: {
    refundMode: string;
    refundAmount: number;
    refundNotes: string;
  }) => Promise<void>;
  isRefundProcessing: boolean;
  maxRefundAmount: number;
  isCancelConfirmOpen: boolean;
  setIsCancelConfirmOpen: (open: boolean) => void;
  closeCancelModal: () => void;
  handleCancel: () => Promise<void>;
  actionLoading: "cancel" | "confirm" | null;
  isManualPrescriptionModalOpen: boolean;
  manualPrescriptionModalVariant: ManualPrescriptionModalVariant;
  handleManualPrescriptionOpenChange: (open: boolean) => void;
  manualPrescriptionFiles: File[];
  setManualPrescriptionFiles: React.Dispatch<React.SetStateAction<File[]>>;
  handleManualPrescriptionFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleSaveManualPrescription: () => void | Promise<void>;
  isSavingManualPrescription: boolean;
  isMedicalCertificateModalOpen: boolean;
  setIsMedicalCertificateModalOpen: (open: boolean) => void;
  medicalCertificateReason: string;
  medicalCertificateRestDays: string;
  medicalCertificateRestrictions: string;
  fieldClassNames: any;
  setMedicalCertificateReason: (value: string) => void;
  setMedicalCertificateRestDays: (value: string) => void;
  setMedicalCertificateRestrictions: (value: string) => void;
  handleOpenMedicalCertificatePreview: () => void | Promise<void>;
  isSavingCertificate: boolean;
  isMedicalCertificatePreviewOpen: boolean;
  setIsMedicalCertificatePreviewOpen: (open: boolean) => void;
  medicalCertificatePreviewHtml: string;
  isMedicalCertificatePrinting: boolean;
  handleDownloadMedicalCertificate: () => void;
  handlePrintMedicalCertificate: () => void | Promise<void>;
  isReferModalOpen: boolean;
  setIsReferModalOpen: (open: boolean) => void;
  clinicData: any;
  clinic: any;
  doctor: any;
  patient: any;
  referredName: string;
  setReferredName: (value: string) => void;
  referredAddress: string;
  setReferredAddress: (value: string) => void;
  referredDoctorClinic: string;
  setReferredDoctorClinic: (value: string) => void;
  referredPhone: string;
  setReferredPhone: (value: string) => void;
  referNotes: string;
  setReferNotes: (value: string) => void;
  addToast: any;
  handleOpenReferPreview: () => void;
  isReferPreviewOpen: boolean;
  setIsReferPreviewOpen: (open: boolean) => void;
  referPreviewHtml: string;
  handlePrintReferForm: () => void | Promise<void>;
  isConsentPrinting: boolean;
  isAdminConfirmReasonModalOpen: boolean;
  setIsAdminConfirmReasonModalOpen: (open: boolean) => void;
  adminConfirmReason: string;
  setAdminConfirmReason: (value: string) => void;
  adminConfirmError: string;
  setAdminConfirmError: (value: string) => void;
  handleConfirmWithReason: () => void | Promise<void>;
  isConsentUploadModalOpen: boolean;
  handleConsentUploadOpenChange: (open: boolean) => void;
  pickedConsentFiles: File[];
  setPickedConsentFiles: React.Dispatch<React.SetStateAction<File[]>>;
  consentUploadNote: string;
  setConsentUploadNote: React.Dispatch<React.SetStateAction<string>>;
  handleSaveConsentUpload: () => void | Promise<void>;
  isUploadingConsent: boolean;
  isAddServiceModalOpen: boolean;
  setIsAddServiceModalOpen: (open: boolean) => void;
  handleAddMultipleServicesSuccess: () => void;
  showConsentForm: boolean;
  setShowConsentForm: (open: boolean) => void;
  isEditingConsent: boolean;
  setIsEditingConsent: (open: boolean) => void;
  consentNotes: string;
  setConsentNotes: (value: string) => void;
  hasConsentNotes: boolean;
  handleSaveAndPrintConsent: () => void | Promise<void>;
  handlePrintConsentForm: () => void | Promise<void>;
  isFormTypeModalOpen: boolean;
  setIsFormTypeModalOpen: (open: boolean) => void;
  handleSelectConsentFormType: () => void;
  handleSelectReferFormType: () => void;
  selectedInvoice: any;
  isInvoiceModalOpen: boolean;
  handleCloseInvoice: () => void;
  isPayLaterModalOpen: boolean;
  setIsPayLaterModalOpen: (open: boolean) => void;
  handlePayLaterSubmit: (data: {
    paymentMode: string;
    paymentNotes?: string;
  }) => Promise<void>;
  isPaymentProcessing: boolean;
  isManualPrescriptionPreviewOpen: boolean;
  setIsManualPrescriptionPreviewOpen: (open: boolean) => void;
  manualPrescriptionImageUrl: string;
};

/**
 * Slim patient strip shown once the summary cards scroll out of view, so the
 * patient stays identifiable while the doctor is prescribing below the fold.
 */
export type StickyPatientBarProps = {
  /** Driven by an IntersectionObserver on a sentinel below the summary cards. */
  visible: boolean;
  name: string;
  avatar?: string | null;
  age?: string | number | null;
  gender?: string | null;
  contact?: string | null;
  /** Pre-formatted date/time, e.g. "31 July 2026 - 10:30 am". */
  appointmentText?: string;
  doctorName?: string;
  status?: string;
  onOpenPatient?: () => void;
};

/**
 * Compact patient header shown while prescribing, in place of the three full
 * summary cards. Every field is optional so the strip degrades to whatever the
 * appointment actually has.
 */
export type ConsultationPatientBarProps = {
  name: string;
  avatar?: string | null;
  age?: string | number | null;
  gender?: string | null;
  /** Patient phone — shown instead of the internal UUID. */
  contact?: string | null;
  visitId?: string | null;
  /** Clinic service for this visit. */
  service?: string | null;
  doctorName?: string | null;
  paymentStatus?: string | null;
  paymentMode?: string | null;
  /** Service fee for this visit, formatted as currency for display. */
  amount?: number | string | null;
  /**
   * ISO date the covering payment from a past appointment runs out. Only
   * meaningful when the payment mode is "Covered".
   */
  coveredUntil?: string | null;
  onViewFullDetails: () => void;
  /**
   * Collapsing to this strip shouldn't cost the doctor the ability to close
   * out the visit — when the appointment can be marked completed, that
   * action stays available here too, not just behind "View Full Details".
   */
  showMarkAsCompleted?: boolean;
  onMarkAsCompleted?: () => void;
  isMarkAsCompletedLoading?: boolean;
  isMarkAsCompletedDisabled?: boolean;
};

/**
 * The prescription-mode picker that sits beside the appointment section tabs.
 *
 * The section-preference shortcut used to live here too; it now sits in the
 * clinical-details drawer header, next to the sections it configures.
 */
export type PrescriptionTabActionsProps = {
  showDigitalToggle: boolean;
  isDigitalPrescription: boolean;
  /** Locked once medicines exist, or before the appointment is confirmed. */
  isToggleDisabled: boolean;
  /** Why it is locked. Shown on hover and, on touch, inline under the row. */
  disabledMessage?: string;
  /** A read or a save is in flight — the switch stays put until it settles. */
  isToggleBusy: boolean;
  onDigitalPrescriptionChange: (value: boolean) => void;
};

/** One entry in the appointment section tab strip. */
export type AppointmentTabTitleProps = {
  icon: React.ReactNode;
  /** Full label, shown from `sm` up. */
  label: string;
  /** Abbreviated label for narrow screens. Omit when the full label fits. */
  shortLabel?: string;
};
