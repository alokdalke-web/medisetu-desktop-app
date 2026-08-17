import React from "react";
import { Chip } from "@heroui/react";

/* ---------- Formatters ---------- */

export const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

export const roleLabels: Record<string, string> = {
  doctor: "Doctor",
  receptionist: "Receptionist",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  lab_assistant: "Lab Assistant",
  radiologist: "Radiologist",
  admin: "Admin",
  user: "User",
};

export const roleLabel = (userType?: string) =>
  roleLabels[String(userType ?? "").toLowerCase()] ?? userType ?? "-";

/** Maps a user's userType to the role filter value used by the Users list (`/users?role=`). */
const roleListParams: Record<string, string> = {
  doctor: "Doctor",
  receptionist: "Receptionist",
  pharmacist: "Pharmacist",
  lab_assistant: "Lab_Assistant",
};

/** Back-to-list path that preserves the caller's role tab, e.g. `/users?role=Lab_Assistant`. */
export const getUsersListPath = (userType?: string | null) => {
  const roleParam = roleListParams[String(userType ?? "").toLowerCase()];
  return roleParam ? `/users?role=${roleParam}` : "/users";
};

export const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
};

export const fmtDateTime = (date?: string | null, time?: string | null) => {
  const d = fmtDate(date);
  if (d === "-") return "-";
  return time ? `${d} • ${time}` : d;
};

export const fmtCurrency = (value: number | null, currency?: string) => {
  if (value === null || value === undefined) return "-";
  const symbol = currency === "INR" || !currency ? "₹" : `${currency} `;
  return `${symbol}${Number(value).toLocaleString("en-IN")}`;
};

export const to12h = (hhmm?: string | null) => {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm).trim());
  if (!m) return String(hhmm);
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

/* ---------- Shared UI primitives ---------- */

export const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-default-100 dark:bg-default-50/40 ${className}`} />
);

export const InfoField: React.FC<{ label: string; value: unknown }> = ({ label, value }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <div className="text-xs text-default-400">{label}</div>
      <div className="mt-0.5 text-sm text-default-800 dark:text-default-200">{String(value)}</div>
    </div>
  );
};

export const EmptyBlock: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-default-200 bg-default-50/50 py-10 text-center dark:border-default-100 dark:bg-default-50/20 sm:py-12">
    <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-default-100 text-default-400 dark:bg-default-50/50">
      {icon}
    </div>
    <p className="text-sm font-medium text-default-700 dark:text-default-200">{title}</p>
    <p className="mt-1 max-w-[280px] px-4 text-xs text-default-400">{description}</p>
  </div>
);

export const AppointmentStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const v = (status ?? "").toLowerCase();
  const style =
    v.includes("complet") || v.includes("confirm")
      ? { color: "success" as const, dot: "bg-emerald-400" }
      : v.includes("cancel") || v.includes("noshow") || v.includes("no show")
        ? { color: "danger" as const, dot: "bg-rose-400" }
        : v.includes("pending") || v.includes("upcoming")
          ? { color: "warning" as const, dot: "bg-amber-400" }
          : { color: "default" as const, dot: "bg-default-400" };

  return (
    <Chip
      size="sm"
      variant="flat"
      color={style.color}
      className="gap-2"
      startContent={<span className={`h-2 w-2 rounded-full ${style.dot}`} />}
    >
      {status ?? "-"}
    </Chip>
  );
};
