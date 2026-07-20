import {
  CanvasImageFitMode,
  CanvasPaperSize,
  DateSeparator,
  DateDisplayFormat,
  HandlebarFieldGroup,
  TimeSeparator,
  TimeDisplayFormat,
} from "./types";

export const FIELD_DRAG_DATA_KEY = "application/x-handlebar-field";
export const POINT_DRAG_DATA_KEY = "application/x-handlebar-point-id";
export const VITALS_TABLE_ID = "vitals.table";
export const APPOINTMENT_DATE_FIELD_ID = "appointmentDate";
export const APPOINTMENT_SLOT_FIELD_ID = "appointmentSlot";
export const CLINIC_LOGO_FIELD_ID = "clinic.logo";
export const DOCTOR_REGISTRATION_NUMBER_FIELD_ID = "doctor.registrationNumber";
export const VISITING_NOTES_FIELD_ID = "visitingNotes";
export const ARRAY_FIELD_IDS = new Set([
  "visitingDays",
  "surgerySuggested",
  "habits",
  "allergies",
  "symptoms[0].name",
]);
export const CLINIC_LOGO_BASE_WIDTH_PX = 180;
export const CLINIC_LOGO_BASE_HEIGHT_PX = 60;
export const DEFAULT_TEXT_FONT_SIZE_PX = 12;
export const DEFAULT_TABLE_FONT_SIZE_PX = 8;
export const MIN_MARKER_FONT_SCALE = 0.6;
export const MAX_MARKER_FONT_SCALE = 2;
export const MARKER_FONT_SCALE_STEP = 0.1;
export const KEYBOARD_NUDGE_STEP = 0.5;
export const KEYBOARD_NUDGE_FAST_STEP = 2;
export const MIN_MARKER_SIZE_SCALE = 0.6;
export const MAX_MARKER_SIZE_SCALE = 2.2;
export const MARKER_SIZE_SCALE_STEP = 0.1;
export const MARKER_SIZE_SCALE_FAST_STEP = 0.2;
export const CANVAS_HEIGHT_FILL_RATIO = 0.82;

export const DATE_FORMAT_OPTIONS: DateDisplayFormat[] = [
  "DD MM YYYY",
  "MM DD YY",
  "DD MM YY",
];

export const DATE_SEPARATOR_OPTIONS: Array<{
  value: DateSeparator;
  label: string;
}> = [
  { value: "space", label: "Space" },
  { value: "slash", label: "/" },
  { value: "dash", label: "-" },
  { value: "none", label: "None" },
];

export const TIME_FORMAT_OPTIONS: TimeDisplayFormat[] = [
  "hh:mm A",
  "HH:mm",
  "HH:mm:ss",
  "hh:mm:ss A",
];

export const TIME_SEPARATOR_OPTIONS: Array<{
  value: TimeSeparator;
  label: string;
}> = [
  { value: "colon", label: ":" },
  { value: "slash", label: "/" },
  { value: "dash", label: "-" },
  { value: "none", label: "None" },
];

export const DATE_FIELD_IDS = new Set([
  APPOINTMENT_DATE_FIELD_ID,
  "followUpDate",
  "visitingDays",
]);

export const TIME_FIELD_IDS = new Set([APPOINTMENT_SLOT_FIELD_ID]);

export const CANVAS_PAPER_SIZE_OPTIONS: CanvasPaperSize[] = [
  "A5",
  "A4",
  "A3",
  "A2",
  "Letter",
  "Legal",
];

export const CANVAS_IMAGE_FIT_OPTIONS: Array<{
  value: CanvasImageFitMode;
  label: string;
}> = [
  { value: "contain", label: "Contain (fit inside)" },
  { value: "cover", label: "Cover (fill crop)" },
  { value: "stretch", label: "Stretch" },
  { value: "width-fit", label: "Width Fit" },
  { value: "height-fit", label: "Height Fit" },
  { value: "original", label: "Original Size" },
];

export const PAPER_SIZE_DIMENSIONS_MM: Record<
  CanvasPaperSize,
  { widthMm: number; heightMm: number }
> = {
  A5: { widthMm: 148, heightMm: 210 },
  A4: { widthMm: 210, heightMm: 297 },
  A3: { widthMm: 297, heightMm: 420 },
  A2: { widthMm: 420, heightMm: 594 },
  Letter: { widthMm: 216, heightMm: 279 },
  Legal: { widthMm: 216, heightMm: 356 },
};

