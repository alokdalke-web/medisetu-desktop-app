import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

/* ----------------------------- Common Types ----------------------------- */

export type PharmaciesApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  status?: number | string;
  result?: T;
  data?: T;
  pagination?: any;
};

/* ----------------------------- Supplier Types ----------------------------- */

export type AddSupplierRequest = {
  supplierName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  creditDays?: number;
  status: "active" | "inactive";
};

export type UpdatePharmacySupplierRequest = {
  supplierName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  creditDays?: number;
  status: "active" | "inactive";
};

export type UpdatePharmacySupplierArgs = {
  supplierId: string;
  body: UpdatePharmacySupplierRequest;
};

export type GetAllSuppliersArgs = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "inactive";
};

export type SupplierListResponse = {
  success: boolean;
  data: Array<{
    id: string;
    pharmacyId: string;
    supplierName: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    gstNumber: string;
    panNumber: string;
    creditDays: number;
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type SupplierImportResponse = {
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  insertedSuppliers?: string[];
  updatedSuppliers?: string[];
  skippedSuppliers?: string[];
  errors?: string[];
};

export type SupplierStatsResponse = {
  totalSuppliers: {
    count: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  gstRegisteredSuppliers: {
    count: number;
    percentageOfTotal: number;
  };
  activeSuppliers: {
    count: number;
    percentageOfTotal: number;
  };
  inactiveSuppliers: {
    count: number;
    percentageOfTotal: number;
  };
};

/* ----------------------------- Medicine Types ----------------------------- */

export type AddMedicineRequest = {
  medicineName: string;
  category?: string;
  brandName?: string;
  composition?: string;
  hsnId: string;
  form?: string;
  shelf?: string;
  reorder?: number | null;
  packOf?: number| null;
  status?: "active" | "inactive";
  tags?: string[];
};

export type UpdateMedicineRequest = {
  medicineName?: string;
  category?: string;
  brandName?: string;
  composition?: string;
  hsnId?: string;
  form?: string;
  shelf?: string;
  reorder?: number | null;
  packOf?: number| null;
  status?: "active" | "inactive";
  tags?: string[];
};

export type UpdateMedicineArgs = {
  medicineId: string;
  body: UpdateMedicineRequest;
};

export type GetAllMedicinesArgs = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  form?: string;
  status?: "active" | "inactive";
  hsnId?: string;
  stockStatus?: "empty" | "low" | "medium" | "good";
  tag?: string;
};

export type HSN = {
  id: string;
  hsnCode: string;
  gstPercentage: string;
  description: string;
  effectiveFrom: string;
  createdAt: string;
};

export type GetHSNResponse = {
  success: boolean;
  data: HSN[];
};

export type GetCategoriesResponse = {
  success: boolean;
  data: string[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type GetTagsResponse = {
  success: boolean;
  data: string[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type Medicine = {
  id: string;
  pharmacyId: string;
  medicineName: string;
  brandName: string;
  sku: string;
  composition: string;
  category: string | null;
  hsnId: string;
  form: string | null;
  shelf: string | null;
  reorder: number;
  packOf: number| null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  hsnCode: string;
  hsnGstPercentage: string;
  description: string;
  effectiveFrom: string;
  availableQuantity: number;
  tags?: string[];
};

export type MedicineListResponse = {
  success: boolean;
  data: Medicine[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type GetBrandsResponse = {
  success: boolean;
  data: string[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type ExportMedicinesResponse = Blob;

export type MedicineStatsResponse = {
  totalMedicines: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  totalCategories: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  totalBrands: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  totalForms: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
};

/* ----------------------------- Prescription Types ----------------------------- */

export type PrescriptionStatus = 'PENDING' | 'ON_HOLD' | 'COMPLETED' | 'REJECTED';

export type GetPrescriptionsArgs = {
  pageNumber?: number;
  pageSize?: number;
  status?: PrescriptionStatus;
  doctorId?: string;
  patientId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
};

export type Prescription = {
  id: string;
  status: PrescriptionStatus;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
    mobile: string;
    age: number | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  doctor: {
    id: string;
    name: string;
    speciality: string;
  };
  pharmacist: {
    id: string;
    name: string;
  } | null;
  prescriptionPdf: string | null;
  reportId: string;
  appointmentId: string;
};

export type PrescriptionDetail = {
  id: string;
  status: PrescriptionStatus;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    age: number | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
  doctor: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    speciality: string;
  };
  pharmacist: {
    id: string;
    name: string;
  } | null;
  prescriptionpdf: string;
  medicines: Array<{
    id: string;
    medicineName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
  }>;
  prescription: {
    pdf: string | null;
    provisionalDiagnosis: string | null;
    finalDiagnosis: string | null;
    advice: string | null;
    clinicalNotes: string | null;
    followUpInDays: number | null;
    followUpDate: string | null;
  };
  reportId: string;
  appointmentId: string;
  pharmacyUserId: string | null;
};

export type PrescriptionListResponse = {
  success: boolean;
  data: Prescription[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type UpdatePrescriptionStatusRequest = {
  status: PrescriptionStatus;
};

export type UpdatePrescriptionStatusArgs = {
  id: string;
  body: UpdatePrescriptionStatusRequest;
};

export type PrescriptionStatsResponse = {
  pending: {
    count: number;
    percentageOfTotal: number;
  };
  onHold: {
    count: number;
    percentageOfTotal: number;
  };
  completed: {
    count: number;
    percentageOfTotal: number;
  };
  rejected: {
    count: number;
    percentageOfTotal: number;
  };
};

export type CheckMedicineRequest = {
  medicineNames: string[];
};

export type CheckMedicineItem = {
  medicineName: string;
  exists: boolean;
};

export type CheckMedicineResponse = {
  success: boolean;
  data: CheckMedicineItem[];
};

/* ----------------------------- Stock Types ----------------------------- */

export type StockPaymentStatus = 'paid' | 'unpaid' | 'partial';

export type GetAllStocksArgs = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  supplierId?: string;
  pharmacyStockPaymentStatus?: StockPaymentStatus;
  startDate?: string;
  endDate?: string;
  medicineName?: string;
  batch?: string;
};

export type StockMedicine = {
  id: string;
  pharmacyStockId: string;
  pharmacyMedicineId: string;
  batch: string;
  expiry: string;
  quantity: number;
  mrp: string;
  cost: string;
  totalCost: string;
  medicineName: string;
  sku: string;
  category: string;
  form: string;
  packOf: string;
};

export type Stock = {
  id: string;
  pharmacyId: string;
  pharmacySupplierId: string;
  purchaseDate: string;
  invoice: string | null;
  pharmacyStockPaymentStatus: StockPaymentStatus;
  paymentNotes: string;
  unit: number;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  supplierName: string;
  contactPerson: string;
  phone: string;
  medicines: StockMedicine[];
};

export type StockListResponse = {
  success: boolean;
  data: Stock[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type GetExpiryStockArgs = {
  pageNumber?: number;
  pageSize?: number;
  medicineName?: string;
  expiryDays?: number;
};

export type ExpiryStockItem = {
  stockMedicineId: string;
  stockId: string;

  medicineId: string;
  medicineBrand: string;
  medicineName: string;
  shelf: string;

  batch: string;
  expiry: string;

  purchasedQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;

  mrp: string;
  cost: string;

  supplierName: string;
  purchaseDate: string;
};

export type ExpiryStockResponse = {
  success: boolean;
  data: ExpiryStockItem[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type ExportStocksResponse = Blob;

export type AddStockMedicineItem = {
  pharmacyMedicineId: string;
  batch?: string;
  expiry: string;
  quantity: number;
  mrp: number | string;
  cost: number | string;
};

export type AddStockRequest = {
  supplierId?: string;
  purchaseDate: string;
  pharmacyStockPaymentStatus: StockPaymentStatus;
  paymentNotes?: string;
  medicines: AddStockMedicineItem[];
};

export type AddStockResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    [key: string]: any;
  };
};

export type UpdateStockMedicineItem = {
  id?: string;
  pharmacyMedicineId: string;
  batch?: string;
  expiry: string;
  quantity: number;
  mrp: number | string;
  cost: number | string;
};

export type UpdateStockRequest = {
  supplierId?: string;
  purchaseDate: string;
  pharmacyStockPaymentStatus?: StockPaymentStatus;
  paymentNotes?: string;
  medicines?: UpdateStockMedicineItem[];
};

export type GetStockResponse = {
  success: boolean;
  data: Stock;
};

export type UploadStockInvoiceArgs = {
  stockId: string;
  file: File;
};

/* ----------------------------- Sales Types ----------------------------- */

export type PaymentMethod = "Cash" | "UPI" | "NetBanking";

export type GetAllSalesArgs = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
};

export type GetAvailableStockQueryArgs = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  form?: string;
  medicineName?: string;
};

export type SalesChartPeriod = "week" | "month" | "year";

export type SalesChartItem = {
  day?: string;
  date?: string;
  month?: string;
  sales: number;
};

/* ----------------------------- Dashboard Types ----------------------------- */

// ─── Dashboard Summary Types ───
export type DashboardPeriod = "thisMonth" | "lastMonth";

export interface DashboardSummaryQuery {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface StatCard {
  value: number;
  delta: number;
  sparkUp: boolean;
  comparisonLabel: string;
}

export interface InventoryHealth {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  // expiringSoon: number;
}

export interface CriticalAlert {
  id: string;
  title: string;
  description: string;
  type: "warning" | "danger" | "info";
}

export interface PaymentOverview {
  totalReceivables: number;
  receivablesFrom: string;
  totalPayables: number;
  payablesTo: string;
}

export interface SmartInsight {
  id: string;
  text: string;
  detail: string;
  type: "success" | "warning" | "info";
}

export interface DashboardSummaryResponse {
  statCards: {
    todayProfit: StatCard;
    lowStockMedicines: StatCard;
    paidToSuppliers: StatCard;
    totalSales: StatCard;
  };
  inventoryHealth: InventoryHealth;
  criticalAlerts: CriticalAlert[];
  paymentOverview: PaymentOverview;
  smartInsights: SmartInsight[];
}

// ─── Sales Overview Types ───
export type SalesPeriod = "week" | "month" | "year";
export type SalesMetric = "revenue" | "profit" | "orders";

export interface SalesOverviewQuery {
  period: SalesPeriod;
  metric: SalesMetric;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface BottomStat {
  label: string;
  value: string;
  delta: number;
}

export interface SalesOverviewResponse {
  totalValue: number;
  delta: number;
  deltaLabel: string;
  chartData: ChartDataPoint[];
  bottomStats: BottomStat[];
}

// ─── Category Revenue Types ───
export interface CategoryRevenueQuery {
  period: DashboardPeriod;
}

export interface CategoryItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface CategoryRevenueResponse {
  totalRevenue: number;
  categories: CategoryItem[];
}

// ─── Top Performers Types ───
export interface TopPerformersQuery {
  period: DashboardPeriod;
}

export interface Performer {
  type: string;
  label: string;
  name: string;
  value: string;
  subValue: string;
  delta: number;
}

export interface TopPerformersResponse {
  performers: Performer[];
}

// ─── AI Stock Prediction Types ───
export interface AiStockPredictionResponse {
  medicineName: string;
  runoutDays: number;
  currentStock: number;
  dailyAverageUsage: number;
  suggestedOrder: number;
}

export type DashboardCardMetric = {
  value: number;
  percentageChange: number;
  trend: "increase" | "decrease" | "neutral";
};

export type DashboardMetricsItem = {
  subtext: string;
  value: number;
  percentageChange: number;
  trend: "increase" | "decrease" | "neutral";
  sparkline: number[];
};

export type DashboardPrescriptionsStats = {
  totalPrescriptions: number;
  pending: number;
  onHold: number;
  completed: number;
  rejected: number;
};

export type RadarDataItem = {
  category: string;
  value: number;
};

export type TopBrandPerDayItem = {
  day: string;
  topBrand: string;
  quantity: number;
};

export type BarDataItem = {
  day: string;
  value: number;
};

export type DashboardRadialItem = {
  hsnCode: string;
  description: string;
  gstPercentage: number;
  value: number;
  fill: string;
};

export type DashboardRadialsResponse = {
  topHsnCodes: DashboardRadialItem[];
  totalPercentageCovered: number;
};

export type DashboardStatsResponse = {
  cards: {
    totalMedicines: DashboardCardMetric;
    lowStockMedicines: DashboardCardMetric;
    todaysSales: DashboardCardMetric;
    monthlyRevenue: DashboardCardMetric;
  };
  prescriptions: DashboardPrescriptionsStats;
  radarData: RadarDataItem[];
  dashboardMetrics: {
    totalProfit: DashboardMetricsItem;
    averageSalesAmount: DashboardMetricsItem;
  };
  topBrandPerDay: TopBrandPerDayItem[];
  barData: BarDataItem[];
  dashboardRadials: DashboardRadialsResponse;
};

export type AvailableStockItem = {
  pharmacyStockMedicineId: string;
  pharmacyStockId?: string;
  pharmacyMedicineId?: string;
  medicineName: string;
  batch: string;
  expiry: string;
  availableQuantity: number;
  mrp: string;
  gstPercentage: string | number;
  category?: string | null;
  form?: string | null;
  tags?: string[];
  packOf?: number | null;
};

export type StockCacheItem = {
  medicineName: string;
  availableQuantity: number;
};

export type AvailableStockListResponse = {
  success: boolean;
  data: AvailableStockItem[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type CreateSaleRequest = {
  prescriptionId?: string;
  subscriptionId?: string;
  patientName: string;
  patientMobile?: string;
  paymentMethod: PaymentMethod;
  paymentNotes?: string;
  items: Array<{
    pharmacyStockMedicineId: string;
    quantity: number;
    discountPercent?: number;
  }>;
};

export type SaleItem = {
  id: string;
  pharmacyId: string;
  createdBy: string;
  prescriptionId: string | null;
  patientName: string;
  patientMobile: string;
  paymentMethod: PaymentMethod;
  paymentNotes: string;
  totalItems: number;
  subtotal: string;
  gstAmount: string;
  discountAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesListResponse = {
  success: boolean;
  data: SaleItem[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type GSTBreakdown = {
  gstPercentage: number;
  cgst: number;
  sgst: number;
  gstAmount: number;
};

export type SaleItemDetail = {
  id: string;
  pharmacySalesId: string;
  pharmacyStockMedicineId: string;
  quantity: number;
  discountPercent: string;
  total: string;
  createdAt: string;
  batch: string;
  expiry: string;
  mrp: string;
  cost: string;
  medicineName: string;
  category: string;
  form: string;
  hsnCode: string;
  gstPercentage: string;
  gstBreakdown: GSTBreakdown;
};

export type SaleDetail = {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyContactNumber: string;
  createdBy: string;
  prescriptionId: string | null;
  patientName: string;
  patientMobile: string;
  paymentMethod: PaymentMethod;
  paymentNotes: string;
  totalItems: number;
  subtotal: string;
  gstAmount: string;
  discountAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  items: SaleItemDetail[];
};

export type SaleDetailResponse = {
  success: boolean;
  data: SaleDetail;
};

export type SalesStatItem = {
  value?: number;
  count?: number;
  percentageChange: number;
  trend: "increase" | "decrease" | "neutral";
};

export type SalesStatsResponse = {
  totalSalesAmount: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease" | "neutral";
  };
  totalInvoices: {
    count: number;
    percentageChange: number;
    trend: "increase" | "decrease" | "neutral";
  };
  totalUnitsSold: {
    count: number;
    percentageChange: number;
    trend: "increase" | "decrease" | "neutral";
  };
  cashSales: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease" | "neutral";
  };
};

export type StockStatsResponse = {
  totalPurchaseAmount: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  totalPurchaseEntries: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  totalUnitsPurchased: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  paidAmount: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
};

/* ----------------------------- Subscription Types ----------------------------- */

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export type SubscriptionMedicine = {
  id: string;
  pharmacyMedicineId: string;
  quantity: number;
  medicineName: string;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: string;
  pharmacyId: string;
  customerName: string | null;
  customerMobile: string | null;
  customerAddress: string | null;
  frequencyDays: number;
  nextDeliveryDate: string;
  status: SubscriptionStatus;
  remarks: string | null;
  salesAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  medicines: SubscriptionMedicine[];
};

export type CreateSubscriptionRequest = {
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  frequencyDays: number;
  nextDeliveryDate: string;
  remarks?: string;
  medicines: Array<{
    pharmacyMedicineId: string;
    quantity: number;
  }>;
};

export type UpdateSubscriptionRequest = {
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  frequencyDays?: number;
  nextDeliveryDate?: string;
  status?: SubscriptionStatus;
  remarks?: string;
  medicines?: Array<{
    pharmacyMedicineId: string;
    quantity: number;
  }>;
};

export type GetSubscriptionsArgs = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: SubscriptionStatus;
  startDate?: string;
  endDate?: string;
};

export type SubscriptionListResponse = {
  success: boolean;
  data: Subscription[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type SubscriptionStatsResponse = {
  totalSubscriptions: {
    value: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  activeSubscriptions: {
    value: number;
    percentageFromTotal: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  inactiveSubscriptions: {
    value: number;
    percentageFromTotal: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
  pausedSubscriptions: {
    value: number;
    percentageFromTotal: number;
    percentageChange: number;
    trend: "increase" | "decrease";
  };
};

export type UpdateDeliveryDateRequest = {
  nextDeliveryDate: string;
};

export type SubscriptionNotification = {
  id: string;
  pharmacyId: string;
  customerName: string | null;
  customerMobile: string | null;
  customerAddress: string | null;
  frequencyDays: number;
  nextDeliveryDate: string;
  status: SubscriptionStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  medicines: Array<{
    id: string;
    pharmacyMedicineId: string;
    quantity: number;
    medicineName: string;
    brand: string | null;
    sku: string;
    category: string | null;
    form: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type SubscriptionNotificationResponse = {
  success: boolean;
  data: SubscriptionNotification[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type MarkNotificationReadResponse = {
  success: boolean;
  message: string;
};

export type SubscriptionSale = {
  subscriptionId: string;
  salesId: string;
  units: number;
  totalAmount: string;
  createdAt: string;
};

export type SubscriptionSalesResponse = {
  success: boolean;
  data: SubscriptionSale[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

/* ----------------------------- Settings Types ----------------------------- */

export type NoLossSettingRequest = {
  noLoss: boolean;
};

export type NoLossSettingResponse = PharmaciesApiResponse<any>;

/* ----------------------------- API ----------------------------- */

export const pharmaciesApi = createApi({
  reducerPath: "pharmaciesApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Supplier", "Medicine", "HSN", "Category", "Brand", "Prescription", "Stock", "Sale", "Setting", "Subscription", "Dashboard", "SalesOverview", "CategoryRevenue", "TopPerformers", "AiPrediction", "Tag"],
  endpoints: (builder) => ({
    /* ----------------------------- Suppliers ----------------------------- */
    getAllSuppliers: builder.query<SupplierListResponse, GetAllSuppliersArgs>({
      query: ({ pageNumber = 1, pageSize = 10, search = "", status }) => ({
        url: `/pharmacies/supplier/get-all-supplier`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(status ? { status } : {}),
        },
      }),
      providesTags: [{ type: "Supplier", id: "LIST" }],
    }),

    addSupplier: builder.mutation<
      PharmaciesApiResponse<any>,
      AddSupplierRequest
    >({
      query: (body) => ({
        url: "/pharmacies/supplier/add-supplier",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Supplier", id: "LIST" }],
    }),

    updatePharmacySupplier: builder.mutation<
      PharmaciesApiResponse<any>,
      UpdatePharmacySupplierArgs
    >({
      query: ({ supplierId, body }) => ({
        url: `/pharmacies/supplier/update-supplier/${supplierId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Supplier", id: "LIST" },
        { type: "Supplier", id: arg.supplierId },
      ],
    }),

    downloadSupplierSampleTemplate: builder.mutation<Blob, void>({
      query: () => ({
        url: "/pharmacies/supplier/download-supplier-sample-template",
        method: "GET",
        responseHandler: async (response) => response.blob(),
        cache: "no-cache",
      }),
    }),

    importSupplier: builder.mutation<
      {
        success: boolean;
        message: string;
        data: SupplierImportResponse;
      },
      File
    >({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/pharmacies/supplier/import-supplier",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Supplier", id: "LIST" }],
    }),

    exportSuppliers: builder.mutation<Blob, void>({
      query: () => ({
        url: "/pharmacies/supplier/export-all-supplier",
        method: "GET",
        responseHandler: async (response) => response.blob(),
        cache: "no-cache",
      }),
    }),

    getSupplierStats: builder.query<SupplierStatsResponse, void>({
      query: () => ({
        url: "/pharmacies/supplier/stats",
        method: "GET",
      }),

      transformResponse: (res: any): SupplierStatsResponse => {
        return res?.data;
      },
    }),

    /* ----------------------------- Medicines ----------------------------- */
    getAllMedicines: builder.query<MedicineListResponse, GetAllMedicinesArgs>({
      query: ({ pageNumber = 1, pageSize = 10, search = "", category, form, status, hsnId, stockStatus, tag }) => ({
        url: `/pharmacies/medicine/get-all-medicines`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(category ? { category } : {}),
          ...(form ? { form } : {}),
          ...(status ? { status } : {}),
          ...(hsnId ? { hsnId } : {}),
          ...(stockStatus ? { stockStatus } : {}),
          ...(tag ? { tag } : {}),
        },
      }),
      providesTags: [{ type: "Medicine", id: "LIST" }],
    }),

    addMedicine: builder.mutation<
      PharmaciesApiResponse<any>,
      AddMedicineRequest
    >({
      query: (body) => ({
        url: "/pharmacies/medicine/add-medicine",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Medicine", id: "LIST" }],
    }),

    updateMedicine: builder.mutation<
      PharmaciesApiResponse<any>,
      UpdateMedicineArgs
    >({
      query: ({ medicineId, body }) => ({
        url: `/pharmacies/medicine/update-medicine/${medicineId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Medicine", id: "LIST" },
        { type: "Medicine", id: arg.medicineId },
      ],
    }),

    getHSN: builder.query<GetHSNResponse, void>({
      query: () => ({
        url: "/pharmacies/medicine/get-hsn",
        method: "GET",
      }),
      providesTags: [{ type: "HSN", id: "LIST" }],
    }),

    getMedicineCategories: builder.query<GetCategoriesResponse, { pageNumber?: number; pageSize?: number; search?: string }>({
      query: ({ pageNumber = 1, pageSize = 10, search = "" }) => ({
        url: "/pharmacies/medicine/get-medicine-categories",
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      }),
      providesTags: [{ type: "Category", id: "LIST" }],
    }),

    getMedicineTags: builder.query<GetTagsResponse, { pageNumber?: number; pageSize?: number; search?: string }>({
      query: ({ pageNumber = 1, pageSize = 10, search = "" }) => ({
        url: "/pharmacies/medicine/get-medicine-tags",
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      }),
      providesTags: [{ type: "Tag", id: "LIST" }],
    }),

    exportMedicines: builder.mutation<Blob, void>({
        query: () => ({
            url: "/pharmacies/medicine/export-all-medicines",
            method: "GET",
            responseHandler: async (response) => response.blob(),
            cache: "no-cache",
        }),
    }),

    downloadMedicineSampleTemplate: builder.mutation<Blob, void>({
      query: () => ({
        url: "/pharmacies/medicine/download-medicine-sample-template",
        method: "GET",
        responseHandler: async (response) => response.blob(),
        cache: "no-cache",
      }),
    }),

    importMedicine: builder.mutation<{
      success: boolean;
      message: string;
      data: {
        totalInserted: number;
        totalUpdated: number;
        totalSkipped: number;
        totalErrors: number;
        insertedMedicines: string[];
        updatedMedicines: string[];
        skippedMedicines: string[];
        errors: string[];
      };
    }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/pharmacies/medicine/import-medicine",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Medicine", id: "LIST" }],
    }),

    getMedicineBrands: builder.query<GetBrandsResponse, { pageNumber?: number; pageSize?: number; search?: string }>({
      query: ({ pageNumber = 1, pageSize = 10, search = "" }) => ({
        url: "/pharmacies/medicine/get-medicine-brands",
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      }),
      providesTags: [{ type: "Brand", id: "LIST" }],
    }),

    getMedicineStats: builder.query<MedicineStatsResponse, void>({
      query: () => ({
        url: "/pharmacies/medicine/stats",
        method: "GET",
      }),

      transformResponse: (res: any): MedicineStatsResponse => {
        return res.data;
      },

      providesTags: [{ type: "Medicine", id: "STATS" }],
    }),

    /* ----------------------------- Prescriptions ----------------------------- */
    getPrescriptions: builder.query<PrescriptionListResponse, GetPrescriptionsArgs>({
      query: ({ pageNumber = 1, pageSize = 10, search = "", status, doctorId, patientId, startDate, endDate }) => ({
        url: `/pharmacies/prescription/get-prescriptions`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(status ? { status } : {}),
          ...(doctorId ? { doctorId } : {}),
          ...(patientId ? { patientId } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
      providesTags: [{ type: "Prescription", id: "LIST" }],
    }),

    getPrescriptionById: builder.query<{ success: boolean; data: PrescriptionDetail }, { id: string }>({
      query: ({ id }) => ({
        url: `/pharmacies/prescription/get-prescription/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, { id }) => [{ type: "Prescription", id }],
    }),

    updatePrescriptionStatus: builder.mutation<
      { success: boolean; message: string; data: any },
      UpdatePrescriptionStatusArgs
    >({
      query: ({ id, body }) => ({
        url: `/pharmacies/prescription/update-prescription-status/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Prescription", id: "LIST" },
        { type: "Prescription", id },
      ],
    }),

    checkMedicines: builder.mutation<CheckMedicineResponse, CheckMedicineRequest>({
      query: (body) => ({
        url: "/pharmacies/prescription/check-medicines",
        method: "POST",
        body,
      }),
    }),

    getPrescriptionStats: builder.query<PrescriptionStatsResponse, void>({
      query: () => ({
        url: "/pharmacies/prescription/stats",
        method: "GET",
      }),

      transformResponse: (res: any): PrescriptionStatsResponse => {
        return res?.data;
      },
    }),

    /* ----------------------------- Stock ----------------------------- */
    addStock: builder.mutation<AddStockResponse, AddStockRequest>({
      query: (body) => ({
        url: "/pharmacies/stock/add-stock",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Stock", id: "LIST" }],
    }),

    uploadStockInvoice: builder.mutation<
      PharmaciesApiResponse<any>,
      UploadStockInvoiceArgs
    >({
      query: ({ stockId, file }) => {
        const formData = new FormData();
        formData.append("invoice", file);
        return {
          url: `/pharmacies/stock/upload-invoice/${stockId}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Stock", id: "LIST" }],
    }),

    getAllStocks: builder.query<StockListResponse, GetAllStocksArgs>({
      query: ({ 
        pageNumber = 1, 
        pageSize = 10, 
        search = "", 
        supplierId, 
        pharmacyStockPaymentStatus, 
        startDate, 
        endDate,
        medicineName,
        batch 
      }) => ({
        url: `/pharmacies/stock/get-all-stock`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(supplierId ? { supplierId } : {}),
          ...(pharmacyStockPaymentStatus ? { pharmacyStockPaymentStatus } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(medicineName ? { medicineName } : {}),
          ...(batch ? { batch } : {}),
        },
      }),
      providesTags: [{ type: "Stock", id: "LIST" }],
    }),
    getExpiryStock: builder.query<ExpiryStockResponse, GetExpiryStockArgs>({
      query: ({
        pageNumber = 1,
        pageSize = 10,
        medicineName = "",
        expiryDays,
      }) => ({
        url: "/pharmacies/stock/get-expiry-stock",
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(medicineName?.trim()
            ? { medicineName: medicineName.trim() }
            : {}),
          ...(expiryDays !== undefined ? { expiryDays } : {}),
        },
      }),
      providesTags: [{ type: "Stock", id: "EXPIRY" }],
    }),
    getAvailableStock: builder.query<AvailableStockListResponse, GetAvailableStockQueryArgs>({
      query: ({
        pageNumber = 1,
        pageSize = 10,
        search = "",
        category,
        form,
        medicineName,
      }) => ({
        url: `/pharmacies/stock/get-available-stock`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(category ? { category } : {}),
          ...(form ? { form } : {}),
          ...(medicineName ? { medicineName } : {}),
        },
      }),
      providesTags: [{ type: "Stock", id: "AVAILABLE" }],
    }),
    getStockCache: builder.query<PharmaciesApiResponse<StockCacheItem[]>, void>({
      query: () => ({
        url: "/pharmacies/stock/get-stock-cache",
        method: "GET",
      }),
      transformResponse: (resp: any): PharmaciesApiResponse<StockCacheItem[]> => ({
        success: Boolean(resp?.success ?? true),
        message: resp?.message,
        status: resp?.status,
        data: Array.isArray(resp?.data)
          ? resp.data.map((item: any) => ({
              medicineName: String(item?.medicineName ?? ""),
              availableQuantity: Number(item?.availableQuantity ?? 0),
            }))
          : [],
      }),
      providesTags: [{ type: "Stock", id: "CACHE" }],
    }),
    getStockById: builder.query<GetStockResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/pharmacies/stock/get-stock/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, { id }) => [{ type: "Stock", id }],
    }),

    getDashboardStats: builder.query<PharmaciesApiResponse<DashboardStatsResponse>, void>({
      query: () => ({
        url: "/pharmacies/dashboard/stats",
        method: "GET",
      }),
      providesTags: [{ type: "Stock", id: "DASHBOARD_STATS" }],
    }),

    getTopSellingMedicines: builder.query<PharmaciesApiResponse<Array<{ medicineName: string; totalSalesAmount: number; quantitySold: number }>>, void>({
      query: () => ({
        url: "/pharmacies/dashboard/top-selling-medicines",
        method: "GET",
      }),
      providesTags: [{ type: "Stock", id: "TOP_SELLING_MEDICINES" }],
    }),

    getTopSuppliers: builder.query<PharmaciesApiResponse<Array<{ supplierName: string; supplierNumber: string; totalPurchaseAmount: number }>>, void>({
      query: () => ({
        url: "/pharmacies/dashboard/top-suppliers",
        method: "GET",
      }),
      providesTags: [{ type: "Stock", id: "TOP_SUPPLIERS" }],
    }),

    getSalesChart: builder.query<PharmaciesApiResponse<SalesChartItem[]>, { period?: SalesChartPeriod }>({
      query: ({ period = "week" }) => ({
        url: "/pharmacies/dashboard/sales-chart",
        method: "GET",
        params: { period },
      }),
      providesTags: [{ type: "Stock", id: "SALES_CHART" }],
    }),

    getStockStats: builder.query<StockStatsResponse, void>({
      query: () => ({
        url: "/pharmacies/stock/stats",
        method: "GET",
      }),

      transformResponse: (res: any): StockStatsResponse => {
        return res.data;
      },

      providesTags: [{ type: "Stock", id: "STATS" }],
    }),

    downloadStockSampleTemplate: builder.mutation<Blob, void>({
      query: () => ({
        url: "/pharmacies/stock/download-stock-sample-template",
        method: "GET",
        responseHandler: async (response) => response.blob(),
        cache: "no-cache",
      }),
    }),

    importStock: builder.mutation<
    {
      success: boolean;
      message: string;
      data: {
        totalStocks: number;
        totalMedicines: number;
        totalErrors: number;
        insertedStocks: string[];
        insertedMedicines: string[];
        errors: string[];
      };
    },
    File
    >({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/pharmacies/stock/import-stock",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Stock", id: "LIST" }],
    }),

    /* ----------------------------- Settings ----------------------------- */
    setNoLossSetting: builder.mutation<PharmaciesApiResponse<any>, NoLossSettingRequest>({
      query: (body) => ({
        url: "/pharmacies/setting/no-loss",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Setting", id: "NO_LOSS" }],
    }),

    updateStock: builder.mutation<
      PharmaciesApiResponse<any>,
      { stockId: string; body: UpdateStockRequest }
    >({
      query: ({ stockId, body }) => ({
        url: `/pharmacies/stock/update-stock/${stockId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Stock", id: "LIST" },
        { type: "Stock", id: arg.stockId },
      ],
    }),

    exportStocks: builder.mutation<Blob, void>({
      query: () => ({
        url: "/pharmacies/stock/export-all-stock",
        method: "GET",
        responseHandler: async (response) => response.blob(),
        cache: "no-cache",
      }),
    }),

    createSale: builder.mutation<PharmaciesApiResponse<any>, CreateSaleRequest>({
      query: (body) => ({
        url: "/pharmacies/sales/create-sale",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Sale", id: "LIST" }],
    }),

    sendInvoiceWhatsApp: builder.mutation<
      PharmaciesApiResponse<any>,
      { saleId: string }
    >({
      query: ({ saleId }) => ({
        url: `/pharmacies/sales/send-invoice-whatsapp/${saleId}`,
        method: "POST",
      }),
    }),

    /* ----------------------------- Sales ----------------------------- */
    getAllSales: builder.query<SalesListResponse, GetAllSalesArgs>({
      query: ({ 
        pageNumber = 1, 
        pageSize = 10, 
        search = "", 
        paymentMethod, 
        startDate, 
        endDate 
      }) => ({
        url: `/pharmacies/sales/get-all-sales`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
      providesTags: [{ type: "Sale", id: "LIST" }],
    }),

    getSaleById: builder.query<SaleDetailResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/pharmacies/sales/get-sale/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, { id }) => [{ type: "Sale", id }],
    }),

    getSalesStats: builder.query<SalesStatsResponse, void>({
      query: () => ({
        url: "/pharmacies/sales/stats",
        method: "GET",
      }),

      transformResponse: (res: any): SalesStatsResponse => {
        return res.data;
      },

      providesTags: [{ type: "Sale", id: "STATS" }],
    }),

    createSubscription: builder.mutation<
      PharmaciesApiResponse<Subscription>,
      CreateSubscriptionRequest
    >({
      query: (body) => ({
        url: "/pharmacies/patient-subscription/create-patient-subscription",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Subscription", id: "LIST" }, { type: "Subscription", id: "STATS" }],
    }),

    updateSubscription: builder.mutation<
      PharmaciesApiResponse<Subscription>,
      { id: string; body: UpdateSubscriptionRequest }
    >({
      query: ({ id, body }) => ({
        url: `/pharmacies/patient-subscription/update-patient-subscription/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Subscription", id: "LIST" },
        { type: "Subscription", id: "STATS" },
        { type: "Subscription", id: arg.id }
      ],
    }),

    getSubscriptions: builder.query<SubscriptionListResponse, GetSubscriptionsArgs>({
      query: ({ 
        pageNumber = 1, 
        pageSize = 10, 
        search = "", 
        status,
        startDate,
        endDate 
      }) => ({
        url: `/pharmacies/patient-subscription/get-patient-subscriptions`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(status ? { status } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
      providesTags: [{ type: "Subscription", id: "LIST" }],
    }),

    getSubscriptionById: builder.query<PharmaciesApiResponse<Subscription>, { subscriptionId: string }>({
      query: ({ subscriptionId }) => ({
        url: `/pharmacies/patient-subscription/get-patient-subscription/${subscriptionId}`,
        method: "GET",
      }),
      providesTags: (_res, _err, { subscriptionId }) => [{ type: "Subscription", id: subscriptionId }],
    }),

    updateDeliveryDate: builder.mutation<
      PharmaciesApiResponse<Subscription>,
      { id: string; body: UpdateDeliveryDateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/pharmacies/patient-subscription/update-delivery-date/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Subscription", id: "LIST" },
        { type: "Subscription", id: "STATS" },
        { type: "Subscription", id: arg.id }
      ],
    }),

    getSubscriptionStats: builder.query<SubscriptionStatsResponse, void>({
      query: () => ({
        url: "/pharmacies/patient-subscription/stats",
        method: "GET",
      }),
      transformResponse: (res: any): SubscriptionStatsResponse => {
        return res.data;
      },
      providesTags: [{ type: "Subscription", id: "STATS" }],
    }),

    getSubscriptionNotifications: builder.query<SubscriptionNotificationResponse, void>({
      query: () => ({
        url: `/pharmacies/patient-subscription/get-patient-subscriptions-notification`,
        method: "GET",
      }),
      providesTags: [{ type: "Subscription", id: "NOTIFICATIONS" }],
    }),

    markSubscriptionNotificationRead: builder.mutation<
      MarkNotificationReadResponse,
      void
    >({
      query: () => ({
        url: `/pharmacies/patient-subscription/mark-subscription-notification-read`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Subscription", id: "NOTIFICATIONS" }],
    }),

    getSubscriptionSales: builder.query<
      SubscriptionSalesResponse,
      { subscriptionId: string; pageNumber?: number; pageSize?: number }
    >({
      query: ({ subscriptionId, pageNumber = 1, pageSize = 10 }) => ({
        url: `/pharmacies/patient-subscription/get-subscription-sales/${subscriptionId}`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
        },
      }),
      providesTags: (_res, _err, { subscriptionId }) => [
        { type: "Subscription", id: `SALES_${subscriptionId}` }
      ],
    }),

    /* ----------------------------- Dashboard Endpoints ----------------------------- */
    
    // ─── Get Dashboard Summary ───
    getDashboardSummary: builder.query<DashboardSummaryResponse, DashboardSummaryQuery>({
      query: ({ startDate, endDate }) => ({
        url: "/pharmacies/dashboard/summary",
        method: "GET",
        params: { startDate, endDate },
      }),
      providesTags: [{ type: "Dashboard", id: "SUMMARY" }],
      transformResponse: (response: any): DashboardSummaryResponse => {
        const data = response?.data ?? response?.result ?? response ?? {};
        return {
          statCards: {
            todayProfit: {
              value: data.statCards?.todayProfit?.value ?? 0,
              delta: data.statCards?.todayProfit?.delta ?? 0,
              sparkUp: data.statCards?.todayProfit?.sparkUp ?? true,
              comparisonLabel: data.statCards?.todayProfit?.comparisonLabel ?? "vs yesterday",
            },
            lowStockMedicines: {
              value: data.statCards?.lowStockMedicines?.value ?? 0,
              delta: data.statCards?.lowStockMedicines?.delta ?? 0,
              sparkUp: data.statCards?.lowStockMedicines?.sparkUp ?? false,
              comparisonLabel: data.statCards?.lowStockMedicines?.comparisonLabel ?? "Needs attention",
            },
            paidToSuppliers: {
              value: data.statCards?.paidToSuppliers?.value ?? 0,
              delta: data.statCards?.paidToSuppliers?.delta ?? 0,
              sparkUp: data.statCards?.paidToSuppliers?.sparkUp ?? true,
              comparisonLabel: data.statCards?.paidToSuppliers?.comparisonLabel ?? "vs last month",
            },
            totalSales: {
              value: data.statCards?.totalSales?.value ?? 0,
              delta: data.statCards?.totalSales?.delta ?? 0,
              sparkUp: data.statCards?.totalSales?.sparkUp ?? true,
              comparisonLabel: data.statCards?.totalSales?.comparisonLabel ?? "vs yesterday",
            },
          },
          inventoryHealth: {
            inStock: data.inventoryHealth?.inStock ?? 0,
            lowStock: data.inventoryHealth?.lowStock ?? 0,
            outOfStock: data.inventoryHealth?.outOfStock ?? 0,
            // expiringSoon: data.inventoryHealth?.expiringSoon ?? 0,
          },
          criticalAlerts: data.criticalAlerts ?? [],
          paymentOverview: {
            totalReceivables: data.paymentOverview?.totalReceivables ?? 0,
            receivablesFrom: data.paymentOverview?.receivablesFrom ?? "From 0 customers",
            totalPayables: data.paymentOverview?.totalPayables ?? 0,
            payablesTo: data.paymentOverview?.payablesTo ?? "To 0 suppliers",
          },
          smartInsights: data.smartInsights ?? [],
        };
      },
    }),

    // ─── Get Sales Overview ───
    getSalesOverview: builder.query<SalesOverviewResponse, SalesOverviewQuery>({
      query: ({ period, metric }) => ({
        url: "/pharmacies/dashboard/sales-overview",
        method: "GET",
        params: { period, metric },
      }),
      providesTags: [{ type: "SalesOverview", id: "LIST" }],
      transformResponse: (response: any): SalesOverviewResponse => {
        const data = response?.data ?? response?.result ?? response ?? {};
        return {
          totalValue: data.totalValue ?? 0,
          delta: data.delta ?? 0,
          deltaLabel: data.deltaLabel ?? "vs last week",
          chartData: data.chartData ?? [],
          bottomStats: data.bottomStats ?? [],
        };
      },
    }),

    // ─── Get Category Revenue ───
    getCategoryRevenue: builder.query<CategoryRevenueResponse, CategoryRevenueQuery>({
      query: ({ period }) => ({
        url: "/pharmacies/dashboard/category-revenue",
        method: "GET",
        params: { period },
      }),
      providesTags: [{ type: "CategoryRevenue", id: "LIST" }],
      transformResponse: (response: any): CategoryRevenueResponse => {
        const data = response?.data ?? response?.result ?? response ?? {};
        return {
          totalRevenue: data.totalRevenue ?? 0,
          categories: data.categories ?? [],
        };
      },
    }),

    // ─── Get Top Performers ───
    getTopPerformers: builder.query<TopPerformersResponse, TopPerformersQuery>({
      query: ({ period }) => ({
        url: "/pharmacies/dashboard/top-performers",
        method: "GET",
        params: { period },
      }),
      providesTags: [{ type: "TopPerformers", id: "LIST" }],
      transformResponse: (response: any): TopPerformersResponse => {
        const data = response?.data ?? response?.result ?? response ?? {};
        return {
          performers: data.performers ?? [],
        };
      },
    }),

    // ─── Get AI Stock Prediction ───
    getAiStockPrediction: builder.query<AiStockPredictionResponse, void>({
      query: () => ({
        url: "/pharmacies/dashboard/ai-stock-prediction",
        method: "GET",
      }),
      providesTags: [{ type: "AiPrediction", id: "LATEST" }],
      transformResponse: (response: any): AiStockPredictionResponse => {
        const data = response?.data ?? response?.result ?? response ?? {};
        return {
          medicineName: data.medicineName ?? "",
          runoutDays: data.runoutDays ?? 0,
          currentStock: data.currentStock ?? 0,
          dailyAverageUsage: data.dailyAverageUsage ?? 0,
          suggestedOrder: data.suggestedOrder ?? 0,
        };
      },
    }),
  }),
});

export const {
  // Supplier hooks
  useGetAllSuppliersQuery,
  useAddSupplierMutation,
  useUpdatePharmacySupplierMutation,
  useDownloadSupplierSampleTemplateMutation,
  useImportSupplierMutation,
  useExportSuppliersMutation,
  useGetSupplierStatsQuery,
  // Medicine hooks
  useGetAllMedicinesQuery,
  useLazyGetAllMedicinesQuery,
  useAddMedicineMutation,
  useUpdateMedicineMutation,
  useGetHSNQuery,
  useGetMedicineCategoriesQuery,
  useGetMedicineTagsQuery,
  useExportMedicinesMutation,
  useDownloadMedicineSampleTemplateMutation, 
  useImportMedicineMutation,
  useGetMedicineBrandsQuery,
  useGetMedicineStatsQuery,
  // Prescription hooks
  useGetPrescriptionsQuery,
  useGetPrescriptionByIdQuery,
  useUpdatePrescriptionStatusMutation,
  useCheckMedicinesMutation,
  useGetPrescriptionStatsQuery,
  // Stock hooks
  useGetAllStocksQuery,
  useGetExpiryStockQuery,
  useGetStockByIdQuery,
  useAddStockMutation,
  useUpdateStockMutation,
  useUploadStockInvoiceMutation,
  useExportStocksMutation,
  useGetAvailableStockQuery,
  useGetStockCacheQuery,
  useGetStockStatsQuery,
  useDownloadStockSampleTemplateMutation,
  useImportStockMutation,
  // Sales hooks
  useCreateSaleMutation,
  useGetAllSalesQuery,
  useGetSaleByIdQuery,
  useSendInvoiceWhatsAppMutation,
  useGetSalesStatsQuery,
  // Dashboard hooks
  useGetDashboardStatsQuery,
  useGetTopSellingMedicinesQuery,
  useGetTopSuppliersQuery,
  useGetSalesChartQuery,
  // Setting hooks
  useSetNoLossSettingMutation,
  // Patient Subscription hooks
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useGetSubscriptionsQuery,
  useGetSubscriptionByIdQuery,
  useUpdateDeliveryDateMutation,
  useGetSubscriptionStatsQuery,
  useGetSubscriptionNotificationsQuery,
  useMarkSubscriptionNotificationReadMutation,
  useGetSubscriptionSalesQuery,
  // Dashboard specific hooks
  useGetDashboardSummaryQuery,
  useGetSalesOverviewQuery,
  useGetCategoryRevenueQuery,
  useGetTopPerformersQuery,
  useGetAiStockPredictionQuery,
} = pharmaciesApi;
