import type { ClinicWithDoctors, RequestDoctor, RequestDoctorStatus } from "../../../../redux/api/requestApi";

export type BoardStatus = "Pending" | "Approved" | "Reviewing" | "Rejected" | "Archive";
export type ActiveBoardStatus = Exclude<BoardStatus, "Archive">;
export type BulkActionType = "approve" | "reject" | "archive" | "unarchive" | "export";

export interface BulkOperationResult {
  succeeded: number;
  failed: number;
  total: number;
  skipped?: number;
  failedRecords: Array<{ id: string; reason: string; code?: string }>;
}

export interface RequestDoctorWithClinic extends RequestDoctor {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string | null;
  speciality?: string | null;
  registrationNumber?: string | null;
  profileImage?: string | null;
  isArchive?: boolean | null;
  userStatus?: string | null;
  userType?: string | null;
  gender?: string | null;
  qualification?: string | null;
  yearsOfExperience?: number | null;
  licenseNumber?: string | null;
  createdAt?: string | null;
  clinic?: ClinicWithDoctors | null;
}

export interface RequestCard {
  id: string;
  doctorId: string;
  clinic: ClinicWithDoctors;
  doctor: RequestDoctorWithClinic;
  status: BoardStatus;
  createdAt?: string | null;
}

export interface PendingStatusChange {
  action: "status" | "archive" | "unarchive";
  doctorId: string;
  fromStatus: BoardStatus;
  toStatus: BoardStatus;
  card?: RequestCard;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface StatusMeta {
  color: "success" | "warning" | "primary" | "danger" | "default";
  className: string;
}

export type StatusToUserStatusMap = Record<BoardStatus, RequestDoctorStatus>;
export type StatusMetaMap = Record<BoardStatus, StatusMeta>;