export const HANDLEBAR_FIELD_GROUPS: HandlebarFieldGroup[] = [
  {
    label: "clinic",
    fields: [
      {
        id: CLINIC_LOGO_FIELD_ID,
        alias: "Clinic logo URL",
        dummyValue:
          "https://dummyimage.com/180x60/0ea5e9/ffffff&text=Clinic+Logo",
      },
      {
        id: "clinic.name",
        alias: "Clinic name",
        dummyValue: "North Valley Clinic",
      },
      {
        id: "clinic.tagline",
        alias: "Clinic tagline",
        dummyValue: "Care with compassion",
      },
      {
        id: "clinic.address",
        alias: "Clinic address",
        dummyValue: "221B Baker Street",
      },
      { id: "clinic.city", alias: "Clinic city", dummyValue: "Chandigarh" },
      { id: "clinic.state", alias: "Clinic state", dummyValue: "Punjab" },
      { id: "clinic.zipcode", alias: "Clinic zipcode", dummyValue: "160017" },
      {
        id: "clinic.phone",
        alias: "Clinic phone",
        dummyValue: "+91 98765 43210",
      },
    ],
  },
  {
    label: "doctor",
    fields: [
      {
        id: "doctor.name",
        alias: "Doctor name",
        dummyValue: "Dr. Meera Arora",
      },
      {
        id: "doctor.speciality",
        alias: "Doctor speciality",
        dummyValue: "General Physician",
      },
      {
        id: "doctor.qualification",
        alias: "Doctor qualification",
        dummyValue: "MBBS, MD (Medicine)",
      },
      {
        id: "doctor.email",
        alias: "Doctor email",
        dummyValue: "meera.arora@northvalley.in",
      },
      {
        id: DOCTOR_REGISTRATION_NUMBER_FIELD_ID,
        alias: "Doctor registration number",
        dummyValue: "REG-2024-8842",
      },
      {
        id: "doctor.availability[0].day",
        alias: "Doctor availability day",
        dummyValue: "Monday",
      },
      {
        id: "doctor.availability[0].isAvailable",
        alias: "Doctor available flag",
        dummyValue: "true",
      },
      {
        id: "doctor.availability[0].display",
        alias: "Doctor availability display",
        dummyValue: "9:00 AM - 1:00 PM",
      },
    ],
  },
  {
    label: "patient",
    fields: [
      {
        id: "patient.name",
        alias: "Patient's name",
        dummyValue: "Sukhvinder Singh",
      },
      { id: "patient.age", alias: "Patient age", dummyValue: "34" },
      { id: "patient.gender", alias: "Patient gender", dummyValue: "Male" },
      {
        id: "patient.address",
        alias: "Patient address",
        dummyValue: "House 45, Sector 22, Chandigarh",
      },
    ],
  },
  {
    label: "appointment",
    fields: [
      {
        id: APPOINTMENT_DATE_FIELD_ID,
        alias: "Appointment date",
        dummyValue: "2026-04-02",
      },
      {
        id: APPOINTMENT_SLOT_FIELD_ID,
        alias: "Slot",
        dummyValue: "10:30 AM",
      },
    ],
  },
  {
    label: "other",
    fields: [
      { id: "followUpDate", alias: "Follow-up date", dummyValue: "2026-04-16" },
      { id: VISITING_NOTES_FIELD_ID, alias: "Visiting notes", dummyValue: "Check for persistent cough" },
      { id: "diagnosis", alias: "Diagnosis", dummyValue: "Acute pharyngitis" },
      {
        id: "habits",
        alias: "Habits",
        dummyValue: ["Smoking", "Drinking"],
      },
      {
        id: "visitingDays",
        alias: "Visiting Days",
        dummyValue: ["2026-04-01", "2026-04-05"],
      },
      {
        id: "surgerySuggested",
        alias: "Surgery Suggested",
        dummyValue: ["Mole Removal", "Hernia Repair"],
      },
      {
        id: "allergies",
        alias: "Allergies",
        dummyValue: ["Penicillin"],
      },
      {
        id: "advice",
        alias: "Advice",
        dummyValue: "Steam inhalation twice daily",
      },
      {
        id: "dietarySuggestion",
        alias: "Dietary suggestion",
        dummyValue: "Soft warm foods and hydration",
      },
    ],
  },
  {
    label: "symptoms",
    fields: [
      {
        id: "symptoms[0].name",
        alias: "Primary symptom",
        dummyValue: "Sore throat",
      },
    ],
  },
  {
    label: "tests",
    fields: [
      { id: "testNames", alias: "Test names", dummyValue: "CBC" },
    ],
  },
  {
    label: "vitals",
    fields: [
      {
        id: VITALS_TABLE_ID,
        alias: "Vitals table",
        dummyValue: "Vitals table",
        tablePreview: {
          headers: ["BP", "Pulse", "SpO2", "Temp", "Wt", "Ht", "BMI"],
          row: ["120/80", "72", "98%", "36.8 C", "72 kg", "175 cm", "23.5"],
        },
      },
    ],
  },
  {
    label: "prescriptions",
    fields: [
      {
        id: "prescriptions.table",
        alias: "Prescriptions table",
        dummyValue: "Prescription table",
        tablePreview: {
          headers: [
            "Medication",
            "Dosage / Frequency",
            "Duration",
            "Instructions",
          ],
          row: [
            "Paracetamol (500 mg)",
            "1 tablet - Twice daily",
            "5 days",
            "After meals",
          ],
        },
      },
    ],
  },
];

