import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetricItem {
  value: number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  maxValue?: number;
}

export interface Metrics {
  totalPatients: MetricItem;
  appointments: MetricItem;
  newPatients: MetricItem;
  prescriptions: MetricItem;
  revenue: MetricItem;
  avgRating: MetricItem;
}

export interface TrendData {
  labels: string[];
  currentPeriod: number[];
  previousPeriod: number[];
}

export interface DistributionItem {
  label: string;
  value: number;
  percentage: number;
}

export interface DepartmentItem {
  department: string;
  appointments: number;
  revenue: number;
}

export interface RevenueOverview {
  totalRevenue: number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  comparisonLabel: string;
  chartData: { label: string; value: number }[];
}

export interface MedicineSaleItem {
  medicine: string;
  units: number;
  revenue: number;
}

export interface NoShowAnalysis {
  total: number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  breakdown: DistributionItem[];
}

export interface DemographicItem {
  ageGroup: string;
  patients: number;
  percentage: number;
}

export interface MonthlyComparisonItem {
  metric: string;
  thisMonth: number;
  lastMonth: number;
  change: number;
}

export interface AlertItem {
  type: "warning" | "danger" | "info";
  title: string;
  date: string;
}

export interface ReportsOverviewData {
  metrics: Metrics;
  appointmentsTrend: TrendData;
  patientDistribution: DistributionItem[];
  topDepartments: DepartmentItem[];
  revenueOverview: RevenueOverview;
  paymentModeDistribution: DistributionItem[];
  medicineSales: MedicineSaleItem[];
  prescriptionsTrend: TrendData;
  noShowAnalysis: NoShowAnalysis;
  patientDemographics: DemographicItem[];
  monthlyComparison: MonthlyComparisonItem[];
  alerts: AlertItem[];
  meta: {
    generatedAt: string;
    accuracy: number;
  };
}

export interface ReportsOverviewResponse {
  success: boolean;
  message: string;
  data: ReportsOverviewData;
}

export interface TrendResponse {
  success: boolean;
  message: string;
  data: TrendData;
}

// ─── Patient Reports Types ───────────────────────────────────────────────────

export interface PatientMetrics {
  totalPatients: MetricItem;
  newPatients: MetricItem;
  returningPatients: MetricItem;
  activePatients: MetricItem;
  inactivePatients: MetricItem;
  avgVisitsPerPatient: MetricItem;
}

export interface CityItem {
  city: string;
  patients: number;
  percentage: number;
}

export interface VisitFrequencyItem {
  frequency: string;
  patients: number;
  percentage: number;
}

export interface LastVisitRecencyItem {
  lastVisit: string;
  patients: number;
  percentage: number;
}

export interface GrowthPeriod {
  value: number;
  change?: number;
}

export interface GrowthSummary {
  thisWeek: GrowthPeriod;
  lastWeek: GrowthPeriod;
  thisMonth: GrowthPeriod;
  lastMonth: GrowthPeriod;
  thisYear: GrowthPeriod;
  lastYear: GrowthPeriod;
  yearlyGrowth: { value: number; label: string };
  insight: string;
}

export interface PatientReportsData {
  metrics: PatientMetrics;
  patientTrend: TrendData;
  ageDistribution: DistributionItem[];
  genderDistribution: DistributionItem[];
  topCities: CityItem[];
  newVsReturning: TrendData;
  visitFrequency: VisitFrequencyItem[];
  lastVisitRecency: LastVisitRecencyItem[];
  growthSummary: GrowthSummary;
  meta: { generatedAt: string; accuracy: number };
}

export interface PatientReportsResponse {
  success: boolean;
  message: string;
  data: PatientReportsData;
}

export interface PatientTrendQueryArgs {
  type: "patients" | "newVsReturning";
  period: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  department?: string;
  doctorId?: string;
}

// ─── Appointment Reports Types ───────────────────────────────────────────────

export interface AppointmentMetrics {
  totalAppointments: MetricItem;
  completed: MetricItem;
  pending: MetricItem;
  cancelled: MetricItem;
  noShow: MetricItem;
  avgDuration: MetricItem;
}

export interface TimeSlotItem {
  timeSlot: string;
  appointments: number;
  percentage: number;
}

export interface DayItem {
  day: string;
  appointments: number;
}

export interface DoctorItem {
  doctor: string;
  doctorId: string;
  appointments: number;
  completed: number;
  completionRate: number;
}

export interface AppointmentNoShowAnalysis {
  total: number;
  rate: number;
  rateChange: number;
  rateChangeType: "increase" | "decrease" | "neutral";
  breakdown: DistributionItem[];
}

