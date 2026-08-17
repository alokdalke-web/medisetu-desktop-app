import type React from "react";

export type PendingAppt = {
  id: string;
  patientName: string;
  profileImage?: string | null;
  start: string;
  time: string | null;
  notes: string | null;
  symptoms: string | null;
  age?: string | null;
  gender?: string | null;
  status?: string | null;
  payment?: string | null;
  paymentMethod?: string | null;
  paymentPrice?: number | null;
  tokenNo?: number | null;
  mobile?: string | null;
  appointmentType?: string | null;
  dateLabel: string;
};

export type SetupStep = {
  title: string;
  subtitle: string;
  status: "completed" | "pending";
  stepNumber: number;
  path?: string;
};

export type SetupProgress = {
  title: string;
  completed: number;
  total: number;
  ctaLabel: string;
  ctaPath: string;
  secondaryLabel: string;
  steps: SetupStep[];
};

export type QuickAction = {
  icon: React.ReactNode;
  label: string;
  path: string;
};

export interface StartYourDayCardProps {
  firstPatient?: PendingAppt;
  waitingCount: number;
  totalAppointments: number;
  completedCount: number;
  remainingCount: number;
  onStartConsultation: () => void;
  onViewPatient: () => void;
  onAddWalkIn: () => void;
  isNavigationDisabled?: boolean;
}

export interface TodaysAppointmentsListProps {
  appointments: PendingAppt[];
  onViewCalendar: () => void;
  onViewAppointment: (id: string) => void;
  onAddWalkIn: () => void;
  isNavigationDisabled?: boolean;
}

export interface QuickActionsGridProps {
  navigate: (path: string) => void;
  isNavigationDisabled?: boolean;
}

export interface RecentPatientsProps {
  appointments: PendingAppt[];
  navigate: (path: string) => void;
  isNavigationDisabled?: boolean;
}

export interface SetupProgressBannerProps {
  progress: SetupProgress;
  navigate: (path: string) => void;
  isNavigationDisabled?: boolean;
}

/* =========================
   DOCTOR DASHBOARD v2 (/api/v2/dashboard/doctor)
========================= */
export type DoctorDashboardV2Metric = {
  count: number;
  hikePercent: number;
  previous: number;
};

export type DoctorDashboardV2StatusBlock = {
  totalEarning: { amount: number; hikePercent: number; previous: number };
  totalAppointments: DoctorDashboardV2Metric;
  confirmedAppointments: DoctorDashboardV2Metric;
  pendingAppointments: DoctorDashboardV2Metric;
  noShowAppointments: DoctorDashboardV2Metric;
  completedAppointments: DoctorDashboardV2Metric;
  cancelledAppointments: DoctorDashboardV2Metric;
  waitingPatients: DoctorDashboardV2Metric;
  remainingAppointments: DoctorDashboardV2Metric;
  uniquePatients: DoctorDashboardV2Metric;
};

export type DoctorDashboardV2PendingAppointment = {
  id: string;
  name: string;
  profileImage: string | null;
  gender: string | null;
  age: number | null;
  mobile: string | null;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string | null;
  appointmentType: string | null;
  reasonForVisit: string | null;
  symptoms: string | null;
  tokenNo: number | null;
  payment: {
    paymentMode?: string | null;
    paymentStatus?: string | null;
    price?: string | number | null;
  } | null;
};

export type DoctorDashboardV2Result = {
  status: DoctorDashboardV2StatusBlock;
  appointmentStats: Array<{
    date: string;
    count: number;
    noShowCount: number;
    completedCount: number;
  }>;
  pendingAppointments: DoctorDashboardV2PendingAppointment[];
  peakHours: Array<{
    hour: number;
    count: number;
    completedCount: number;
    noShowCount: number;
    cancelledCount: number;
    upcomingCount: number;
    tokenCount: number;
    tokenRange: { min: number; max: number } | null;
  }>;
  patientTypes: {
    newPatients: DoctorDashboardV2Metric;
    returningPatients: DoctorDashboardV2Metric;
  };
};

export interface DoctorDashboardV2Response {
  success: boolean;
  message: string;
  data: DoctorDashboardV2Result;
}

export type DoctorDashboardV2QueryArgs = Partial<{
  startDate: string;
  endDate: string;
  doctorId: string;
}> | void;

export type DoctorDashboardProfileResult = {
  doctorName: string | null;
  setupProgress: SetupProgress | null;
};

export interface DoctorDashboardProfileResponse {
  success: boolean;
  message: string;
  data: DoctorDashboardProfileResult;
}

export type DoctorDashboardProfileQueryArgs = Partial<{
  doctorId: string;
}> | void;
