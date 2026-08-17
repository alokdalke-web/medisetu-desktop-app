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

// ─── Revenue Reports Types ───────────────────────────────────────────────────

export interface RevenueMetrics {
  totalRevenue: MetricItem;
  amountCollected: MetricItem;
  pendingAmount: MetricItem;
  avgInvoiceValue: MetricItem;
  totalInvoices: MetricItem;
  refunds: MetricItem;
}

export interface ServiceRevenueItem {
  service: string;
  revenue: number;
  percentage: number;
}

export interface DoctorRevenueItem {
  doctor: string;
  doctorId: string;
  revenue: number;
  percentage: number;
}

export interface AppointmentTypeRevenueItem {
  appointmentType: string;
  revenue: number;
  percentage: number;
}

export interface OutstandingAgingItem {
  bracket: string;
  amount: number;
  percentage: number;
}

export interface MonthlyRevenueItem {
  month: string;
  thisYear: number;
  lastYear: number;
}

export interface YtdSummary {
  revenue: number;
  lastYearRevenue: number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  collected: number;
  lastYearCollected: number;
  collectedChange: number;
  collectedChangeType: "increase" | "decrease" | "neutral";
  label: string;
}

export interface RevenueReportsData {
  metrics: RevenueMetrics;
  revenueTrend: TrendData;
  revenueBreakdown: DistributionItem[];
  paymentModeDistribution: DistributionItem[];
  topServices: ServiceRevenueItem[];
  doctorWiseRevenue: DoctorRevenueItem[];
  appointmentTypeRevenue: AppointmentTypeRevenueItem[];
  outstandingAging: OutstandingAgingItem[];
  monthlyRevenue: MonthlyRevenueItem[];
  ytd: YtdSummary;
  insights: string[];
  meta: { generatedAt: string; accuracy: number };
}

export interface RevenueReportsResponse {
  success: boolean;
  message: string;
  data: RevenueReportsData;
}

export interface RevenueReportsQueryArgs {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  department?: string;
  doctorId?: string;
  paymentMode?: string;
}

export interface RevenueTrendQueryArgs {
  type: "revenue" | "collected";
  period: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  department?: string;
  doctorId?: string;
  paymentMode?: string;
}

// ─── Medicine Reports Types ──────────────────────────────────────────────────

export interface MedicineMetrics {
  totalMedicines: MetricItem;
  unitsSold: MetricItem;
  salesAmount: MetricItem;
  grossProfit: MetricItem;
  lowStockItems: MetricItem;
  expiringItems: MetricItem;
}

export interface TopSellingMedicineItem {
  medicineName: string;
  unitsSold: number;
  salesAmount: number;
}

export interface LowStockMedicineItem {
  medicineName: string;
  currentStock: number;
  reorderLevel: number;
}

export interface ExpiringSoonItem {
  medicineName: string;
  batch: string;
  expiryDate: string;
  daysLeft: number;
  quantity: number;
}

export interface TopSupplierItem {
  supplierId: string;
  supplierName: string;
  purchaseAmount: number;
  percentage: number;
}

export interface InventoryMovementBucket {
  count: number;
  percentage: number;
}

export interface InventorySummary {
  totalStockValue: number;
  totalStockUnits: number;
  fastMoving: InventoryMovementBucket;
  slowMoving: InventoryMovementBucket;
  deadStock: InventoryMovementBucket;
}

export interface MedicineReportsData {
  metrics: MedicineMetrics;
  salesTrend: TrendData;
  salesByCategory: DistributionItem[];
  salesByFormulation: DistributionItem[];
  topSellingMedicines: TopSellingMedicineItem[];
  lowStockMedicines: LowStockMedicineItem[];
  expiringSoon: ExpiringSoonItem[];
  topSuppliers: TopSupplierItem[];
  inventorySummary: InventorySummary;
  insights: string[];
  meta: { generatedAt: string };
}

export interface MedicineReportsResponse {
  success: boolean;
  message: string;
  data: MedicineReportsData;
}

export interface MedicineReportsQueryArgs {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  category?: string;
  supplierId?: string;
  pharmacyId?: string;
}

export interface MedicineTrendQueryArgs {
  type: "sales" | "units";
  period: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  category?: string;
  supplierId?: string;
  pharmacyId?: string;
}

// ─── Staff Reports Types ─────────────────────────────────────────────────────

export interface StaffMetrics {
  totalStaff: MetricItem;
  activeStaff: MetricItem;
  appointmentsHandled: MetricItem;
  completedAppointments: MetricItem;
  avgAppointmentsPerDoctor: MetricItem;
  completionRate: MetricItem;
}

export interface StaffPerformanceItem {
  staffId: string;
  staffName: string;
  role: string;
  appointments: number;
  completed: number;
  completionRate: number;
}

export interface StaffWorkloadItem {
  staffId: string;
  staffName: string;
  role: string;
  appointments: number;
  shareOfClinic: number;
}

export interface StaffReportsData {
  metrics: StaffMetrics;
  appointmentsTrend: TrendData;
  staffByRole: DistributionItem[];
  staffByStatus: DistributionItem[];
  topPerformingStaff: StaffPerformanceItem[];
  staffWorkload: StaffWorkloadItem[];
  insights: string[];
  /** Panels the schema has no data for — rendered as unavailable, never faked. */
  unavailableSections: string[];
  meta: { generatedAt: string };
}

export interface StaffReportsResponse {
  success: boolean;
  message: string;
  data: StaffReportsData;
}

