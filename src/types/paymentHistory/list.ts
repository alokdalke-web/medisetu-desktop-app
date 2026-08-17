import type { Pagination as ApiPagination } from "../../redux/api/subscriptionApi";

export type { ApiPagination };

/** Page-size options for the payment history pagination control. */
export type PageSize = 6 | 10 | 15;

export type TabKey = "all" | "credit" | "debit";

export interface TransactionRow {
  rawId: string;
  originalAppointmentId?: string | null;
  patientName: string;
  patientMobile: string | null;
  patientEmail?: string | null;
  patientAvatar?: string | null;
  doctorName: string;
  doctorSpeciality: string | null;
  doctorAvatar?: string | null;
  serviceName: string;
  priceNumber: number | null;
  entryType: string;
  paymentStatus?: string | null;
  paymentMode?: string | null;
  refundMode?: string | null;
  refundNotes?: string | null;
  mode?: string | null;
  dateLabel: string;
  /** Present when multiple services were billed under the same appointment
   * (e.g. a primary charge + an add-on) — lets the row expand to show each
   * service's own amount and transaction id instead of only a combined total. */
  subServices?: { serviceName: string; priceNumber: number; transactionId: string; mode?: string | null }[] | null;
}

export interface BottomControlsProps {
  show: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
}

export interface TransactionListSharedProps {
  rows: TransactionRow[];
  showSkeleton: boolean;
  isError: boolean;
  errorText: string;
  isDoctorUser: boolean;
  onViewDetails: (row: TransactionRow) => void;
}

export type TransactionCardsProps = TransactionListSharedProps & {
  onViewAppointment: (row: TransactionRow) => void;
};

export type TransactionTableProps = TransactionListSharedProps;

export interface TransactionDetailDrawerProps {
  txn: TransactionRow | null;
  isOpen: boolean;
  onClose: () => void;
  onCopy: (text: string) => void;
  onViewAppointment: (txn: TransactionRow) => void;
  moneyFmt: (n: number) => string;
}
