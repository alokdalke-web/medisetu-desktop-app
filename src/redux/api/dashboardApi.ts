// src/redux/api/dashboardApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { TransportLayer } from "../../services/TransportLayer";
import { getAuthToken } from "../../utils/auth";
import type {
  DoctorDashboardV2Response,
  DoctorDashboardV2QueryArgs,
  DoctorDashboardProfileResponse,
  DoctorDashboardProfileQueryArgs,
} from "../../types/doctorDash";
import type {
  ReceptionOverviewQueryArgs,
  ReceptionOverviewResponse,
} from "../../types/receptionistDash";

// Separate base query for v2 endpoints — same pattern as
// `clinicProfileOverviewBaseQuery` in clinicApi.ts. Swapping the version
// segment into a url fed to the shared v1-pinned `baseQueryWithAutoLogout`
// doesn't work: fetchBaseQuery still prepends its fixed baseUrl.
const dashboardV2BaseQuery = fetchBaseQuery({
  baseUrl: (import.meta.env.VITE_API_BASE_URL as string).replace(
    /\/v1\/?$/,
    "/v2",
  ),
  prepareHeaders: (headers) => {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

/* =========================
   ADMIN DASHBOARD (existing types)
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
  registered?: number;
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
  registered?: number;
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

export type SuperAdminRevenueQueryArgs = {
  period?: 'week' | 'month' | 'year' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'weekly' | 'monthly' | 'yearly';
} | void;

export interface SuperAdminRevenueOverviewResponse {
  success: boolean;
  result: {
    totalRevenue: number;
    hikePersent: string;
    dailySeries: {
      labels: string[];
      data: number[];
    };
  };
}

export interface SuperAdminRevenueByPlanResponse {
  success: boolean;
  result: {
    totalRevenue: number;
    byPlan: Array<{
      planName: string;
      amount: number;
      percentage: number;
    }>;
  };
}

export interface SuperAdminRevenueAnalyticsResponse {
  success: boolean;
  result: {
    currentPeriod: { amount: number; growthPercent: number };
    previousPeriod: { amount: number; growthPercent: number };
    allTime: { amount: number; growthPercent: number };
  };
}

export interface SuperAdminTopPerformingClinicsResponse {
  success: boolean;
  result: Array<{
    name: string;
    revenue: number;
    growthPercent: number;
  }>;
}

export interface SuperAdminRegistrationTrendsResponse {
  success: boolean;
  result: {
    clinics: {
      labels: string[];
      data: number[];
    };
  };
}

export interface SuperAdminUsersSubscriptionsSummaryResponse {
  success: boolean;
  result: {
    usersByRole: Array<{
      userType: string;
      count: number;
      percentage: number;
    }>;
    subscriptionsByPlan: Array<{
      planName: string;
      count: number;
    }>;
  };
}

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

// Accepts either the old `period` shape or the newer explicit date-range
// shape — the backend endpoint historically took `period`, team's version
// switched to `startDate`/`endDate`; sending whichever the caller provides
// keeps this working either way.
export type RevenueOverviewQueryArgs = Partial<{
  period: RevenueOverviewPeriod;
  startDate: string;
  endDate: string;
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
  tagTypes: [
    "Dashboard",
    "DoctorDashboard",
    "DoctorDashboardProfile",
    "SuperAdminDashboard",
  ],
  endpoints: (builder) => ({
    /* -------- Existing (Admin) -------- */
    // [Electron] Local SQLite's getDoctorDashboard handler returns a shape
    // that's a union of what both AdminDash and DoctorDash expect, so it's
    // reused here for the local/offline path; the REST path calls the real
    // admin `/dashboard` endpoint with the team's query params.
    getDashboard: builder.query<DashboardResponse, DashboardQueryArgs>({
      queryFn: async (args) => {
        try {
          const params = args ? cleanParams({
            months: args.months,
            startDate: args.startDate,
            endDate: args.endDate,
            dateRangeStartCount: args.dateRangeStartCount,
            dateRangeEndCount: args.dateRangeEndCount,
          }) : {};

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'dashboard.getDoctorDashboard',
            ipcPayload: args || {},
            restConfig: {
              url: "/dashboard",
              method: "GET",
              params: Object.keys(params).length ? params : undefined,
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message || "Failed to fetch dashboard" } };
        }
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

    /* -------- Doctor Dashboard v2 -------- */
    getDoctorDashboardV2: builder.query<
      DoctorDashboardV2Response,
      DoctorDashboardV2QueryArgs
    >({
      queryFn: async (args, api, extraOptions) => {
        const params = cleanParams({
          startDate: args?.startDate,
          endDate: args?.endDate,
          doctorId: args?.doctorId,
        });

        const result = await dashboardV2BaseQuery(
          {
            url: "/dashboard/doctor",
            params: Object.keys(params).length ? params : undefined,
          },
          api,
          extraOptions,
        );
        if (result.error) return { error: result.error };
        return { data: result.data as DoctorDashboardV2Response };
      },
      providesTags: ["DoctorDashboard"],
    }),

    /* -------- Doctor Dashboard v2 "profile" slice (doctorName + setupProgress) --------
       Split from stats because it changes rarely (onboarding steps, profile edits)
       and shouldn't be refetched on every appointment realtime event or short-TTL poll. */
    getDoctorDashboardProfile: builder.query<
      DoctorDashboardProfileResponse,
      DoctorDashboardProfileQueryArgs
    >({
      queryFn: async (args, api, extraOptions) => {
        const params = cleanParams({ doctorId: args?.doctorId });

        const result = await dashboardV2BaseQuery(
          {
            url: "/dashboard/doctor/profile",
            params: Object.keys(params).length ? params : undefined,
          },
          api,
          extraOptions,
        );
        if (result.error) return { error: result.error };
        return { data: result.data as DoctorDashboardProfileResponse };
      },
      providesTags: ["DoctorDashboardProfile"],
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

    getSuperAdminRevenueOverview: builder.query<
      SuperAdminRevenueOverviewResponse,
      SuperAdminRevenueQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          period: args?.period,
        });
        return Object.keys(params).length
          ? { url: "/dashboard/super-admin/revenue-overview", params }
          : "/dashboard/super-admin/revenue-overview";
      },
      providesTags: ["SuperAdminDashboard"],
    }),

    getSuperAdminRevenueByPlan: builder.query<
      SuperAdminRevenueByPlanResponse,
      SuperAdminRevenueQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          period: args?.period,
        });
        return Object.keys(params).length
          ? { url: "/dashboard/super-admin/revenue-by-plan", params }
          : "/dashboard/super-admin/revenue-by-plan";
      },
      providesTags: ["SuperAdminDashboard"],
    }),

    getSuperAdminRevenueAnalytics: builder.query<
      SuperAdminRevenueAnalyticsResponse,
      SuperAdminRevenueQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          period: args?.period,
        });
        return Object.keys(params).length
          ? { url: "/dashboard/super-admin/revenue-analytics", params }
          : "/dashboard/super-admin/revenue-analytics";
      },
      providesTags: ["SuperAdminDashboard"],
    }),

    getSuperAdminTopPerformingClinics: builder.query<
      SuperAdminTopPerformingClinicsResponse,
      SuperAdminRevenueQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          period: args?.period,
        });
        return Object.keys(params).length
          ? { url: "/dashboard/super-admin/top-performing-clinics", params }
          : "/dashboard/super-admin/top-performing-clinics";
      },
      providesTags: ["SuperAdminDashboard"],
    }),

    getSuperAdminRegistrationTrends: builder.query<
      SuperAdminRegistrationTrendsResponse,
      SuperAdminRevenueQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          period: args?.period,
        });
        return Object.keys(params).length
          ? { url: "/dashboard/super-admin/registration-trends", params }
          : "/dashboard/super-admin/registration-trends";
      },
      providesTags: ["SuperAdminDashboard"],
    }),

    getSuperAdminUsersSubscriptionsSummary: builder.query<
      SuperAdminUsersSubscriptionsSummaryResponse,
      void
    >({
      query: () => "/dashboard/super-admin/users-subscriptions-summary",
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
            startDate: args.startDate,
            endDate: args.endDate,
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

    /* -------- Reception Overview -------- */
    getReceptionOverview: builder.query<
      ReceptionOverviewResponse,
      ReceptionOverviewQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({ doctorId: args?.doctorId });

        return Object.keys(params).length
          ? { url: "/dashboard/reception", params }
          : "/dashboard/reception";
      },
      providesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetDoctorDashboardQuery,
  useLazyGetDoctorDashboardQuery,
  useGetDoctorDashboardV2Query,
  useGetDoctorDashboardProfileQuery,
  useGetSuperAdminDashboardQuery,
  useGetSuperAdminRevenueOverviewQuery,
  useGetSuperAdminRevenueByPlanQuery,
  useGetSuperAdminRevenueAnalyticsQuery,
  useGetSuperAdminTopPerformingClinicsQuery,
  useGetSuperAdminRegistrationTrendsQuery,
  useGetSuperAdminUsersSubscriptionsSummaryQuery,
  useGetRevenueOverviewQuery,
  useGetTodayOverviewQuery,
  useGetReceptionOverviewQuery,
} = dashboardApi;