export interface BottomMetrics {
  advanceBookings: { value: number; percentage: number };
  walkIn: { value: number; percentage: number };
  rescheduled: { value: number; percentage: number };
  avgAdvanceDays: { value: number; change: number; changeType: "increase" | "decrease" | "neutral" };
  peakDay: { day: string; appointments: number };
  peakTime: { time: string; appointments: number };
  utilizationRate: { value: number; change: number; changeType: "increase" | "decrease" | "neutral" };
}

export interface AppointmentReportsData {
  metrics: AppointmentMetrics;
  appointmentsTrend: TrendData;
  statusDistribution: DistributionItem[];
  typeDistribution: DistributionItem[];
  topBookingTimeSlots: TimeSlotItem[];
  appointmentsByDay: DayItem[];
  topDoctors: DoctorItem[];
  noShowAnalysis: AppointmentNoShowAnalysis;
  bottomMetrics: BottomMetrics;
  meta: { generatedAt: string; accuracy: number };
}

export interface AppointmentReportsResponse {
  success: boolean;
  message: string;
  data: AppointmentReportsData;
}

export interface AppointmentReportsQueryArgs {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  department?: string;
  doctorId?: string;
  appointmentType?: string;
}

export interface AppointmentTrendQueryArgs {
  type: "appointments" | "byDay" | "timeSlots" | "doctors";
  period: "daily" | "weekly" | "monthly" | "thisWeek" | "lastWeek" | "thisMonth";
  startDate: string;
  endDate: string;
  department?: string;
  doctorId?: string;
  appointmentType?: string;
}

// ─── Query Args ──────────────────────────────────────────────────────────────

export interface ReportsOverviewQueryArgs {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  department?: string;
  doctorId?: string;
}

export interface TrendQueryArgs {
  type: "appointments" | "prescriptions" | "revenue";
  period: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  department?: string;
  doctorId?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function cleanParams(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null && val !== "") {
      result[key] = String(val);
    }
  }
  return result;
}

// ─── API Slice ───────────────────────────────────────────────────────────────

export const reportsOverviewApi = createApi({
  reducerPath: "reportsOverviewApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["ReportsOverview"],
  endpoints: (builder) => ({
    getReportsOverview: builder.query<
      ReportsOverviewResponse,
      ReportsOverviewQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          department: args.department,
          doctorId: args.doctorId,
        });

        return { url: "/reports-overview", params };
      },
      providesTags: ["ReportsOverview"],
    }),

    getReportsOverviewTrend: builder.query<TrendResponse, TrendQueryArgs>({
      query: (args) => {
        const params = cleanParams({
          type: args.type,
          period: args.period,
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          department: args.department,
          doctorId: args.doctorId,
        });

        return { url: "/reports-overview/trend", params };
      },
    }),

    // ─── Patient Reports ─────────────────────────────────────────────────────
    getPatientReports: builder.query<
      PatientReportsResponse,
      ReportsOverviewQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          department: args.department,
          doctorId: args.doctorId,
        });

        return { url: "/reports-overview/patients", params };
      },
      providesTags: ["ReportsOverview"],
    }),

    getPatientReportsTrend: builder.query<TrendResponse, PatientTrendQueryArgs>({
      query: (args) => {
        const params = cleanParams({
          type: args.type,
          period: args.period,
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          department: args.department,
          doctorId: args.doctorId,
        });

        return { url: "/reports-overview/patients/trend", params };
      },
    }),

    // ─── Appointment Reports ─────────────────────────────────────────────────
    getAppointmentReports: builder.query<
      AppointmentReportsResponse,
      AppointmentReportsQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          department: args.department,
          doctorId: args.doctorId,
          appointmentType: args.appointmentType,
        });

        return { url: "/reports-overview/appointments", params };
      },
      providesTags: ["ReportsOverview"],
    }),

    getAppointmentReportsTrend: builder.query<TrendResponse, AppointmentTrendQueryArgs>({
      query: (args) => {
        const params = cleanParams({
          type: args.type,
          period: args.period,
          startDate: args.startDate,
          endDate: args.endDate,
          department: args.department,
          doctorId: args.doctorId,
          appointmentType: args.appointmentType,
        });

        return { url: "/reports-overview/appointments/trend", params };
      },
    }),
  }),
});

export const {
  useGetReportsOverviewQuery,
  useLazyGetReportsOverviewTrendQuery,
  useGetPatientReportsQuery,
  useLazyGetPatientReportsTrendQuery,
  useGetAppointmentReportsQuery,
  useLazyGetAppointmentReportsTrendQuery,
} = reportsOverviewApi;
