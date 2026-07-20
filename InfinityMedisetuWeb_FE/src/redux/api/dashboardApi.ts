// src/redux/api/dashboardApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { TransportLayer } from "../../services/TransportLayer";

/* =========================
   ADMIN DASHBOARD (your existing types)
========================= */
interface AppointmentCount {
  count: number;
}
interface AppointmentSummary {
  totalPendingAppointments: AppointmentCount;
  totalUpcomingAppointments: AppointmentCount;
  totalConfirmedAppointments: AppointmentCount;
  totalCancelledAppointments: AppointmentCount;
  totalApoinmentPatient?: { count: number }[];
  totalErning?: AppointmentCount;
}
interface CompletedAppointmentRaw {
  month: string;
  year: number;
  month_num: number;
  count: number;
}
interface CompletedAppointmentsSeries {
  labels: string[];
  data: number[];
  keys: string[];
  details: Array<{
    date: string;
    count: number;
    label: string;
  }>;
  range: { start: string; end: string };
  raw: CompletedAppointmentRaw[];
}
interface PatientData {
  id: string;
  appoinmentId: string;
  name: string;
  email: string;
  profileImage: string | null;
  appointmentDate: string;
  appointmentTime: string | null;
  appointmentType: string | null;
  appointmentStatus: string | null;
}
type DashboardStatusBlock = {
  totalEarning?: { amount: number; hikePersent?: string };
  totalAppoiment?: { count: number; hikePersent?: string };
  pendingAproval?: { count: number; hikePersent?: string };
  pendingPayment?: { amount: number; hikePersent?: string };
  noShowCount?: { count: number; hikePersent?: string };
  activePatent?: { count: number; hikePersent?: string };
};

type DashboardAppointmentStatus = {
  total?: number;
  completed?: number;
  confirmed?: number;
  pending?: number;
  cancelled?: number;
  noShow?: number;
};

type DashboardRevenueOverviewItem = {
  date: string;
  amount: number;
  appoitmentCount: number;
};

type DashboardPatentOverviewItem = {
  date: string;
  count: number;
};

type DashboardNoShowOverviewItem = {
  date: string;
  count: number;
};

type DashboardSymptomStat = {
  symptomId: string;
  symptomName: string;
  count: number;
};

interface DashboardResult {
  appointment: AppointmentSummary;
  newPatients: number;
  totalNewAppointments: number;
  completedAppointmentsSeries: CompletedAppointmentsSeries;
  upcomingAppointmentsRes: any[];
  totalPatientsCount: number;
  totalAppointmentsCount: number;
  patientData: PatientData[];
  status?: DashboardStatusBlock;
  appoimentStatus?: DashboardAppointmentStatus;
  revenueOverview?: DashboardRevenueOverviewItem[];
  patentOverview?: DashboardPatentOverviewItem[];
  noShowOverview?: DashboardNoShowOverviewItem[];
  symptomStats?: DashboardSymptomStat[];
}
export interface DashboardResponse {
  success: boolean;
  result: DashboardResult;
}

export type DashboardQueryArgs = Partial<{
  months: number;
  startDate: string;
  endDate: string;
  dateRangeStartCount: string;
  dateRangeEndCount: string;
}> | void;

/* =========================
   DOCTOR DASHBOARD (NEW types)
========================= */
type DoctorStatusBlock = {
  totalEarning?: { amount: number; hikePersent?: string };
  totalAppoiment?: { count: number; hikePersent?: string };
  totalConfirmedAppointments?: { count: number; hikePersent?: string };
  totalPendigAppointments?: { count: number; hikePersent?: string };
  totalNoShowAppointments?: { count: number; hikePersent?: string };
  totalApoinmentPatient?: { count: number }[];
};

type DoctorPendingAppointment = {
  id: string;
  name: string;
  profileImage: string | null;
  appoinmentId?: string;
  appointmentId?: string;
  appointmentDate: string;
  appointmentTime: string | null;
  appointmentType: string | null;
  email?: string | null;
  tokenNo?: number | null;
  payment?: {
    paymentMode?: string | null;
    paymentStatus?: string | null;
    price?: string | number | null;
  } | null;
};

type DoctorPatientData = {
  id: string;
  name: string;
  email: string | null;
  profileImage: string | null;

  appointmentDate: string;
  appointmentTime: string | null;
  appointmentType: string | null;
  appointmentStatus: string | null;

  appoinmentId?: string;
  appointmentId?: string;
};

