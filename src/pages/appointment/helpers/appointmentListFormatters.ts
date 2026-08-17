import { FaRupeeSign } from "react-icons/fa";
import {
  FiCheckCircle,
  FiCreditCard,
  FiRefreshCw,
  FiSmartphone,
} from "react-icons/fi";
import type { BookingSourceMeta, PaymentModeMeta } from "../../../types/appointment";

export const doctorDisplayName = (name: string) => {
  const clean = String(name || "").trim();
  if (!clean || clean === "—") return "—";
  return clean.toLowerCase().startsWith("dr.") ? clean : `Dr. ${clean}`;
};

export const isTerminalAppointmentStatus = (status?: string | null) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  return ["completed", "cancelled", "canceled", "noshow"].includes(normalized);
};

export function toTimeRange(
  raw: string,
  durationMinutes: number | null | undefined = 30,
) {
  const s = (raw || "").trim();
  if (!s || s === "—") return "—";

  let addMinutes = 30;

  if (durationMinutes !== null && durationMinutes !== undefined) {
    const parsed = Number(durationMinutes);
    addMinutes = !isNaN(parsed) && parsed > 0 ? parsed : 30;
  }

  const m1 = s.match(/^(\d{1,2}):(\d{2})$/);
  const m2 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  let total = 0;

  if (m1) {
    const h = Number(m1[1]);
    const m = Number(m1[2]);
    total = h * 60 + m;
  } else if (m2) {
    let h = Number(m2[1]);
    const m = Number(m2[2]);
    const ap = m2[3].toUpperCase();

    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;

    total = h * 60 + m;
  } else {
    return s;
  }

  const end = total + addMinutes;

  const fmt = (mins: number) => {
    const m = ((mins % 1440) + 1440) % 1440;
    const h24 = Math.floor(m / 60);
    const mm = m % 60;
    const ap = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

    return `${String(h12).padStart(2, "0")}:${String(mm).padStart(
      2,
      "0",
    )} ${ap}`;
  };

  return `${fmt(total)} - ${fmt(end)}`;
}

export const getPaymentModeMeta = (mode?: string | null): PaymentModeMeta => {
  const value = String(mode || "").trim().toLowerCase();

  if (value === "cash") {
    return {
      icon: FaRupeeSign,
      iconClassName: "bg-emerald-50 text-emerald-600",
    };
  }

  if (value === "upi") {
    return {
      icon: FiSmartphone,
      iconClassName: "bg-violet-50 text-violet-600",
    };
  }

  if (value === "card") {
    return {
      icon: FiCreditCard,
      iconClassName: "bg-blue-50 text-blue-600",
    };
  }

  if (value === "follow-up") {
    return {
      icon: FiRefreshCw,
      iconClassName: "bg-cyan-50 text-cyan-600",
    };
  }

  if (value === "covered") {
    return {
      icon: FiCheckCircle,
      iconClassName: "bg-blue-50 text-blue-600",
    };
  }

  return {
    icon: FiCreditCard,
    iconClassName: "bg-surface-muted text-text-muted",
  };
};

/** Only `slate` is redefined/inverted in this app's `.dark` block (see
 * UI_CONVENTIONS.md §3) — every color family here is a standard, un-inverted
 * Tailwind palette, so `dark:*-950/40` etc. resolve correctly without a
 * manual override. Don't reach for `slate` in this function; use `bg-surface-muted`
 * / `text-text-muted` / `border-line` for the neutral case instead. */
export const getBookingSourceMeta = (source?: string | null): BookingSourceMeta => {
  const value = String(source || "").trim().toLowerCase();

  switch (value) {
    case "walk_in":
      return {
        label: "Walk-In",
        className: "bg-surface-muted text-text border border-line",
      };
    case "phone_call":
      return {
        label: "Phone Call",
        className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30",
      };
    case "web_portal":
      return {
        label: "Web Portal",
        className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30",
      };
    case "mobile_app":
      return {
        label: "Mobile App",
        className: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30",
      };
    default:
      return {
        label: source || "—",
        className: "bg-surface-muted text-text-muted border border-line",
      };
  }
};
