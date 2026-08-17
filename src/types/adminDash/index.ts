export type SubscriptionLike = {
  planName?: string | null;
  slug?: string | null;
  price?: string | number | null;
};

export type DashboardResultLoose = {
  status?: {
    totalAppoiment?: { count?: number; hikePersent?: unknown };
    activePatent?: { count?: number; hikePersent?: unknown };
    totalEarning?: { amount?: number; hikePersent?: unknown };
    pendingAproval?: { count?: number; hikePersent?: unknown };
    pendingPayment?: { amount?: number; hikePersent?: unknown };
    noShowCount?: { count?: number; hikePersent?: unknown };
  };
  revenueOverview?: Array<{ date?: string; appoitmentCount?: number }>;
  appoimentStatus?: {
    pending?: number;
    confirmed?: number;
    cancelled?: number;
    completed?: number;
  };
  patentOverview?: Array<{ date?: string; count?: number }>;
  symptomStats?: Array<{
    symptomId?: string;
    symptomName?: string;
    count?: number;
  }>;
};

export type PendingAppt = {
  id: string;
  patientName: string;
  profileImage?: string | null;
  start: string;
  time: string | null;
  notes: string | null;
  age?: string | null;
  gender?: string | null;
  status?: string | null;
  payment?: string | null;
  paymentMethod?: string | null;
  tokenNo?: number | null;
  patientId?: string | null;
  patientMobile?: string | null;
};

export interface SummaryBarProps {
  nextApptTime?: string;
  nextApptName?: string;
  remaining?: number;
  completed?: number;
  pending?: number;
  todayRevenue?: number;
  onViewSchedule?: () => void;
}

export interface AIInsightsWidgetProps {
  isFreePlan: boolean;
  onUpgrade: () => void;
}

export interface AlertsWidgetProps {
  noShowCount: number;
  onViewNoShow?: () => void;
}

/** One payment method's share of collections over the plotted period. */
export type PaymentModeShare = {
  /** Display label, e.g. "Cash", "UPI". */
  label: string;
  amount: number;
  /** Share of `collected`, 0-100. */
  percent: number;
  color: string;
};

/** A single rate row in ClinicPulseWidget. */
export type PulseRate = {
  label: string;
  /** 0-100. */
  percent: number;
  /** Raw counts behind the percentage, e.g. "3 of 12". */
  detail: string;
  color: string;
};

export interface ClinicPulseWidgetProps {
  totalToday: number;
  rates: PulseRate[];
  /** Appointments today whose payment is settled. */
  paidCount: number;
  /** Appointments today still awaiting payment. */
  unpaidCount: number;
  onViewAppointments?: () => void;
}

/**
 * The `summary` block from GET /appointments/payment-transactions — the same
 * object that drives the Payments History page's KPI cards. Typed here because
 * the API slice declares it as `any`.
 */
export type PaymentTransactionsSummary = {
  totalCreditAmount: number;
  totalDebitAmount: number;
  /** Credit that is booked but not yet collected. A subset of credit. */
  totalPendingAmount: number;
  netAmount: number;
  totalTransactions: number;
  creditTransactions: number;
  debitTransactions: number;
  paymentModeSummary: {
    credit: Record<string, number>;
    debit: Record<string, number>;
  };
};

export interface CollectionsWidgetProps {
  /** Exact period the figures cover, e.g. "26 Jul – 1 Aug". */
  periodLabel: string;
  /** Credit total for the period — equals the sum of `modes` by construction. */
  totalCredit: number;
  modes: PaymentModeShare[];
  refunded: number;
  netAmount: number;
  /** Booked but uncollected; included within `totalCredit`. */
  pendingAmount: number;
  transactionCount: number;
  onViewPayments?: () => void;
}

export interface RemindersWidgetProps {
  appointments: PendingAppt[];
  navigate: (path: string) => void;
}

export interface SymptomBarProps {
  symptoms: Array<{ name: string; count: number; percent: number }>;
  onViewReport?: () => void;
}

export interface PatientOverviewProps {
  newPatients: number;
  returningPatients: number;
  newDelta?: number;
  returningDelta?: number;
  deltaLabel?: string;
  onViewReport?: () => void;
}

export interface QuickActionsWidgetProps {
  navigate: (path: string) => void;
}

export interface PendingAppointmentsTableProps {
  appointments: PendingAppt[];
  navigate: (path: string) => void;
  onViewAll: () => void;
}

export interface PatientSearchBarProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showSearchResults: boolean;
  setShowSearchResults: (value: boolean) => void;
  debouncedSearch: string;
  isSearching: boolean;
  searchResults: any;
  navigate: (path: string) => void;
}
