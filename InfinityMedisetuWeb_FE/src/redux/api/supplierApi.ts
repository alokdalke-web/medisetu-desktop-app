import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

/* ----------------------------- Common Types ----------------------------- */

export type SupplierApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  status?: number | string;
  result?: T;
  data?: T;
  pagination?: any;
};

/* ----------------------------- Supplier Types ----------------------------- */

export type CreateSupplierRequest = {
  name: string;
  companyName: string;
  location: string;
  contactPhone: string;
  contactEmail?: string;
};

export type UpdateSupplierRequest = {
  name: string;
  companyName: string;
  location: string;
  contactPhone: string;
  contactEmail?: string;
};

export type UpdateSupplierArgs = {
  supplierId: string; // ✅ URL param
  body: UpdateSupplierRequest;
};

export type SupplierDto = {
  id?: string;
  _id?: string;
  supplierId?: string;

  name?: string;
  companyName?: string;
  location?: string;
  contactPhone?: string;
  contactEmail?: string;

  orderAmount?: number;
  batchNo?: string;
};

/* ----------------------------- Batches Types ----------------------------- */

export type SupplierBatchDto = {
  id?: string;
  _id?: string;
  batchNo?: string;
  receivedDate?: string;
  supplierId?: string;
  items?: any[];
};

export type GetSuppliersArgs = {
  pharmacyId: string;
  pageNumber?: number; // 1-based
  pageSize?: number;
  search?: string;
};

export type ManualBatchItemPayload = {
  productId: string;
  expiryDate: string; // "YYYY-MM-DD"
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
};

export type CreateManualBatchRequest = {
  supplierId: string;
  batchNo: string;
  receivedDate?: string;
  items: ManualBatchItemPayload[];
};

export type CreateManualBatchArgs = {
  pharmacyId: string;
  body: CreateManualBatchRequest;
};

/**
 * ✅ GET /pharmacy/inventory/batch/{batchId}/medicines/{pharmacyId}
 */
export type GetBatchMedicinesArgs = {
  batchId: string;
  pharmacyId: string;
};

/**
 * ✅ PUT /pharmacy/inventory/batch/{batchId}
 * ✅ Backend wants: { items: [{ productId, quantity, purchasePrice, sellingPrice, expiryDate }] }
 */
export type UpdateBatchMedicineItem = {
  productId: string; // ✅ REQUIRED (backend error says so)
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string; // "YYYY-MM-DD"
  id?: string; // optional
};

export type UpdateBatchMedicineRequest = {
  items?: UpdateBatchMedicineItem[];
  itemsToRemove?: string[]; // ✅ NEW
};

export type UpdateBatchMedicineArgs = {
  batchId: string;
  body: UpdateBatchMedicineRequest;
};

/* ----------------------------- API ----------------------------- */

export const supplierApi = createApi({
  reducerPath: "supplierApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Supplier", "Batches", "BatchMedicines"],
  endpoints: (builder) => ({
    /* ----------------------------- Suppliers ----------------------------- */
    getSuppliers: builder.query<SupplierApiResponse<any>, GetSuppliersArgs>({
      query: ({ pharmacyId, pageNumber = 1, pageSize = 8, search = "" }) => ({
        url: `/pharmacy/inventory/supplier/${pharmacyId}`,
        method: "GET",
        params: {
          pageNumber,
          pageSize,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      }),
      providesTags: [{ type: "Supplier", id: "LIST" }],
    }),
    createSupplier: builder.mutation<
      SupplierApiResponse<SupplierDto>,
      CreateSupplierRequest
    >({
      query: (body) => ({
        url: "/pharmacy/inventory/supplier",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Supplier", id: "LIST" }],
    }),

    // ✅ PUT /pharmacy/inventory/supplier/{supplierId}
    updateSupplier: builder.mutation<
      SupplierApiResponse<SupplierDto>,
      UpdateSupplierArgs
    >({
      query: ({ supplierId, body }) => ({
        url: `/pharmacy/inventory/supplier/${supplierId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Supplier", id: "LIST" },
        { type: "Supplier", id: arg.supplierId },
      ],
    }),

    /* ----------------------------- Batches ----------------------------- */

getSupplierBatches: builder.query<
  SupplierApiResponse<SupplierBatchDto[]>,
  { supplierId: string; search?: string }
>({
  query: ({ supplierId, search }) => ({
    url: `/pharmacy/inventory/batches/${supplierId}`,
    method: "GET",
    params: {
      search, // 👈 backend ko search param milega
    },
  }),
  providesTags: (_res, _err, arg) => [
    { type: "Batches", id: `SUP-${arg.supplierId}` },
  ],
}),


    getBatchMedicines: builder.query<
      SupplierApiResponse<any>,
      GetBatchMedicinesArgs
    >({
      query: ({ batchId, pharmacyId }) => ({
        url: `/pharmacy/inventory/batch/${batchId}/medicines/${pharmacyId}`,
        method: "GET",
      }),
      providesTags: (_res, _err, arg) => [
        { type: "BatchMedicines", id: `BATCH-${arg.batchId}` },
      ],
    }),

    createManualBatch: builder.mutation<
      SupplierApiResponse<any>,
      CreateManualBatchArgs
    >({
      query: ({ pharmacyId, body }) => ({
        url: `/pharmacy/inventory/manual-batch/${pharmacyId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "Batches", id: `SUP-${arg.body.supplierId}` },
      ],
    }),

    /* ----------------------------- Update Batch Medicine ----------------------------- */

    updateBatchMedicine: builder.mutation<
      SupplierApiResponse<any>,
      UpdateBatchMedicineArgs
    >({
      query: ({ batchId, body }) => ({
        url: `/pharmacy/inventory/batch/${batchId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "BatchMedicines", id: `BATCH-${arg.batchId}` },
      ],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,

  useGetSupplierBatchesQuery,
  useLazyGetSupplierBatchesQuery,

  useGetBatchMedicinesQuery,
  useLazyGetBatchMedicinesQuery,

  useCreateManualBatchMutation,

  useUpdateBatchMedicineMutation,
} = supplierApi;
