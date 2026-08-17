import type { ComponentType } from "react";
import type { AppointmentRow } from "../../utils/appointment.mapper";

/** Page-size options for the appointment list/card pagination control. */
export type PageSize = 6 | 10 | 15;

/** Layout mode for the appointment list screen. */
export type AppointmentListLayout = "list" | "card";

export interface QueueWaitData {
  /** Map of appointmentId → estimatedWaitMinutes from real-time queue */
  waitByAppointmentId: Map<string, number>;
  hasData: boolean;
}

export interface AppointmentListViewProps {
  layout: AppointmentListLayout;
  showSkeleton: boolean;
  /** Show a subtle loading overlay (opacity) without replacing content */
  isRefreshing?: boolean;
  rows: AppointmentRow[];
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
  goToDetails: (id: string) => void;
  sortDir?: "asc" | "desc" | null;
  onSortStatus?: () => void;
  /** Real-time queue wait data (optional, shown as extra column when available) */
  queueWaitData?: QueueWaitData;
  /** Whether the clinic has the no-show policy enabled */
  noShowPolicyActive?: boolean;
  /** Whether saved draft indicators should be shown beside appointment rows */
  showDraftIndicators?: boolean;
}

/** Props shared by both the table (`AppointmentTable`) and card
 * (`AppointmentCardGrid`) layouts under `pages/appointment/components/list/`. */
export interface AppointmentListSharedProps {
  rows: AppointmentRow[];
  showSkeleton: boolean;
  isRefreshing?: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
  goToDetails: (id: string) => void;
  /** Appointment ids that have a saved prescription draft (shows `DraftDataIndicator`) */
  draftAppointmentIds: Set<string>;
}

export interface AppointmentTableProps extends AppointmentListSharedProps {
  sortDir?: "asc" | "desc" | null;
  onSortStatus?: () => void;
  queueWaitData?: QueueWaitData;
}

export type AppointmentCardGridProps = AppointmentListSharedProps;

export interface BottomControlsProps {
  show: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
  variant?: "card" | "plain";
}

export interface BookingSourceMeta {
  label: string;
  className: string;
}

export interface PaymentModeMeta {
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
}
