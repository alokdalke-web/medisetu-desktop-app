import type React from "react";
import type { Control, FieldValues } from "react-hook-form";

import type {
  ClinicServiceOption,
  ClinicSymptomItem,
  DayRange,
  DoctorOption,
  PatientOption,
  Slot,
  SymptomDraft,
  TimeSlot,
  TokenSlot,
} from "../../pages/appointment/new-appointment/types";

/* ── AppointmentDateSection ── */
export type CalendarCell = {
  iso: string;
  dayNum: number;
  isAllowed: boolean;
  isToday: boolean;
} | null;

export type CalendarMonthSection = {
  monthKey: string;
  monthLabel: string;
  weeks: CalendarCell[][];
};

export type AppointmentDateSectionProps = {
  dateFieldRef: React.RefObject<HTMLDivElement | null>;
  isTokenMode: boolean;
  showAllTokens: boolean;
  setShowAllTokens: React.Dispatch<React.SetStateAction<boolean>>;
  dayRange: DayRange;
  setDayRange: React.Dispatch<React.SetStateAction<DayRange>>;
  rangeEndLabel: string;
  calendarMonthSections: CalendarMonthSection[];
  dateParam: string;
  handlePickPill: (iso: string) => void;
  onOpenCustomSlot?: () => void;
  children: React.ReactNode;
};

/* ── CustomSlotModal ── */
export type CustomSlotModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isTokenMode: boolean;
  onConfirmTime: (time24: string) => void;
  onConfirmToken: (tokenNo: number) => void;
  /**
   * The doctor's working windows for the selected day, as 24hr `HH:mm` pairs (one per shift).
   * Used only to warn when a custom time falls outside them — booking is never blocked, since
   * reception legitimately squeezes patients in after hours. Omit to skip the check.
   */
  workingWindows?: WorkingWindow[];
};

export type WorkingWindow = { start: string; end: string };

/* ── AppointmentSlotSection ── */
export type ShiftUiData = {
  shifts: TimeSlot[][];
  shiftLabels: string[];
  hasMultipleShifts: boolean;
  activeShiftSlots: TimeSlot[];
};

export type AppointmentSlotSectionProps = {
  slotFieldRef: React.RefObject<HTMLDivElement | null>;
  selectedSlot: Slot | null;
  customSlot?: Slot | null;
  customDurationMinutes: number | null;
  setCustomDurationMinutes: React.Dispatch<React.SetStateAction<number | null>>;
  activeShiftTab: number;
  setActiveShiftTab: React.Dispatch<React.SetStateAction<number>>;
  isSlotsLoading: boolean;
  isSlotsError: boolean;
  isExpired: boolean;
  isTokenMode: boolean;
  showAllTokens: boolean;
  setShowAllTokens: React.Dispatch<React.SetStateAction<boolean>>;
  tokenSlotsToRender: TokenSlot[];
  shouldManualPickToken: boolean;
  shiftUiData: ShiftUiData;
  slots: Slot[];
  dateParam: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  formErrors: any;
  handleSelectSlot: (slot: Slot) => void;
  shouldLockSlotsForToday: boolean;
  formatDurationLabel: (minutes: number) => string;
  addMinutesToTime: (time: string, minutesToAdd: number) => string;
  formatIsoForUi: (iso: string) => string;
  formatTimeTo12Hour: (time: string) => string;
  pad2: (n: number) => string;
  jiggleKey: string;
};

/* ── AppointmentSummaryPanel ── */
export type AppointmentSummaryPanelProps = {
  showPatientSummary: boolean;
  patientName: string;
  patientAgeGender: string;
  patientPhone: string;
  patientAddress: string;
  patientBadgeText: string;
  doctorName: string;
  doctorRole: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  paymentMode: string;
  amountText: string;
  isCreating: boolean;
  isSubmitting: boolean;
  saveButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onSubmit: React.MouseEventHandler<HTMLButtonElement>;
  getInitials: (name: string) => string;
};

/* ── AppointmentFooterActions ── */
export type AppointmentFooterActionsProps = {
  hasActiveSubscription: boolean;
  isCreating: boolean;
  isSubmitting: boolean;
  saveButtonRef: React.RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onSubmit: React.MouseEventHandler<HTMLButtonElement>;
};

/* ── DoctorSelectionSection ── */
export type DoctorSelectionSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  doctorFieldRef: React.RefObject<HTMLDivElement | null>;
  doctorOptions: DoctorOption[];
  isFetchingDoctors: boolean;
  onDoctorSelectionChange: (key: React.Key | null) => void;
  jiggleKey: string;
};

