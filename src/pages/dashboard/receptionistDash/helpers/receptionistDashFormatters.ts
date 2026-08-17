export function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function fmtINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
