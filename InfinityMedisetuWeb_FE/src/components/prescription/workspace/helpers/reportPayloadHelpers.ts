import {
  buildDosePattern,
  buildDurationBadgeLabel,
  calcTotalDoses,
} from "./doseHelpers";
import type { MedicineUses, SelectedMed } from "../types";
import {
  emptyPrescriptionDetails,
  type PrescriptionDetailsValue,
} from "../../PrescriptionDetails";

const FORMS_WITHOUT_SCHEDULE_PAYLOAD = new Set([
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

const FORMS_WITH_SCHEDULE_PAYLOAD = new Set([
  "tablet",
  "capsule",
  "lozenge",
  "syrup",
  "suspension",
]);

const shouldHideScheduleForForm = (formKey: string) =>
  FORMS_WITHOUT_SCHEDULE_PAYLOAD.has(formKey) ||
  (formKey !== "" && !FORMS_WITH_SCHEDULE_PAYLOAD.has(formKey));

export type ReportCardRequest = {
  reportCard: {
    patientId?: string;
    petientId: string; // backend spelling
    appointmentId: string;
    comorbidities: string[];
    habits: string[];
    vitals: {
      bpSys?: number | null;
      bpDia?: number | null;
      pulse?: number | null;
      spo2?: number | null;
      temperatureC?: number | null;
      heightCm?: number | null;
      weightKg?: number | null;
      bmi?: number | null;
    };
    generalExamination: string[];
    systemExamination: string;
    provisionalDiagnosis?: string;
    differentialDiagnosis?: string;
    finalDiagnosis?: string;
    investigations: string;
    advice: string;
    clinicalNotes: string;
    allergies: string[];
    surgerySuggested?: string[];
    visitingDays?: string[];
    visitingNotes?: string;
    followUpInDays?: string | null;
    followUpDate?: string | null;
  };
  prescriptions: Array<{
    medicineId: string;
    medicineName: string;
    composition: string;
    strength: string;
    dosage: string;
    frequency: string;
    duration: string;
    manufacturer: string;
    medicineCount: string;
    marketer: string;
    imageUrl: string;
    notes: string;
    uses: MedicineUses;
  }>;
};

export function toArray(val?: unknown): string[] {
  if (val == null) return [];

  if (Array.isArray(val)) {
    return val.map((t) => String(t ?? "").trim()).filter(Boolean);
  }

  if (typeof val === "string") {
    return val
      .split(/[,|\n]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  if (typeof val === "number" || typeof val === "boolean") {
    return String(val)
      .split(/[,|\n]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
}

export const buildReportCardPayload = (
  patientId: string,
  appointmentId: string,
  details: PrescriptionDetailsValue,
  meds: SelectedMed[],
): ReportCardRequest => {
  const v = details.vitals || emptyPrescriptionDetails.vitals;

  const prescriptions = meds
    .map((m) => {
      const d = m.details || {};

      const medicineName = (d.medicineName || m.name || "").toString().trim();
      if (!medicineName) return null;

      const formKey = (d.form ?? "").toString().trim().toLowerCase();
      const hidesSchedule = shouldHideScheduleForForm(formKey);

      const dosePattern = buildDosePattern(m.dose);
      const frequency = hidesSchedule || dosePattern === "0-0-0" ? "-" : dosePattern;
      const duration = buildDurationBadgeLabel(m.dose);
      const medicineCount = String(calcTotalDoses(m.dose) || 0);

      // ✅ Never send null/undefined
      const composition = (d.composition ?? "N/A").toString().trim() || "N/A";
      const strength = (d.strength ?? "").toString().trim();
      const dosage = (d.dosage ?? "").toString().trim() || "-";
      
      const manufacturer = (d.manufacturer ?? "N/A").toString().trim() || "N/A";
      const marketer = (d.marketer ?? "").toString();
      const imageUrl = (d.imageUrl ?? "").toString();
      const notes = (d.notes ?? "").toString().trim();
      const finalNotes = notes === "" ? "-" : notes;
      const uses = d.uses && typeof d.uses === "object" ? d.uses : {};

      // ✅ Build prescription object without notes if empty
      const prescription: any = {
        medicineId: String(m.id),
        medicineName,
        composition,
        strength,
        dosage,
        frequency,
        duration,
        manufacturer,
        medicineCount,
        marketer,
        imageUrl,
        notes: finalNotes,
        uses,
      };
      
      // ✅ Only add notes if it has a value
      if (notes) {
        prescription.notes = notes;
      }

      return prescription;
    })
    .filter((p): p is ReportCardRequest["prescriptions"][number] => p !== null);

  return {
    reportCard: {
      patientId,
      petientId: patientId,
      appointmentId,
      comorbidities: details.comorbidities || [],
      habits: details.habits || [],
      vitals: {
        bpSys: v.bpSys ?? null,
        bpDia: v.bpDia ?? null,
        pulse: v.pulse ?? null,
        temperatureC: v.temperatureC ?? null,
        spo2: v.spo2 ?? null,
        heightCm: v.heightCm ?? null,
        weightKg: v.weightKg ?? null,
        bmi: v.bmi ?? null,
      },
      generalExamination: details.generalFindings || [],
      systemExamination: details.systemExamNotes || "",
      provisionalDiagnosis: details.provisionalDiagnosis || "",
      differentialDiagnosis: details.differentialDiagnosis || "",
      finalDiagnosis: details.diagnosis || "",
      investigations: details.investigations || "",
      advice: (details as any).advice || "",
      clinicalNotes: details.clinicalNotes || "",
      allergies: toArray((details as any).allergies),
      surgerySuggested: toArray((details as any).surgerySuggested),
      visitingDays: (details as any).visitingDays || [],
      visitingNotes: (details as any).visitingNotes || "",
      followUpInDays:
        details.followUpDays != null ? String(details.followUpDays) : null,
      followUpDate: details.followUpDate
        ? new Date(details.followUpDate).toISOString()
        : null,
    },
    prescriptions,
  };
};
