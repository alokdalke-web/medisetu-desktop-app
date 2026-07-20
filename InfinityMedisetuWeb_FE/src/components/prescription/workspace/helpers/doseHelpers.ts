import type { Dose } from "../types";

export const TOPICAL_FORMS = [
  "Cream",
  "Ointment",
  "Gel",
  "Lotion",
  "Paste",
  "Oil",
  "Powder",
  "Spray",
  "Foam",
  "Mouthwash",
  "Oral Rinse",
  "Shampoo",
  "Soap",
  "Facewash",
  "Conditioner",
  "Sanitizer",
  "Handwash",
  "Dental Cement",
  "Dental Varnish",
  "Mouth Gel",
  "Toothpaste",
  "Inhaler",
  "Injection",
  "Patch",
  "Suppository",
  "Sachet",
  "Granules",
  "Liquid",
  "Drops",
];

export const ORAL_FORMS = [
  "Tablet",
  "Capsule",
  "Lozenge",
  "Syrup",
  "Suspension",
  "Drops",
  "Sachet",
  "Granules",
];

export const LIQUID_ORAL = ["Syrup", "Suspension", "Drops"];

export const MAX_DOCTOR_DURATION_DAYS = 30;
export const MAX_DOCTOR_DURATION_WEEKS = 4;

export const clampDoctorDays = (value: number) =>
  Math.min(
    MAX_DOCTOR_DURATION_DAYS,
    Math.max(1, Math.floor(Number(value) || 1)),
  );

export const clampDoctorWeeks = (value: number) =>
  Math.min(
    MAX_DOCTOR_DURATION_WEEKS,
    Math.max(1, Math.floor(Number(value) || 1)),
  );

const clampScheduleDoseCount = (value: unknown) => {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count)) return 0;
  return Math.min(2, Math.max(0, count));
};

const getDoseSlotCount = (
  dose: Dose,
  slot: "morning" | "noon" | "night",
) => {
  const enabled = dose[slot];
  const rawCount =
    slot === "morning"
      ? dose.morningCount
      : slot === "noon"
        ? dose.noonCount
        : dose.nightCount;
  const count = clampScheduleDoseCount(rawCount);

  if (!enabled) return 0;
  return count > 0 ? count : 1;
};

const formatTimePart = (label: string, count: number) =>
  count > 1 ? `${label} x${count}` : label;

const calcDailyDoseCount = (dose: Dose): number =>
  getDoseSlotCount(dose, "morning") +
  getDoseSlotCount(dose, "noon") +
  getDoseSlotCount(dose, "night");

export const buildTimeParts = (dose: Dose): string[] => {
  const parts: string[] = [];
  const morningCount = getDoseSlotCount(dose, "morning");
  const noonCount = getDoseSlotCount(dose, "noon");
  const nightCount = getDoseSlotCount(dose, "night");

  if (morningCount) parts.push(formatTimePart("Morning", morningCount));
  if (noonCount) parts.push(formatTimePart("Noon", noonCount));
  if (nightCount) parts.push(formatTimePart("Night", nightCount));
  return parts;
};

export const buildDosePattern = (dose: Dose) => {
  const m = getDoseSlotCount(dose, "morning");
  const n = getDoseSlotCount(dose, "noon");
  const ni = getDoseSlotCount(dose, "night");
  return `${m}-${n}-${ni}`;
};

export const buildFreqPart = (dose: Dose): string => {
  if (dose.frequency === "weekly") return "Weekly";
  if (dose.frequency === "every_n_days") {
    const n = Math.max(1, Number(dose.intervalDays || 1));
    return `Every ${n} day${n > 1 ? "s" : ""}`;
  }
  return "Daily";
};

export const countOccurrenceDays = (dose: Dose): number => {
  const totalDays = Math.max(1, Number(dose.days || 1));

  if (dose.frequency === "every_n_days") {
    const n = Math.max(1, Number(dose.intervalDays || 1));
    return Math.ceil(totalDays / n);
  }

  if (dose.frequency === "weekly") {
    const weeks = Math.max(1, Math.ceil(totalDays / 7));
    return weeks;
  }

  return totalDays;
};

export const recalcEveryNDaysDuration = (next: Dose) => {
  const interval = Math.max(1, Math.floor(Number(next.intervalDays || 2)));

  const maxOccurrences =
    Math.floor((MAX_DOCTOR_DURATION_DAYS - 1) / interval) + 1;

  const requestedOccurrences = Math.max(
    1,
    Math.floor(Number(next.targetDoses || 1)),
  );

  const cappedOccurrences = Math.min(requestedOccurrences, maxOccurrences);
  const durationDays = (cappedOccurrences - 1) * interval + 1;

  return {
    ...next,
    intervalDays: interval,
    targetDoses: cappedOccurrences,
    customTargetDoses: cappedOccurrences,
    days: clampDoctorDays(durationDays),
  };
};