export interface StaffReportsQueryArgs {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  role?: string;
  doctorId?: string;
}

export interface StaffTrendQueryArgs {
  type: "appointments" | "completed";
  period: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  role?: string;
  doctorId?: string;
}

// ─── Custom Reports Types ────────────────────────────────────────────────────

export type CustomValueType = "number" | "currency" | "percentage" | "text";

export interface CustomCatalogMetric {
  id: string;
  label: string;
  category: string;
  type: CustomValueType;
}

export interface CustomCatalogDimension {
  id: string;
  label: string;
}

export interface CustomCatalogFilter {
  id: string;
  label: string;
  type: "select" | "multiselect" | "lookup";
  options?: { label: string; value: string }[];
}

export interface CustomCatalogDataSource {
  id: string;
  label: string;
  metrics: CustomCatalogMetric[];
  dimensions: CustomCatalogDimension[];
  filters: CustomCatalogFilter[];
}

export interface CustomReportSchemaResponse {
  success: boolean;
  message: string;
  data: { dataSources: CustomCatalogDataSource[] };
}

export interface CustomColumn {
  key: string;
  label: string;
  type: CustomValueType;
  align: "left" | "right";
}

export type CustomReportRow = Record<string, string | number>;

export interface CustomReportResult {
  columns: CustomColumn[];
  rows: CustomReportRow[];
  totals: CustomReportRow;
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
  };
  appliedDefinition: {
    dataSource: string;
    metrics: string[];
    groupBy: string;
    thenBy?: string;
    sortBy: string;
    sortDirection: "asc" | "desc";
  };
  meta: { generatedAt: string };
}

export interface CustomReportRunResponse {
  success: boolean;
  message: string;
  data: CustomReportResult;
}

export interface CustomReportFilters {
  startDate: string;
  endDate: string;
  doctorId?: string;
  patientId?: string;
  service?: string;
  appointmentType?: string;
  appointmentStatus?: string[];
  paymentStatus?: "collected" | "pending" | "refunded";
  paymentMode?: string;
}

export interface CustomReportRunArgs {
  dataSource: string;
  metrics: string[];
  groupBy: string;
  thenBy?: string;
  filters: CustomReportFilters;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  includeZeroValues?: boolean;
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

    // ─── Revenue Reports ─────────────────────────────────────────────────────
    getRevenueReports: builder.query<
      RevenueReportsResponse,
      RevenueReportsQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          department: args.department,
          doctorId: args.doctorId,
          paymentMode: args.paymentMode,
        });

        return { url: "/reports-overview/revenue", params };
      },
      providesTags: ["ReportsOverview"],
    }),

    getRevenueReportsTrend: builder.query<TrendResponse, RevenueTrendQueryArgs>({
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
          paymentMode: args.paymentMode,
        });

        return { url: "/reports-overview/revenue/trend", params };
      },
    }),

    // ─── Medicine Reports ────────────────────────────────────────────────────
    getMedicineReports: builder.query<
      MedicineReportsResponse,
      MedicineReportsQueryArgs
    >({
      query: (args) => {
        const params = cleanParams({
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          category: args.category,
          supplierId: args.supplierId,
          pharmacyId: args.pharmacyId,
        });

        return { url: "/reports-overview/medicines", params };
      },
      providesTags: ["ReportsOverview"],
    }),

    getMedicineReportsTrend: builder.query<TrendResponse, MedicineTrendQueryArgs>({
      query: (args) => {
        const params = cleanParams({
          type: args.type,
          period: args.period,
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          category: args.category,
          supplierId: args.supplierId,
          pharmacyId: args.pharmacyId,
        });

        return { url: "/reports-overview/medicines/trend", params };
      },
    }),

    // ─── Staff Reports ───────────────────────────────────────────────────────
    getStaffReports: builder.query<StaffReportsResponse, StaffReportsQueryArgs>({
      query: (args) => {
        const params = cleanParams({
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          role: args.role,
          doctorId: args.doctorId,
        });

        return { url: "/reports-overview/staff", params };
      },
      providesTags: ["ReportsOverview"],
    }),

    getStaffReportsTrend: builder.query<TrendResponse, StaffTrendQueryArgs>({
      query: (args) => {
        const params = cleanParams({
          type: args.type,
          period: args.period,
          startDate: args.startDate,
          endDate: args.endDate,
          compareStartDate: args.compareStartDate,
          compareEndDate: args.compareEndDate,
          role: args.role,
          doctorId: args.doctorId,
        });

        return { url: "/reports-overview/staff/trend", params };
      },
    }),

    // ─── Custom Reports ──────────────────────────────────────────────────────
    getCustomReportSchema: builder.query<CustomReportSchemaResponse, void>({
      query: () => ({ url: "/reports-overview/custom/schema" }),
    }),

    runCustomReport: builder.mutation<CustomReportRunResponse, CustomReportRunArgs>({
      query: (body) => ({
        url: "/reports-overview/custom/run",
        method: "POST",
        body,
      }),
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
  useGetRevenueReportsQuery,
  useLazyGetRevenueReportsTrendQuery,
  useGetMedicineReportsQuery,
  useLazyGetMedicineReportsTrendQuery,
  useGetStaffReportsQuery,
  useLazyGetStaffReportsTrendQuery,
  useGetCustomReportSchemaQuery,
  useRunCustomReportMutation,
} = reportsOverviewApi;
