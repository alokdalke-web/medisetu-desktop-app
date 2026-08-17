import type { Option as AutocompleteOption } from "../../../components/shared/AutocompleteField";

export type PatientOption = AutocompleteOption & { data: any };

export type DayRange = 7 | 15 | 30;

export type DoctorOption = {
  label: string;
  value: string;
  serviceCount?: number;
  status?: string;
  badgeText?: string;
  badgeTone?: "success" | "danger" | "warning" | "muted";
};

export type ClinicServiceOption = {
  value: string;
  name: string;
  priceText?: string;
  expText?: string;
  data?: any;
};

export type NewAppointmentForm = {
  patientSelect: string;
  patientId: string;
  doctorSelect: string;
  doctorId: string;
  appointmentDate: any;
  appointmentTime: string | null;
  clinicServiceId: string;
  paymentMode: string;
  notes?: string;
  price?: string;
  paymentNotes?: string;
  bookingSource?: "walk_in" | "phone_call" | "web_portal" | "mobile_app";
};

export type ApiSuccess = {
  success?: boolean;
  message?: string;
  status?: number | string;
  result?: any;
};

export type SlotStatus = "available" | "reserved" | "booked" | "break";

export type TimeSlot = {
  kind: "time";
  id: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  durationMinutes: number;
  dateIso: string;
  weekday: string;
  source?: string;
};

export type TokenSlot = {
  kind: "token";
  id: string;
  tokenNo: number;
  status: SlotStatus;
  dateIso: string;
  weekday: string;
  clinicAvailabilityId?: string;
};

export type Slot = TimeSlot | TokenSlot;

export type TokenMeta = {
  autoToken?: number;
  totalTokens?: number;
  availableTokens?: number;
};

export type SymptomDraft = {
  id: string;
  name: string;
  clinicSymptomId?: string;
};

export type ClinicSymptomItem = {
  id?: any;
  _id?: any;
  name?: any;
  status?: any;
};

export type AppointmentDraft = {
  values: {
    patientSelect: string;
    patientId: string;
    doctorSelect: string;
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string | null;
    clinicServiceId: string;
    paymentMode: string;
    notes: string;
    price: string;
    paymentNotes: string;
    bookingSource?: "walk_in" | "phone_call" | "web_portal" | "mobile_app";
  };
  dayRange: DayRange;
  symptoms: SymptomDraft[];
  showAllTokens: boolean;
  patientSnapshot?: any | null;
  doctorSnapshot?: any | null;
};
