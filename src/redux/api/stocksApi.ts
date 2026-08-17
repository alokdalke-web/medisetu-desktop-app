import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

/* ------------------- Types ------------------- */

export type StockStatus = "healthy" | "low_stock" | "out_of_stock";

export interface Stock {
  id: string;
  pharmacyId: string;
  medicineId: string;
  medicineName?: string;
  supplierName: string;

  // ✅ Backend field
  batchNumber: string;

  // ✅ UI alias (for older/new UI components expecting batchNo)
  batchNo?: string;

  quantity: number;
  expiryDate: string;
  lowStockThreshold: number;

  mrp?: number;
  discount?: number;
  status?: StockStatus;
  createdAt?: string;
  updatedAt?: string;

  // ✅ New pricing/strip fields (optional from backend)
  totalStrips?: number;
  stripQuantity?: number;
  pricePerStrip?: number;
  price?: number;
}

export interface StockListResponse {
  success: boolean;
  result: {
    stocks: Stock[];
    pagination: {
      totalRecords: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  };
}

/**
 * ✅ CreateStockRequest updated:
 * - Old flow fields optional (medicineName, quantity, mrp, discount)
 * - New flow fields optional (totalStrips, stripQuantity, pricePerStrip, price, medicine)
 * - Common required fields kept (pharmacyId, supplierName, batchNumber, expiryDate)
 */
export interface CreateStockRequest {
  pharmacyId: string;
  supplierName: string;
  batchNumber: string;
  expiryDate: string;

  // -------- OLD payload (backward compatibility) --------
  medicineName?: string;
  quantity?: number;
  mrp?: number;
  discount?: number;

  // -------- NEW payload (your AddStockModal) --------
  totalStrips?: number;
  stripQuantity?: number;
  pricePerStrip?: number;
  price?: number;

  medicine?: {
    drugSkuId: string;
    name: string;
    genericName?: string;
    manufacturer?: string | null;
    composition?: string;
    form?: string;
    strength?: string;
    packSize?: string;
    category?: string;
    requiresPrescription?: boolean;
    imageUrl?: string;
  };

  // (optional) allow UI alias if ever passed
  batchNo?: string;
}

export interface UpdateStockRequest {
  supplierName?: string;

  // ✅ allow both (UI may send batchNo)
  batchNumber?: string;
  batchNo?: string;

  quantity?: number;
  expiryDate?: string;
  lowStockThreshold?: number;

