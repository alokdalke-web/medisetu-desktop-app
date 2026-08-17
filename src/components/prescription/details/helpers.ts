import {
  DEFAULT_HEADER_ORDER,
  VITAL_LIMITS,
} from "./constants";
import {
  emptyPrescriptionDetails,
  type DoctorPreferencesApiShape,
  type DoctorPreferencesResult,
  type PrescriptionDetailsValue,
  type Vitals,
} from "./types";

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export const splitChips = (v: unknown): string[] => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap((x) => splitChips(x));
  if (typeof v === "string") {
    return (v || "")
      .split(/[,|\n]/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof v === "number" || typeof v === "boolean") return [String(v)];
  return [];
};

export const uniq = (arr: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
};

export const toggleStrIn = (arr: string[], item: string) => {
  const has = arr.some((x) => x.toLowerCase() === item.toLowerCase());
  return has
    ? arr.filter((x) => x.toLowerCase() !== item.toLowerCase())
    : [...arr, item];
};

export const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");
export const sanitizeInt = (raw: string, maxDigits: number) =>
  digitsOnly(raw).slice(0, maxDigits);

export const sanitizeTemp = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const a = (parts[0] ?? "").slice(0, 2);
  const b = (parts[1] ?? "").slice(0, 1);
  if (cleaned.includes(".")) return `${a}.${b}`;
  return a;
};

export const calcBmi = (
  heightCm?: number | null,
  weightKg?: number | null,
) => {
  const h = Number(heightCm ?? 0);
  const w = Number(weightKg ?? 0);
  if (h <= 0 || w <= 0) return null;
  const m = h / 100;
  const bmi = Number((w / (m * m)).toFixed(1));
  return Number.isFinite(bmi) ? bmi : null;
};

export const validateVital = (
  key: keyof typeof VITAL_LIMITS,
  value: number | null | undefined,
): string | null => {
  if (value == null) return null;
  const limits = VITAL_LIMITS[key];
  if (value < limits.min) return `Minimum ${limits.min}`;
  if (value > limits.max) return `Maximum ${limits.max}`;
  return null;
};

export const formatVisitingDay = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

