import { type SelectedMed } from "../../../components/PrescriptionWorkspace";
import { type PrescriptionDetailsValue } from "../../../components/prescription/PrescriptionDetails";

export const statusToChip = (s?: string): string => {
  switch (s) {
    case "Active":
    case "Paid":
      return "success";

    case "Blocked":
      return "danger";

    case "New":
      return "info";

    case "Cash":
    case "UPI":
      return "info";

    case "Pay Later":
      return "warning";

    default:
      return "default";
  }
};

export const fmtDate = (val?: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const to12h = (hhmm?: string) => {
  if (!hhmm) return "";
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm?.trim() ?? "");
  if (!m) return hhmm ?? "";
  const [, hh, mm] = m;
  const d = new Date();
  d.setHours(Number(hh), Number(mm), 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const calcAgeFromDob = (dob?: string) => {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 0 || age > 120 ? "—" : age;
};

export const shortPid = (id?: string) =>
  id ? `#${String(id).slice(0, 6)}` : "#—";

export const safe = (v: any, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v : fallback;

export const extractDays = (duration?: string, fallback = 3) => {
  const d = safe(duration);
  const m = d.match(/\d+/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const normalizeFormKey = (value?: string) =>
  (value || "").toLowerCase().replace(/\s+/g, " ").trim();

const FORMS_WITHOUT_SCHEDULE_RESPONSE = new Set([
  "cream",
  "ointment",
  "gel",
  "lotion",
  "paste",
  "oil",
  "spray",
  "foam",
  "mouthwash",
  "oral rinse",
  "toothpaste",
  "mouth gel",
  "dental cement",
  "dental varnish",
  "inhaler",
  "patch",
  "suppository",
  "shampoo",
  "soap",
  "facewash",
  "conditioner",
  "sanitizer",
  "handwash",
  "sachet",
  "granules",
  "powder",
  "liquid",
  "drops",
  "injection",
]);

export const normalizeDose = (m: any) => {
  const raw = m?.dose;
  const fallbackDays = extractDays(m?.duration, 3);

  if (raw && typeof raw === "object") {
    const daysN = Number(raw.days);
    return {
      morning: !!raw.morning,
      noon: !!raw.noon,
      night: !!raw.night,
      days: Number.isFinite(daysN) && daysN > 0 ? daysN : fallbackDays,
    };
  }

  const freq = safe(m?.frequency).toLowerCase();
  const formKey = normalizeFormKey(m?.form ?? m?.details?.form ?? m?.medicine?.form);
  const isNoScheduleFrequency = freq === "-" || freq === "0-0-0";
  const shouldKeepDefaultSchedule =
    isNoScheduleFrequency && FORMS_WITHOUT_SCHEDULE_RESPONSE.has(formKey);
  const dosePatternMatch = freq.match(/^([01])-([01])-([01])$/);
  const dose = {
    morning: shouldKeepDefaultSchedule
      ? true
      : isNoScheduleFrequency
      ? false
      : dosePatternMatch
      ? dosePatternMatch[1] === "1"
      : /morning|od|once|bd|twice/.test(freq) || /am/.test(freq),
    noon: shouldKeepDefaultSchedule
      ? false
      : isNoScheduleFrequency
      ? false
      : dosePatternMatch
      ? dosePatternMatch[2] === "1"
      : /noon|td|thrice/.test(freq),
    night: shouldKeepDefaultSchedule
      ? true
      : isNoScheduleFrequency
      ? false
      : dosePatternMatch
      ? dosePatternMatch[3] === "1"
      : /night|hs|bd|twice/.test(freq) || /pm/.test(freq),
    days: fallbackDays,
  };

  if (
    !isNoScheduleFrequency &&
    !dose.morning &&
    !dose.noon &&
    !dose.night
  ) {
    dose.morning = true;
    dose.night = true;
  }

  return dose;
};

export const mapReportPrescriptionToSelectedMed = (
  p: any,
  idx: number,
): SelectedMed & any => {
  const name = safe(p.medicineName || p.medicine_name || p.name, "Medicine").toUpperCase();
  const medicineId = safe(p.medicineId || p.medicine_id || p.medicine?.id || p.id || String(idx));
  const composition = safe(p.composition, "N/A");
  const strength = safe(p.strength || p.medicine?.strength);
  const dosageRaw = safe(p.dosage);
  const dosage = dosageRaw === "-" || dosageRaw.toLowerCase() === "null" ? "" : dosageRaw;
  const frequencyText = safe(p.frequency);
  const manufacturer = safe(p.manufacturer || p.marketer, "N/A");
  const notes = safe(p.notes);
  const marketer = safe(p.marketer);
  const imageUrl = safe(p.imageUrl || p.image_url);
  const medicineCount = p.medicineCount ?? p.medicine_count ?? "";
  const uses = p.uses && typeof p.uses === "object" ? p.uses : {};

  const freq = frequencyText.toLowerCase();
  const durationStr = safe(p.duration);
  const form = safe(p.form || p.medicine?.form || p.details?.form);
  const formKey = normalizeFormKey(form);
  const isNoScheduleFrequency = freq === "-" || freq === "0-0-0";
  const shouldKeepDefaultSchedule =
    isNoScheduleFrequency && FORMS_WITHOUT_SCHEDULE_RESPONSE.has(formKey);
  const days = extractDays(durationStr, 3);
  const dosePatternMatch = freq.match(/^([01])-([01])-([01])$/);

  const dose = {
    morning: shouldKeepDefaultSchedule
      ? true
      : isNoScheduleFrequency
      ? false
      : dosePatternMatch
      ? dosePatternMatch[1] === "1"
      : /morning|od|once|bd|twice/.test(freq) || /am/.test(freq),
    noon: shouldKeepDefaultSchedule
      ? false
      : isNoScheduleFrequency
      ? false
      : dosePatternMatch
      ? dosePatternMatch[2] === "1"
      : /noon|td|thrice/.test(freq),
    night: shouldKeepDefaultSchedule
      ? true
      : isNoScheduleFrequency
      ? false
      : dosePatternMatch
      ? dosePatternMatch[3] === "1"
      : /night|hs|bd|twice/.test(freq) || /pm/.test(freq),
    days,
    frequency: /weekly/.test(freq) ? "weekly" : "daily",
    dailyDays: days,
  };

  if (
    !isNoScheduleFrequency &&
    !dose.morning &&
    !dose.noon &&
    !dose.night
  ) {
    dose.morning = true;
    dose.night = true;
  }

  return {
    id: medicineId,
    medicineId,
    name,
    image: p.imageUrl ?? p.image ?? null,
    dose,
    composition,
    manufacturer,
    strength,
    dosage,
    frequency: frequencyText,
    duration: durationStr,
    notes,
    marketer,
    medicineCount,
    form,
    details: {
      medicineName: name,
      composition,
      strength,
      dosage,
      frequency: frequencyText,
      duration: durationStr,
      manufacturer,
      medicineCount,
      marketer,
      imageUrl,
      notes,
      uses,
      form,
    },
  };
};

export const mergeReportCardToDetails = (
  rc: any,
  prev: PrescriptionDetailsValue,
): PrescriptionDetailsValue => {
  if (!rc) return prev;
  const next: any = { ...prev };

  next.comorbidities = rc.comorbidities ?? next.comorbidities ?? [];
  next.habits = rc.habits ?? next.habits ?? [];

  if (rc.generalExamination) next.generalExamination = rc.generalExamination;
  if (rc.systemExamination) next.systemExamination = rc.systemExamination;

  if (rc.investigations) next.investigations = rc.investigations;
  if (rc.advice) next.advice = rc.advice;
  if (rc.clinicalNotes) next.clinicalNotes = rc.clinicalNotes;
  if (rc.allergies) next.allergies = rc.allergies;

  next.provisionalDiagnosis =
    rc.provisionalDiagnosis || next.provisionalDiagnosis || "";
  next.differentialDiagnosis =
    rc.differentialDiagnosis || next.differentialDiagnosis || "";
  next.finalDiagnosis = rc.finalDiagnosis || next.finalDiagnosis || "";
  next.diagnosis =
    next.diagnosis || rc.finalDiagnosis || rc.provisionalDiagnosis || "";
  next.surgerySuggested = rc.surgerySuggested || next.surgerySuggested || "";
  next.visitingDays = rc.visitingDays || next.visitingDays || [];

  if (rc.followUpInDays && !next.followUpDays) {
    const n = Number(rc.followUpInDays);
    if (!Number.isNaN(n)) next.followUpDays = n;
  }

  if (rc.followUpDate && !next.followUpOn) {
    next.followUpOn = rc.followUpDate;
  }

  return next as PrescriptionDetailsValue;
};
