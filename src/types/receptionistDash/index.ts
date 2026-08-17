import type { ReceptionDoctorQueue } from "./apiTypes";

export * from "./apiTypes";

export type AppointmentRow = {
  id: string;
  name: string;
  avatar: string | null;
  start: string;
  time: string | null;
  tokenNo: number | null;
  doctorName: string;
  status: string;
  type: string;
  payment: string | null;
  paymentMethod: string | null;
  amount: number | null;
};

export type DoctorOption = {
  id: string;
  name: string;
};

export interface QuickActionsWidgetProps {
  navigate: (path: string) => void;
  isNavigationDisabled?: boolean;
}

export interface DoctorFilterDropdownProps {
  doctorsList: DoctorOption[];
  selectedDoctorId: string;
  selectedDoctorName: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSelect: (doctorId: string) => void;
  isApprovalPending: boolean;
  lockedTitle?: string;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export interface AppointmentsTableProps {
  appointments: AppointmentRow[];
  isApprovalPending: boolean;
  lockedTitle?: string;
  navigateWhenApproved: (path: string) => void;
}

export interface ReceptionStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  /** Live micro-context line under the value (e.g. "Next: 02:00 PM · Sanjay") */
  detail?: string;
  /** 0-100; renders a thin progress bar under the detail line */
  progressPct?: number;
  onClick?: () => void;
  disabled?: boolean;
  lockedTitle?: string;
}

export interface PaymentBadgeProps {
  payment: string | null;
  paymentMethod: string | null;
}

export interface PendingPaymentsWidgetProps {
  appointments: AppointmentRow[];
  isApprovalPending: boolean;
  lockedTitle?: string;
  navigateWhenApproved: (path: string) => void;
}

export interface DoctorQueueWidgetProps {
  queues: ReceptionDoctorQueue[];
  isApprovalPending: boolean;
  lockedTitle?: string;
  onSelectDoctor: (doctorId: string) => void;
}

export interface DoctorQueueHintProps {
  selectedDoctorName: string;
  isApprovalPending: boolean;
  lockedTitle?: string;
  onClear: () => void;
}
