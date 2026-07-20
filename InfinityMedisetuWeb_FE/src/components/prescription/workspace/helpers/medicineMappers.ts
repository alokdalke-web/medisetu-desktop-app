import {
  buildDurationBadgeLabel,
  buildFrequency,
  calcTotalDoses,
  ORAL_FORMS,
  recalcEveryNDaysDuration,
  TOPICAL_FORMS,
  withDoseModeMemory,
} from "./doseHelpers";
import type { Dose, DoseFrequency, MedicineDetails, SelectedMed } from "../types";

const clampScheduleDoseCount = (value: unknown) => {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count)) return 0;
  return Math.min(2, Math.max(0, count));
};

export const normalizeKey = (s?: string | null) =>
  (s || "").toLowerCase().replace(/\s+/g, " ").trim();

export const makeMedKey = (m: { id?: string; name?: string }) =>
  (m.id && String(m.id)) || normalizeKey(m.name);

export const dedupeMeds = (arr: SelectedMed[]) => {
  const seen = new Set<string>();
  const out: SelectedMed[] = [];
  for (const m of arr) {
    const key = makeMedKey({ id: m.id, name: m.name });
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out;
};

export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const highlightHtml = (text: string, q: string) => {
  const qq = normalizeKey(q);
  if (!qq) return escapeHtml(text);

  const idx = normalizeKey(text).indexOf(qq);
  if (idx < 0) return escapeHtml(text);

  const pre = escapeHtml(text.slice(0, idx));
  const mid = escapeHtml(text.slice(idx, idx + qq.length));
  const post = escapeHtml(text.slice(idx + qq.length));
  return `${pre}<mark class="rounded bg-emerald-100 px-1">${mid}</mark>${post}`;
};

export const formatStrength = (strength?: string | null) => {
  const raw = (strength ?? "").toString().trim();
  if (!raw) return "";

  if (/\bmg\b/i.test(raw)) return raw;
  if (/^[0-9]+(\.[0-9]+)?$/.test(raw)) return `${raw}mg`;
  return raw;
};

export const extractAnyId = (x: any) =>
  String(
    x?.medicineId ??
      x?.medicine_id ??
      x?.medicine?.id ??
      x?.id ??
      x?.medicine?.medicineId ??
      "",
  ).trim();

export const extractAnyName = (x: any) =>
  String(
    x?.medicineName ?? x?.medicine_name ?? x?.medicine?.name ?? x?.name ?? "",
  ).trim();

export const extractAnyStrength = (x: any) =>
  String(
    x?.strength ?? x?.details?.strength ?? x?.medicine?.strength ?? "",
  ).trim();

export const extractAnyForm = (x: any) =>
  String(
    x?.form ??
      x?.medicineForm ??
      x?.medicine_form ??
      x?.formName ??
      x?.dosageForm ??
      x?.dosage_form ??
      x?.details?.form ??
      x?.details?.medicineForm ??
      x?.details?.medicine_form ??
      x?.details?.medicine?.form ??
      x?.medicine?.form ??
      x?.medicine?.medicineForm ??
      x?.medicine?.medicine_form ??
      "",
  ).trim();

export const isValidMedicineName = (name?: string | null) => {
  const value = String(name ?? "").trim();

  if (!value) return false;
  if (value.length > 160) return false;
  if (/[<>]/.test(value)) return false;
  if (/<\s*\/?\s*[a-z][^>]*>/i.test(value)) return false;
  if (/\b(?:javascript|data):/i.test(value)) return false;
  if (/\bon[a-z]+\s*=/i.test(value)) return false;

  return true;
};

export const medicineNameKey = (name?: string | null) => normalizeKey(name || "");

export const medicineNameStrengthKey = (
  name?: string | null,
  strength?: string | null,
) => `${medicineNameKey(name)}|${String(strength ?? "").trim()}`;

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

const FORMS_WITH_SCHEDULE_RESPONSE = new Set([
  "tablet",
  "capsule",
  "lozenge",
  "syrup",
  "suspension",
]);

const shouldKeepDefaultScheduleForNoScheduleResponse = (formKey: string) =>
  FORMS_WITHOUT_SCHEDULE_RESPONSE.has(formKey) ||
  (formKey !== "" && !FORMS_WITH_SCHEDULE_RESPONSE.has(formKey));

export const parseDoseFromBackendFields = (raw: any): Dose => {
  const freqStr = String(
    raw?.frequency ?? raw?.details?.frequency ?? "",
  ).trim();
  const durStr = String(raw?.duration ?? raw?.details?.duration ?? "").trim();
  const countStr = String(
    raw?.medicineCount ??
      raw?.medicine_count ??
      raw?.details?.medicineCount ??
      raw?.details?.medicine_count ??
      "",
  ).trim();

  const formKey = normalizeKey(extractAnyForm(raw));
  const isNoScheduleFrequency = freqStr === "-" || freqStr === "0-0-0";
  const shouldKeepDefaultSchedule =
    isNoScheduleFrequency &&
    shouldKeepDefaultScheduleForNoScheduleResponse(formKey);

  const isThrice = /thrice/i.test(freqStr);
  const isTwice = /twice/i.test(freqStr);
  const isOnce = /once/i.test(freqStr);
  const dosePatternMatch = freqStr.match(/^([0-2])-([0-2])-([0-2])$/);

  let morning = true,
    noon = false,
    night = true;
  let morningCount = 1,
    noonCount = 0,
    nightCount = 1;

  if (isNoScheduleFrequency && !shouldKeepDefaultSchedule) {
    morning = false;
    noon = false;
    night = false;
    morningCount = 0;
    noonCount = 0;
    nightCount = 0;
  } else if (dosePatternMatch && !shouldKeepDefaultSchedule) {
    morningCount = clampScheduleDoseCount(dosePatternMatch[1]);
    noonCount = clampScheduleDoseCount(dosePatternMatch[2]);
    nightCount = clampScheduleDoseCount(dosePatternMatch[3]);
    morning = morningCount > 0;
    noon = noonCount > 0;
    night = nightCount > 0;
  } else if (isThrice) {
    morning = true;
    noon = true;
    night = true;
    morningCount = 1;
    noonCount = 1;
    nightCount = 1;
  } else if (isOnce) {
    morning = true;
    noon = false;
    night = false;
    morningCount = 1;
    noonCount = 0;
    nightCount = 0;
  } else if (isTwice) {
    morning = true;
    noon = false;
    night = true;
    morningCount = 1;
    noonCount = 0;
    nightCount = 1;
  }

  const pickNum = (s: string) => {
    const m = s.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  };

  let frequency: DoseFrequency = "daily";
  let intervalDays = 2;
  if (/weekly/i.test(freqStr)) {
    frequency = "weekly";
  } else {
    const m = freqStr.match(/every\s+(\d+)\s*day/i);
    if (m?.[1]) {
      frequency = "every_n_days";
      intervalDays = Math.max(1, Number(m[1]));
    }
  }

  let days = 3;

  if (frequency === "weekly") {
    const w = pickNum(durStr);
    days = Math.max(7, (w ? w : 1) * 7);
  } else if (frequency === "every_n_days") {
    const perOccurrence =
      morningCount + noonCount + nightCount || 1;

    const totalActualDoses = pickNum(durStr) ?? pickNum(countStr) ?? perOccurrence;
    const occurrences = Math.max(1, Math.ceil(totalActualDoses / perOccurrence));

    const base: Dose = {
      morning,
      noon,
      night,
      morningCount,
      noonCount,
      nightCount,
      days: 3,
      frequency,
      intervalDays,
      targetDoses: occurrences,
      customTargetDoses: occurrences,
    };

    return recalcEveryNDaysDuration(base);
  } else {
    const d = pickNum(durStr);
    days = Math.max(1, d ?? 3);
  }

  return {
    morning,
    noon,
    night,
    morningCount,
    noonCount,
    nightCount,
    days,
    frequency,
    intervalDays:
      (frequency as DoseFrequency) === "every_n_days"
        ? intervalDays
        : undefined,
    targetDoses:
      (frequency as DoseFrequency) === "every_n_days"
        ? Math.max(1, pickNum(countStr) ?? 4)
        : undefined,
  };
};

export const normalizeSelectedMedBasic = (raw: any): SelectedMed => {
  const id = extractAnyId(raw);
  const name = extractAnyName(raw);

  const doseFromRaw = raw?.dose;
  const hasDose =
    doseFromRaw &&
    typeof doseFromRaw === "object" &&
    typeof doseFromRaw.frequency === "string" &&
    typeof doseFromRaw.days !== "undefined";

  const dose: Dose = withDoseModeMemory(
    hasDose
      ? {
          morning: !!doseFromRaw.morning,
          noon: !!doseFromRaw.noon,
          night: !!doseFromRaw.night,
          morningCount: clampScheduleDoseCount(
            doseFromRaw.morningCount ?? (doseFromRaw.morning ? 1 : 0),
          ),
          noonCount: clampScheduleDoseCount(
            doseFromRaw.noonCount ?? (doseFromRaw.noon ? 1 : 0),
          ),
          nightCount: clampScheduleDoseCount(
            doseFromRaw.nightCount ?? (doseFromRaw.night ? 1 : 0),
          ),
          days: Math.max(1, Number(doseFromRaw.days || 1)),
          frequency: (doseFromRaw.frequency as DoseFrequency) || "daily",
          intervalDays:
            doseFromRaw.frequency === "every_n_days"
              ? Math.max(1, Number(doseFromRaw.intervalDays || 2))
              : undefined,
          targetDoses:
            doseFromRaw.frequency === "every_n_days"
              ? Math.max(1, Number(doseFromRaw.targetDoses || 1))
              : undefined,
          weekDays: Array.isArray(doseFromRaw.weekDays)
            ? doseFromRaw.weekDays
            : undefined,
          dailyDays: doseFromRaw.dailyDays,
          weeklyWeeks: doseFromRaw.weeklyWeeks,
          customIntervalDays: doseFromRaw.customIntervalDays,
          customTargetDoses: doseFromRaw.customTargetDoses,
        }
      : parseDoseFromBackendFields(raw),
  );

  const detailsFromRaw = raw?.details || raw;

  let notesValue = (detailsFromRaw?.notes ?? "").toString();
  if (notesValue === "-" || notesValue === "null" || notesValue === "") {
    notesValue = "";
  }

  let dosageValue = (detailsFromRaw?.dosage ?? "").toString();
  if (dosageValue === "-" || dosageValue === "null") {
    dosageValue = "";
  }

  const details: MedicineDetails = {
    medicineName: (detailsFromRaw?.medicineName ?? name ?? "").toString(),
    composition: (detailsFromRaw?.composition ?? "N/A").toString(),
    strength: (detailsFromRaw?.strength ?? "").toString(),
    dosage: dosageValue,
    frequency: (detailsFromRaw?.frequency ?? "").toString(),
    duration: (detailsFromRaw?.duration ?? "").toString(),
    manufacturer: (detailsFromRaw?.manufacturer ?? "N/A").toString(),
    medicineCount: (
      detailsFromRaw?.medicineCount ??
      detailsFromRaw?.medicine_count ??
      ""
    ).toString(),
    marketer: (detailsFromRaw?.marketer ?? "").toString(),
    imageUrl: (
      detailsFromRaw?.imageUrl ??
      detailsFromRaw?.image_url ??
      ""
    ).toString(),
    notes: notesValue,
    uses:
      detailsFromRaw?.uses && typeof detailsFromRaw.uses === "object"
        ? detailsFromRaw.uses
        : {},
    category: (detailsFromRaw?.category ?? "").toString(),
    form: extractAnyForm({ ...raw, details: detailsFromRaw }),
  };

  return {
    id: id || "",
    name: name || details.medicineName || "",
    image: raw?.image ?? raw?.imageUrl ?? raw?.image_url ?? null,
    dose,
    details,
  };
};

export const getMedicineDetailsForForm = (
  med: any,
  form: string,
  dose: Dose,
): MedicineDetails => {
  const formLower = (form || "").toLowerCase().trim();

  const frequency = buildFrequency(dose);
  const duration = buildDurationBadgeLabel(dose);
  const totalCount = calcTotalDoses(dose);

  if (TOPICAL_FORMS.some((f) => f.toLowerCase() === formLower)) {
    return {
      medicineName: (med?.name ?? med?.medicineName ?? "").toString().toUpperCase(),
      strength: (med as any).strength ?? "",
      dosage: "",
      frequency,
      duration,
      medicineCount: "",
      marketer: "",
      imageUrl: "",
      notes: "",
      uses: {},
      category: (med as any).category ?? "",
      form: form,
    };
  }

  if (ORAL_FORMS.some((f) => f.toLowerCase() === formLower)) {
    let dosageText = "";

    if (formLower === "syrup" || formLower === "suspension") {
      dosageText = "5 ml";
    } else if (formLower === "drops") {
      dosageText = "2 drops";
    } else if (formLower === "capsule") {
      dosageText = "1 capsule";
    } else if (formLower === "sachet") {
      dosageText = "1 sachet";
    }

    return {
      medicineName: (med?.name ?? med?.medicineName ?? "").toString().toUpperCase(),
      strength: (med as any).strength ?? "",
      dosage: dosageText,
      frequency,
      duration,
      medicineCount: totalCount > 0 ? String(totalCount) : "",
      marketer: "",
      imageUrl: "",
      notes: "After Food",
      uses: {},
      category: (med as any).category ?? "",
      form: form,
    };
  }

  return {
    medicineName: (med?.name ?? med?.medicineName ?? "").toString().toUpperCase(),
    strength: (med as any).strength ?? "",
    dosage: "",
    frequency,
    duration,
    medicineCount: totalCount > 0 ? String(totalCount) : "",
    marketer: "",
    imageUrl: "",
    notes: "",
    uses: {},
    category: (med as any).category ?? "",
    form: form,
  };
};

export const syncDetailsWithDose = (
  med: SelectedMed,
  nextDose: Dose,
): MedicineDetails => {
  const prev = med.details || {};
  return {
    ...prev,
    medicineName: (prev.medicineName || med.name || "").toString().toUpperCase(),
    frequency: buildFrequency(nextDose),
    duration: buildDurationBadgeLabel(nextDose),
    medicineCount: String(calcTotalDoses(nextDose) || ""),
    notes: (prev.notes ?? "").toString(),
    strength: (prev.strength ?? "").toString(),
    composition: (prev.composition ?? "N/A").toString(),
    dosage: (prev.dosage ?? "").toString(),
    manufacturer: (prev.manufacturer ?? "N/A").toString(),
    marketer: (prev.marketer ?? "").toString(),
    imageUrl: (prev.imageUrl ?? "").toString(),
    uses: prev.uses ?? {},
  };
};
