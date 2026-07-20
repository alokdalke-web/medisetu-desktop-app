import { parseDate } from "@internationalized/date";

export const toIsoDateOnly = (raw: any): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const first10 = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(first10)) return first10;

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return "";
};

export const getServiceExpiryIso = (service: any): string => {
  if (!service) return "";
  const raw =
    service?.["Expiring on"] ??
    service?.expiringOn ??
    service?.expiryDate ??
    service?.expiresOn ??
    service?.expireOn ??
    service?.expiry ??
    "";
  return toIsoDateOnly(raw);
};

export const fmtDate = (d: any): string => {
  if (!d) return "";
  if (typeof d === "object" && "year" in d && "month" in d && "day" in d) {
    const yyyy = (d as any).year;
    const mm = String((d as any).month).padStart(2, "0");
    const dd = String((d as any).day).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  if (d instanceof Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  if (typeof d === "string")
    return d.includes("/") ? d : d.replaceAll("-", "/");
  return "";
};

export const toApiDate = (d: any): string => {
  const s = fmtDate(d);
  return s ? s.replaceAll("/", "-") : "";
};

export const formatIsoForUi = (iso: string) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const extractTimeLabel = (value: any): string => {
  const s = String(value ?? "").trim();
  if (!s) return "";

  const isoMatch = /^\d{4}-\d{2}-\d{2}T(\d{2}):([0-5]\d)/.exec(s);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;

  const ampmMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(s);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2];
    const ampm2 = (ampmMatch[3] ?? "").toUpperCase();
    if (ampm2 === "PM" && h < 12) h += 12;
    if (ampm2 === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }

  return s;
};

export const calcDurationMinutes = (rawStart: any, rawEnd: any): number => {
  if (!rawStart || !rawEnd) return 0;
  const sd = new Date(String(rawStart));
  const ed = new Date(String(rawEnd));
  if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
    const diff = (ed.getTime() - sd.getTime()) / 60000;
    return diff > 0 ? Math.round(diff) : 0;
  }
  return 0;
};

export const timeToMinutes = (time: string): number => {
  const [hh, mm] = String(time ?? "")
    .split(":")
    .map(Number);

  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
};

export const minutesToTime = (totalMinutes: number): string => {
  const safe = Math.max(0, totalMinutes);
  const hh = Math.floor(safe / 60) % 24;
  const mm = safe % 60;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const addMinutesToTime = (
  time: string,
  minutesToAdd: number,
): string => {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
};

/**
 * Formats a duration in minutes into a compact, human-friendly label.
 *
 * Examples:
 *   30  → "30m"
 *   60  → "1h"
 *   100 → "1h 40m"
 *   135 → "2h 15m"
 *
 * Designed for a minimalist UI — short, scannable, and clear even for
 * long durations where raw minutes (e.g. "100 min") are hard to parse.
 */
export const formatDurationLabel = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));

  if (safeMinutes < 60) {
    return `${safeMinutes}m`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

export const safeParseCalendarDate = (value: string, fallbackIso: string) => {
  try {
    return parseDate(value);
  } catch {
    return parseDate(fallbackIso);
  }
};

export const getLocalDateISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const pad2 = (n: number) => String(n).padStart(2, "0");
