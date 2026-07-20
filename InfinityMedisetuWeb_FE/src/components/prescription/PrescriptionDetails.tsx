import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaLightbulb } from "react-icons/fa";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiCoffee,
  FiEdit3,
  FiFlag,
  FiMapPin,
  FiScissors,
  FiSettings,
  FiTarget,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router";
import { useGetDoctorPreferencesQuery } from "../../redux/api/medicineApi";

/** ---------- Types ---------- */
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

type Props = {
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

type DoctorPreferencesResult = {
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

type DoctorPreferencesApiShape =
  | DoctorPreferencesResult
  | { success?: boolean; result?: DoctorPreferencesResult }
  | { data?: DoctorPreferencesResult | { result?: DoctorPreferencesResult } }
  | undefined
  | null;

/* ---------------- Default fallback data ----------------- */
const DEFAULT_ALLERGIES = [
  "Codeine",
  "Contrast dye",
  "Dust",
  "Eggs",
  "Latex",
  "NKDA",
  "NSAIDs",
  "Peanuts/Nuts",
  "Penicillin",
  "Pollen",
  "Shellfish",
  "Sulfa drugs",
];

const DEFAULT_PROVISIONAL_DIAG = [
  "Acidity",
  "Allergy",
  "Body pain",
  "Cold/Cough",
  "Dengue",
  "Diarrhea",
  "Fever",
  "Flu",
  "Headache",
  "High BP",
  "Low BP",
  "Infection",
  "Malaria",
  "Migraine",
  "Stomach pain",
  "Diabetes",
  "Typhoid",
  "UTI",
  "Viral fever",
];

const DEFAULT_SURGERY_SUGGESTED = [
  "Appendectomy",
  "Hernia repair",
  "Cataract surgery",
  "Tonsillectomy",
  "Cholecystectomy",
  "Knee arthroscopy",
];

const DEFAULT_HABITS = ["Alcohol", "Smoking", "Tobacco"];

const DEFAULT_HEADER_ORDER = [
  "Pathology Test Name",
  "Advice",
  "Dietary Suggestions",
  "Habits",
  "Vitals",
  "Allergy",
  "Diagnosis",
  "Surgery Suggested",
  "Visiting Days",
  "Follow-Up (days)",
];

const DEFAULT_DIET_SUGGESTIONS_LIST = [
  "Drink boiled water.",
  "Eat small, frequent meals.",
  "Avoid spicy and oily foods.",
  "Include fruits and vegetables.",
  "Stay hydrated throughout the day.",
  "Limit caffeine and alcohol.",
  "Reduce salt and sugar intake.",
  "Include protein-rich foods.",
  "Avoid processed and junk foods.",
  "Maintain a balanced diet.",
];

/* ---------------- Vitals Limits ----------------- */
const VITAL_LIMITS = {
  bpSys: { min: 70, max: 220 },
  bpDia: { min: 40, max: 120 },
  pulse: { min: 40, max: 130 },
  spo2: { min: 70, max: 100 },
  temperatureC: { min: 32, max: 42 },
  heightCm: { min: 30, max: 200 },
  weightKg: { min: 1, max: 200 },
} as const;

/* ---------------- Helpers ----------------- */
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const splitChips = (v: unknown): string[] => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap((x) => splitChips(x));
  if (typeof v === "string")
    return (v || "")
      .split(/[,|\n]/g)
      .map((x) => x.trim())
      .filter(Boolean);
  if (typeof v === "number" || typeof v === "boolean") return [String(v)];
  return [];
};

const uniq = (arr: string[]) => {
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

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");
const sanitizeInt = (raw: string, maxDigits: number) =>
  digitsOnly(raw).slice(0, maxDigits);

const sanitizeTemp = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const a = (parts[0] ?? "").slice(0, 2);
  const b = (parts[1] ?? "").slice(0, 1);
  if (cleaned.includes(".")) return `${a}.${b}`;
  return a;
};

const calcBmi = (heightCm?: number | null, weightKg?: number | null) => {
  const h = Number(heightCm ?? 0);
  const w = Number(weightKg ?? 0);
  if (h <= 0 || w <= 0) return null;
  const m = h / 100;
  const bmi = Number((w / (m * m)).toFixed(1));
  return Number.isFinite(bmi) ? bmi : null;
};

const validateVital = (
  key: keyof typeof VITAL_LIMITS,
  value: number | null | undefined,
): string | null => {
  if (value == null) return null;
  const limits = VITAL_LIMITS[key];
  if (value < limits.min) return `Minimum ${limits.min}`;
  if (value > limits.max) return `Maximum ${limits.max}`;
  return null;
};
const formatVisitingDay = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const toDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getCalendarDays = (month: Date) => {
  const firstDayOfMonth = startOfMonth(month);
  const gridStart = new Date(firstDayOfMonth);
  gridStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

const CALENDAR_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeVitals = (v: Vitals): Vitals => {
  const toNum = (x: any) => {
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

const withDefaults = (
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

    if ((rawVitals as any).pulse != null)
      processedVitals.pulse = Number((rawVitals as any).pulse);

    if ((rawVitals as any).spo2 != null)
      processedVitals.spo2 = Number((rawVitals as any).spo2);

    if ((rawVitals as any).heightCm != null)
      processedVitals.heightCm = Number((rawVitals as any).heightCm);

    if ((rawVitals as any).weightKg != null)
      processedVitals.weightKg = Number((rawVitals as any).weightKg);

    if ((rawVitals as any).bmi != null)
      processedVitals.bmi = Number((rawVitals as any).bmi);
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
    vitals: { ...processedVitals, ...norm, bmi },
  };
};

const getValidList = (list: unknown, fallback: string[]) => {
  if (Array.isArray(list)) {
    const cleaned = list
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    if (cleaned.length > 0) return uniq(cleaned);
  }
  return fallback;
};

const getValidHeaderOrder = (list: unknown) => {
  if (Array.isArray(list)) {
    const cleaned = list
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }
  return DEFAULT_HEADER_ORDER;
};

const extractDoctorPreferences = (
  raw: DoctorPreferencesApiShape,
): DoctorPreferencesResult | undefined => {
  if (!raw || typeof raw !== "object") return undefined;

  const maybeDirect = raw as DoctorPreferencesResult;
  if (
    Array.isArray(maybeDirect.habitList) ||
    Array.isArray(maybeDirect.allergyList) ||
    Array.isArray(maybeDirect.diagnosisList) ||
    Array.isArray(maybeDirect.surgerySuggestedList) ||
    Array.isArray(maybeDirect.headerOrder)
  ) {
    return maybeDirect;
  }

  const maybeResult = (raw as { result?: DoctorPreferencesResult }).result;
  if (maybeResult && typeof maybeResult === "object") return maybeResult;

  const maybeData = (raw as { data?: unknown }).data;
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

const FIELD_CN = {
  inputWrapper:
    "rounded-2xl border-slate-200 bg-white shadow-none data-[hover=true]:border-slate-300 dark:border-[#273244] dark:bg-[#0f1728] dark:text-white dark:data-[hover=true]:border-[#46beae]/45",
  input:
    "text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
} as const;

const SectionCard: React.FC<{
  title: string | React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconTooltip?: string;
  iconClassName?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  openStateKey?: string;
  filled?: boolean;
}> = ({
  title,
  children,
  icon,
  iconTooltip,
  iconClassName,
  showTooltip = false,
  tooltipText,
  subtitle,
  defaultOpen = false,
  openStateKey = "",
  filled = false,
}) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    React.useEffect(() => {
      setIsOpen(defaultOpen);
    }, [defaultOpen, openStateKey]);

    return (
      <div
        className={[
          "overflow-hidden rounded-xl border bg-white transition-colors dark:bg-[#111726]",
          isOpen
            ? "border-[#0a6c74]/40 ring-1 ring-[#0a6c74]/15 dark:border-[#46beae]/45 dark:ring-[#46beae]/15"
            : "border-slate-200 dark:border-[#273244]",
        ].join(" ")}
      >
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen((prev) => !prev);
            }
          }}
          onClick={(e) => {
            // Prevent toggling if clicking on a nested button or popover
            if ((e.target as HTMLElement).closest('button, [role="button"]:not([aria-expanded])')) {
              return;
            }
            setIsOpen((prev) => !prev);
          }}
          className={[
            "flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition cursor-pointer",
            isOpen
              ? "bg-[#0a6c74]/[0.04] dark:bg-[#46beae]/[0.06]"
              : "hover:bg-slate-50 dark:hover:bg-[#151e31]",
          ].join(" ")}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {icon ? (
              <Tooltip content={iconTooltip ?? "Section"} placement="top">
                <span
                  className={[
                    "relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35",
                    iconClassName ?? "",
                  ].join(" ")}
                >
                  {icon}
                  {filled ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#111726]" />
                  ) : null}
                </span>
              </Tooltip>
            ) : null}

            <div className="min-w-0 flex-1">
              <Tooltip
                content={tooltipText}
                isDisabled={!showTooltip || !tooltipText}
                placement="top"
              >
                <div
                  className={[
                    "flex items-center gap-1.5 truncate text-[13px] font-semibold leading-5 text-slate-900 dark:text-white",
                    showTooltip ? "cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <span className="truncate">{title}</span>
                  {filled ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                      Added
                    </span>
                  ) : null}
                </div>
              </Tooltip>

              {subtitle ? (
                <div className="truncate text-[11px] leading-4 text-slate-500 dark:text-white">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          <FiChevronDown
            className={[
              "shrink-0 transition-transform duration-200",
              isOpen ? "rotate-180 text-[#0a6c74] dark:text-[#46beae]" : "text-slate-400 dark:text-white",
            ].join(" ")}
          />
        </div>

        {isOpen && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-[#273244]">
            {children}
          </div>
        )}
      </div>
    );
  };
const MiniChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 dark:bg-[#172033] dark:text-white">
    {children}
  </span>
);

const ActionRow: React.FC<{
  title: string;
  subtitle?: string;
  onClick: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconTooltip?: string;
  iconClassName?: string;
  filled?: boolean;
}> = ({
  title,
  subtitle,
  onClick,
  children,
  disabled,
  icon,
  iconTooltip,
  iconClassName,
  filled = false,
}) => {
    const hasChildren = React.Children.count(children) > 0;

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onClick();
        }}
        className={[
          "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left transition dark:border-[#273244] dark:bg-[#111726]",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-[#151e31]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {icon ? (
              <Tooltip content={iconTooltip ?? title} placement="top">
                <span
                  className={[
                    "relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35",
                    iconClassName ?? "",
                  ].join(" ")}
                >
                  {icon}
                  {filled ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#111726]" />
                  ) : null}
                </span>
              </Tooltip>
            ) : null}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold leading-5 text-slate-900 dark:text-white">
                <span className="truncate">{title}</span>
                {filled ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    Added
                  </span>
                ) : null}
              </div>
              {subtitle ? (
                <div className="truncate text-[11px] leading-4 text-slate-500 dark:text-white">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          <FiChevronRight className="shrink-0 text-slate-400 dark:text-white" />
        </div>

        {hasChildren ? (
          <div className="mt-3 flex flex-wrap gap-2">{children}</div>
        ) : null}
      </button>
    );
  };

type RightDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
};

type CenterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const CenterModal: React.FC<CenterModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-[#273244] dark:bg-[#111726]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#273244]">
          <div className="text-base font-semibold text-slate-900 dark:text-white">{title}</div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-[#273244] dark:text-white dark:hover:bg-[#151c2d]"
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        <div className="p-5">{children}</div>

        {footer ? (
          <div className="border-t border-slate-200 p-4 dark:border-[#273244]">{footer}</div>
        ) : null}
      </div>
    </div>
  );
};

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = "w-full sm:w-[420px]",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Close drawer backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />

      <div
        className={[
          "absolute right-0 top-0 h-[100dvh] max-w-full bg-white shadow-2xl dark:bg-[#111726]",
          widthClass,
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-[#273244]">
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                {title}
              </div>
              {subtitle ? (
                <div className="text-xs text-slate-500 dark:text-white">{subtitle}</div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#273244] dark:text-white dark:hover:bg-[#151c2d]"
              aria-label="Close"
            >
              <FiX />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">{children}</div>

          {footer ? (
            <div className="border-t border-slate-200 p-4 dark:border-[#273244]">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
const formatPathologyTestName = (name: string) => {
  const cleaned = String(name ?? "")
    .trim()
    .replace(/[_-]+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (word === word.toUpperCase()) return word; // keep PSA, CBC, CVC
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

/* ---------------- Component ----------------- */
const PrescriptionDetails: React.FC<Props> = ({
  value,
  defaultValue,
  onChange,
  className,
  variant = "all",
  layout,
  disabled = false,
  disabledTooltip,
  onAddTest,
  addedTests = [],
  doctorId,
  previewPreferences,
  hidePreferenceShortcut = false,
  allowParentScroll = false,
}) => {
  const isLocked = !!disabled;
  const lockMessage = disabledTooltip || "Please confirm appointment first";

  const initial = useMemo(
    () => withDefaults(value ?? defaultValue ?? emptyPrescriptionDetails),
    [value, defaultValue],
  );

  const [draft, setDraft] = useState<PrescriptionDetailsValue>(initial);

  const showComplaints = variant === "all" || variant === "complaintsOnly";
  const showRest = variant === "all" || variant === "withoutComplaints";

  const resolvedLayout: "form" | "panel" =
    layout ?? (variant === "withoutComplaints" ? "panel" : "form");

  const navigate = useNavigate();
  const showPreferenceShortcut =
    resolvedLayout === "panel" && !previewPreferences && !hidePreferenceShortcut;

  const normalizedDoctorId = String(doctorId ?? "").trim();

  const { data: doctorPreferencesData } = useGetDoctorPreferencesQuery(
    normalizedDoctorId,
    {
      skip: !normalizedDoctorId || !!previewPreferences,
      refetchOnMountOrArgChange: true,
    },
  );

  const doctorPreferences = useMemo(
    () =>
      extractDoctorPreferences(
        doctorPreferencesData as DoctorPreferencesApiShape,
      ),
    [doctorPreferencesData],
  );

  const effectiveDoctorPreferences = useMemo<
    DoctorPreferencesResult | undefined
  >(() => {
    if (!previewPreferences) return doctorPreferences;

    return {
      ...(doctorPreferences ?? {}),
      headerOrder:
        previewPreferences.headerOrder ?? doctorPreferences?.headerOrder,
      habitList: previewPreferences.habitList ?? doctorPreferences?.habitList,
      allergyList:
        previewPreferences.allergyList ?? doctorPreferences?.allergyList,
      diagnosisList:
        previewPreferences.diagnosisList ?? doctorPreferences?.diagnosisList,
      surgerySuggestedList:
        previewPreferences.surgerySuggestedList ??
        doctorPreferences?.surgerySuggestedList,
      dietarySuggestionsList:
        previewPreferences.dietarySuggestionsList ??
        doctorPreferences?.dietarySuggestionsList,
      followUpDays:
        previewPreferences.followUpDays ?? doctorPreferences?.followUpDays,
      followupDays:
        previewPreferences.followupDays ?? doctorPreferences?.followupDays,
    };
  }, [doctorPreferences, previewPreferences]);

  const habitsOptions = useMemo(
    () => getValidList(effectiveDoctorPreferences?.habitList, DEFAULT_HABITS),
    [effectiveDoctorPreferences],
  );

  const allergyOptions = useMemo(
    () =>
      getValidList(effectiveDoctorPreferences?.allergyList, DEFAULT_ALLERGIES),
    [effectiveDoctorPreferences],
  );

  const diagnosisOptions = useMemo(
    () =>
      getValidList(
        effectiveDoctorPreferences?.diagnosisList,
        DEFAULT_PROVISIONAL_DIAG,
      ),
    [effectiveDoctorPreferences],
  );

  const surgeryOptions = useMemo(
    () =>
      getValidList(
        effectiveDoctorPreferences?.surgerySuggestedList,
        DEFAULT_SURGERY_SUGGESTED,
      ),
    [effectiveDoctorPreferences],
  );

  const dietarySuggestionsOptions = useMemo(
    () =>
      getValidList(
        effectiveDoctorPreferences?.dietarySuggestionsList,
        DEFAULT_DIET_SUGGESTIONS_LIST,
      ),
    [effectiveDoctorPreferences],
  );

  const [showDietSuggestions, setShowDietSuggestions] = useState(false);

  const panelHeaderOrder = useMemo(
    () => getValidHeaderOrder(effectiveDoctorPreferences?.headerOrder),
    [effectiveDoctorPreferences],
  );
  const filterHiddenSections = useCallback(
    (data: PrescriptionDetailsValue): PrescriptionDetailsValue => {
      // Only filter in panel layout with valid header order
      if (
        resolvedLayout !== "panel" ||
        !panelHeaderOrder ||
        panelHeaderOrder.length === 0
      ) {
        return data;
      }

      const filtered = { ...data };
      const visibleSections = new Set(panelHeaderOrder);

      // Reset values for hidden sections
      if (!visibleSections.has("Habits")) {
        filtered.habits = [];
      }

      if (!visibleSections.has("Allergy")) {
        filtered.allergies = "";
      }

      if (!visibleSections.has("Diagnosis")) {
        filtered.provisionalDiagnosis = "";
      }

      if (!visibleSections.has("Surgery Suggested")) {
        filtered.surgerySuggested = "";
      }

      if (!visibleSections.has("Advice")) {
        filtered.advice = "";
      }

      if (!visibleSections.has("Dietary Suggestions")) {
        filtered.clinicalNotes = "";
      }

      if (!visibleSections.has("Visiting Days")) {
        filtered.visitingDays = [];
        filtered.visitingNotes = "";
      }

      if (!visibleSections.has("Follow-Up (days)")) {
        filtered.followUpDays = null;
        filtered.followUpDate = "";
      }

      return filtered;
    },
    [resolvedLayout, panelHeaderOrder],
  );

  useEffect(() => { }, [
    normalizedDoctorId,
    doctorPreferencesData,
    doctorPreferences,
    habitsOptions,
    allergyOptions,
    diagnosisOptions,
    surgeryOptions,
  ]);
  const apiFollowUpDays = useMemo(() => {
    const raw =
      effectiveDoctorPreferences?.followUpDays ??
      effectiveDoctorPreferences?.followupDays ??
      null;

    if (raw == null) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [effectiveDoctorPreferences]);
  // useEffect(() => {
  //   setDraft(withDefaults(value ?? defaultValue ?? emptyPrescriptionDetails));
  // }, [value, defaultValue]);

  useEffect(() => {
    const newValue = withDefaults(
      value ?? defaultValue ?? emptyPrescriptionDetails,
    );
    const filtered = filterHiddenSections(newValue);
    setDraft(filtered);
    // Only trigger onChange if needed
    if (JSON.stringify(filtered) !== JSON.stringify(draft)) {
      onChange?.(filtered);
    }
  }, [value, defaultValue, filterHiddenSections, onChange]);

  useEffect(() => {
    if (isLocked) return;

    const bmi = calcBmi(draft.vitals.heightCm, draft.vitals.weightKg);
    if (bmi !== draft.vitals.bmi) {
      const next = { ...draft, vitals: { ...draft.vitals, bmi } };
      setDraft(next);
      onChange?.(next);
    }
  }, [draft, isLocked, onChange]);

  useEffect(() => {
    if (isLocked || !apiFollowUpDays) return;

    setDraft((prev) => {
      if (prev.followUpDays && prev.followUpDays > 0) return prev;
      const next = { ...prev, followUpDays: apiFollowUpDays };
      onChange?.(next);
      return next;
    });
  }, [apiFollowUpDays, isLocked, onChange]);

  useEffect(() => {
    if (isLocked) return;

    setDraft((prev) => {
      if (prev.followUpDays && prev.followUpDays > 0) {
        const dt = new Date();
        dt.setDate(dt.getDate() + prev.followUpDays);
        const yyyyMmDd = dt.toISOString().slice(0, 10);

        if (prev.followUpDate === yyyyMmDd) return prev;

        const next = { ...prev, followUpDate: yyyyMmDd };
        onChange?.(next);
        return next;
      }

      if (prev.followUpDate === "") return prev;

      const next = { ...prev, followUpDate: "" };
      onChange?.(next);
      return next;
    });
  }, [draft.followUpDays, isLocked, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDietSuggestions) {
        const target = event.target as HTMLElement;
        if (!target.closest(".diet-suggestions-container")) {
          setShowDietSuggestions(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDietSuggestions]);

  // const commit = (next: PrescriptionDetailsValue) => {
  //   if (isLocked) return;
  //   setDraft(next);
  //   onChange?.(next);
  // };

  const commit = useCallback(
    (next: PrescriptionDetailsValue) => {
      if (isLocked) return;

      // Filter out hidden sections before saving
      const filteredNext = filterHiddenSections(next);

      setDraft(filteredNext);
      onChange?.(filteredNext);
    },
    [isLocked, filterHiddenSections, onChange],
  );

  // const upd = <K extends keyof PrescriptionDetailsValue>(
  //   key: K,
  //   val: PrescriptionDetailsValue[K]
  // ) => {
  //   commit({ ...draft, [key]: val });
  // };

  const [hasUserEdited, setHasUserEdited] = useState(false);
  const upd = useCallback(
    <K extends keyof PrescriptionDetailsValue>(
      key: K,
      val: PrescriptionDetailsValue[K],
    ) => {
      const updated = { ...draft, [key]: val };
      commit(updated);
      setHasUserEdited(true); // Mark that user has edited
    },
    [draft, commit],
  );

  // Only sync from props if user hasn't edited
  useEffect(() => {
    if (hasUserEdited) return; // Don't overwrite user changes

    const newValue = withDefaults(
      value ?? defaultValue ?? emptyPrescriptionDetails,
    );
    const filtered = filterHiddenSections(newValue);
    setDraft(filtered);
    if (JSON.stringify(filtered) !== JSON.stringify(draft)) {
      onChange?.(filtered);
    }
  }, [value, defaultValue, filterHiddenSections, onChange, hasUserEdited]);

  // const upd = useCallback(<K extends keyof PrescriptionDetailsValue>(
  //   key: K,
  //   val: PrescriptionDetailsValue[K]
  // ) => {
  //   const updated = { ...draft, [key]: val };
  //   commit(updated);
  // }, [draft, commit])

  const toggleStrIn = (arr: string[], item: string) => {
    const has = arr.some((x) => x.toLowerCase() === item.toLowerCase());
    return has
      ? arr.filter((x) => x.toLowerCase() !== item.toLowerCase())
      : [...arr, item];
  };

  useEffect(() => {
    // Clean up hidden section data when panel layout and header order changes
    if (resolvedLayout === "panel" && panelHeaderOrder.length > 0) {
      const filtered = filterHiddenSections(draft);
      if (JSON.stringify(filtered) !== JSON.stringify(draft)) {
        setDraft(filtered);
        onChange?.(filtered);
      }
    }
  }, [panelHeaderOrder, resolvedLayout, filterHiddenSections, draft, onChange]);

  const vitalsChips = useMemo(() => {
    const v = draft.vitals || {};
    const out: string[] = [];

    if (v.bpSys != null)
      out.push(`BP: ${v.bpSys}${v.bpDia != null ? `/${v.bpDia}` : ""}`);

    if (v.temperatureC != null) {
      const f = (Number(v.temperatureC) * 9) / 5 + 32;
      out.push(`Temperature: ${f.toFixed(1)} °F`);
    }

    if (v.spo2 != null) out.push(`SpO₂: ${v.spo2} %`);
    if (v.pulse != null) out.push(`Pulse: ${v.pulse}`);
    if (v.weightKg != null) out.push(`Weight: ${v.weightKg} kg`);

    return out;
  }, [draft.vitals]);

  const MAX_ALLERGIES = 5;
  const [allergyInput, setAllergyInput] = useState("");

  const allergyChips = useMemo(() => {
    return uniq(splitChips(draft.allergies)).slice(0, MAX_ALLERGIES);
  }, [draft.allergies]);

  const setAllergyChips = (chips: string[]) => {
    upd("allergies", chips.join(", "));
  };

  const toggleAllergyChip = (chip: string) => {
    if (isLocked) return;

    const has = allergyChips.some(
      (x) => x.toLowerCase() === chip.toLowerCase(),
    );

    if (has) {
      setAllergyChips(
        allergyChips.filter((x) => x.toLowerCase() !== chip.toLowerCase()),
      );
      return;
    }

    if (allergyChips.length >= MAX_ALLERGIES) return;

    const next = uniq([...allergyChips, chip]).slice(0, MAX_ALLERGIES);
    setAllergyChips(next);
  };

  const surgeryChips = useMemo(
    () => uniq(splitChips(draft.surgerySuggested ?? "")).slice(0, 2),
    [draft.surgerySuggested],
  );

  const setSurgeryChips = (chips: string[]) => {
    upd("surgerySuggested", chips.join(", "));
  };

  const toggleSurgeryChip = (chip: string) => {
    if (isLocked) return;
    const has = surgeryChips.some(
      (x) => x.toLowerCase() === chip.toLowerCase(),
    );
    const next = has
      ? surgeryChips.filter((x) => x.toLowerCase() !== chip.toLowerCase())
      : surgeryChips.length < 2
        ? [...surgeryChips, chip]
        : surgeryChips;
    setSurgeryChips(next);
  };

  const [surgeryInput, setSurgeryInput] = useState("");
  const visitingDaysModal = useDisclosure();
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth],
  );

  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const addSurgeryFromInput = () => {
    const items = splitChips(surgeryInput);
    if (!items.length) return;
    const canAdd = 2 - surgeryChips.length;
    if (canAdd <= 0) {
      setSurgeryInput("");
      return;
    }
    const merged = uniq([...surgeryChips, ...items]).slice(0, 2);
    setSurgeryChips(merged);
    setSurgeryInput("");
  };

  const removeSurgeryChip = (chip: string) => {
    setSurgeryChips(
      surgeryChips.filter((x) => x.toLowerCase() !== chip.toLowerCase()),
    );
  };

  const addVisitingDay = (rawDate: string) => {
    if (!rawDate) return;
    const pickedDate = new Date(rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (pickedDate < today) return;

    const normalized = rawDate;
    const next = uniq([...(draft.visitingDays ?? []), normalized]);
    upd("visitingDays", next);
  };

  const removeVisitingDay = (day: string) => {
    upd(
      "visitingDays",
      (draft.visitingDays ?? []).filter((d) => d !== day),
    );
  };

  const addAllergyFromInput = () => {
    const items = splitChips(allergyInput);
    if (items.length === 0) return;

    const merged = uniq([...allergyChips, ...items]).slice(0, MAX_ALLERGIES);
    setAllergyChips(merged);
    setAllergyInput("");
  };

  const removeAllergyChip = (chip: string) => {
    const next = allergyChips.filter(
      (x) => x.toLowerCase() !== chip.toLowerCase(),
    );
    setAllergyChips(next);
  };

  const vitalsModal = useDisclosure();

  const [vitalsTemp, setVitalsTemp] = useState<Vitals>(draft.vitals);

  const [vitalErrors, setVitalErrors] = useState<
    Record<keyof typeof VITAL_LIMITS, string | null>
  >({
    bpSys: null,
    bpDia: null,
    pulse: null,
    spo2: null,
    temperatureC: null,
    heightCm: null,
    weightKg: null,
  });

  const validateVitalsTemp = () => {
    const errors: Record<keyof typeof VITAL_LIMITS, string | null> = {
      bpSys: validateVital("bpSys", vitalsTemp.bpSys),
      bpDia: validateVital("bpDia", vitalsTemp.bpDia),
      pulse: validateVital("pulse", vitalsTemp.pulse),
      spo2: validateVital("spo2", vitalsTemp.spo2),
      temperatureC: validateVital("temperatureC", vitalsTemp.temperatureC),
      heightCm: validateVital("heightCm", vitalsTemp.heightCm),
      weightKg: validateVital("weightKg", vitalsTemp.weightKg),
    };
    setVitalErrors(errors);
    return !Object.values(errors).some((error) => error !== null);
  };

  const openVitals = () => {
    if (isLocked) return;
    const norm = normalizeVitals(draft.vitals);
    setVitalsTemp({ ...draft.vitals, ...norm, bmi: null });
    setVitalErrors({
      bpSys: null,
      bpDia: null,
      pulse: null,
      spo2: null,
      temperatureC: null,
      heightCm: null,
      weightKg: null,
    });
    vitalsModal.onOpen();
  };

  const autoFillVitals = () => {
    if (isLocked) return;
    const filled = {
      ...vitalsTemp,
      bpSys: vitalsTemp.bpSys ?? 120,
      bpDia: vitalsTemp.bpDia ?? 80,
      pulse: vitalsTemp.pulse ?? 78,
      spo2: vitalsTemp.spo2 ?? 98,
      temperatureC: vitalsTemp.temperatureC ?? 37,
    };
    setVitalsTemp(filled);

    setTimeout(() => {
      const errors: Record<keyof typeof VITAL_LIMITS, string | null> = {
        bpSys: validateVital("bpSys", filled.bpSys),
        bpDia: validateVital("bpDia", filled.bpDia),
        pulse: validateVital("pulse", filled.pulse),
        spo2: validateVital("spo2", filled.spo2),
        temperatureC: validateVital("temperatureC", filled.temperatureC),
        heightCm: validateVital("heightCm", filled.heightCm),
        weightKg: validateVital("weightKg", filled.weightKg),
      };
      setVitalErrors(errors);
    }, 0);
  };

  const saveVitals = () => {
    if (isLocked) return;

    const isValid = validateVitalsTemp();
    if (!isValid) return;

    const norm = normalizeVitals(vitalsTemp);
    const bmi = calcBmi(norm.heightCm, norm.weightKg);

    commit({
      ...draft,
      vitals: {
        ...draft.vitals,
        ...norm,
        bmi,
      },
    });

    vitalsModal.onClose();
  };

  // Which sections already contain data — used to show an "Added" badge so
  // doctors can scan the panel and instantly see what is done vs. pending.
  const sectionFilled = useMemo<Record<string, boolean>>(() => {
    const hasText = (v?: string | null) => !!(v && String(v).trim());
    return {
      "Pathology Test Name": addedTests.length > 0,
      Advice: hasText(draft.advice),
      "Dietary Suggestions": hasText(draft.clinicalNotes),
      Habits: (draft.habits ?? []).length > 0,
      Vitals: vitalsChips.length > 0,
      Allergy: allergyChips.length > 0,
      Diagnosis:
        hasText(draft.provisionalDiagnosis) || hasText(draft.diagnosis),
      "Surgery Suggested": surgeryChips.length > 0,
      "Visiting Days": (draft.visitingDays ?? []).length > 0,
      "Follow-Up (days)":
        draft.followUpDays != null || hasText(draft.followUpDate),
    };
  }, [
    addedTests.length,
    draft.advice,
    draft.clinicalNotes,
    draft.habits,
    draft.provisionalDiagnosis,
    draft.diagnosis,
    draft.visitingDays,
    draft.followUpDays,
    draft.followUpDate,
    vitalsChips.length,
    allergyChips.length,
    surgeryChips.length,
  ]);

  const filledSectionCount = useMemo(
    () =>
      panelHeaderOrder.reduce(
        (count, header) => count + (sectionFilled[header] ? 1 : 0),
        0,
      ),
    [panelHeaderOrder, sectionFilled],
  );

  const panelSections = useMemo(() => {
    const sectionMap: Record<string, React.ReactNode> = {
      "Pathology Test Name": (
        <div
          key="Pathology Test Name"
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-[#273244] dark:bg-[#111726]"
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Tooltip content="Pathology tests" placement="top">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-white dark:ring-1 dark:ring-violet-400/30">
                  <FiClipboard className="h-4 w-4" />
                </span>
              </Tooltip>

              <span className="min-w-0 truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                Pathology Tests
              </span>

              {addedTests.length > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-700">
                  {addedTests.length}
                </span>
              )}
            </div>

            {onAddTest && (
              <Tooltip
                content={lockMessage}
                isDisabled={!isLocked}
                placement="top"
              >
                <div className="shrink-0">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (!isLocked) onAddTest();
                    }}
                    className={[
                      "rounded-full px-3 py-1.5 text-center text-[11px] font-semibold text-white transition",
                      "whitespace-nowrap cursor-pointer",
                      isLocked
                        ? "cursor-not-allowed bg-slate-300 opacity-60"
                        : "bg-[#2f7d6e] hover:bg-[#256857]",
                    ].join(" ")}
                  >
                    + Add
                  </button>
                </div>
              </Tooltip>
            )}
          </div>

          {addedTests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {addedTests.map((name, idx) => (
                <span
                  key={`${name}-${idx}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:border-[#46beae]/35 dark:bg-[#123730] dark:text-white"
                >
                  <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-semibold text-emerald-700 dark:bg-[#0b1321] dark:text-white">
                    {idx + 1}
                  </span>

                  <span className="break-words whitespace-normal leading-4">
                    {formatPathologyTestName(name)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      ),
      Advice: (
        <SectionCard
          key="Advice"
          filled={sectionFilled.Advice}
          title="Advice"
          icon={<FiEdit3 className="h-4 w-4" />}
          iconTooltip="Advice / notes"
          iconClassName="bg-amber-50 text-amber-600"
          subtitle="Write advice for the patient"
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={Boolean(draft.advice?.trim())}
          openStateKey={`advice-${draft.advice ?? ""}`}
        >
          <Textarea
            placeholder="Write advice, recommendations, or instructions for the patient..."
            value={draft.advice}
            onValueChange={(v) => upd("advice", v)}
            minRows={3}
            variant="bordered"
            classNames={{ inputWrapper: "rounded-2xl border-slate-200" }}
            isDisabled={isLocked}
          />
        </SectionCard>
      ),

      "Dietary Suggestions": (
        <SectionCard
          key="Dietary Suggestions"
          filled={sectionFilled["Dietary Suggestions"]}
          title={
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate">
                Dietary Suggestions
              </span>
              <div className="diet-suggestions-container relative shrink-0">
                <Popover
                  isOpen={showDietSuggestions}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) {
                      setShowDietSuggestions(false);
                    }
                  }}
                  placement="bottom-end"
                  offset={10}
                  isNonModal={true}
                  backdrop="transparent"
                >
                  <PopoverTrigger>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDietSuggestions(!showDietSuggestions);
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-600 text-white transition hover:bg-yellow-700"
                      disabled={isLocked}
                    >
                      <Tooltip
                        content="Click to view diet suggestions"
                        placement="top"
                        isDisabled={showDietSuggestions}
                      >
                        <span className="flex h-full w-full items-center justify-center">
                          <FaLightbulb size={12} />
                        </span>
                      </Tooltip>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 max-w-[90vw] p-3 shadow-xl border border-slate-200 rounded-xl bg-white z-[10000] dark:border-[#273244] dark:bg-[#111726]"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {!isLocked && (
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-slate-700 dark:text-white">
                            Suggestions
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowDietSuggestions(false);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:text-white dark:hover:text-white"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                        <div className="max-h-52 overflow-y-auto overflow-x-hidden">
                          {dietarySuggestionsOptions.map((suggestion, idx) => {
                            const currentText = draft.clinicalNotes || "";
                            const isDuplicate = currentText
                              .toLowerCase()
                              .includes(suggestion.toLowerCase());

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  if (isDuplicate) {
                                    setShowDietSuggestions(false);
                                    return;
                                  }

                                  const currentText = draft.clinicalNotes || "";
                                  const newText = currentText
                                    ? `${currentText} ${suggestion}`
                                    : `${suggestion}`;
                                  upd("clinicalNotes", newText);

                                  // Keep popover open after selection
                                  setShowDietSuggestions(false);
                                }}
                                className={`mb-1 w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${isDuplicate
                                  ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-white dark:opacity-100"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-primary dark:text-white dark:hover:bg-[#151c2d]"
                                  }`}
                                disabled={isDuplicate}
                                title={
                                  isDuplicate
                                    ? "Already added"
                                    : "Add suggestion"
                                }
                              >
                                {suggestion}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          }
          icon={<FiCoffee className="h-4 w-4" />}
          iconTooltip="Dietary suggestions"
          iconClassName="bg-yellow-50 text-yellow-700"
          subtitle="Write dietary suggestions"
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={Boolean(draft.clinicalNotes?.trim())}
          openStateKey={`diet-${draft.clinicalNotes ?? ""}`}
        >
          <Textarea
            placeholder="Write dietary suggestions for the patient..."
            value={draft.clinicalNotes}
            onValueChange={(v) => upd("clinicalNotes", v)}
            minRows={3}
            variant="bordered"
            classNames={{ inputWrapper: "rounded-2xl border-slate-200" }}
            isDisabled={isLocked}
          />
        </SectionCard>
      ),

      Habits: (
        <SectionCard
          key="Habits"
          filled={sectionFilled.Habits}
          title="Habits"
          icon={<FiFlag className="h-4 w-4" />}
          iconTooltip="Habits"
          iconClassName="bg-slate-100 text-slate-600 dark:bg-[#172033] dark:text-white"
          subtitle="Smoking, Alcohol, Lifestyle, etc."
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={(draft.habits ?? []).length > 0}
          openStateKey={`habits-${(draft.habits ?? []).join("|")}`}
        >
          <div className="flex flex-wrap gap-2">
            {habitsOptions.map((h) => {
              const active = (draft.habits ?? []).some(
                (item) => item.toLowerCase() === h.toLowerCase(),
              );
              return (
                <button
                  key={h}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    const newHabits = toggleStrIn(draft.habits ?? [], h);
                    upd("habits", newHabits);
                  }}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    isLocked ? "cursor-not-allowed" : "",
                    active
                      ? "border-blue-200 bg-blue-50 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
                  ].join(" ")}
                >
                  {h}
                </button>
              );
            })}
          </div>
          {(draft.habits ?? []).length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {(draft.habits ?? []).map((habit) => (
                <span
                  key={habit}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-[#123730] dark:text-white"
                >
                  {habit}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        const newHabits = (draft.habits ?? []).filter(
                          (h) => h.toLowerCase() !== habit.toLowerCase(),
                        );
                        upd("habits", newHabits);
                      }}
                      className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-200 dark:hover:bg-[#46beae]/20"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </SectionCard>
      ),

      Vitals: (
        <span key="Vitals" className="block">
          <ActionRow
            title="Vitals"
            filled={sectionFilled.Vitals}
            icon={<FiActivity className="h-4 w-4" />}
            iconTooltip="Vitals"
            iconClassName="bg-cyan-50 text-cyan-700"
            subtitle="Current health measurements"
            onClick={openVitals}
            disabled={isLocked}
          >
            {vitalsChips.map((t) => (
              <MiniChip key={t}>{t}</MiniChip>
            ))}
          </ActionRow>
        </span>
      ),

      Allergy: (
        <SectionCard
          key="Allergy"
          filled={sectionFilled.Allergy}
          title="Allergy"
          icon={<FiAlertTriangle className="h-4 w-4" />}
          iconTooltip="Patient allergies"
          iconClassName="bg-rose-50 text-rose-600 dark:bg-[#172033] dark:text-white"
          subtitle="Add patient allergies"
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={allergyChips.length > 0}
          openStateKey={`allergy-${allergyChips.join("|")}`}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {allergyOptions.map((a) => {
              const active = allergyChips.some(
                (x) => x.toLowerCase() === a.toLowerCase(),
              );

              return (
                <button
                  key={a}
                  type="button"
                  disabled={isLocked}
                  onClick={() => toggleAllergyChip(a)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    isLocked ? "cursor-not-allowed" : "",
                    active
                      ? "border-primary/25 bg-primary/10 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
                  ].join(" ")}
                >
                  {a}
                </button>
              );
            })}
          </div>

          {allergyChips.length > 0 ? (
            <div className="mt-8 mb-2 flex flex-wrap gap-2">
              {allergyChips.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-blue-50 px-3 py-1 text-xs font-medium text-primary dark:border-[#46beae]/35 dark:bg-[#123730] dark:text-[#d8fff8]"
                >
                  {a}
                  {!isLocked ? (
                    <button
                      type="button"
                      onClick={() => removeAllergyChip(a)}
                      className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-[#46beae]/20"
                      aria-label={`Remove ${a}`}
                    >
                      <FiX size={12} className="text-primary dark:text-[#d8fff8]" />{" "}
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}

          <Input
            placeholder={
              allergyChips.length >= MAX_ALLERGIES
                ? `Max ${MAX_ALLERGIES} allergies added`
                : "Add allergy and press enter"
            }
            value={allergyInput}
            onValueChange={(v) => setAllergyInput(v)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (isLocked) return;
                addAllergyFromInput();
              }
            }}
            variant="bordered"
            classNames={FIELD_CN}
            isDisabled={isLocked || allergyChips.length >= MAX_ALLERGIES}
          />
        </SectionCard>
      ),

      Diagnosis: (
        <SectionCard
          key="Diagnosis"
          filled={sectionFilled.Diagnosis}
          title="Diagnosis"
          icon={<FiTarget className="h-4 w-4" />}
          iconTooltip="Diagnosis"
          iconClassName="bg-blue-50 text-blue-700"
          subtitle="Add diagnosis details"
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={splitChips(draft.provisionalDiagnosis ?? "").length > 0}
          openStateKey={`diagnosis-${draft.provisionalDiagnosis ?? ""}`}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {diagnosisOptions.map((d) => {
              const currentDiagnosis = splitChips(
                draft.provisionalDiagnosis ?? "",
              );
              const active = currentDiagnosis.some(
                (x) => x.toLowerCase() === d.toLowerCase(),
              );

              return (
                <button
                  key={d}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;

                    const current = splitChips(
                      draft.provisionalDiagnosis ?? "",
                    );
                    const has = current.some(
                      (x) => x.toLowerCase() === d.toLowerCase(),
                    );

                    const next = has
                      ? current.filter(
                        (x) => x.toLowerCase() !== d.toLowerCase(),
                      )
                      : [...current, d];

                    upd("provisionalDiagnosis", next.join(", "));
                  }}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    isLocked ? "cursor-not-allowed" : "",
                    active
                      ? "border-blue-200 bg-blue-50 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
                  ].join(" ")}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {splitChips(draft.provisionalDiagnosis ?? "").length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {splitChips(draft.provisionalDiagnosis ?? "").map((diag) => (
                <span
                  key={diag}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary dark:bg-[#123730] dark:text-white"
                >
                  {diag}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = splitChips(
                          draft.provisionalDiagnosis ?? "",
                        );
                        const next = current.filter(
                          (x) => x.toLowerCase() !== diag.toLowerCase(),
                        );
                        upd("provisionalDiagnosis", next.join(", "));
                      }}
                      className="grid h-4 w-4 place-items-center rounded-full hover:bg-primary/15"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </SectionCard>
      ),

      "Surgery Suggested": (
        <SectionCard
          key="Surgery Suggested"
          filled={sectionFilled["Surgery Suggested"]}
          title="Surgery Suggested"
          icon={<FiScissors className="h-4 w-4" />}
          iconTooltip="Surgery suggested"
          iconClassName="bg-fuchsia-50 text-fuchsia-600"
          subtitle="Add suggested surgery details"
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={surgeryChips.length > 0}
          openStateKey={`surgery-${surgeryChips.join("|")}`}
        >
          <div className="mb-3 flex flex-wrap gap-2 ">
            {surgeryOptions.map((opt) => {
              const active = surgeryChips.some(
                (x) => x.toLowerCase() === opt.toLowerCase(),
              );

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isLocked}
                  onClick={() => toggleSurgeryChip(opt)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    isLocked ? "cursor-not-allowed" : "",
                    active
                      ? "border-blue-200 bg-blue-50 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
                  ].join(" ")}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-8 mb-3 flex flex-wrap gap-2">
            {surgeryChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-blue-50 px-3 py-1 text-xs font-medium text-primary dark:border-[#46beae]/35 dark:bg-[#123730] dark:text-white"
              >
                {chip}
                {!isLocked ? (
                  <button
                    type="button"
                    onClick={() => removeSurgeryChip(chip)}
                    className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-100"
                    aria-label={`Remove ${chip}`}
                  >
                    <FiX size={12} className="text-primary" />{" "}
                  </button>
                ) : null}
              </span>
            ))}
          </div>

          <div className="mt-2 grid gap-2">
            <Input
              placeholder="Type and press Enter"
              value={surgeryInput}
              onValueChange={(v) => setSurgeryInput(v)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (isLocked) return;
                  addSurgeryFromInput();
                }
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked || surgeryChips.length >= 2}
            />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-white">
            {surgeryChips.length}/2 selected
          </div>
        </SectionCard>
      ),

      "Visiting Days": (
        <SectionCard
          key="Visiting Days"
          filled={sectionFilled["Visiting Days"]}
          title="Visiting Days"
          icon={<FiMapPin className="h-4 w-4" />}
          iconTooltip="Visiting days"
          iconClassName="bg-emerald-50 text-emerald-700"
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={
            (draft.visitingDays ?? []).length > 0 ||
            Boolean(draft.visitingNotes?.trim())
          }
          openStateKey={`visiting-${(draft.visitingDays ?? []).join("|")}-${draft.visitingNotes ?? ""}`}
        >
          <div className="grid gap-3">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-white">
                Select a visiting date
              </p>

              <button
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (isLocked) return;
                  setCalendarMonth(startOfMonth(new Date()));
                  visitingDaysModal.onOpen();
                }}
                className={[
                  "flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-left transition",
                  isLocked
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 dark:border-[#273244] dark:bg-[#172033]"
                    : "border-primary/30 bg-primary/5 hover:border-primary/50 dark:border-[#46beae]/35 dark:bg-[#123730]",
                ].join(" ")}
              >
                <span className="text-[13px] font-medium text-slate-700 dark:text-white">
                  Open calendar
                </span>

                <span className="text-xs font-semibold text-primary">
                  Select
                </span>
              </button>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-white">
                Visiting notes
              </p>

              <Textarea
                placeholder="Write visiting notes..."
                value={draft.visitingNotes ?? ""}
                onValueChange={(v) => upd("visitingNotes", v)}
                minRows={2}
                maxRows={4}
                variant="bordered"
                classNames={{
                  inputWrapper:
                    "rounded-2xl border-slate-200 bg-white dark:border-[#273244] dark:bg-[#0f1728]",
                  input:
                    "text-xs text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
                }}
                isDisabled={isLocked}
              />
            </div>

            {(draft.visitingDays ?? []).length > 0 ? (
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3">
                <div className="mb-2 text-xs font-semibold text-primary">
                  Selected Visiting Days
                </div>

                <div className="flex flex-wrap gap-2">
                  {(draft.visitingDays ?? []).map((day) => (
                    <span
                      key={day}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-[#46beae]/35 dark:bg-[#123730] dark:text-white"
                    >
                      <span className="text-primary">
                        {formatVisitingDay(day)}
                      </span>
                      {!isLocked ? (
                        <button
                          type="button"
                          onClick={() => removeVisitingDay(day)}
                          className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 transition hover:bg-primary/20"
                          aria-label={`Remove ${day}`}
                        >
                          <FiX size={12} className="text-primary" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-500 dark:border-[#273244] dark:bg-[#111726] dark:text-white">
                No visiting day selected yet
              </div>
            )}
          </div>
        </SectionCard>
      ),

      "Follow-Up (days)": (
        <SectionCard
          key="Follow-Up (days)"
          filled={sectionFilled["Follow-Up (days)"]}
          title="Follow-Up (days)"
          icon={<FiCalendar className="h-4 w-4" />}
          iconTooltip="Follow-up"
          iconClassName="bg-teal-50 text-teal-700"
          showTooltip={isLocked}
          tooltipText={lockMessage}
          defaultOpen={Boolean(draft.followUpDays || draft.followUpDate)}
          openStateKey={`followup-${draft.followUpDays ?? ""}-${draft.followUpDate ?? ""}`}
        >
          <div className="grid gap-3">
            <Input
              type="number"
              label="Follow-up in days"
              placeholder="Enter days"
              value={draft.followUpDays?.toString() ?? ""}
              onValueChange={(v) => {
                const n = v ? clamp(Number(v), 1, 365) : null;
                upd("followUpDays", Number.isFinite(n as number) ? n : null);
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
            />
            <Input
              type="date"
              readOnly
              label="Follow-up date"
              value={draft.followUpDate}
              onChange={(e) => upd("followUpDate", e.target.value)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
            />
          </div>
        </SectionCard>
      ),
    };

    // Only render sections that are present in headerOrder from API
    const sectionsToRender = panelHeaderOrder
      .filter((header) => sectionMap[header] != null)
      .map((header) => sectionMap[header]);

    return sectionsToRender;
  }, [
    addedTests,
    onAddTest,
    lockMessage,
    isLocked,
    draft,
    allergyInput,
    allergyChips,
    surgeryChips,
    vitalsChips,
    panelHeaderOrder,
    habitsOptions,
    allergyOptions,
    surgeryOptions,
    surgeryInput,
    diagnosisOptions,
    dietarySuggestionsOptions,
    showDietSuggestions,
    setShowDietSuggestions,
    sectionFilled,
  ]);

  return (
    <div className={["w-full ", className || ""].join(" ")}>
      {showComplaints && (
        <div className="mb-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Chief complaint"
              placeholder="Fever / Cough / Pain abdomen..."
              value={draft.chiefComplaint}
              onValueChange={(v) => upd("chiefComplaint", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
            />
            <Input
              label="Duration"
              placeholder="e.g., 3 days"
              value={draft.chiefComplaintDuration ?? ""}
              onValueChange={(v) => upd("chiefComplaintDuration", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
            />
            <Input
              label="Other complaints"
              placeholder="Headache, nausea..."
              value={draft.otherComplaints}
              onValueChange={(v) => upd("otherComplaints", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
            />
          </div>

          <Textarea
            label="Brief history (HOPI)"
            placeholder="Onset, progression, associated symptoms…"
            value={draft.history ?? ""}
            onValueChange={(v) => upd("history", v)}
            minRows={2}
            variant="bordered"
            classNames={{ inputWrapper: "rounded-2xl border-slate-200" }}
            className="mt-4"
            isDisabled={isLocked}
          />
        </div>
      )}
      {showRest && resolvedLayout === "panel" && (
        <div
          className={[
            "w-full min-h-0 space-y-1.5 pr-2",
            "pt-1 pb-20  lg:pb-18",
            allowParentScroll
              ? "h-auto overflow-visible"
              : [
                "h-[calc(100dvh-190px)]",
                "sm:h-[calc(100dvh-210px)]",
                "lg:h-[calc(100dvh-220px)]",
                "xl:h-[calc(100dvh-230px)]",
                "overflow-y-auto overflow-x-hidden overscroll-y-contain",
                "[scrollbar-gutter:stable]",
                "[&::-webkit-scrollbar]:w-1.5",
                "[&::-webkit-scrollbar-track]:rounded-full",
                "[&::-webkit-scrollbar-track]:bg-[#2f7d6e]/10",
                "[&::-webkit-scrollbar-thumb]:rounded-full",
                "[&::-webkit-scrollbar-thumb]:bg-[#2f7d6e]",
                "hover:[&::-webkit-scrollbar-thumb]:bg-[#256857]",
                "[scrollbar-color:#2f7d6e_#eaf2f0]",
                "[scrollbar-width:thin]",
              ].join(" "),
          ].join(" ")}
        >
          {/* Panel header — a plain label bar so it's clearly a header, not a tappable card */}
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-1 pb-2 pt-0.5 backdrop-blur dark:border-[#273244] dark:bg-[#111726]/95">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Clinical Details
              </span>
              {filledSectionCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  {filledSectionCount} filled
                </span>
              )}
            </div>

            {showPreferenceShortcut && (
              <Tooltip
                content="Customize which sections appear and their order"
                placement="left"
              >
                <button
                  type="button"
                  onClick={() => navigate("/profile/prescription-preference")}
                  className="group inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#1a2535] dark:hover:text-slate-200"
                  aria-label="Customize prescription sections"
                >
                  <FiSettings
                    size={13}
                    className="transition-transform duration-200 group-hover:rotate-45"
                  />
                  <span className="hidden whitespace-nowrap sm:inline">Customize</span>
                </button>
              </Tooltip>
            )}
          </div>

          {panelSections}
        </div>
      )}

      {showRest && resolvedLayout === "form" && (
        <>
          <div className="mb-5 rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Habits
            </div>
            <div className="flex flex-wrap gap-2">
              {habitsOptions.map((h) => {
                const active = (draft.habits ?? []).some(
                  (item) => item.toLowerCase() === h.toLowerCase(),
                );
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return;
                      const newHabits = toggleStrIn(draft.habits ?? [], h);
                      upd("habits", newHabits);
                    }}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      isLocked ? "cursor-not-allowed" : "",
                      active
                        ? "border-blue-200 bg-blue-50 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
                    ].join(" ")}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
            {(draft.habits ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(draft.habits ?? []).map((habit) => (
                  <span
                    key={habit}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-[#123730] dark:text-white"
                  >
                    {habit}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          const newHabits = (draft.habits ?? []).filter(
                            (h) => h.toLowerCase() !== habit.toLowerCase(),
                          );
                          upd("habits", newHabits);
                        }}
                        className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-200 dark:hover:bg-[#46beae]/20"
                      >
                        <FiX size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">
              Allergy
            </div>
            <div className="flex flex-wrap gap-2">
              {allergyOptions.map((a) => {
                const active = allergyChips.some(
                  (x) => x.toLowerCase() === a.toLowerCase(),
                );
                return (
                  <button
                    key={a}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleAllergyChip(a)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      isLocked ? "cursor-not-allowed" : "",
                      active
                        ? "border-blue-200 bg-blue-50 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
                    ].join(" ")}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            {allergyChips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {allergyChips.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 dark:border-[#46beae]/35 dark:bg-[#123730] dark:text-[#d8fff8]"
                  >
                    {a}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => removeAllergyChip(a)}
                        className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-[#46beae]/20"
                      >
                        <FiX size={12} className="text-current" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Diagnosis
            </div>
            <div className="flex flex-wrap gap-2">
              {diagnosisOptions.map((d) => {
                const active = splitChips(
                  draft.provisionalDiagnosis ?? "",
                ).some((x) => x.toLowerCase() === d.toLowerCase());

                return (
                  <button
                    key={d}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return;

                      const current = splitChips(
                        draft.provisionalDiagnosis ?? "",
                      );
                      const has = current.some(
                        (x) => x.toLowerCase() === d.toLowerCase(),
                      );
                      const next = has
                        ? current.filter(
                          (x) => x.toLowerCase() !== d.toLowerCase(),
                        )
                        : [...current, d];
                      upd("provisionalDiagnosis", next.join(", "));
                    }}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      isLocked ? "opacity-60 cursor-not-allowed" : "",
                      active
                        ? "border-blue-200 bg-blue-50 text-primary"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {splitChips(draft.provisionalDiagnosis ?? "").length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {splitChips(draft.provisionalDiagnosis ?? "").map((diag) => (
                  <span
                    key={diag}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {diag}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = splitChips(
                            draft.provisionalDiagnosis ?? "",
                          );
                          const next = current.filter(
                            (x) => x.toLowerCase() !== diag.toLowerCase(),
                          );
                          upd("provisionalDiagnosis", next.join(", "));
                        }}
                        className="grid h-4 w-4 place-items-center rounded-full hover:bg-blue-100"
                      >
                        <FiX size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 p-4 ">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Surgery Suggested
            </div>
            <div className="flex flex-wrap gap-2">
              {surgeryOptions.map((h) => {
                const active = surgeryChips.some(
                  (item) => item.toLowerCase() === h.toLowerCase(),
                );
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleSurgeryChip(h)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      isLocked ? "opacity-60 cursor-not-allowed" : "",
                      active
                        ? "border-blue-200 bg-blue-50 text-primary"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
            {surgeryChips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {surgeryChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {chip}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => removeSurgeryChip(chip)}
                        className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-100"
                      >
                        <FiX size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Vitals</div>
              <Button
                size="sm"
                radius="full"
                isDisabled={isLocked}
                onPress={() =>
                  commit({
                    ...draft,
                    vitals: {
                      ...draft.vitals,
                      bpSys: draft.vitals.bpSys ?? 120,
                      bpDia: draft.vitals.bpDia ?? 80,
                      pulse: draft.vitals.pulse ?? 78,
                      spo2: draft.vitals.spo2 ?? 98,
                      temperatureC: draft.vitals.temperatureC ?? 36.8,
                    },
                  })
                }
                className="bg-emerald-600 text-white hover:opacity-95"
              >
                Auto-Fill
              </Button>
            </div>
          </div>
        </>
      )}

      <CenterModal
        isOpen={visitingDaysModal.isOpen}
        onClose={visitingDaysModal.onClose}
        title="Select Visiting Day"
        footer={
          <div className="flex justify-end">
            <Button
              radius="full"
              variant="bordered"
              onPress={visitingDaysModal.onClose}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-[#273244] dark:bg-[#111726]">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-[#273244] dark:text-white dark:hover:bg-[#151c2d]"
            >
              <FiChevronLeft size={16} />
            </button>

            <div className="text-sm font-semibold text-slate-800 dark:text-white">
              {calendarMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>

            <button
              type="button"
              onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-[#273244] dark:text-white dark:hover:bg-[#151c2d]"
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-7 gap-2">
            {CALENDAR_DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-medium text-slate-400 dark:text-white"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dateKey = toDateKey(day);
              const isCurrentMonth =
                day.getMonth() === calendarMonth.getMonth();
              const isPast = startOfDay(day) < todayDate;
              const isSelected = (draft.visitingDays ?? []).includes(dateKey);

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={isLocked || isPast || !isCurrentMonth}
                  onClick={() => {
                    if (isLocked || isPast || !isCurrentMonth) return;

                    if (!(draft.visitingDays ?? []).includes(dateKey)) {
                      addVisitingDay(dateKey);
                    }

                    visitingDaysModal.onClose();
                  }}
                  className={[
                    "h-10 rounded-full text-sm font-medium transition",
                    !isCurrentMonth
                      ? "text-slate-300 dark:text-white"
                      : isPast
                        ? "cursor-not-allowed text-slate-300 dark:text-white"
                        : isSelected
                          ? "bg-[#14b8a6] text-white shadow-sm"
                          : "text-slate-700 hover:bg-primary/10 hover:text-primary dark:text-white dark:hover:bg-[#151c2d]",
                  ].join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </CenterModal>

      <RightDrawer
        isOpen={vitalsModal.isOpen}
        onClose={vitalsModal.onClose}
        title="Vitals"
        subtitle="Current health measurements"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              radius="full"
              variant="bordered"
              onPress={vitalsModal.onClose}
            >
              Cancel
            </Button>
            <Button
              radius="full"
              color="primary"
              onPress={saveVitals}
              isDisabled={
                isLocked ||
                Object.values(vitalErrors).some((error) => error !== null)
              }
            >
              Save Vitals
            </Button>
          </div>
        }
      >
        <div className="flex justify-start">
          <Button
            radius="full"
            size="sm"
            onPress={autoFillVitals}
            className="bg-primary text-white"
            isDisabled={isLocked}
          >
            Auto-Fill
          </Button>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <Input
              label="BP (Sys)"
              placeholder="e.g. 120"
              type="text"
              inputMode="numeric"
              maxLength={3}
              endContent={<span className="text-xs text-slate-500 dark:text-white">mmHg</span>}
              value={vitalsTemp.bpSys?.toString() ?? ""}
              onValueChange={(raw) => {
                const s = sanitizeInt(raw, 3);
                const value = s === "" ? null : Number(s);
                setVitalsTemp((p) => ({ ...p, bpSys: value }));
                const error = validateVital("bpSys", value);
                setVitalErrors((prev) => ({ ...prev, bpSys: error }));
              }}
              onBlur={() => {
                const norm = normalizeVitals(vitalsTemp);
                setVitalsTemp((p) => ({ ...p, bpSys: norm.bpSys ?? null }));
                const error = validateVital("bpSys", norm.bpSys);
                setVitalErrors((prev) => ({ ...prev, bpSys: error }));
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors.bpSys}
            />
            {vitalErrors.bpSys && (
              <div className="mt-1 text-xs text-danger">
                {vitalErrors.bpSys}
              </div>
            )}
          </div>

          <div>
            <Input
              label="BP (Dia)"
              placeholder="e.g. 80"
              type="text"
              inputMode="numeric"
              maxLength={3}
              endContent={<span className="text-xs text-slate-500 dark:text-white">mmHg</span>}
              value={vitalsTemp.bpDia?.toString() ?? ""}
              onValueChange={(raw) => {
                const s = sanitizeInt(raw, 3);
                const value = s === "" ? null : Number(s);
                setVitalsTemp((p) => ({ ...p, bpDia: value }));
                const error = validateVital("bpDia", value);
                setVitalErrors((prev) => ({ ...prev, bpDia: error }));
              }}
              onBlur={() => {
                const norm = normalizeVitals(vitalsTemp);
                setVitalsTemp((p) => ({ ...p, bpDia: norm.bpDia ?? null }));
                const error = validateVital("bpDia", norm.bpDia);
                setVitalErrors((prev) => ({ ...prev, bpDia: error }));
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors.bpDia}
            />
            {vitalErrors.bpDia && (
              <div className="mt-1 text-xs text-danger">
                {vitalErrors.bpDia}
              </div>
            )}
          </div>

          <div>
            <Input
              label="Pulse"
              placeholder="e.g. 78"
              type="text"
              inputMode="numeric"
              maxLength={3}
              endContent={<span className="text-xs text-slate-500 dark:text-white">bpm</span>}
              value={vitalsTemp.pulse?.toString() ?? ""}
              onValueChange={(raw) => {
                const s = sanitizeInt(raw, 3);
                const value = s === "" ? null : Number(s);
                setVitalsTemp((p) => ({ ...p, pulse: value }));
                const error = validateVital("pulse", value);
                setVitalErrors((prev) => ({ ...prev, pulse: error }));
              }}
              onBlur={() => {
                const norm = normalizeVitals(vitalsTemp);
                setVitalsTemp((p) => ({ ...p, pulse: norm.pulse ?? null }));
                const error = validateVital("pulse", norm.pulse);
                setVitalErrors((prev) => ({ ...prev, pulse: error }));
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors.pulse}
            />
            {vitalErrors.pulse && (
              <div className="mt-1 text-xs text-danger">
                {vitalErrors.pulse}
              </div>
            )}
          </div>

          <div>
            <Input
              label="SpO2"
              placeholder="e.g. 98"
              type="text"
              inputMode="numeric"
              maxLength={3}
              endContent={<span className="text-xs text-slate-500 dark:text-white">%</span>}
              value={vitalsTemp.spo2?.toString() ?? ""}
              onValueChange={(raw) => {
                const s = sanitizeInt(raw, 3);
                const value = s === "" ? null : Number(s);
                setVitalsTemp((p) => ({ ...p, spo2: value }));
                const error = validateVital("spo2", value);
                setVitalErrors((prev) => ({ ...prev, spo2: error }));
              }}
              onBlur={() => {
                const norm = normalizeVitals(vitalsTemp);
                setVitalsTemp((p) => ({ ...p, spo2: norm.spo2 ?? null }));
                const error = validateVital("spo2", norm.spo2);
                setVitalErrors((prev) => ({ ...prev, spo2: error }));
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors.spo2}
            />
            {vitalErrors.spo2 && (
              <div className="mt-1 text-xs text-danger">{vitalErrors.spo2}</div>
            )}
          </div>

          <div>
            <Input
              label="Temperature"
              placeholder="e.g. 36.8"
              type="text"
              inputMode="decimal"
              maxLength={4}
              endContent={<span className="text-xs text-slate-500 dark:text-white">°C</span>}
              value={vitalsTemp.temperatureC?.toString() ?? ""}
              onValueChange={(raw) => {
                const s = sanitizeTemp(raw);
                const value = s === "" ? null : Number(s);
                setVitalsTemp((p) => ({
                  ...p,
                  temperatureC: value,
                }));
                const error = validateVital("temperatureC", value);
                setVitalErrors((prev) => ({ ...prev, temperatureC: error }));
              }}
              onBlur={() => {
                const norm = normalizeVitals(vitalsTemp);
                setVitalsTemp((p) => ({
                  ...p,
                  temperatureC: norm.temperatureC ?? null,
                }));
                const error = validateVital("temperatureC", norm.temperatureC);
                setVitalErrors((prev) => ({ ...prev, temperatureC: error }));
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors.temperatureC}
            />
            {vitalErrors.temperatureC && (
              <div className="mt-1 text-xs text-danger">
                {vitalErrors.temperatureC}
              </div>
            )}
          </div>

          <div>
            <Input
              label="Height"
              placeholder="e.g. 170"
              type="text"
              inputMode="numeric"
              maxLength={3}
              endContent={<span className="text-xs text-slate-500 dark:text-white">cm</span>}
              value={vitalsTemp.heightCm?.toString() ?? ""}
              onValueChange={(raw) => {
                const s = sanitizeInt(raw, 3);
                const value = s === "" ? null : Number(s);
                setVitalsTemp((p) => ({
                  ...p,
                  heightCm: value,
                }));
                const error = validateVital("heightCm", value);
                setVitalErrors((prev) => ({ ...prev, heightCm: error }));
              }}
              onBlur={() => {
                const norm = normalizeVitals(vitalsTemp);
                setVitalsTemp((p) => ({
                  ...p,
                  heightCm: norm.heightCm ?? null,
                }));
                const error = validateVital("heightCm", norm.heightCm);
                setVitalErrors((prev) => ({ ...prev, heightCm: error }));
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors.heightCm}
            />
            {vitalErrors.heightCm && (
              <div className="mt-1 text-xs text-danger">
                {vitalErrors.heightCm}
              </div>
            )}
          </div>

          <div>
            <Input
              label="Weight"
              placeholder="e.g. 65"
              type="text"
              inputMode="numeric"
              maxLength={3}
              endContent={<span className="text-xs text-slate-500 dark:text-white">kg</span>}
              value={vitalsTemp.weightKg?.toString() ?? ""}
              onValueChange={(raw) => {
                const s = sanitizeInt(raw, 3);
                const value = s === "" ? null : Number(s);
                setVitalsTemp((p) => ({
                  ...p,
                  weightKg: value,
                }));
                const error = validateVital("weightKg", value);
                setVitalErrors((prev) => ({ ...prev, weightKg: error }));
              }}
              onBlur={() => {
                const norm = normalizeVitals(vitalsTemp);
                setVitalsTemp((p) => ({
                  ...p,
                  weightKg: norm.weightKg ?? null,
                }));
                const error = validateVital("weightKg", norm.weightKg);
                setVitalErrors((prev) => ({ ...prev, weightKg: error }));
              }}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors.weightKg}
            />
            {vitalErrors.weightKg && (
              <div className="mt-1 text-xs text-danger">
                {vitalErrors.weightKg}
              </div>
            )}
          </div>

          <Input
            label="BMI"
            isReadOnly
            value={
              calcBmi(vitalsTemp.heightCm, vitalsTemp.weightKg)?.toString() ??
              ""
            }
            variant="bordered"
            classNames={FIELD_CN}
          />
        </div>
      </RightDrawer>
    </div>
  );
};

export default PrescriptionDetails;
