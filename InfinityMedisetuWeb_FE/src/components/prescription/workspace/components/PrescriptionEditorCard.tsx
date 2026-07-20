import { Input } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiMoon,
  FiStar,
  FiSun,
  FiSunrise,
  FiX,
} from "react-icons/fi";
import {
  buildDosePattern,
  buildScheduleText,
  calcTotalDoses,
  clampDoctorDays,
  clampDoctorWeeks,
  countOccurrenceDays,
  MAX_DOCTOR_DURATION_DAYS,
  MAX_DOCTOR_DURATION_WEEKS,
  recalcEveryNDaysDuration,
  TOPICAL_FORMS,
  withDoseModeMemory,
} from "../helpers/doseHelpers";
import { formatStrength } from "../helpers/medicineMappers";
import type { Dose, DoseFrequency, SelectedMed } from "../types";

const COMPACT_ORAL_FORMS = [
  "tablet",
  "capsule",
  "lozenge",
  "syrup",
  "suspension",
];

const COMPACT_APPLICATION_FORMS = [
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
];

const INJECTION_FORM = "injection";

const INJECTION_ROUTE_OPTIONS = ["IV", "IM", "SC", "ID"] as const;

const SCHEDULE_PATTERN_OPTIONS = [
  "0-0-0",
  "0-0-1",
  "0-0-2",
  "0-1-0",
  "0-1-1",
  "0-1-2",
  "0-2-0",
  "0-2-1",
  "0-2-2",
  "1-0-0",
  "1-0-1",
  "1-0-2",
  "1-1-0",
  "1-1-1",
  "1-1-2",
  "1-2-0",
  "1-2-1",
  "1-2-2",
  "2-0-0",
  "2-0-1",
  "2-0-2",
  "2-1-0",
  "2-1-1",
  "2-1-2",
  "2-2-0",
  "2-2-1",
  "2-2-2",
];
const SCHEDULE_PATTERN_SUGGESTIONS = SCHEDULE_PATTERN_OPTIONS.map(
  (pattern) => ({
    pattern,
    digits: pattern.replace(/-/g, ""),
    label: pattern === "0-0-0" ? "None" : pattern,
  }),
);

const FOOD_TIMING_OPTIONS = [
  "Before Food",
  "After Food",
  "Empty stomach",
] as const;

type StandardFoodTiming = (typeof FOOD_TIMING_OPTIONS)[number];
type FoodTimingMode = StandardFoodTiming | "Custom";

const isStandardFoodTiming = (value: string): value is StandardFoodTiming =>
  FOOD_TIMING_OPTIONS.some((option) => option === value);

const getFoodTimingMode = (value: string): FoodTimingMode => {
  if (isStandardFoodTiming(value)) return value;
  return value ? "Custom" : "After Food";
};

const controlClassName =
  "h-9 w-full min-w-0 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:z-10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-[#273244] dark:bg-[#0f1728] dark:text-white dark:placeholder-slate-500 dark:focus:border-[#46beae]/60 dark:focus:ring-[#46beae]/20 dark:disabled:bg-[#111726] dark:disabled:text-slate-500";

const Segmented: React.FC<{
  value: DoseFrequency;
  disabled?: boolean;
  onChange: (v: DoseFrequency) => void;
}> = ({ value, disabled, onChange }) => {
  const item = (key: DoseFrequency, label: string) => {
    const active = value === key;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(key)}
        className={[
          "rounded-full px-4 py-1.5 text-sm transition",
          disabled ? "cursor-not-allowed opacity-60" : "",
          active
            ? "bg-white shadow-sm text-slate-900 dark:bg-[#1e293b] dark:text-white"
            : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-[#1a2235]">
      {item("daily", "Daily")}
      {item("weekly", "Weekly")}
      {item("every_n_days", "Custom")}
    </div>
  );
};

const ScheduleDoseButton: React.FC<{
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
}> = ({ active, disabled, onClick, label, icon }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "group relative inline-flex h-9 w-full min-w-0 items-center justify-center gap-0 overflow-hidden rounded-full border px-1 text-[11px] font-semibold leading-none transition-all duration-300 cursor-pointer",
        "2xl:gap-1.5 2xl:px-2.5 2xl:text-[13px]",
        disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5",
        active
          ? "border-emerald-600 bg-emerald-700 text-white shadow-sm shadow-emerald-100 dark:border-emerald-500 dark:shadow-emerald-900/30"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#273244] dark:bg-[#0f1728] dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400",
      ].join(" ")}
      title={label}
    >
      <span
        className={[
          "absolute inset-0 opacity-0 transition-opacity duration-300",
          active
            ? "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 opacity-100"
            : "group-hover:bg-emerald-50 group-hover:opacity-100 dark:group-hover:bg-emerald-950/30",
        ].join(" ")}
      />

      <span
        className={[
          "relative z-10 hidden h-5 w-5 place-items-center rounded-full transition-all duration-300 2xl:grid",
          active
            ? "bg-white/20 text-white group-hover:rotate-12 group-hover:scale-110"
            : "bg-emerald-50 text-emerald-700 group-hover:rotate-12 group-hover:scale-110 dark:bg-emerald-950/50 dark:text-emerald-400",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="relative z-10 block max-w-full truncate whitespace-nowrap leading-none">
        {label}
      </span>

      {active && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse 2xl:right-1.5 2xl:top-1.5" />
      )}
    </button>
  );
};

