export type ReceptionOverviewQueryArgs = {
  doctorId?: string;
} | void;

export type ReceptionAppointmentCounts = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  remaining: number;
};

export type ReceptionPaymentSummary = {
  collectedToday: number;
  paidCount: number;
  pendingAmount: number;
  pendingCount: number;
};

export type ReceptionDoctorQueue = {
  doctorId: string;
  doctorName: string;
  total: number;
  completed: number;
  remaining: number;
};

export type ReceptionOverviewData = {
  appointments: ReceptionAppointmentCounts;
  payments: ReceptionPaymentSummary;
  patientsRegisteredToday: number;
  doctorQueues: ReceptionDoctorQueue[];
};

export type ReceptionOverviewResponse = {
  success: boolean;
  message: string;
  data: ReceptionOverviewData;
};
