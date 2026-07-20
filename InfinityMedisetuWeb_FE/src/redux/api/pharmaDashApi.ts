
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

/* ----------------------------- Common Envelope ----------------------------- */

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  status?: number | string;
  data?: T;
  result?: T;
  [key: string]: unknown;
};

export interface PharmaDashRangeParams {
  startDate: string;
  endDate: string;
}

/* ----------------------------- ✅ Medicine Search Types ----------------------------- */

export type InvoiceMedicineSearchParams = {
  // ✅ new backend param
  name?: string;

  page?: number;
  limit?: number;

  // optional old param (if any old code still passes it)
  search?: string;
};

export type InvoiceMedicineDto = {
  productId?: string;
  sku?: string;
  drugName?: string;
  strength?: string;
  packSize?: number | null;

  batchItemId?: string;
  expiryDate?: string;
  sellingPrice?: string | number;
  availableQuantity?: string | number;

  // fallback old keys
  id?: string | number;
  _id?: string;
  medicineId?: string;
  name?: string;
  medicineName?: string;
  expDate?: string;
  price?: number | string;
  mrp?: number;
  status?: string;
  isActive?: boolean;

  [key: string]: unknown;
};

export type InvoiceMedicineSearchResponse = ApiEnvelope<InvoiceMedicineDto[]>;

/* ----------------------------- ✅ Stock Details (REAL RESPONSE) ----------------------------- */

export type StockDetailsMedicineDto = {
  sku?: string;
  drugName?: string;
  strength?: string;
  packSize?: number | null;
  mrp?: string | number;
  gstPercentage?: string | number;
  isPrescriptionRequired?: boolean;
  status?: string; // active/inactive
};

export type StockDetailsStockDto = {
  totalAvailable?: number | string;
  stockStatus?: string; // IN_STOCK / OUT_OF_STOCK etc
  totalReceived?: number | string;
  totalSold?: number | string;
};

export type StockDetailsSupplierDto = {
  name?: string;
  companyName?: string;
  contactPhone?: string;
  location?: string;
};

export type StockDetailsBatchDto = {
  batchNo?: string;
  expiryDate?: string;
  sellingPrice?: string | number;
  receivedQty?: number | string;
  soldQty?: number | string;
  availableQty?: number | string;
  supplier?: StockDetailsSupplierDto;
};

export type StockIssueSuggestionDto = {
  policy?: string;
  allocationOrder?: Array<{
    batchNo?: string;
    expiryDate?: string;
    availableQty?: number | string;
    sellingPrice?: string | number;
  }>;
};

export type MedicineStockDetailsDto = {
  medicine?: StockDetailsMedicineDto;
  batchCount?: number;
  stock?: StockDetailsStockDto;
  batches?: StockDetailsBatchDto[];
  issueSuggestion?: StockIssueSuggestionDto;
};

/* ----------------------------- ✅ Inventory History (REAL RESPONSE) ----------------------------- */

export type InventoryOutByBatchDto = {
  batchNo?: string;
  expiryDate?: string;
  soldQty?: number | string;
};

export type InventoryRecentOutMovementDto = {
  batchNo?: string;
  quantity?: number | string;
  referenceType?: string; // INVOICE
  inoviceid?: string; // ⚠️ backend spelling
  invoiceId?: string; // fallback if backend changes
  createdAt?: string;
};

export type InvoiceInventoryHistoryDto = {
  medicine?: StockDetailsMedicineDto & {
    composition?: string | null;
  };
  consumption?: {
    outByBatch?: InventoryOutByBatchDto[];
    recentOutMovements?: InventoryRecentOutMovementDto[];
  };
};

/* ----------------------------- Summary Types ----------------------------- */

export type PharmaDashSummaryCards = {
  totalSales: number;
  pendingPrescriptions: number;
  totalMedicines: number;
  lowStockCount: number;
  expiredMedicineCount: number;
};

export type PharmaDashRevenuePoint = {
  date: string;
  value: number;
};

export type PharmaDashStockBreakdown = {
  activeCount: number;
  lowCount: number;
  outOfStockCount: number;
  totalCount: number;
  activePercent: number;
  lowPercent: number;
  outPercent: number;
};

export type PharmaDashboardSummaryDto = {
  range?: { start: string; end: string };
  cards?: PharmaDashSummaryCards;
  revenue?: {
    points?: PharmaDashRevenuePoint[];
    yearly?: Array<{ year: number; revenue: number }>;
    monthly?: Array<{ year: number; month: number; revenue: number }>;
  };
  stockBreakdown?: PharmaDashStockBreakdown;
};

/* ----------------------------- Top Selling Types ----------------------------- */

export type TopSellingMedicineDto = {
  sku: string;
  drugName: string;
  strength: string;
  packSize: number | null;
  soldQty: number;
};

export type TopSellingResponse = ApiEnvelope<TopSellingMedicineDto[]>;

/* ----------------------------- Stock Health Types ----------------------------- */

