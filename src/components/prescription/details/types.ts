export type Vitals = {
  bpSys?: number | null;
  bpDia?: number | null;
  pulse?: number | null;
  spo2?: number | null;
  temperatureC?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
};

export type PrescriptionDetailsValue = {
  chiefComplaint: string;
  chiefComplaintDuration?: string;
  otherComplaints: string;
  history?: string;

  allergies: string;

  comorbidities?: string[];
  habits?: string[];

  followUpOn?: string | null;

  generalFindings?: string[];
  systemExamNotes?: string;

  provisionalDiagnosis?: string;
  differentialDiagnosis?: string;
  diagnosis: string;

  surgerySuggested?: string;
  visitingDays?: string[];
  visitingNotes?: string;

  investigations: string;
  advice: string;
  clinicalNotes: string;
  notes: string;

  followUpDays?: number | null;
  followUpDate: string;

  pregnancyStatus: "NA" | "Pregnant" | "Lactating";

  vitals: Vitals;

  /** Per-tooth clinical notes for Dentist-speciality prescriptions, e.g. { "Tooth-22": "Needs RCT" }. */
  additionalInformation?: Record<string, string>;
};

export const emptyPrescriptionDetails: PrescriptionDetailsValue = {
  chiefComplaint: "",
  chiefComplaintDuration: "",
  otherComplaints: "",
  history: "",
  comorbidities: [],
  allergies: "",
  habits: [],
  generalFindings: [],
  systemExamNotes: "",
  provisionalDiagnosis: "",
  differentialDiagnosis: "",
  diagnosis: "",
  surgerySuggested: "",
  visitingDays: [],
  visitingNotes: "",
  investigations: "",
  advice: "",
  clinicalNotes: "",
  notes: "",
  followUpDays: null,
  followUpDate: "",
  pregnancyStatus: "NA",
  additionalInformation: {},
  vitals: {
    bpSys: null,
    bpDia: null,
    pulse: null,
    spo2: null,
    temperatureC: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
  },
};

export type DoctorPreferencesResult = {
  id?: string;
  doctorId?: string;
  headerOrder?: string[];
  habitList?: string[];
  allergyList?: string[];
  diagnosisList?: string[];
  surgerySuggestedList?: string[];
  dietarySuggestionsList?: string[];
  followUpDays?: number | string | null;
  followupDays?: number | string | null;
};

export type DoctorPreferencesApiShape =
  | DoctorPreferencesResult
  | { success?: boolean; result?: DoctorPreferencesResult }
  | { data?: DoctorPreferencesResult | { result?: DoctorPreferencesResult } }
  | undefined
  | null;

export type PrescriptionDetailsProps = {
  value?: PrescriptionDetailsValue;
  defaultValue?: PrescriptionDetailsValue;
  disabledTooltip?: string;
  onChange?: (val: PrescriptionDetailsValue) => void;
  className?: string;

  variant?: "all" | "complaintsOnly" | "withoutComplaints";
  layout?: "form" | "panel";
  disabled?: boolean;

  onAddTest?: () => void;
  addedTests?: string[];

  doctorId?: string;

  previewPreferences?: Partial<DoctorPreferencesResult>;
  hidePreferenceShortcut?: boolean;
  allowParentScroll?: boolean;
};

export type UpdatePrescriptionDetails = <K extends keyof PrescriptionDetailsValue>(
  key: K,
  val: PrescriptionDetailsValue[K],
) => void;