export const withDoseModeMemory = (dose: Dose): Dose => {
  const dailyDays = clampDoctorDays(Number(dose.dailyDays ?? dose.days ?? 1));

  const weeklyWeeks = clampDoctorWeeks(
    Number(
      dose.weeklyWeeks ??
        (dose.frequency === "weekly"
          ? Math.ceil(Math.max(1, Number(dose.days || 1)) / 7)
          : Math.ceil(dailyDays / 7)),
    ),
  );

  const customIntervalDays = Math.min(
    MAX_DOCTOR_DURATION_DAYS,
    Math.max(
      1,
      Math.floor(Number(dose.customIntervalDays ?? dose.intervalDays ?? 2)),
    ),
  );

  const inferredOccurrences = Math.max(
    1,
    countOccurrenceDays({
      ...dose,
      frequency: "every_n_days",
      intervalDays: customIntervalDays,
      days: Math.max(1, Number(dose.days || dailyDays)),
    }),
  );

  const customTargetDoses = Math.max(
    1,
    Math.floor(
      Number(
        dose.customTargetDoses ??
          dose.targetDoses ??
          inferredOccurrences,
      ),
    ),
  );

  return {
    ...dose,
    dailyDays,
    weeklyWeeks,
    customIntervalDays,
    customTargetDoses,
  };
};

const humanJoin = (arr: string[]) => {
  if (arr.length <= 1) return arr[0] || "";
  if (arr.length === 2) return `${arr[0]} & ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")} & ${arr[arr.length - 1]}`;
};

export const getDefaultDoseForForm = (form: string): Dose => {
  const formLower = (form || "").toLowerCase().trim();

  if (TOPICAL_FORMS.some((f) => f.toLowerCase() === formLower)) {
    return withDoseModeMemory({
      morning: true,
      noon: false,
      night: true,
      days: 5,
      frequency: "daily",
      intervalDays: 2,
      targetDoses: 10,
    });
  }

  if (ORAL_FORMS.some((f) => f.toLowerCase() === formLower)) {
    if (LIQUID_ORAL.some((f) => f.toLowerCase() === formLower)) {
      return withDoseModeMemory({
        morning: true,
        noon: false,
        night: true,
        days: 7,
        frequency: "daily",
        intervalDays: 2,
        targetDoses: 14,
      });
    }

    return withDoseModeMemory({
      morning: true,
      noon: false,
      night: true,
      days: 5,
      frequency: "daily",
      intervalDays: 2,
      targetDoses: 10,
    });
  }

  return withDoseModeMemory({
    morning: true,
    noon: false,
    night: true,
    days: 3,
    frequency: "daily",
    intervalDays: 2,
    targetDoses: 4,
  });
};

export const calcTotalDoses = (dose: Dose): number => {
  const perDay = calcDailyDoseCount(dose);
  if (perDay <= 0) return 0;
  return countOccurrenceDays(dose) * perDay;
};

export const buildDurationBadgeLabel = (dose: Dose): string => {
  const days = Math.max(1, Number(dose.days || 1));
  if (dose.frequency === "weekly") {
    const weeks = Math.max(1, Math.ceil(days / 7));
    return `Weekly for ${weeks} Week${weeks > 1 ? "s" : ""}`;
  }
  if (dose.frequency === "every_n_days") {
    const td = calcTotalDoses(dose);
    return `${Math.max(1, td)} Dose${td === 1 ? "" : "s"}`;
  }
  return `${days} Day${days > 1 ? "s" : ""}`;
};

export const buildScheduleText = (dose: Dose): string => {
  const timeParts = buildTimeParts(dose);
  const timeText = timeParts.length ? humanJoin(timeParts) : "As directed";

  if (dose.frequency === "weekly") {
    const weeks = Math.max(
      1,
      Math.ceil(Math.max(1, Number(dose.days || 1)) / 7),
    );
    return `${timeText} • Weekly • ${weeks} week${weeks > 1 ? "s" : ""}`;
  }

  if (dose.frequency === "every_n_days") {
    const n = Math.max(1, Number(dose.intervalDays || 1));
    const td = Math.max(1, calcTotalDoses(dose));
    return `${timeText} • Every ${n} day${n > 1 ? "s" : ""} • ${td} dose${
      td > 1 ? "s" : ""
    }`;
  }

  const d = Math.max(1, Number(dose.days || 1));
  return `${timeText} • ${d} day${d > 1 ? "s" : ""}`;
};

export const buildFrequency = (dose: Dose): string => {
  const count = calcDailyDoseCount(dose);
  const perDay =
    count === 3
      ? "Thrice a day"
      : count === 2
        ? "Twice a day"
        : count === 1
          ? "Once a day"
          : count > 3
            ? `${count} times a day`
            : "As directed";

  const freq = buildFreqPart(dose);
  return dose.frequency === "daily" ? perDay : `${perDay} • ${freq}`;
};

export const buildInstructionLine = (dose: Dose): string => {
  const timeParts = buildTimeParts(dose);
  const timeText = timeParts.length ? humanJoin(timeParts) : "As directed";

  if (dose.frequency === "every_n_days") {
    const n = Math.max(1, Number(dose.intervalDays || 1));
    const td = Math.max(1, calcTotalDoses(dose));
    return `Take ${timeText} every ${n} day${n > 1 ? "s" : ""} • Total ${td} doses.`;
  }

  if (dose.frequency === "weekly") {
    const weeks = Math.max(
      1,
      Math.ceil(Math.max(1, Number(dose.days || 1)) / 7),
    );
    return `Take ${timeText} weekly for ${weeks} week${weeks > 1 ? "s" : ""}.`;
  }

  const d = Math.max(1, Number(dose.days || 1));
  return `Take ${timeText} daily for ${d} day${d > 1 ? "s" : ""}.`;
};