export type StockHealthSummary = {
  expiredCount: number;
  nearExpiryCount: number;
  totalCount: number;
};

export type StockHealthItemDto = {
  batchNo: string;
  expiryDate: string;
  sku: string;
  drugName: string;
  strength: string;
  packSize: number | null;
  availableQty: number;
};

export type StockHealthDataDto = {
  summary: StockHealthSummary;
  items: StockHealthItemDto[];
  pagination?: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

/* ----------------------------- ✅ Pharmacy Update Types ----------------------------- */

export type PharmacyStatus = "active" | "deactive";

export type UpdatePharmacyBody = {
  name: string;
  address: string;
  contactNumber: string;
  status: PharmacyStatus;
};

export type UpdatePharmacyArgs = {
  id: string;
  body: UpdatePharmacyBody;
};

/* ----------------------------- API Slice ----------------------------- */

export const pharmaDashApi = createApi({
  reducerPath: "pharmaDashApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["PharmaDash", "Pharmacy", "Medicines", "Inventory"],
  endpoints: (builder) => ({
    getPharmaDashboardSummary: builder.query<
      ApiEnvelope<PharmaDashboardSummaryDto>,
      PharmaDashRangeParams
    >({
      query: (params) => ({
        url: "/pharmacy/dashboard/summary",
        method: "GET",
        params,
      }),
      providesTags: ["PharmaDash"],
    }),

    getPharmaDashboardTopSelling: builder.query<TopSellingResponse, PharmaDashRangeParams>({
      query: (params) => ({
        url: "/pharmacy/dashboard/top-selling",
        method: "GET",
        params,
      }),
      providesTags: ["PharmaDash"],
    }),

    getPharmaDashboardStockHealth: builder.query<ApiEnvelope<StockHealthDataDto>, PharmaDashRangeParams>({
      query: (params) => ({
        url: "/pharmacy/dashboard/stock-health",
        method: "GET",
        params,
      }),
      providesTags: ["PharmaDash"],
    }),

    // ✅ GET: /pharmacy/invoice/medicine/search?name=...
    searchInvoiceMedicines: builder.query<
      InvoiceMedicineSearchResponse,
      InvoiceMedicineSearchParams
    >({
      query: (params) => {
        const p = params ?? {};
        const { name, search, ...rest } = p;

        // ✅ accept either `name` or old `search`, but SEND as `name`
        const qRaw = (name ?? search) as unknown;
        const q =
          typeof qRaw === "string" && qRaw.trim().length > 0 ? qRaw.trim() : undefined;

        return {
          url: "/pharmacy/invoice/medicine/search",
          method: "GET",
          params: {
            ...rest,
            ...(q ? { name: q } : {}),
          },
        };
      },
      providesTags: ["Medicines"],
    }),

    searchMedicines: builder.query<
      InvoiceMedicineSearchResponse,
      InvoiceMedicineSearchParams
    >({
      query: (params) => {
        const p = params ?? {};
        const { name, search, ...rest } = p;

        // ✅ accept either `name` or old `search`, but SEND as `name`
        const qRaw = (name ?? search) as unknown;
        const q =
          typeof qRaw === "string" && qRaw.trim().length > 0 ? qRaw.trim() : undefined;

        return {
          url: "/pharmacy/invoice/medicineList",
          method: "GET",
          params: {
            ...rest,
            ...(q ? { name: q } : {}),
          },
        };
      },
      providesTags: ["Medicines"],
    }),

    // ✅ GET: /pharmacy/invoice/stock/:productId
    getInvoiceMedicineStockDetails: builder.query<ApiEnvelope<MedicineStockDetailsDto>, string>({
      query: (productId) => ({
        url: `/pharmacy/invoice/stock/${productId}`,
        method: "GET",
      }),
      providesTags: ["Medicines"],
    }),

    // ✅ GET: /pharmacy/invoice/inventory/:id  (History)
    getInvoiceInventoryHistory: builder.query<ApiEnvelope<InvoiceInventoryHistoryDto>, string>({
      query: (id) => ({
        url: `/pharmacy/invoice/inventory/${id}`,
        method: "GET",
      }),
      providesTags: ["Inventory"],
    }),

    // ✅ PUT: /pharmacy/:id
    updatePharmacy: builder.mutation<ApiEnvelope<unknown>, UpdatePharmacyArgs>({
      query: ({ id, body }) => ({
        url: `/pharmacy/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Pharmacy", "PharmaDash"],
    }),
  }),
});

export const {
  useGetPharmaDashboardSummaryQuery,
  useGetPharmaDashboardTopSellingQuery,
  useGetPharmaDashboardStockHealthQuery,

  useSearchInvoiceMedicinesQuery,
  useSearchMedicinesQuery,
  useGetInvoiceMedicineStockDetailsQuery,

  useGetInvoiceInventoryHistoryQuery,
  useLazyGetInvoiceInventoryHistoryQuery,

  useUpdatePharmacyMutation,
} = pharmaDashApi;
