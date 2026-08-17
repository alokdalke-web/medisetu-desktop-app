export function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function parseHikePercent(v: unknown): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const m = s.match(/^([+-]?)(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const sign = m[1] === "-" ? -1 : 1;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(sign * Math.abs(num));
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function isPlaceholderTime(hhmm?: string | null) {
  const t = String(hhmm ?? "").trim();
  return t === "23:59" || t === "23:59:00";
}

export function mergeDateTime(dateISO?: string | null, hhmm?: string | null): string {
  if (!dateISO) return new Date().toISOString();
  const dt = new Date(dateISO);
  if (hhmm && !isPlaceholderTime(hhmm)) {
    const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
    if (!Number.isNaN(h)) dt.setHours(h);
    if (!Number.isNaN(m)) dt.setMinutes(m);
    dt.setSeconds(0);
    dt.setMilliseconds(0);
  }
  return dt.toISOString();
}

export function fmtTime12(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function initials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function cleanText(v: unknown): string | null {
  const text = String(v ?? "").trim();
  return text ? text : null;
}

export function doctorGreetingName(value: unknown): string {
  return cleanText(value)?.replace(/^dr\.?\s+/i, "") || "Doctor";
}

export function formatDateLabel(dateISO?: string | null) {
  const raw = cleanText(dateISO);
  if (!raw) return "—";
  const ymd = raw.includes("T") ? raw.slice(0, 10) : raw;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateRangeLabel(startYmd: string, endYmd: string): string {
  const s = new Date(startYmd + "T00:00:00");
  const e = new Date(endYmd + "T00:00:00");
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()))
    return "Custom";
  const fmt = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" });
    return `${day} ${mon}`;
  };
  return `${fmt(s)} - ${fmt(e)} ${e.getFullYear()}`;
}

export function getRtkErrorMessage(err: unknown): string {
  if (!err) return "Failed to load dashboard";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as Record<string, any>;
    const dataMsg =
      e?.data?.message || e?.data?.error || (typeof e?.data === "string" ? e.data : null);
    if (dataMsg) return String(dataMsg);
    if (e?.error) return String(e.error);
  }
  return "Failed to load dashboard";
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatSymptoms(raw: unknown): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const list = raw
      .map((item: any) => {
        if (!item) return "";
        if (typeof item === "object") {
          return String(item.name ?? item.label ?? item.title ?? "").trim();
        }
        return String(item).trim();
      })
      .filter(Boolean);
    return list.length > 0 ? list.join(", ") : null;
  }
  const s = String(raw).trim();
  return s ? s : null;
}

