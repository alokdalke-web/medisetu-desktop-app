export type NoShowAction =
  | "warning"
  | "penalty"
  | "advance_required"
  | "blocked"
  | "no-show";

export type NoShowRow = {
  id: string;
  patientName: string;
  patientMobile: string;
  doctorName: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentStatus: "no-show";
  latestAction: NoShowAction;
  reason?: string;
  markedBy?: string;
  markedAt?: string;
  totalNoShows: number;
  firstNoShowDate?: string;
  currentStatus: string;
  isBlocked: boolean;
};

export type RowsPerPage = 8 | 10 | 15 | "all";

interface NoShowPaginationProps {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalRecords: number;
  apiPageSize: number;
  rowsPerPage: RowsPerPage;
  setRowsPerPage: (value: RowsPerPage) => void;
}

export interface NoShowTableProps extends NoShowPaginationProps {
  rows: NoShowRow[];
  showSkeleton: boolean;
  onViewHistory: (patientId: string) => void;
}

export interface NoShowCardGridProps extends NoShowPaginationProps {
  rows: NoShowRow[];
  showSkeleton: boolean;
  onViewHistory: (patientId: string) => void;
}

export interface BottomControlsProps extends NoShowPaginationProps {
  show: boolean;
  variant?: "card" | "plain";
}