const TimingOptionButton: React.FC<{
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label: string;
}> = ({ active, disabled, onClick, label }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "group relative inline-flex h-8 w-full min-w-0 items-center justify-center overflow-hidden rounded-full border px-1 text-[10px] font-semibold transition-all duration-300 cursor-pointer",
        "min-[390px]:px-1.5 min-[390px]:text-[11px]",
        "sm:h-9 sm:w-auto sm:min-w-[92px] sm:px-2 sm:text-[12px]",
        "lg:min-w-[96px] xl:min-w-[102px]",
        disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5",
        active
          ? "border-emerald-600 bg-emerald-700 text-white shadow-sm shadow-emerald-100 dark:border-emerald-500 dark:shadow-emerald-900/30"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#273244] dark:bg-[#0f1728] dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400",
      ].join(" ")}
      title={label}
    >
      <span
        className={[
          "absolute inset-0 opacity-0 transition-opacity duration-300",
          active
            ? "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 opacity-100"
            : "group-hover:bg-emerald-50 group-hover:opacity-100 dark:group-hover:bg-emerald-950/30",
        ].join(" ")}
      />

      <span className="relative z-10 block max-w-full truncate whitespace-nowrap leading-none">
        {label}
      </span>

      {active && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse sm:right-1.5 sm:top-1.5" />
      )}
    </button>
  );
};
const PrescriptionEditorCard: React.FC<{
  index?: number;
  med: SelectedMed;
  canEdit: boolean;
  canRemove?: boolean;
  isFavorite?: boolean;
  onRemove: () => void;
  onToggleFavorite?: () => void;
  onDoseChange: (updater: (d: Dose) => Dose) => void;
  onFoodChange: (v: string) => void;
  onDosageChange: (v: string) => void;
  onCollapse?: () => void;
}> = ({
  index,
  med,
  canEdit,
  canRemove = true,
  isFavorite = false,
  onRemove,
  onToggleFavorite,
  onDoseChange,
  onFoodChange,
  onDosageChange,
  onCollapse,
}) => {
    const d = med.details || {};
    const dose = med.dose;

    const [dosage, setDosage] = useState(d?.dosage || "");
    const initialFood = String(d?.notes ?? "");
    const initialFoodModeValue = initialFood.trim();
    const [customFood, setCustomFood] = useState(
      initialFoodModeValue && !isStandardFoodTiming(initialFoodModeValue)
        ? initialFood
        : "",
    );
    const [timingMode, setTimingMode] = useState<FoodTimingMode>(
      getFoodTimingMode(initialFoodModeValue),
    );
    const [schedulePatternInput, setSchedulePatternInput] = useState("");
    const [showScheduleSuggestions, setShowScheduleSuggestions] =
      useState(false);
    const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
    const [isFoodTimingDropdownOpen, setIsFoodTimingDropdownOpen] =
      useState(false);
    const scheduleInputWrapperRef = useRef<HTMLDivElement | null>(null);
    const routeDropdownRef = useRef<HTMLDivElement | null>(null);
    const foodTimingDropdownRef = useRef<HTMLDivElement | null>(null);
    const [scheduleSuggestionsStyle, setScheduleSuggestionsStyle] =
      useState<React.CSSProperties | null>(null);

    useEffect(() => {
      if (d?.dosage !== undefined) {
        setDosage(d.dosage);
      }
    }, [d?.dosage]);

    const doses = Math.max(0, calcTotalDoses(dose));

    const displayForm = String(
      d?.form ??
      (med as any)?.form ??
      (med as any)?.medicine?.form ??
      (med as any)?.details?.medicine?.form ??
      "",
    ).trim();

    // Get form and determine type
    const actualFormKey = displayForm.toLowerCase().trim();
    const formKey = actualFormKey || "tablet";
    const medicineName = (d.medicineName || med.name || "").trim() || "Medicine";
    const strengthText = formatStrength(d.strength);
    const strengthNumber = strengthText.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
    const showStrengthText =
      strengthText &&
        !medicineName.toLowerCase().includes(strengthText.toLowerCase()) &&
        (!strengthNumber || !medicineName.toLowerCase().includes(strengthNumber))
        ? strengthText
        : "";
    const isTopical = TOPICAL_FORMS.some(
      (f) => f.toLowerCase() === formKey,
    );
    const isCompactOralForm = COMPACT_ORAL_FORMS.includes(formKey);
    const isCompactApplicationForm =
      COMPACT_APPLICATION_FORMS.includes(formKey);
    const isInjectionForm = formKey === INJECTION_FORM;
    const detailsFrequency = String(d?.frequency ?? "").trim();
    const usesNoSchedulePayload =
      detailsFrequency === "-" || detailsFrequency === "0-0-0";
    const isCustomTimingRequired =
      timingMode === "Custom" && customFood.trim() === "";
    const shouldUseRouteLayout =
      isInjectionForm ||
      (actualFormKey
        ? !isCompactOralForm && !isCompactApplicationForm
        : usesNoSchedulePayload);


    // const food = (d?.notes || getDefaultFoodText()).trim();
    const rawFood = String(d?.notes ?? "");
    const food = rawFood.trim();

    useEffect(() => {
      if (d?.notes === undefined) return;

      if (!food) {
        setCustomFood("");
        return;
      }

      if (isStandardFoodTiming(food)) {
        setTimingMode(food);
        setCustomFood("");
        return;
      }

      setTimingMode("Custom");
      setCustomFood(rawFood);
    }, [d?.notes, food, rawFood]);

    const getFoodOptions = () => {

      // Dental specific forms
      // const dentalForms = [
      //   "Dental Cement",
      //   "Mouthwash",
      //   "Oral Rinse",
      //   "Dental Varnish",
      //   "Mouth Gel",
      //   "Toothpaste",
      // ];
      // const isDental = dentalForms.some(
      //   (f) => f.toLowerCase() === (form || "").toLowerCase(),
      // );

      // if (isDental) {
      //   return [
      //     { value: "After brushing", label: "After brushing" },
      //     { value: "Before bed", label: "Before bed" },
      //     { value: "After meals", label: "After meals" },
      //     { value: "As directed", label: "As directed" },
      //     { value: "Apply to affected area", label: "Apply to affected area" },
      //     { value: "Rinse for 30 seconds", label: "Rinse for 30 seconds" },
      //   ];
      // }

      // if (isTopical) {
      //   return [
      //     { value: "Morning & Evening", label: "Morning & Evening" },
      //     { value: "Night", label: "Night" },
      //     { value: "As needed", label: "As needed" },
      //     { value: "After bath", label: "After bath" },
      //     { value: "Before bed", label: "Before bed" },
      //   ];
      // }
      // if (isLiquid) {
      //   return [
      //     { value: "Before Food", label: "Before Food" },
      //     { value: "After Food", label: "After Food" },
      //     { value: "Empty stomach", label: "Empty stomach" },
      //     { value: "As directed", label: "As directed" },
      //   ];
      // }
      // if (form === "Injection") {
      //   return [
      //     { value: "Now", label: "Now" },
      //     { value: "Stat", label: "Stat" },
      //     { value: "As directed", label: "As directed" },
      //   ];
      // }
      // if (form === "Inhaler") {
      //   return [
      //     { value: "As needed", label: "As needed" },
      //     { value: "Morning", label: "Morning" },
      //     { value: "Morning & Evening", label: "Morning & Evening" },
      //     { value: "Before bed", label: "Before bed" },
      //   ];
      // }
      // Default for tablets/capsules


      return [
        { value: "Before Food", label: "Before Food" },
        { value: "After Food", label: "After Food" },

        { value: "Empty stomach", label: "Empty stomach" },
      ];
    };
    const rememberedDose = withDoseModeMemory(dose);

    const safeDays = clampDoctorDays(Number(rememberedDose.dailyDays || 1));
    const safeWeeks = clampDoctorWeeks(Number(rememberedDose.weeklyWeeks || 1));
    const safeInterval = Math.max(
      1,
      Math.floor(Number(rememberedDose.customIntervalDays || 2)),
    );
    const desiredRepeatCount = Math.max(
      1,
      Math.floor(
        Number(
          rememberedDose.customTargetDoses ||
          rememberedDose.targetDoses ||
          countOccurrenceDays({
            ...rememberedDose,
            frequency: "every_n_days",
          }) ||
          1,
        ),
      ),
    );

    const toggleTime = (key: "morning" | "noon" | "night") => {
      onDoseChange((prev) => {
        const countKey = `${key}Count` as
          | "morningCount"
          | "noonCount"
          | "nightCount";
        const enabled = !prev[key];
        const next = {
          ...prev,
          [key]: enabled,
          [countKey]: enabled ? Math.max(1, Number(prev[countKey] || 1)) : 0,
        } as Dose;

        if (!next.morning && !next.noon && !next.night) return prev;
        if (next.frequency === "every_n_days")
          return recalcEveryNDaysDuration(next);
        return next;
      });
    };

    const changeFreq = (nextFreq: DoseFrequency) => {
      onDoseChange((prev) => {
        const currentBase = withDoseModeMemory(prev);

        const current: Dose = {
          ...currentBase,
          dailyDays:
            currentBase.frequency === "daily"
              ? clampDoctorDays(
                Number(currentBase.days || currentBase.dailyDays || 1),
              )
              : currentBase.dailyDays,
          weeklyWeeks:
            currentBase.frequency === "weekly"
              ? clampDoctorWeeks(
                Math.ceil(Math.max(1, Number(currentBase.days || 1)) / 7),
              )
              : currentBase.weeklyWeeks,
          customIntervalDays:
            currentBase.frequency === "every_n_days"
              ? Math.min(
                MAX_DOCTOR_DURATION_DAYS,
                Math.max(
                  1,
                  Math.floor(
                    Number(
                      currentBase.intervalDays ||
                      currentBase.customIntervalDays ||
                      2,
                    ),
                  ),
                ),
              )
              : currentBase.customIntervalDays,
          customTargetDoses:
            currentBase.frequency === "every_n_days"
              ? Math.max(
                1,
                Math.floor(
                  Number(
                    currentBase.targetDoses ||
                    currentBase.customTargetDoses ||
                    1,
                  ),
                ),
              )
              : currentBase.customTargetDoses,
        };

        if (nextFreq === "daily") {
          return withDoseModeMemory({
            ...current,
            frequency: "daily",
            days: clampDoctorDays(Number(current.dailyDays || 1)),
          });
        }

        if (nextFreq === "weekly") {
          const weeks = clampDoctorWeeks(Number(current.weeklyWeeks || 1));
          return withDoseModeMemory({
            ...current,
            frequency: "weekly",
            days: clampDoctorDays(weeks * 7),
            weeklyWeeks: weeks,
          });
        }

        const interval = Math.min(
          MAX_DOCTOR_DURATION_DAYS,
          Math.max(
            1,
            Math.floor(
              Number(current.customIntervalDays || current.intervalDays || 2),
            ),
          ),
        );

        const repeatCount = Math.max(
          1,
          Math.floor(
            Number(
              current.customTargetDoses ||
              current.targetDoses ||
              countOccurrenceDays({
                ...current,
                frequency: "every_n_days",
                intervalDays: interval,
              }) ||
              1,
            ),
          ),
        );

        return withDoseModeMemory(
          recalcEveryNDaysDuration({
            ...current,
            frequency: "every_n_days",
            intervalDays: interval,
            targetDoses: repeatCount,
            customIntervalDays: interval,
            customTargetDoses: repeatCount,
          }),
        );
      });
    };

    const compactFrequency = dose.frequency === "weekly" ? "weekly" : "daily";
    const schedulePattern = buildDosePattern(dose);
    const selectedSchedulePattern = SCHEDULE_PATTERN_OPTIONS.includes(
      schedulePattern,
    )
      ? schedulePattern
      : "1-0-1";
    const selectedSchedulePatternLabel =
      selectedSchedulePattern === "0-0-0" ? "None" : selectedSchedulePattern;

    useEffect(() => {
      setSchedulePatternInput(selectedSchedulePatternLabel);
    }, [selectedSchedulePatternLabel]);

    const [isScheduleJustOpened, setIsScheduleJustOpened] = useState(false);
    const schedulePatternSearchDigits = schedulePatternInput.replace(
      /[^012]/g,
      "",
    );
    // Show all suggestions when dropdown first opens, filter only when user types
    const schedulePatternSuggestions = isScheduleJustOpened
      ? SCHEDULE_PATTERN_SUGGESTIONS
      : SCHEDULE_PATTERN_SUGGESTIONS.filter(
        ({ digits }) =>
          !schedulePatternSearchDigits ||
          digits.startsWith(schedulePatternSearchDigits),
      );

    useEffect(() => {
      if (!showScheduleSuggestions) {
        setScheduleSuggestionsStyle(null);
        return;
      }

      const updatePosition = () => {
        const rect = scheduleInputWrapperRef.current?.getBoundingClientRect();
        if (!rect) return;

        const dropdownMaxHeight = 240; // keep compact so it overlays less content
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;

        // If not enough space below but more space above, show above
        const showAbove = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;

        setScheduleSuggestionsStyle({
          left: rect.left,
          top: showAbove ? undefined : rect.bottom + 6,
          bottom: showAbove ? window.innerHeight - rect.top + 6 : undefined,
          width: rect.width,
          maxHeight: Math.min(dropdownMaxHeight, showAbove ? spaceAbove : spaceBelow),
        } as React.CSSProperties);
      };

      updatePosition();

      // Listen to both window scroll and any scrollable ancestor (e.g. modal body)
      const scrollableParent = scheduleInputWrapperRef.current?.closest(
        "[class*='overflow-y-auto'], [class*='overflow-auto'], [style*='overflow']"
      );

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      scrollableParent?.addEventListener("scroll", updatePosition);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
        scrollableParent?.removeEventListener("scroll", updatePosition);
      };
    }, [showScheduleSuggestions]);

    useEffect(() => {
      if (!isRouteDropdownOpen) return;

      const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
        if (!routeDropdownRef.current) return;
        if (!(event.target instanceof Node)) return;
        if (!routeDropdownRef.current.contains(event.target)) {
          setIsRouteDropdownOpen(false);
        }
      };

      document.addEventListener("mousedown", handleOutsidePress);
      document.addEventListener("touchstart", handleOutsidePress);

      return () => {
        document.removeEventListener("mousedown", handleOutsidePress);
        document.removeEventListener("touchstart", handleOutsidePress);
      };
    }, [isRouteDropdownOpen]);

    useEffect(() => {
      if (!isFoodTimingDropdownOpen) return;

      const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
        if (!foodTimingDropdownRef.current) return;
        if (!(event.target instanceof Node)) return;
        if (!foodTimingDropdownRef.current.contains(event.target)) {
          setIsFoodTimingDropdownOpen(false);
        }
      };

      document.addEventListener("mousedown", handleOutsidePress);
      document.addEventListener("touchstart", handleOutsidePress);

      return () => {
        document.removeEventListener("mousedown", handleOutsidePress);
        document.removeEventListener("touchstart", handleOutsidePress);
      };
    }, [isFoodTimingDropdownOpen]);

    const getSchedulePatternFromInput = (value: string) => {
      const trimmedValue = value.trim();
      const digitValue = trimmedValue.replace(/-/g, "");

      if (trimmedValue.toLowerCase() === "none") return "0-0-0";
      if (/^[0-2]-[0-2]-[0-2]$/.test(trimmedValue)) return trimmedValue;
      if (/^[0-2]{3}$/.test(digitValue)) {
        return `${digitValue[0]}-${digitValue[1]}-${digitValue[2]}`;
      }

      return "";
    };

    const changeSchedulePattern = (pattern: string) => {
      const [morningCount, noonCount, nightCount] = pattern
        .split("-")
        .map((part) => Math.min(2, Math.max(0, Number(part) || 0)));

      onDoseChange((prev) => {
        const next: Dose = {
          ...prev,
          morning: morningCount > 0,
          noon: noonCount > 0,
          night: nightCount > 0,
          morningCount,
          noonCount,
          nightCount,
        };

        if (next.frequency === "every_n_days") {
          return recalcEveryNDaysDuration(next);
        }

        return next;
      });
    };

    const handleSchedulePatternInputChange = (value: string) => {
      const digits = value.replace(/[^012]/g, "").slice(0, 3);
      const nextPattern = getSchedulePatternFromInput(digits);
      setShowScheduleSuggestions(true);
      setIsScheduleJustOpened(false);

      if (!nextPattern || !SCHEDULE_PATTERN_OPTIONS.includes(nextPattern)) {
        setSchedulePatternInput(digits);
        return;
      }

      changeSchedulePattern(nextPattern);
      setSchedulePatternInput(
        nextPattern === "0-0-0" ? "None" : nextPattern,
      );
      setShowScheduleSuggestions(false);
    };

    const selectSchedulePattern = (pattern: string) => {
      if (!SCHEDULE_PATTERN_OPTIONS.includes(pattern)) return;

      changeSchedulePattern(pattern);
      setSchedulePatternInput(pattern === "0-0-0" ? "None" : pattern);
      setShowScheduleSuggestions(false);
    };

    const handleSchedulePatternInputKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const nextPattern = getSchedulePatternFromInput(schedulePatternInput);

        if (nextPattern && SCHEDULE_PATTERN_OPTIONS.includes(nextPattern)) {
          selectSchedulePattern(nextPattern);
        }

        return;
      }

      if (e.key === "Escape") {
        setShowScheduleSuggestions(false);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const allowedControlKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Enter",
        "Escape",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ];

      if (allowedControlKeys.includes(e.key)) return;
      if (/^[0-2]$/.test(e.key)) return;
      if (e.key === "-") return;

      e.preventDefault();
    };

    const handleSchedulePatternInputBlur = () => {
      const nextPattern = getSchedulePatternFromInput(schedulePatternInput);

      if (nextPattern && SCHEDULE_PATTERN_OPTIONS.includes(nextPattern)) {
        changeSchedulePattern(nextPattern);
        setSchedulePatternInput(
          nextPattern === "0-0-0" ? "None" : nextPattern,
        );
        setShowScheduleSuggestions(false);
        return;
      }

      setSchedulePatternInput(selectedSchedulePatternLabel);
      setShowScheduleSuggestions(false);
    };

    const scheduleSuggestionsMenu =
      showScheduleSuggestions && canEdit && scheduleSuggestionsStyle ? (
        <div
          style={scheduleSuggestionsStyle}
          className="fixed z-[9999] min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            className="overflow-y-auto overflow-x-hidden [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[scrollbar-color:#334155_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-[#334155]"
            style={{ maxHeight: "inherit" }}
          >
            {schedulePatternSuggestions.length > 0 ? (
              schedulePatternSuggestions.map(({ digits, pattern, label }) => {
                const isSelected = pattern === selectedSchedulePattern;

                return (
                  <button
                    key={pattern}
                    type="button"
                    onClick={() => selectSchedulePattern(pattern)}
                    className={[
                      "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-semibold transition",
                      isSelected
                        ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                        : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                    ].join(" ")}
                  >
                    <span className="whitespace-nowrap">{digits}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className={[
                          "text-xs font-medium whitespace-nowrap",
                          isSelected
                            ? "text-teal-600 dark:text-[#9be7dc]"
                            : "text-slate-400 dark:text-slate-400",
                        ].join(" ")}
                      >
                        {label}
                      </span>
                      {isSelected && <FiCheck className="h-4 w-4 shrink-0" />}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                No matching schedule
              </div>
            )}
          </div>
        </div>
      ) : null;

    const changeTimingMode = (nextMode: FoodTimingMode) => {
      setTimingMode(nextMode);

      if (nextMode === "Custom") {
        onFoodChange(customFood);
        return;
      }

      setCustomFood("");
      onFoodChange(nextMode);
    };

    const selectTimingMode = (nextMode: FoodTimingMode) => {
      changeTimingMode(nextMode);
      setIsFoodTimingDropdownOpen(false);
    };

    const changeCompactDuration = (value: string) => {
      const amount = Number(value || 1);

      if (compactFrequency === "weekly") {
        const weeks = clampDoctorWeeks(amount);
        onDoseChange((prev) =>
          withDoseModeMemory({
            ...prev,
            frequency: "weekly",
            days: clampDoctorDays(weeks * 7),
            weeklyWeeks: weeks,
          }),
        );
        return;
      }

      const days = clampDoctorDays(amount);
      onDoseChange((prev) =>
        withDoseModeMemory({
          ...prev,
          frequency: "daily",
          days,
          dailyDays: days,
        }),
      );
    };

    const foodOptions = getFoodOptions();
    const durationValue =
      compactFrequency === "weekly" ? String(safeWeeks) : String(safeDays);
    const durationUnit = compactFrequency === "weekly" ? "weeks" : "days";
    const selectedInjectionRoute = INJECTION_ROUTE_OPTIONS.some(
      (route) => route === food,
    )
      ? food
      : "";

    const selectInjectionRoute = (route: string) => {
      onFoodChange(route);
      setIsRouteDropdownOpen(false);
    };

    const timingModeOptions: FoodTimingMode[] = [
      ...FOOD_TIMING_OPTIONS,
      "Custom",
    ];

    const medicineHeader = (
      <div
        className={[
          "flex min-w-0 flex-1 items-start gap-3 rounded-lg -mx-1 px-1 py-0.5",
          onCollapse ? "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-[#151e31]" : "",
        ].join(" ")}
        {...(onCollapse
          ? {
            role: "button",
            tabIndex: 0,
            title: "Collapse",
            onClick: onCollapse,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCollapse();
              }
            },
          }
          : {})}
      >
        {typeof index === "number" && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            {index}
          </span>
        )}

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px] font-bold text-slate-900 dark:text-white sm:text-[16px]">
            <span className="min-w-0 truncate">
              {medicineName}
              {showStrengthText ? ` ${showStrengthText}` : ""}
            </span>
            {displayForm && (
              <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                {displayForm}
              </span>
            )}
          </div>
        </div>

        {onCollapse && (
          <span className="ml-1 mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden>
            <FiChevronUp className="h-4 w-4" />
          </span>
        )}
      </div>
    );

    const compactTotalBadge = (
      <div className="hidden min-w-[76px] shrink-0 py-2 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 sm:block">
        {`${String(doses || 0).padStart(2, "0")} doses`}
      </div>
    );

    if (shouldUseRouteLayout) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-[0_1px_3px_0_rgb(0_0_0/0.2)]">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-[#273244]">
            {medicineHeader}
            {compactTotalBadge}

            <div className="flex shrink-0 items-center gap-2">
              {onToggleFavorite && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={onToggleFavorite}
                  className={[
                    "grid h-8 w-8 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
                    isFavorite
                      ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-950/40"
                      : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500 dark:border-[#273244] dark:bg-[#0f1728] dark:text-slate-500 dark:hover:border-amber-700 dark:hover:bg-amber-950/30",
                  ].join(" ")}
                  aria-label={
                    isFavorite ? "Remove from favourites" : "Add to favourites"
                  }
                  title={
                    isFavorite ? "Remove from favourites" : "Add to favourites"
                  }
                >
                  <FiStar className={isFavorite ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                </button>
              )}

              {canRemove && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={onRemove}
                  className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${medicineName}`}
                  title="Remove medicine"
                >
                  <FiX className="h-4 w-4 text-rose-500 dark:text-rose-200" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-slate-50/60 p-2.5 dark:bg-[#0b1321]/50 sm:p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-[minmax(140px,162px)_minmax(110px,128px)_minmax(88px,96px)_minmax(160px,1fr)]">
              <div className="grid h-9 grid-cols-2 overflow-hidden rounded-lg border border-slate-200/70 bg-white dark:border-[#273244]/70 dark:bg-[#0f1728]">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => changeFreq("daily")}
                  className={[
                    "border-r border-slate-200 text-sm font-medium transition dark:border-[#273244]",
                    compactFrequency === "daily"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                    !canEdit ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  Daily
                </button>

                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => changeFreq("weekly")}
                  className={[
                    "text-sm font-medium transition",
                    compactFrequency === "weekly"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                    !canEdit ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  Weekly
                </button>
              </div>

              <div className="flex h-9 min-w-0 items-center rounded-lg border border-slate-200/70 bg-white px-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:z-10 dark:border-[#273244]/70 dark:bg-[#0f1728] dark:focus-within:border-[#46beae]/60 dark:focus-within:ring-[#46beae]/20">
                <input
                  type="number"
                  min={1}
                  max={
                    compactFrequency === "weekly"
                      ? MAX_DOCTOR_DURATION_WEEKS
                      : MAX_DOCTOR_DURATION_DAYS
                  }
                  value={durationValue}
                  disabled={!canEdit}
                  onChange={(e) => changeCompactDuration(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none disabled:cursor-not-allowed disabled:text-slate-400 dark:text-white dark:disabled:text-slate-500"
                  aria-label="Duration"
                />
                <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {durationUnit}
                </span>
              </div>

              <div ref={routeDropdownRef} className="relative min-w-0">
                <button
                  type="button"
                  disabled={!canEdit}
                  aria-label="Route"
                  aria-expanded={isRouteDropdownOpen}
                  onClick={() => setIsRouteDropdownOpen((prev) => !prev)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setIsRouteDropdownOpen(false);
                    }
                  }}
                  className={[
                    controlClassName,
                    "flex items-center justify-between gap-2 text-left",
                    isRouteDropdownOpen
                      ? "border-emerald-400 ring-2 ring-emerald-100 dark:border-[#46beae]/60 dark:ring-[#46beae]/20"
                      : "",
                  ].join(" ")}
                >
                  <span className="truncate">
                    {selectedInjectionRoute || "Route"}
                  </span>
                  <FiChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-slate-600 transition dark:text-slate-400",
                      isRouteDropdownOpen ? "rotate-180 text-emerald-700 dark:text-emerald-400" : "",
                    ].join(" ")}
                  />
                </button>

                {isRouteDropdownOpen && canEdit && (
                  <div
                    ref={(el) => {
                      if (!el || !routeDropdownRef.current) return;
                      const rect = routeDropdownRef.current.getBoundingClientRect();
                      const dropdownHeight = el.scrollHeight || 200;
                      const spaceBelow = window.innerHeight - rect.bottom - 8;
                      const spaceAbove = rect.top - 8;
                      const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

                      el.style.position = "fixed";
                      el.style.left = `${rect.left}px`;
                      el.style.width = `${Math.max(rect.width, 128)}px`;
                      if (showAbove) {
                        el.style.bottom = `${window.innerHeight - rect.top + 6}px`;
                        el.style.top = "auto";
                      } else {
                        el.style.top = `${rect.bottom + 6}px`;
                        el.style.bottom = "auto";
                      }
                    }}
                    className="fixed z-[9999] min-w-[128px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {["", ...INJECTION_ROUTE_OPTIONS].map((route) => {
                      const label = route || "Route";
                      const isSelected = route === selectedInjectionRoute;

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => selectInjectionRoute(route)}
                          className={[
                            "flex h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-semibold transition",
                            isSelected
                              ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                              : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                          ].join(" ")}
                        >
                          <span className="truncate">{label}</span>
                          {isSelected && <FiCheck className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={dosage}
                disabled={!canEdit}
                onChange={(e) => {
                  setDosage(e.target.value);
                  onDosageChange(e.target.value);
                }}
                placeholder="Enter Instruction"
                className={[
                  controlClassName,
                ].join(" ")}
              />
            </div>
          </div>
        </div>
      );
    }

    if (isCompactApplicationForm) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-[0_1px_3px_0_rgb(0_0_0/0.2)]">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-[#273244]">
            {medicineHeader}
            {compactTotalBadge}

            <div className="flex shrink-0 items-center gap-2">
              {onToggleFavorite && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={onToggleFavorite}
                  className={[
                    "grid h-8 w-8 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
                    isFavorite
                      ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-950/40"
                      : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500 dark:border-[#273244] dark:bg-[#0f1728] dark:text-slate-500 dark:hover:border-amber-700 dark:hover:bg-amber-950/30",
                  ].join(" ")}
                  aria-label={
                    isFavorite ? "Remove from favourites" : "Add to favourites"
                  }
                  title={
                    isFavorite ? "Remove from favourites" : "Add to favourites"
                  }
                >
                  <FiStar className={isFavorite ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                </button>
              )}

              {canRemove && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={onRemove}
                  className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${medicineName}`}
                  title="Remove medicine"
                >
                  <FiX className="h-4 w-4 text-rose-500 dark:text-rose-200" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-slate-50/60 p-2.5 dark:bg-[#0b1321]/50 sm:p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-[minmax(140px,162px)_minmax(110px,128px)_minmax(160px,1fr)]">
              <div className="grid h-9 grid-cols-2 overflow-hidden rounded-lg border border-slate-200/70 bg-white dark:border-[#273244]/70 dark:bg-[#0f1728]">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => changeFreq("daily")}
                  className={[
                    "border-r border-slate-200 text-sm font-medium transition dark:border-[#273244]",
                    compactFrequency === "daily"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                    !canEdit ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  Daily
                </button>

                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => changeFreq("weekly")}
                  className={[
                    "text-sm font-medium transition",
                    compactFrequency === "weekly"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                    !canEdit ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  Weekly
                </button>
              </div>

              <div className="flex h-9 min-w-0 items-center rounded-lg border border-slate-200/70 bg-white px-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:z-10 dark:border-[#273244]/70 dark:bg-[#0f1728] dark:focus-within:border-[#46beae]/60 dark:focus-within:ring-[#46beae]/20">
                <input
                  type="number"
                  min={1}
                  max={
                    compactFrequency === "weekly"
                      ? MAX_DOCTOR_DURATION_WEEKS
                      : MAX_DOCTOR_DURATION_DAYS
                  }
                  value={durationValue}
                  disabled={!canEdit}
                  onChange={(e) => changeCompactDuration(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none disabled:cursor-not-allowed disabled:text-slate-400 dark:text-white dark:disabled:text-slate-500"
                  aria-label="Duration"
                />
                <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {durationUnit}
                </span>
              </div>

              <input
                type="text"
                value={dosage}
                disabled={!canEdit}
                onChange={(e) => {
                  setDosage(e.target.value);
                  onDosageChange(e.target.value);
                }}
                placeholder="Enter Instruction"
                className={[
                  controlClassName,
                ].join(" ")}
              />
            </div>
          </div>
        </div>
      );
    }

    if (isCompactOralForm) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-[0_1px_3px_0_rgb(0_0_0/0.2)]">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-[#273244]">
            {medicineHeader}
            {compactTotalBadge}

            <div className="flex shrink-0 items-center gap-2">
              {onToggleFavorite && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={onToggleFavorite}
                  className={[
                    "grid h-8 w-8 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
                    isFavorite
                      ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-950/40"
                      : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500 dark:border-[#273244] dark:bg-[#0f1728] dark:text-slate-500 dark:hover:border-amber-700 dark:hover:bg-amber-950/30",
                  ].join(" ")}
                  aria-label={
                    isFavorite ? "Remove from favourites" : "Add to favourites"
                  }
                  title={
                    isFavorite ? "Remove from favourites" : "Add to favourites"
                  }
                >
                  <FiStar className={isFavorite ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                </button>
              )}

              {canRemove && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={onRemove}
                  className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${medicineName}`}
                  title="Remove medicine"
                >
                  <FiX className="h-4 w-4 text-rose-500 dark:text-rose-200" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-slate-50/60 p-2.5 dark:bg-[#0b1321]/50 sm:p-3">
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-[96px_130px_132px_118px_1fr]">
              <div
                ref={scheduleInputWrapperRef}
                className="relative col-span-1 min-w-0"
              >
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Schedule</label>
                <div className="relative">
                  <input
                    type="text"
                    value={schedulePatternInput}
                    disabled={!canEdit}
                    onFocus={(e) => {
                      e.currentTarget.select();
                      setIsScheduleJustOpened(true);
                      setShowScheduleSuggestions(true);
                    }}
                    onKeyDown={handleSchedulePatternInputKeyDown}
                    onChange={(e) =>
                      handleSchedulePatternInputChange(e.target.value)
                    }
                    onBlur={handleSchedulePatternInputBlur}
                    inputMode="numeric"
                    className={`${controlClassName} pr-9`}
                    aria-label="Dose schedule"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    disabled={!canEdit}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsScheduleJustOpened(true);
                      setShowScheduleSuggestions((prev) => !prev);
                    }}
                    className="absolute right-3 top-1/2 grid -translate-y-1/2 place-items-center text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-slate-400"
                    aria-label="Show dose schedule options"
                  >
                    <FiChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {scheduleSuggestionsMenu}
              </div>

              <div
                ref={foodTimingDropdownRef}
                className="relative col-span-1 min-w-0"
              >
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Timing</label>
                <button
                  type="button"
                  disabled={!canEdit}
                  aria-label="Food timing"
                  aria-expanded={isFoodTimingDropdownOpen}
                  onClick={() => setIsFoodTimingDropdownOpen((prev) => !prev)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setIsFoodTimingDropdownOpen(false);
                    }
                  }}
                  className={[
                    controlClassName,
                    "flex cursor-pointer items-center justify-between gap-2 pr-3 text-left disabled:cursor-not-allowed",
                    isFoodTimingDropdownOpen
                      ? "border-emerald-400 ring-2 ring-emerald-100 dark:border-[#46beae]/60 dark:ring-[#46beae]/20"
                      : "",
                  ].join(" ")}
                >
                  <span className="truncate">{timingMode}</span>
                  <FiChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-slate-600 transition dark:text-slate-400",
                      isFoodTimingDropdownOpen
                        ? "rotate-180 text-emerald-700 dark:text-emerald-400"
                        : "",
                    ].join(" ")}
                  />
                </button>

                {isFoodTimingDropdownOpen && canEdit && (
                  <div
                    ref={(el) => {
                      if (!el || !foodTimingDropdownRef.current) return;
                      const rect = foodTimingDropdownRef.current.getBoundingClientRect();
                      const dropdownHeight = el.scrollHeight || 200;
                      const spaceBelow = window.innerHeight - rect.bottom - 8;
                      const spaceAbove = rect.top - 8;
                      const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

                      el.style.position = "fixed";
                      el.style.left = `${rect.left}px`;
                      el.style.width = `${Math.max(rect.width, 160)}px`;
                      if (showAbove) {
                        el.style.bottom = `${window.innerHeight - rect.top + 6}px`;
                        el.style.top = "auto";
                      } else {
                        el.style.top = `${rect.bottom + 6}px`;
                        el.style.bottom = "auto";
                      }
                    }}
                    className="fixed z-[9999] min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {timingModeOptions.map((option) => {
                      const isSelected = option === timingMode;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => selectTimingMode(option)}
                          className={[
                            "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-semibold transition",
                            isSelected
                              ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                              : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                          ].join(" ")}
                        >
                          <span className="truncate">{option}</span>
                          {isSelected && <FiCheck className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {timingMode === "Custom" && (
                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Custom</label>
                  <input
                    type="text"
                    value={customFood}
                    disabled={!canEdit}
                    required
                    aria-required="true"
                    aria-invalid={canEdit && isCustomTimingRequired}
                    onChange={(e) => {
                      setCustomFood(e.target.value);
                      onFoodChange(e.target.value);
                    }}
                    placeholder="e.g. Take with boiled water"
                    className={[
                      controlClassName,
                      canEdit && isCustomTimingRequired
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500 dark:focus:border-rose-500 dark:focus:ring-rose-900/30"
                        : "",
                    ].join(" ")}
                  />
                  {canEdit && isCustomTimingRequired && (
                    <p className="mt-1 text-xs font-medium text-rose-500">
                      Custom timing is required
                    </p>
                  )}
                </div>
              )}

              <div className="col-span-1 min-w-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Frequency</label>
                <div className="grid h-9 grid-cols-2 overflow-hidden rounded-lg border border-slate-200/70 bg-white dark:border-[#273244]/70 dark:bg-[#0f1728]">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => changeFreq("daily")}
                    className={[
                      "border-r border-slate-200 text-sm font-medium transition dark:border-[#273244]",
                      compactFrequency === "daily"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                      !canEdit ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                  >
                    Daily
                  </button>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => changeFreq("weekly")}
                    className={[
                      "text-sm font-medium transition",
                      compactFrequency === "weekly"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                      !canEdit ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                  >
                    Weekly
                  </button>
                </div>
              </div>

              <div className="col-span-1 min-w-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Duration</label>
                <div className="flex h-9 min-w-0 items-center rounded-lg border border-slate-200/70 bg-white px-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:z-10 dark:border-[#273244]/70 dark:bg-[#0f1728] dark:focus-within:border-[#46beae]/60 dark:focus-within:ring-[#46beae]/20">
                  <input
                    type="number"
                    min={1}
                    max={
                      compactFrequency === "weekly"
                        ? MAX_DOCTOR_DURATION_WEEKS
                        : MAX_DOCTOR_DURATION_DAYS
                    }
                    value={durationValue}
                    disabled={!canEdit}
                    onChange={(e) => changeCompactDuration(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none disabled:cursor-not-allowed disabled:text-slate-400 dark:text-white dark:disabled:text-slate-500"
                    aria-label="Duration"
                  />
                  <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {durationUnit}
                  </span>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-1 min-w-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Instruction</label>
                <input
                  type="text"
                  value={dosage}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setDosage(e.target.value);
                    onDosageChange(e.target.value);
                  }}
                  placeholder="Enter Instruction"
                  className={controlClassName}
                />
              </div>
            </div>
          </div>

        </div>
      );
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm dark:border-[#273244] dark:bg-[#111726] md:px-5 md:py-4">
        <div className="flex items-start justify-between gap-3">
          {medicineHeader}

          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {`${String(doses).padStart(2, "0")} doses`}
            </span>

            {canRemove && (
              <button
                type="button"
                disabled={!canEdit}
                onClick={onRemove}
                className={[
                  "grid h-9 w-9 place-items-center rounded-full border",
                  canEdit
                    ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                    : "border-slate-200 text-slate-400 cursor-not-allowed dark:border-[#273244] dark:text-white",
                ].join(" ")}
                aria-label="Remove"
              >
                <FiX className="h-4 w-4 text-rose-600 dark:text-rose-200" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              SCHEDULE
            </div>

            <div className="mt-3 grid w-full grid-cols-3 gap-2 ">
              <ScheduleDoseButton
                active={dose.morning}
                disabled={!canEdit}
                onClick={() => toggleTime("morning")}
                label="Morn"
                icon={<FiSunrise size={13} />}
              />

              <ScheduleDoseButton
                active={dose.noon}
                disabled={!canEdit}
                onClick={() => toggleTime("noon")}
                label="Noon"
                icon={<FiSun size={13} />}
              />

              <ScheduleDoseButton
                active={dose.night}
                disabled={!canEdit}
                onClick={() => toggleTime("night")}
                label="Evng"
                icon={<FiMoon size={13} />}
              />
            </div>

            {/* Food/Application Timing */}
            <div className="mt-4 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              {isTopical ? "APPLICATION" : "TIMING"}
            </div>

            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-nowrap sm:gap-2">
                {" "}
                {foodOptions.map((option) => (
                  <TimingOptionButton
                    key={option.value}
                    active={food === option.value}

                    disabled={!canEdit}
                    onClick={() => {
                      if (food === option.value) {
                        onFoodChange("");
                      } else {
                        onFoodChange(option.value);
                      }
                    }}
                    label={option.label}
                  />
                ))}
              </div>

              {/* Custom input option - FINAL WORKING SOLUTION */}
              {canEdit && (
                <div className="w-full">
                  <input
                    type="text"
                    className="h-9 w-full rounded-full border border-slate-200 bg-white px-4 text-xs focus:border-emerald-600 focus:outline-none dark:border-[#273244] dark:bg-[#0f1728] dark:text-white dark:placeholder-slate-500 dark:focus:border-[#46beae]/60"
                    placeholder={`Custom ${isTopical ? "application" : "timing"}...`}
                    value={customFood || ""}
                    onChange={(e) => {
                      setCustomFood(e.target.value);
                      onFoodChange(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                    onKeyUp={(e) => e.stopPropagation()}
                    onKeyPress={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              FREQUENCY &amp; DURATION
            </div>

            <div className="mt-3">
              <Segmented
                value={dose.frequency}
                disabled={!canEdit}
                onChange={changeFreq}
              />
            </div>

            <div className="mt-4">
              {dose.frequency === "daily" && (
                <Input
                  key="daily-duration"
                  type="number"
                  min={1}
                  max={MAX_DOCTOR_DURATION_DAYS}
                  value={String(safeDays)}
                  onValueChange={(v) =>
                    onDoseChange((prev) => {
                      const nextDays = clampDoctorDays(Number(v || 1));
                      return withDoseModeMemory({
                        ...prev,
                        days: nextDays,
                        dailyDays: nextDays,
                      });
                    })
                  }
                  isDisabled={!canEdit}
                  radius="full"
                  variant="bordered"
                  endContent={
                    <span className="min-w-[38px] shrink-0 whitespace-nowrap pr-2 text-right text-sm font-medium leading-none text-slate-500">
                      days
                    </span>
                  }
                  classNames={{ inputWrapper: "h-11" }}
                />
              )}

              {dose.frequency === "weekly" && (
                <Input
                  key="weekly-duration"
                  type="number"
                  min={1}
                  max={MAX_DOCTOR_DURATION_WEEKS}
                  value={String(safeWeeks)}
                  onValueChange={(v) => {
                    const weeks = clampDoctorWeeks(Number(v || 1));
                    onDoseChange((prev) =>
                      withDoseModeMemory({
                        ...prev,
                        days: clampDoctorDays(weeks * 7),
                        weeklyWeeks: weeks,
                      }),
                    );
                  }}
                  isDisabled={!canEdit}
                  radius="full"
                  variant="bordered"
                  endContent={
                    <span className="min-w-[46px] shrink-0 whitespace-nowrap pr-2 text-right text-sm font-medium leading-none text-slate-500">
                      weeks
                    </span>
                  }
                  classNames={{ inputWrapper: "h-11" }}
                />
              )}

              {dose.frequency === "every_n_days" && (
                <div key="custom-duration" className="space-y-3">
                  <Input
                    key="custom-interval"
                    type="number"
                    min={1}
                    max={MAX_DOCTOR_DURATION_DAYS}
                    label="Repeat every (days)"
                    value={String(safeInterval)}
                    onValueChange={(v) =>
                      onDoseChange((prev) => {
                        const current = withDoseModeMemory(prev);
                        const nextInterval = Math.min(
                          MAX_DOCTOR_DURATION_DAYS,
                          Math.max(1, Number(v || 1)),
                        );

                        const repeatCount = Math.max(
                          1,
                          Number(
                            current.customTargetDoses || current.targetDoses || 1,
                          ),
                        );

                        return withDoseModeMemory(
                          recalcEveryNDaysDuration({
                            ...current,
                            intervalDays: nextInterval,
                            targetDoses: repeatCount,
                            customIntervalDays: nextInterval,
                            customTargetDoses: repeatCount,
                          }),
                        );
                      })
                    }
                    isDisabled={!canEdit}
                    radius="lg"
                    variant="bordered"
                  />

                  <Input
                    key="custom-repeat-count"
                    type="number"
                    min={1}
                    label="Repeat Doses"
                    value={String(desiredRepeatCount)}
                    onValueChange={(v) =>
                      onDoseChange((prev) => {
                        const current = withDoseModeMemory(prev);
                        const repeatCount = Math.max(1, Number(v || 1));

                        return withDoseModeMemory(
                          recalcEveryNDaysDuration({
                            ...current,
                            targetDoses: repeatCount,
                            customIntervalDays:
                              current.customIntervalDays ||
                              current.intervalDays ||
                              2,
                            customTargetDoses: repeatCount,
                          }),
                        );
                      })
                    }
                    isDisabled={!canEdit}
                    radius="lg"
                    variant="bordered"
                  />

                  {/* <p className="text-xs text-slate-500">
                  Actual total doses: {calcTotalDoses(dose)}
                </p> */}

                  {/* <p className="text-xs text-slate-500">
                    Maximum prescription duration is 30 days.
                  </p> */}
                </div>
              )}
              <div className="mt-4">
                <div className="text-xs font-semibold tracking-wide text-slate-500 mb-1">
                  DOSAGE / APPLICATION <span className="text-rose-500">*</span>
                </div>
                {/* <p className="text-xs text-slate-500 mb-1">
                Example: 1 tablet, 5 ml, 2 capsules
              </p> */}
                <Input
                  type="text"
                  placeholder="e.g. 1 Tablet, 5 ml, 2 Capsules, Apply"
                  value={dosage}
                  onValueChange={(v) => {
                    setDosage(v);
                    onDosageChange(v);
                  }}
                  isDisabled={!canEdit}
                  radius="full"
                  variant="bordered"
                  // isRequired={true}
                  classNames={{
                    inputWrapper:
                      "h-6" + (canEdit && !dosage ? " border-rose-500" : ""),
                  }}
                />
                {canEdit && !dosage && (
                  <p className="text-xs text-rose-500 mt-1">Dosage is required</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          {buildScheduleText(dose)} • {food}
        </div>
      </div>
    );
  };

export default PrescriptionEditorCard;