export const HANDLEBAR_FIELDS = HANDLEBAR_FIELD_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.id),
);

export const HANDLEBAR_FIELDS_BY_ID = new Map(
  HANDLEBAR_FIELD_GROUPS.flatMap((group) =>
    group.fields.map((field) => [field.id, field] as const),
  ),
);

export const TABLE_HANDLEBAR_ID_MAP: Record<string, string[]> = {
  [VITALS_TABLE_ID]: [
    "vitals.bpSys",
    "vitals.bpDia",
    "vitals.pulse",
    "vitals.spo2",
    "vitals.temperatureC",
    "vitals.weightKg",
    "vitals.heightCm",
    "vitals.bmi",
  ],
  "prescriptions.table": [
    "prescriptions[0].medicineName",
    "prescriptions[0].dosage",
    "prescriptions[0].frequency",
    "prescriptions[0].duration",
    "prescriptions[0].notes",
  ],
};

export const IDEAL_FIELD_POSITIONS: Record<
  string,
  {
    x: number;
    y: number;
    fontScale: number;
    widthScale: number;
    heightScale: number;
  }
> = {
  [CLINIC_LOGO_FIELD_ID]: {
    x: 10.09,
    y: 5.89,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "clinic.name": {
    x: 47.44,
    y: 2.88,
    fontScale: 1.0,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "clinic.address": {
    x: 36.77,
    y: 8.64,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "clinic.zipcode": {
    x: 53.26,
    y: 8.39,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "clinic.phone": {
    x: 67.43,
    y: 7.9,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "clinic.tagline": {
    x: 47.56,
    y: 4.38,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "doctor.name": {
    x: 10.83,
    y: 15.23,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "doctor.qualification": {
    x: 12.97,
    y: 18.06,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "doctor.availability[0].day": {
    x: 4.76,
    y: 20.98,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "doctor.availability[0].display": {
    x: 17.91,
    y: 21.26,
    fontScale: 0.6,
    widthScale: 0.7,
    heightScale: 1.0,
  },
  "doctor.email": {
    x: 37.06,
    y: 15.2,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "patient.name": {
    x: 20.4,
    y: 29.28,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "patient.age": {
    x: 59.1,
    y: 29.56,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "patient.gender": {
    x: 81.68,
    y: 29.36,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  [APPOINTMENT_DATE_FIELD_ID]: {
    x: 80.16,
    y: 15.45,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  [APPOINTMENT_SLOT_FIELD_ID]: {
    x: 79.29,
    y: 17.22,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "patient.address": {
    x: 71.59,
    y: 35.59,
    fontScale: 0.6,
    widthScale: 0.8,
    heightScale: 1.0,
  },
  diagnosis: {
    x: 17.63,
    y: 41.38,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  habits: {
    x: 13.72,
    y: 46.89,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  allergies: {
    x: 84.49,
    y: 42.11,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  dietarySuggestion: {
    x: 31.56,
    y: 88.12,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  advice: {
    x: 22.68,
    y: 82.59,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "symptoms[0].name": {
    x: 19.34,
    y: 35.9,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  testNames: {
    x: 86.09,
    y: 46.94,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  followUpDate: {
    x: 77.43,
    y: 94.91,
    fontScale: 0.6,
    widthScale: 1.0,
    heightScale: 1.0,
  },
  "vitals.table": {
    x: 43.01,
    y: 55.98,
    fontScale: 1.0,
    widthScale: 0.8,
    heightScale: 1.0,
  },
  "prescriptions.table": {
    x: 49.17,
    y: 71.53,
    fontScale: 1.0,
    widthScale: 0.9,
    heightScale: 1.0,
  },
};