type DoctorDashboardResult = {
  status?: DoctorStatusBlock;
  pendingAppointment?: DoctorPendingAppointment[];
  patientData?: DoctorPatientData[];

  appoinmentStats?: { date: string; count: number; noShowCount?: number }[];
  completedAppointmentsSeries?: { labels: string[]; data: number[] };
  cancelledAppointmentsSeries?: { labels: string[]; data: number[] };

  totalAppointmentsCount?: number;
  totalPatientsCount?: number;
};

export interface DoctorDashboardResponse {
  success: boolean;
  result: DoctorDashboardResult;
}

export type DoctorDashboardQueryArgs = Partial<{
  startDate: string;
  endDate: string;
  months: number;
  doctorId: string; // admin can query a specific doctor's dashboard
  _t: number; // optional cache buster (if you want)
}> | void;

/* =========================
   SUPER ADMIN DASHBOARD
========================= */
type SuperAdminClinicStats = {
  total: number;
  active: number;
  inactive: number;
  monthlyActive: number;
  hikePersent: string;
};

type SuperAdminConversionRateStats = {
  rate: number;
  hikePersent: string;
};

type SuperAdminUserStats = {
  total: number;
  monthlyActive: number;
  byRole: Record<string, number>;
  hikePersent: string;
};

type SuperAdminSubscriptionStats = {
  active: number;
  total: number;
  yearly: number;
  trial: number;
  expired: number;
  cancelled: number;
  byPlan: Array<{ planName: string; count: number }>;
  hikePersent: string;
};

type SuperAdminSeries = {
  labels: string[];
  data: number[];
};

type SuperAdminRevenueByPlanItem = {
  planName: string;
  amount: number;
  percentage: number;
};

type SuperAdminRevenueStats = {
  total: number;
  yearly: number;
  currentPeriod: number;
  hikePersent: string;
  dailySeries: SuperAdminSeries;
  byPlan: {
    thisWeek: SuperAdminRevenueByPlanItem[];
    thisMonth: SuperAdminRevenueByPlanItem[];
  };
  analytics: {
    thisMonth: { amount: number; growthPercent: number };
    lastMonth: { amount: number; growthPercent: number };
    allTime: { amount: number; growthPercent: number };
  };
};

type SuperAdminTopClinic = {
  name: string;
  revenue: number;
  growthPercent: number;
};

type SuperAdminRegistrationTrends = {
  clinics: SuperAdminSeries;
};

type SuperAdminActivity = {
  id: string;
  type: "clinic_registered" | "payment_received" | "subscription_created" | "verification_pending";
  title: string;
  description: string;
  timestamp: string;
  relatedId?: string;
};

type SuperAdminDashboardResult = {
  clinics: SuperAdminClinicStats;
  conversionRate: SuperAdminConversionRateStats;
  users: SuperAdminUserStats;
  subscriptions: SuperAdminSubscriptionStats;
  revenue: SuperAdminRevenueStats;
  topClinics: SuperAdminTopClinic[];
  registrationTrends: SuperAdminRegistrationTrends;
  activities?: SuperAdminActivity[];
  lastUpdatedAt: string;
};

export interface SuperAdminDashboardResponse {
  success: boolean;
  result: SuperAdminDashboardResult;
}

export type SuperAdminDashboardQueryArgs = Partial<{
  startDate: string;
  endDate: string;
}> | void;

/* =========================
   REVENUE OVERVIEW API (NEW)
========================= */
export type RevenueOverviewPeriod = "week" | "month";

export type RevenueOverviewDayItem = {
  date: string;
  amount: number;
  refundedAmount: number;
  paymentModes: Record<string, number>; // "cash" | "upi" | "card" | "insurance"
};

export interface RevenueOverviewData {
  period: RevenueOverviewPeriod;
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  todayRevenue: number;
  pendingPayments: number;
  pendingPaymentCount: number;
  trend: string;
  previousRevenue: number;
  comparisonLabel: string;
  revenueOverview: RevenueOverviewDayItem[];
  meta: {
    clinicId: string;
    doctorId: string | null;
    rangeStart: string;
    rangeEnd: string;
    generatedAt: string;
  };
}

export interface RevenueOverviewResponse {
  success: boolean;
  message: string;
  data: RevenueOverviewData;
}

export type RevenueOverviewQueryArgs = Partial<{
  period: RevenueOverviewPeriod;
  doctorId: string;
}> | void;

/* =========================
   TODAY OVERVIEW API (NEW)
========================= */
export type TodayOverviewAppointments = {
  total: number;
  remaining: number;
  completed: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
};

export type TodayUpcomingAppointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  patientName: string;
};

export type TodayAppointmentItem = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string | null;
  appointmentStatus: string;
  tokenNo: number | null;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  patientProfileImage: string | null;
  paymentStatus: string | null;
  reason: string | null;
};

