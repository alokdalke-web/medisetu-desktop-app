import type { LabReportActions } from "../../../redux/api/labAssistantApi";

const defaultAllowedUploadFormats = ["pdf", "jpg", "jpeg", "png", "webp"];

const formatMimeTypes: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
};

export function isCompletedOrVerifiedStatus(status?: string | null) {
  const normalized = String(status ?? "").trim().toUpperCase();
  return normalized === "COMPLETED" || normalized === "VERIFIED";
}

export function getLabReportUploadFormats(actions?: LabReportActions | null) {
  const formats =
    (actions?.allowedUploadFormats?.length ?? 0) > 0
      ? (actions?.allowedUploadFormats ?? defaultAllowedUploadFormats)
      : defaultAllowedUploadFormats;

  return Array.from(
    new Set(
      formats
        .map((format) => String(format).trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function getLabReportUploadAccept(actions?: LabReportActions | null) {
  return getLabReportUploadFormats(actions)
    .map((format) => `.${format}`)
    .join(",");
}

export function isAllowedLabReportUploadFile(
  file: File,
  actions?: LabReportActions | null,
) {
  const formats = getLabReportUploadFormats(actions);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = file.type.toLowerCase();

  if (extension && formats.includes(extension)) return true;

  return formats.some((format) =>
    formatMimeTypes[format]?.some((mime) => mime === mimeType),
  );
}

export function getLabReportDownloadErrorMessage(error: unknown) {
  const payload = (error as any)?.data;
  const message = String(
    payload?.message ?? payload?.error ?? (error as any)?.error ?? "",
  ).trim();

  if (
    (error as any)?.status === 400 &&
    /report is viewable only after result completion/i.test(message)
  ) {
    return "Complete the result before downloading report.";
  }

  return message || "Could not download the lab report.";
}