  // (optional) if you ever update pricing via same endpoint
  mrp?: number;
  discount?: number;
  totalStrips?: number;
  stripQuantity?: number;
  pricePerStrip?: number;
  price?: number;
}

export interface StockQueryParams {
  pharmacyId?: string;
  medicineId?: string;
  status?: StockStatus;
  search?: string;
  expiringInDays?: string;
  pageNumber?: number;
  pageSize?: number;
}

/* ------------------- Helpers ------------------- */

const withBatchNo = (s: Stock): Stock => ({
  ...s,
  batchNo: s.batchNo ?? s.batchNumber ?? "",
});

const withBatchNoList = (res: StockListResponse): StockListResponse => ({
  ...res,
  result: {
    ...res.result,
    stocks: Array.isArray(res.result?.stocks)
      ? res.result.stocks.map(withBatchNo)
      : [],
  },
});

const withBatchNoSingle = (res: { success: boolean; result: Stock }) => ({
  ...res,
  result: withBatchNo(res.result),
});

const normalizeUpdateBody = (data: UpdateStockRequest) => {
  const { batchNo, ...rest } = data;
  return {
    ...rest,
    ...(batchNo ? { batchNumber: batchNo } : {}),
  };
};

/**
 * ✅ Normalize create body:
 * - batchNo -> batchNumber
 * - If new fields exist but old ones missing, map them for safety
 *   (so backend expecting old fields can still work)
 */
const normalizeCreateBody = (body: CreateStockRequest) => {
  const finalBatchNumber = body.batchNumber || body.batchNo || "";

  // if user sends new payload, create fallback old fields (optional)
  const derivedMedicineName =
    body.medicineName || body.medicine?.name || undefined;

  const derivedQuantity =
    typeof body.quantity === "number"
      ? body.quantity
      : typeof body.totalStrips === "number"
      ? body.totalStrips
      : undefined;

  const derivedMrp =
    typeof body.mrp === "number"
      ? body.mrp
      : typeof body.pricePerStrip === "number"
      ? body.pricePerStrip
      : undefined;

  return {
    ...body,
    batchNumber: finalBatchNumber,

    // keep old fields present if derivable (won't harm if backend ignores)
    ...(derivedMedicineName ? { medicineName: derivedMedicineName } : {}),
    ...(typeof derivedQuantity === "number" ? { quantity: derivedQuantity } : {}),
    ...(typeof derivedMrp === "number" ? { mrp: derivedMrp } : {}),
  };
};

/* ------------------- API ------------------- */

export const stocksApi = createApi({
  reducerPath: "stocksApi",
baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Stock"],
  endpoints: (builder) => ({
    // Get all stocks with filters and pagination
    getStocks: builder.query<StockListResponse, StockQueryParams>({
      query: (params) => ({
        url: "/medicine/stock",
        params: {
          ...params,
          pageNumber: params.pageNumber?.toString(),
          pageSize: params.pageSize?.toString(),
        },
      }),
      transformResponse: (res: StockListResponse) => withBatchNoList(res),
      providesTags: (result) =>
        result
          ? [
              ...result.result.stocks.map(({ id }) => ({
                type: "Stock" as const,
                id,
              })),
              { type: "Stock" as const, id: "LIST" },
            ]
          : [{ type: "Stock" as const, id: "LIST" }],
    }),

    // Get stock by ID
    getStockById: builder.query<{ success: boolean; result: Stock }, string>({
      query: (stockId) => `/medicine/stock/${stockId}`,
      transformResponse: (res: { success: boolean; result: Stock }) =>
        withBatchNoSingle(res),
      providesTags: (_result, _error, id) => [{ type: "Stock", id }],
    }),

    // Create new stock
    createStock: builder.mutation<
      { success: boolean; result: Stock },
      CreateStockRequest
    >({
      query: (body) => ({
        url: "/medicine/stock",
        method: "POST",
        body: normalizeCreateBody(body),
      }),
      transformResponse: (res: { success: boolean; result: Stock }) =>
        withBatchNoSingle(res),
      invalidatesTags: [{ type: "Stock", id: "LIST" }],
    }),

    // Update stock (PATCH)
    updateStock: builder.mutation<
      { success: boolean; result: Stock },
      { stockId: string; data: UpdateStockRequest }
    >({
      query: ({ stockId, data }) => ({
        url: `/medicine/stock/${stockId}`,
        method: "PATCH",
        body: normalizeUpdateBody(data), // ✅ batchNo -> batchNumber
      }),
      transformResponse: (res: { success: boolean; result: Stock }) =>
        withBatchNoSingle(res),
      invalidatesTags: (_result, _error, { stockId }) => [
        { type: "Stock", id: stockId },
        { type: "Stock", id: "LIST" },
      ],
    }),

    // Delete stock
    deleteStock: builder.mutation<{ success: boolean }, string>({
      query: (stockId) => ({
        url: `/medicine/stock/${stockId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Stock", id: "LIST" }],
    }),

    // Get low stock alerts
    getLowStockAlerts: builder.query<
      { success: boolean; result: Stock[] },
      void
    >({
      query: () => "/medicine/stock/alerts/low-stock",
      transformResponse: (res: { success: boolean; result: Stock[] }) => ({
        ...res,
        result: Array.isArray(res.result) ? res.result.map(withBatchNo) : [],
      }),
      providesTags: [{ type: "Stock", id: "LOW_STOCK" }],
    }),

    // Get expiring items
    getExpiringItems: builder.query<{ success: boolean; result: Stock[] }, void>(
      {
        query: () => "/medicine/stock/alerts/expiring",
        transformResponse: (res: { success: boolean; result: Stock[] }) => ({
          ...res,
          result: Array.isArray(res.result) ? res.result.map(withBatchNo) : [],
        }),
        providesTags: [{ type: "Stock", id: "EXPIRING" }],
      }
    ),

    // Get stock pricing
    getStockPricing: builder.query<
      {
        success: boolean;
        result: { pricePerStrip: number; mrp?: number; discount?: number };
      },
      string
    >({
      query: (stockId) => `/medicine/stock/${stockId}/pricing`,
    }),

    // Update stock pricing
    updateStockPricing: builder.mutation<
      { success: boolean },
      { stockId: string; pricePerStrip: number; mrp?: number; discount?: number }
    >({
      query: ({ stockId, ...body }) => ({
        url: `/medicine/stock/${stockId}/pricing`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { stockId }) => [
        { type: "Stock", id: stockId },
        { type: "Stock", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetStocksQuery,
  useGetStockByIdQuery,
  useCreateStockMutation,
  useUpdateStockMutation,
  useDeleteStockMutation,
  useGetLowStockAlertsQuery,
  useGetExpiringItemsQuery,
  useGetStockPricingQuery,
  useUpdateStockPricingMutation,
} = stocksApi;