export type TodaySymptomCounts = {
  period: "this_week";
  data: Record<string, number>;
};

export type TodayPatientOverview = {
  period: "past_30_days";
  newPatients: { count: number; trend: string };
  returningPatients: { count: number; trend: string };
};

export type TodayOverviewRevenue = {
  todayRevenue: number;
  todayPaidAppointments: number;
  todayPendingPayments: number;
  todayPendingCount: number;
};

export interface TodayOverviewData {
  date: string;
  appointments: TodayOverviewAppointments;
  revenue: TodayOverviewRevenue;
  todaysAppointments: TodayAppointmentItem[];
  upcomingAppointments: TodayUpcomingAppointment[];
  symptomCounts: TodaySymptomCounts;
  patientOverview: TodayPatientOverview;
  meta: {
    clinicId: string;
    doctorId: string;
    generatedAt: string;
  };
}

export interface TodayOverviewResponse {
  success: boolean;
  message: string;
  data: TodayOverviewData;
}

export type TodayOverviewQueryArgs = Partial<{
  doctorId: string;
}> | void;

/* =========================
   helpers
========================= */
const cleanParams = (params: Record<string, any>) => {
  const out: Record<string, any> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && !v.trim()) return;
    out[k] = v;
  });
  return out;
};

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Dashboard", "DoctorDashboard", "SuperAdminDashboard"],
  endpoints: (builder) => ({
    /* -------- Existing (Admin) -------- */
    getDashboard: builder.query<DashboardResponse, DashboardQueryArgs>({
      query: (args) => {
        if (!args) return "/dashboard";

        const params = cleanParams({
          months: args.months,
          startDate: args.startDate,
          endDate: args.endDate,
          dateRangeStartCount: args.dateRangeStartCount,
          dateRangeEndCount: args.dateRangeEndCount,
        });

        return Object.keys(params).length
          ? { url: "/dashboard", params }
          : "/dashboard";
      },
      providesTags: ["Dashboard"],
    }),

    /* -------- NEW (Doctor) -------- */
    getDoctorDashboard: builder.query<
      DoctorDashboardResponse,
      DoctorDashboardQueryArgs
    >({
      queryFn: async (args) => {
        try {
          const params = args ? cleanParams({
            startDate: args.startDate,
            endDate: args.endDate,
            months: args.months,
            doctorId: args.doctorId,
            _t: args._t,
          }) : {};

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'dashboard.getDoctorDashboard',
            ipcPayload: params,
            restConfig: {
              url: "/dashboard/doctor",
              method: "GET",
              params: Object.keys(params).length ? params : undefined,
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["DoctorDashboard"],
    }),

    /* -------- NEW (Super Admin) -------- */
    getSuperAdminDashboard: builder.query<
      SuperAdminDashboardResponse,
      SuperAdminDashboardQueryArgs
    >({
      query: (args) => {
        if (!args) return "/dashboard/super-admin";

        const params = cleanParams({
          startDate: args.startDate,
          endDate: args.endDate,
        });

        return Object.keys(params).length
          ? { url: "/dashboard/super-admin", params }
          : "/dashboard/super-admin";
      },
      providesTags: ["SuperAdminDashboard"],
    }),

    /* -------- Revenue Overview -------- */
    getRevenueOverview: builder.query<
      RevenueOverviewResponse,
      RevenueOverviewQueryArgs
    >({
      queryFn: async (args) => {
        try {
          const params = args ? cleanParams({
            period: args.period,
            doctorId: args.doctorId,
          }) : {};

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'dashboard.getRevenueOverview',
            ipcPayload: params,
            restConfig: {
              url: "/dashboard/revenue-overview",
              method: "GET",
              params: Object.keys(params).length ? params : undefined,
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Dashboard"],
    }),

    /* -------- Today Overview -------- */
    getTodayOverview: builder.query<
      TodayOverviewResponse,
      TodayOverviewQueryArgs
    >({
      queryFn: async (args) => {
        try {
          const params = args ? cleanParams({
            doctorId: args.doctorId,
          }) : {};

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'dashboard.getTodayOverview',
            ipcPayload: params,
            restConfig: {
              url: "/dashboard/today-overview",
              method: "GET",
              params: Object.keys(params).length ? params : undefined,
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["DoctorDashboard"],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetDoctorDashboardQuery,
  useLazyGetDoctorDashboardQuery,
  useGetSuperAdminDashboardQuery,
  useGetRevenueOverviewQuery,
  useGetTodayOverviewQuery,
} = dashboardApi;
