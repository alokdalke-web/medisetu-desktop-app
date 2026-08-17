import type { PatientRow } from "../../../types/patient";

export const safeParseDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const normalized =
      s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
    const d1 = new Date(normalized);
    if (!Number.isNaN(d1.getTime())) return d1;
    return null;
  }
  return null;
};

export const formatDateLong = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(d);

export const pickDateTime = (p: PatientRow): Date | null => {
  const candidates = [p.createdAt, p.updatedAt, p.lastVisit, p.date];
  for (const c of candidates) {
    const d = safeParseDate(c);
    if (d) return d;
  }
  return null;
};

export const getGender = (p: PatientRow): string =>
  (p.gender ?? p.sex ?? "")?.toString();