export const toDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const addDaysFromTodayDateKey = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const getCalendarDays = (month: Date) => {
  const firstDayOfMonth = startOfMonth(month);
  const gridStart = new Date(firstDayOfMonth);
  gridStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

export const normalizeVitals = (v: Vitals): Vitals => {
  const toNum = (x: unknown) => {
    if (x === "" || x == null) return null;
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  };

  const roundInt = (n: number | null) => (n == null ? null : Math.round(n));
  const temp1 = (n: number | null) => (n == null ? null : Number(n.toFixed(1)));

  const bpSys = roundInt(
    (() => {
      const n = toNum(v.bpSys);
      return n == null ? null : clamp(n, 70, 250);
    })(),
  );

  const bpDia = roundInt(
    (() => {
      const n = toNum(v.bpDia);
      return n == null ? null : clamp(n, 40, 150);
    })(),
  );

  const pulse = roundInt(
    (() => {
      const n = toNum(v.pulse);
      return n == null ? null : clamp(n, 20, 220);
    })(),
  );

  const spo2 = roundInt(
    (() => {
      const n = toNum(v.spo2);
      return n == null ? null : clamp(n, 50, 100);
    })(),
  );

  const temperatureC = temp1(
    (() => {
      const n = toNum(v.temperatureC);
      return n == null ? null : clamp(n, 30, 43);
    })(),
  );

  const heightCm = roundInt(
    (() => {
      const n = toNum(v.heightCm);
      return n == null ? null : clamp(n, 50, 250);
    })(),
  );

  const weightKg = roundInt(
    (() => {
      const n = toNum(v.weightKg);
      return n == null ? null : clamp(n, 2, 300);
    })(),
  );

  return {
    bpSys,
    bpDia,
    pulse,
    spo2,
    temperatureC,
    heightCm,
    weightKg,
    bmi: null,
  };
};

export const withDefaults = (
  v?: Partial<PrescriptionDetailsValue>,
): PrescriptionDetailsValue => {
  const base = { ...emptyPrescriptionDetails };
  const src = v ?? {};

  const rawAllergies = (src as any)?.allergies;
  const allergies =
    typeof rawAllergies === "string"
      ? rawAllergies
      : Array.isArray(rawAllergies)
        ? rawAllergies
            .map((x) => String(x ?? "").trim())
            .filter(Boolean)
            .join(", ")
        : rawAllergies == null
          ? base.allergies
          : String(rawAllergies);

  const rawVitals = src.vitals ?? (src as any)?.vitals;
  const processedVitals = { ...base.vitals, ...(rawVitals ?? {}) };

  if (rawVitals) {
    if ((rawVitals as any).bp && typeof (rawVitals as any).bp === "string") {
      const [sys, dia] = (rawVitals as any).bp.split("/");
      processedVitals.bpSys = sys !== "" ? Number(sys) || null : null;
      processedVitals.bpDia = dia !== "" ? Number(dia) || null : null;
    }

    if ((rawVitals as any).temperature != null) {
      processedVitals.temperatureC = Number((rawVitals as any).temperature);
    }

    if ((rawVitals as any).pulse != null) {
      processedVitals.pulse = Number((rawVitals as any).pulse);
    }

    if ((rawVitals as any).spo2 != null) {
      processedVitals.spo2 = Number((rawVitals as any).spo2);
    }

    if ((rawVitals as any).heightCm != null) {
      processedVitals.heightCm = Number((rawVitals as any).heightCm);
    }

    if ((rawVitals as any).weightKg != null) {
      processedVitals.weightKg = Number((rawVitals as any).weightKg);
    }

    if ((rawVitals as any).bmi != null) {
      processedVitals.bmi = Number((rawVitals as any).bmi);
    }
  }

  const norm = normalizeVitals(processedVitals);
  const bmi = calcBmi(norm.heightCm, norm.weightKg);

  return {
    ...base,
    ...src,
    comorbidities: src.comorbidities ?? [],
    allergies,
    habits: src.habits ?? [],
    generalFindings: src.generalFindings ?? [],
    surgerySuggested: src.surgerySuggested ?? "",
    visitingDays: src.visitingDays ?? [],
    followUpDate: src.followUpDate || src.followUpOn || base.followUpDate,
    vitals: { ...processedVitals, ...norm, bmi },
  };
};

export const getValidList = (list: unknown, fallback: string[]) => {
  const values = Array.isArray(list)
    ? list.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  return values.length > 0 ? values : fallback;
};

export const getValidHeaderOrder = (list: unknown) => {
  const values = Array.isArray(list)
    ? list
        .map((x) => String(x ?? "").trim())
        .filter((x) => DEFAULT_HEADER_ORDER.includes(x))
    : [];

  return values.length > 0 ? values : DEFAULT_HEADER_ORDER;
};

export const extractDoctorPreferences = (
  payload: DoctorPreferencesApiShape,
): DoctorPreferencesResult | undefined => {
  if (!payload) return undefined;

  if ("result" in payload && payload.result) return payload.result;

  const maybeData = "data" in payload ? payload.data : undefined;

  if (
    maybeData &&
    typeof maybeData === "object" &&
    "result" in maybeData &&
    maybeData.result
  ) {
    return maybeData.result;
  }

  if (maybeData && typeof maybeData === "object") {
    const dataDirect = maybeData as DoctorPreferencesResult;
    if (
      Array.isArray(dataDirect.habitList) ||
      Array.isArray(dataDirect.allergyList) ||
      Array.isArray(dataDirect.diagnosisList) ||
      Array.isArray(dataDirect.surgerySuggestedList) ||
      Array.isArray(dataDirect.headerOrder)
    ) {
      return dataDirect;
    }

    const dataResult = (maybeData as { result?: DoctorPreferencesResult })
      .result;
    if (dataResult && typeof dataResult === "object") return dataResult;
  }

  return undefined;
};

export const formatPathologyTestName = (name: string) => {
  const cleaned = String(name ?? "")
    .trim()
    .replace(/[_-]+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

/**
 * One-line summaries of what each clinical section actually contains.
 *
 * Collapsed rows previously carried a static subtitle ("Add diagnosis
 * details") that restated the title and told a doctor nothing — so checking
 * what had been filled in meant expanding all ten sections one by one. Showing
 * the real values instead turns the drawer into something scannable in a
 * single pass, which is the whole point of it being a list.
 *
 * Returns an empty string for sections with no content; callers fall back to
 * the static subtitle there, since an empty section genuinely needs a prompt.
 */
export const buildSectionSummaries = (args: {
  draft: PrescriptionDetailsValue;
  addedTests: string[];
  vitalsChips: string[];
  allergyChips: string[];
  surgeryChips: string[];
}): Record<string, string> => {
  const { draft, addedTests, vitalsChips, allergyChips, surgeryChips } = args;

  const join = (items: string[]) => items.filter(Boolean).join(", ");

  // Long free text is truncated rather than wrapped: the row is a scan target,
  // and the full value is one click away in the expanded section.
  const preview = (value?: string | null, max = 70) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  };

  const followUp = [
    draft.followUpDays != null ? `${draft.followUpDays} days` : "",
    draft.followUpDate ? formatVisitingDay(draft.followUpDate) : "",
  ].filter(Boolean);

  return {
    "Pathology Test Name": addedTests.length
      ? join(addedTests.map(formatPathologyTestName))
      : "",
    Advice: preview(draft.advice),
    "Dietary Suggestions": preview(draft.clinicalNotes),
    Habits: join(draft.habits ?? []),
    Vitals: vitalsChips.join(" · "),
    Allergy: join(allergyChips),
    // Both fields, matching the chip row: an either/or fallback kept showing
    // the mirrored `diagnosis` copy after the chips were cleared.
    Diagnosis: join(
      uniq([
        ...splitChips(draft.provisionalDiagnosis ?? ""),
        ...splitChips(draft.diagnosis ?? ""),
      ]),
    ),
    "Surgery Suggested": join(surgeryChips),
    "Visiting Days": join((draft.visitingDays ?? []).map(formatVisitingDay)),
    "Follow-Up (days)": followUp.join(" · "),
  };
};
