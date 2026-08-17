// src/types/staffManagement.ts — Types for the unified staff limit system

/** Staff user types that share the unified staff limit pool */
export type StaffUserType =
  | "Receptionist"
  | "Nurse"
  | "Pharmacist"
  | "Lab_Assistant"
  | "Radiologist";

/** Doctor user type (separate limit) */
export type DoctorUserType = "Doctor";

/** All user types that can be added via the /adduser endpoint */
export type AddableUserType = DoctorUserType | StaffUserType;

/** Request payload for POST /api/v1/users/adduser */
export interface AddUserPayload {
  name: string;
  email: string;
  userType: AddableUserType;
  mobile?: string;
  speciality?: string | null;
  registrationNumber?: string | null;
  labId?: string; // Required for Lab_Assistant
  pharmacyId?: string; // Required for Pharmacist
}

/** Staff limit information derived from the limitations API */
export interface StaffLimitInfo {
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  isUnlimited: boolean;
  remaining: number | null;
  message?: string;
}

/** Deactivated user info returned by cancel/enforce endpoints */
export interface DeactivatedUser {
  id: string;
  name: string | null;
  email: string | null;
}

/** Deactivated staff with userType info */
export interface DeactivatedStaff extends DeactivatedUser {
  userType: string;
}

/** Result of subscription cancellation */
export interface CancelResult {
  warnings: string[];
  doctorsDeactivated: DeactivatedUser[];
  staffDeactivated: DeactivatedStaff[];
}
