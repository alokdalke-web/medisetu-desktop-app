import type { SelectedMed } from "../../../components/PrescriptionWorkspace";
import {
  emptyPrescriptionDetails,
  type PrescriptionDetailsValue,
} from "../../../components/prescription/details/types";
import { isCategoryAllowed } from "../../../utils/cookieConsent";

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const KEY_PREFIX = "medisetu_appointment_prescription_draft:";
const COOKIE_PREFIX = "medisetu_appt_rx_draft:";
const COOKIE_MAX_VALUE_LENGTH = 3800;
export const APPOINTMENT_PRESCRIPTION_DRAFT_EVENT =
  "appointment-prescription-draft-updated";

export type AppointmentPrescriptionDraft = {
  version: typeof DRAFT_VERSION;
  appointmentId: string;
  updatedAt: string;
  meds: SelectedMed[];
  details: PrescriptionDetailsValue;
  tests: string[];
};

const getDraftKey = (appointmentId: string) =>
  `${KEY_PREFIX}${appointmentId.trim()}`;

const getDraftCookieName = (appointmentId: string) =>
  `${COOKIE_PREFIX}${appointmentId.trim()}`;

const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(encodedName.length));
  } catch {
    return null;
  }
};

const removeDraftCookie = (appointmentId: string) => {
  if (typeof document === "undefined") return;

  document.cookie = `${encodeURIComponent(
    getDraftCookieName(appointmentId),
  )}=; Max-Age=0; Path=/; SameSite=Lax`;
};

const saveDraftCookie = (appointmentId: string, value: string) => {
  if (typeof document === "undefined") return;

  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length > COOKIE_MAX_VALUE_LENGTH) {
    removeDraftCookie(appointmentId);
    return;
  }

  document.cookie = `${encodeURIComponent(
    getDraftCookieName(appointmentId),
  )}=${encodedValue}; Max-Age=${Math.floor(
    DRAFT_TTL_MS / 1000,
  )}; Path=/; SameSite=Lax`;
};

const notifyDraftUpdated = (appointmentId: string) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(APPOINTMENT_PRESCRIPTION_DRAFT_EVENT, {
      detail: { appointmentId },
    }),
  );
};

export const canUseAppointmentPrescriptionDrafts = () =>
  isCategoryAllowed("functional");

const hasText = (value: unknown) => String(value ?? "").trim().length > 0;

export const hasPrescriptionDetailsDraftData = (
  details?: PrescriptionDetailsValue | null,
  options: { includeVitals?: boolean } = {},
) => {
  if (!details) return false;
  const includeVitals = options.includeVitals ?? true;

  const textFields: Array<keyof PrescriptionDetailsValue> = [
    "chiefComplaint",
    "chiefComplaintDuration",
    "otherComplaints",
    "history",
    "allergies",
    "provisionalDiagnosis",
    "differentialDiagnosis",
    "diagnosis",
    "surgerySuggested",
    "investigations",
    "advice",
    "clinicalNotes",
    "notes",
    "visitingNotes",
  ];

  if (textFields.some((field) => hasText(details[field]))) return true;

  const arrayFields: Array<keyof PrescriptionDetailsValue> = [
    "comorbidities",
    "habits",
    "generalFindings",
    "visitingDays",
  ];

  if (
    arrayFields.some((field) => {
      const value = details[field];
      return Array.isArray(value) && value.length > 0;
    })
  ) {
    return true;
  }

  if (!includeVitals) return false;
  const vitals = details.vitals ?? emptyPrescriptionDetails.vitals;
  return [
    vitals.bpSys,
    vitals.bpDia,
    vitals.pulse,
    vitals.spo2,
    vitals.temperatureC,
    vitals.heightCm,
    vitals.weightKg,
  ].some((value) => value != null);
};

export const hasAppointmentPrescriptionDraftData = ({
  meds,
  details,
  tests,
}: Pick<AppointmentPrescriptionDraft, "meds" | "details" | "tests">) =>
  meds.length > 0 ||
  tests.length > 0 ||
  hasPrescriptionDetailsDraftData(details);

export const getAppointmentPrescriptionDraft = (
  appointmentId: string,
): AppointmentPrescriptionDraft | null => {
  const normalizedAppointmentId = appointmentId.trim();
  if (!normalizedAppointmentId) return null;

  const cookieRaw = getCookieValue(getDraftCookieName(normalizedAppointmentId));
  const canUseDraftStorage =
    canUseAppointmentPrescriptionDrafts() || Boolean(cookieRaw);
  if (!canUseDraftStorage) return null;

  try {
    const raw =
      localStorage.getItem(getDraftKey(normalizedAppointmentId)) ?? cookieRaw;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AppointmentPrescriptionDraft>;
    if (
      parsed.version !== DRAFT_VERSION ||
      parsed.appointmentId !== normalizedAppointmentId ||
      !parsed.updatedAt ||
      !Array.isArray(parsed.meds) ||
      !parsed.details ||
      !Array.isArray(parsed.tests)
    ) {
      clearAppointmentPrescriptionDraft(normalizedAppointmentId);
      return null;
    }

    const updatedAtMs = new Date(parsed.updatedAt).getTime();
    if (!Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > DRAFT_TTL_MS) {
      clearAppointmentPrescriptionDraft(normalizedAppointmentId);
      return null;
    }

    return parsed as AppointmentPrescriptionDraft;
  } catch {
    clearAppointmentPrescriptionDraft(normalizedAppointmentId);
    return null;
  }
};

export const saveAppointmentPrescriptionDraft = ({
  appointmentId,
  meds,
  details,
  tests,
}: {
  appointmentId: string;
  meds: SelectedMed[];
  details: PrescriptionDetailsValue;
  tests: string[];
}) => {
  if (!appointmentId.trim() || !canUseAppointmentPrescriptionDrafts()) return;

  if (!hasAppointmentPrescriptionDraftData({ meds, details, tests })) {
    clearAppointmentPrescriptionDraft(appointmentId);
    return;
  }

  const draft: AppointmentPrescriptionDraft = {
    version: DRAFT_VERSION,
    appointmentId,
    updatedAt: new Date().toISOString(),
    meds,
    details,
    tests,
  };

  try {
    const serialized = JSON.stringify(draft);
    localStorage.setItem(getDraftKey(appointmentId), serialized);
    saveDraftCookie(appointmentId, serialized);
    notifyDraftUpdated(appointmentId);
  } catch {
    try {
      saveDraftCookie(appointmentId, JSON.stringify(draft));
      notifyDraftUpdated(appointmentId);
    } catch {
      // Ignore storage quota / private mode errors. The server save flow still works.
    }
  }
};

export const clearAppointmentPrescriptionDraft = (appointmentId: string) => {
  if (!appointmentId.trim()) return;

  try {
    localStorage.removeItem(getDraftKey(appointmentId));
    removeDraftCookie(appointmentId);
    notifyDraftUpdated(appointmentId);
  } catch {}
};
