import type { AppointmentDraft } from "../types";

export const APPOINTMENT_DRAFT_KEY = "new-appointment-session-draft-v1";

export const readAppointmentDraft = (): AppointmentDraft | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(APPOINTMENT_DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed as AppointmentDraft;
  } catch {
    return null;
  }
};

export const writeAppointmentDraft = (draft: AppointmentDraft) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(APPOINTMENT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore session write errors
  }
};

export const clearAppointmentDraft = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(APPOINTMENT_DRAFT_KEY);
  } catch {
    // ignore session clear errors
  }
};
