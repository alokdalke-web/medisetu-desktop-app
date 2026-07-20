import type { ClinicWithDoctors, RequestDoctor } from "../../../../redux/api/requestApi";
import type { BoardStatus } from "./types";

/**
 * Safely extract clinic ID from clinic object
 */
export const getClinicId = (clinic: ClinicWithDoctors): string =>
  clinic.id ?? clinic._id ?? "";

/**
 * Safely extract clinic name from clinic object
 */
export const getClinicName = (clinic: ClinicWithDoctors): string =>
  clinic.clinicName ?? clinic.name ?? "Untitled clinic";

/**
 * Safely extract doctor ID from doctor object
 */
export const getDoctorId = (doctor: RequestDoctor): string =>
  doctor.id ?? doctor._id ?? "";

/**
 * Check if a value represents archived status
 */
export const isArchivedValue = (value: unknown): boolean =>
  value === true || String(value).trim().toLowerCase() === "true";

/**
 * Map user status and archive flag to board status
 */
export const getBoardStatus = (
  userStatus?: string | null,
  isArchive?: unknown,
): BoardStatus => {
  if (isArchivedValue(isArchive)) return "Archive";

  const status = String(userStatus ?? "").trim().toLowerCase();

  if (status === "active" || status === "approved") return "Approved";
  if (status === "reviewing") return "Reviewing";
  if (status === "rejected") return "Rejected";
  if (status === "archive" || status === "archived") return "Archive";

  return "Pending";
};

/**
 * Extract error message from various error formats
 */
export const getErrorMessage = (error: unknown): string => {
  const err = error as {
    data?: { message?: string };
    error?: string;
    status?: string | number;
  };

  return (
    err?.data?.message ??
    err?.error ??
    `Request failed${err?.status ? ` (${err.status})` : ""}`
  );
};

/**
 * Convert date string to ISO format with start of day time
 */
export const toStartIso = (date: string): string | undefined =>
  date ? `${date}T00:00:00Z` : undefined;

/**
 * Convert date string to ISO format with end of day time
 */
export const toEndIso = (date: string): string | undefined =>
  date ? `${date}T23:59:59Z` : undefined;

/**
 * Format date to YYYY-MM-DD format
 */
export const formatYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Get current month date range in YYYY-MM-DD format
 */
export const getCurrentMonthRange = (): { start: string; end: string } => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    start: formatYmd(monthStart),
    end: formatYmd(today),
  };
};
