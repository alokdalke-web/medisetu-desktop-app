import type {
  LabResultTemplate,
  SampleStatus,
} from "../../../../redux/api/labAssistantApi";
import { safeDate } from "../../labData";

export const MEDISETU_LOGO_URL =
  "https://infinitymedisetu.com/assets/images/logoDark.svg";
export const LOCAL_MEDISETU_LOGO_URL = `${import.meta.env.BASE_URL}assets/images/logoDark.svg`;

export type BadgeTone = "teal" | "orange" | "green" | "red" | "gray" | "blue";

export type ResultPreviewParameter = {
  parameterId: string;
  parameterName: string;
  sectionName?: string | null;
  value: string;
  unit: string;
  referenceRange: string;
  flag?: "High" | "Low" | "Normal" | null;
};

export function reportTemplateScopeLabel(template: LabResultTemplate) {
  return template.labId ? "My Lab" : "Default";
}

export function firstNonEmptyText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

export function firstReportDisplayText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    const normalized = text.toLowerCase();
    if (
      text &&
      !["-", "—", "null", "undefined", "[object object]"].includes(normalized)
    ) {
      return text;
    }
  }

  return "";
}

export function calculateAgeFromDob(value: unknown) {
  const dob = safeDate(value);
  if (!dob) return "";

  const todayDate = new Date();
  let age = todayDate.getFullYear() - dob.getFullYear();
  const monthDiff = todayDate.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && todayDate.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  return Number.isFinite(age) && age >= 0 ? String(age) : "";
}

export function extractSampleStatusFromResponse(
  response: unknown,
): SampleStatus | null {
  const payload = response as {
    data?: {
      sampleStatus?: unknown;
      appointmentTest?: { sampleStatus?: unknown };
    };
    sampleStatus?: unknown;
    appointmentTest?: { sampleStatus?: unknown };
  };
  const sampleStatus = firstNonEmptyText(
    payload.data?.sampleStatus,
    payload.data?.appointmentTest?.sampleStatus,
    payload.sampleStatus,
    payload.appointmentTest?.sampleStatus,
  );

  return sampleStatus ? (sampleStatus as SampleStatus) : null;
}

export function extractReportPdfUrl(response: unknown) {
  const payload = response as {
    data?: {
      reportPdf?: unknown;
      report_pdf?: unknown;
      appointmentTest?: { reportPdf?: unknown; report_pdf?: unknown };
      url?: unknown;
      fileUrl?: unknown;
    };
    result?: {
      reportPdf?: unknown;
      report_pdf?: unknown;
      url?: unknown;
      fileUrl?: unknown;
    };
    reportPdf?: unknown;
    report_pdf?: unknown;
    url?: unknown;
    fileUrl?: unknown;
  };

  return (
    firstNonEmptyText(
      payload.data?.reportPdf,
      payload.data?.report_pdf,
      payload.data?.appointmentTest?.reportPdf,
      payload.data?.appointmentTest?.report_pdf,
      payload.data?.url,
      payload.data?.fileUrl,
      payload.result?.reportPdf,
      payload.result?.report_pdf,
      payload.result?.url,
      payload.result?.fileUrl,
      payload.reportPdf,
      payload.report_pdf,
      payload.url,
      payload.fileUrl,
    ) || null
  );
}


export function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatTimestamp(value: string | null) {
  const date = safeDate(value);

  if (!date) return "Pending";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function makeBarcodeFileName(value: string) {
  const safeValue = value.trim().replace(/[^a-z0-9_-]+/gi, "_");
  return `lab-barcode-${safeValue || "sample"}.svg`;
}
