// Universal Numbering System (1-32). Standard dental-chart layout: each
// screen column pairs the same physical side, upper arch over lower arch —
// so the lower row runs 32→17 rather than 17→32.
export const UPPER_ARCH_TEETH: number[] = Array.from({ length: 16 }, (_, i) => i + 1);
export const LOWER_ARCH_TEETH: number[] = Array.from({ length: 16 }, (_, i) => 32 - i);

export const toothKey = (n: number): string => `Tooth-${n}`;

export const isDentistSpeciality = (speciality?: string | null): boolean =>
  (speciality ?? "").trim().toLowerCase() === "dentist";

export const isValidToothNote = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.length >= 3 && trimmed.length <= 200;
};
