import type { SubscriptionLike } from "../../../../types/adminDash";

export function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

/** Parse trend strings like "↑ 100%", "↓ 25%", "0%" from today-overview API */
export function parseTrendPercent(trend?: string): number | undefined {
  if (!trend) return undefined;
  const s = trend.trim();
  if (s === "0%") return 0;
  const m = s.match(/([↑↓]?)\s*(\d+(?:\.\d+)?)%?/);
  if (!m) return undefined;
  const sign = m[1] === "↓" ? -1 : 1;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(sign * num);
}

export function formatINR(n: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n}`;
  }
}

export function formatCompact(n: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function mergeDateTime(dateISO?: string | null, hhmm?: string | null): string {
  if (!dateISO) return new Date().toISOString();
  const dt = new Date(dateISO);
  if (hhmm) {
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
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
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
  const year = e.getFullYear();
  return `${fmt(s)} - ${fmt(e)} ${year}`;
}

export function isFreeSubscription(subscription?: SubscriptionLike | null): boolean {
  if (!subscription) return false;

  const planName = String(subscription.planName ?? "").trim().toLowerCase();
  const slug = String(subscription.slug ?? "").trim().toLowerCase();
  const price = Number(subscription.price);

  return (
    planName === "free" ||
    planName === "free plan" ||
    slug === "free" ||
    slug === "free-plan" ||
    (!Number.isNaN(price) && price === 0)
  );
}

export function normalizePhoneForDial(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = String(phone).trim();
  if (!cleaned) return null;

  const digitsOnly = cleaned.replace(/[^\d+]/g, "");
  if (!digitsOnly) return null;

  if (digitsOnly.startsWith("+")) return digitsOnly;
  return digitsOnly.replace(/^00/, "+");
}