/* ── ServiceSelectionSection ── */
export type ServiceSelectionSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  serviceFieldRef: React.RefObject<HTMLDivElement | null>;
  clinicServiceOptions: ClinicServiceOption[];
  canPickService: boolean;
  isFetchingServices: boolean;
  formErrors: any;
  onServiceSelectionChange: (
    keys: unknown,
    onChange: (value: string) => void,
  ) => void;
  jiggleKey: string;
};

/* ── PatientDoctorSummaryCards ── */
export type PatientDoctorSummaryCardsProps = {
  showPatientSummary: boolean;
  showDoctorSummary: boolean;
  patientName: string;
  patientAgeGender: string;
  patientPhone: string;
  patientLastVisit: string;
  noShowDisplay: string;
  rawNoShowStatus: unknown;
  doctorName: string;
  doctorRole: string;
  doctorFee: string;
  getInitials: (name: string) => string;
};

/* ── SymptomsSection ── */
export type SymptomsSectionProps = {
  hasActiveSubscription: boolean;
  symptomsBoxRef: React.RefObject<HTMLDivElement | null>;
  row: SymptomDraft | null;
  chips: SymptomDraft[];
  chipCount: number;
  maxSymptoms: number;
  limitReached: boolean;
  openSymptomId: string | null;
  setOpenSymptomId: React.Dispatch<React.SetStateAction<string | null>>;
  suggestionsById: Record<string, ClinicSymptomItem[]>;
  loadingById: Record<string, boolean>;
  activeSymptomIndex: number;
  setActiveSymptomIndex: React.Dispatch<React.SetStateAction<number>>;
  loadDefaultSymptoms: (symptomId: string) => void;
  handleSymptomSearch: (symptomId: string, raw: string) => void;
  selectSuggestion: (symptomId: string, item: ClinicSymptomItem) => void;
  updateSymptomName: (id: string, value: string) => void;
  removeSymptom: (id: string) => void;
  showLimitToast: () => void;
  commitInputToChip: () => void;
  moveFirstSymptomToChip: () => void;
  doctorSpeciality?: string;
  toggleSymptomByName?: (name: string) => void;
};

/* ── PaymentSection ── */
export type PaymentOption = {
  label: string;
  value: string;
};

export type PaymentSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  paymentFieldRef: React.RefObject<HTMLDivElement | null>;
  paymentModeOptions: PaymentOption[];
  isServiceSelected: boolean;
  isServiceCoveredForSelectedDate: boolean;
  isFreeConsultationService: boolean;
  formErrors: any;
  getInitialPaymentTabIndex: (
    value: string,
    idx: number,
    disablePayment: boolean,
    selectedValue: string,
  ) => number;
  onPaymentSelect: (onChange: (value: string) => void, value: string) => void;
  onPaymentKeyDown: (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
    value: string,
    disablePayment: boolean,
    onChange: (value: string) => void,
  ) => void;
  onPaymentNotesKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  jiggleKey: string;
  amountText?: string;
};

/* ── PatientSelectionSection ── */
export type PatientSelectionSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  patientFieldRef: React.RefObject<HTMLDivElement | null>;
  patientACKey: number;
  patientACOpen: boolean;
  setPatientACOpen: (open: boolean) => void;
  patientOptions: PatientOption[];
  isFetchingPatients: boolean;
  showInlineAddPatient: boolean;
  showAddPatientInEmpty: boolean;
  debouncedSearch: string;
  openAddPatient: () => void;
  handlePatientFieldKeyDownCapture: (
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => void;
  onPatientInputChange: (value: unknown) => void;
  onPatientSelectionChange: (key: React.Key | null) => void;
  jiggleKey: string;
};

/* ── NewAppointmentModals ── */
export type CreatedPatient = {
  id: string;
  name: string;
  mobile: string;
  gender?: string;
  age?: number;
  address?: string;
  city?: string;
  state?: string;
};

export type NewAppointmentModalsProps = {
  isAddPatientOpen: boolean;
  onCloseAddPatient: () => void;
  quickAddQuery: string;
  onPatientCreated: (patient: CreatedPatient) => void;
  isConfirmModalOpen: boolean;
  onConfirmModalOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  appointmentData: any;
  onConfirmAppointment: () => void;
  requiresPaymentMode?: boolean;
  paymentModeOptions?: PaymentOption[];
  onSelectPaymentMode?: (value: string) => void;
};
