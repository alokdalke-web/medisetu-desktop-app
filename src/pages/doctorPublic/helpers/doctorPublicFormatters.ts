import type { PublicClinic, PublicClinicTiming } from "../../../types/doctor";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function sortTimings(timings: PublicClinicTiming[]) {
  return [...timings].sort(
    (a, b) =>
      DAY_ORDER.indexOf((a.dayOfWeek ?? "").toLowerCase()) -
      DAY_ORDER.indexOf((b.dayOfWeek ?? "").toLowerCase()),
  );
}

export function formatTime(value: string | null) {
  if (!value) return "--";
  const raw = value.trim();
  // Availability rows are free-text varchar: some clinics store "18:00",
  // others already store "6:00 PM". Only convert the 24h form.
  if (/[ap]\.?m\.?$/i.test(raw)) return raw.toUpperCase().replace(/\s+/g, " ");

  const [h, m] = raw.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return raw;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${(m ?? "00").padStart(2, "0")} ${suffix}`;
}

/** Keyless Google Maps embed — works without an API key or billing account. */
export function getClinicMapEmbedUrl(clinic: PublicClinic) {
  if (clinic.latitude && clinic.longitude) {
    return `https://www.google.com/maps?q=${clinic.latitude},${clinic.longitude}&z=15&output=embed`;
  }
  const address = formatClinicLocation(clinic);
  if (address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
  }
  return null;
}

export function getClinicMapsUrl(clinic: PublicClinic) {
  if (clinic.latitude && clinic.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${clinic.latitude},${clinic.longitude}`;
  }
  if (clinic.clinicAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.clinicAddress)}`;
  }
  return null;
}

/**
 * `clinicAddress` is free text and very often already ends with the city/state,
 * so appending them unconditionally produces "…, Indore, Madhya Pradesh 452010,
 * India, Ratna Lok Colony, Madhya Pradesh". Only append what's missing.
 */
export function formatClinicLocation(clinic: PublicClinic) {
  const address = (clinic.clinicAddress ?? "").trim();
  const parts = address ? [address] : [];
  const haystack = address.toLowerCase();

  for (const value of [clinic.city, clinic.state]) {
    const clean = (value ?? "").trim();
    if (!clean) continue;
    if (haystack.includes(clean.toLowerCase())) continue;
    parts.push(clean);
  }

  return parts.join(", ");
}
