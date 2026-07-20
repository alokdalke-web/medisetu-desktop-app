import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

type Pagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export type PharmacyStatus = "active" | "deactive"; // ✅ API uses "deactive"

export type Pharmacy = {
  id: string;
  name: string;
  contactNumber: string;
  address: string;
  status: PharmacyStatus;
  staffCount?: number;
  createdAt?: string;
};

export type PharmacyMember = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  userType: string;
  createdAt: string;
};

type PharmaciesResponse = {
  pharmacies: Pharmacy[];
  pagination: Pagination;
};

type PharmacyDetailsResponse = {
  pharmacy: Pharmacy;
  staff: PharmacyMember[];
};

type CreatePharmacyRequest = {
  name: string;
  contactNumber: string;
  address: string;
};

type AddMemberRequest = {
  pharmacyId: string;
  name: string;
  contactNumber: string;
  email: string;
};

export type UpdatePharmacyBody = {
  name: string;
  address: string;
  contactNumber: string; // digits only ideally
  status: PharmacyStatus;
};

/* ---------- Old generic medicine type (used elsewhere) ---------- */
export type InvoiceMedicine = {
  drugSkuId: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  composition?: string;
  strength?: string;
  packSize?: string;
  requiresPrescription?: boolean;
  imageUrl?: string | null;
};

/* ---------- Invoice medicine search types (for NewInvoice) ---------- */
export type InvoiceMedicineStock = {
  stockId: string;
  batchNumber: string;
  totalStrips: number;
  availableStrips: number;
  stripQuantity: number;
  totalTablets: number;
  expiryDate: string;

  // ✅ add sellingPrice so your UI can use stock[0].sellingPrice
  sellingPrice?: number;

  pricePerStrip: number | null;
  mrp: number | null;
  discount: number | null;
};

export type InvoiceMedicineOption = {
  medicineId: string; // (we are storing productId here for new-shape search)
  name: string;
  genericName?: string;
  manufacturer?: string;
  strength?: string;
  composition?: string;
  form?: string;

  // Extra flattened fields for convenience in UI
  batchItemId?: string;
  expiryDate?: string | null;
  sellingPrice?: number;
  gstPercentage?: number;
  hsnCode?: string;
  availableQuantity?: number;
  availableStrips?: number;

  stock: InvoiceMedicineStock[];
};

export type InvoiceMedicineSearchResult = {
  available: boolean;
  message: string;
  items: InvoiceMedicineOption[];
};

/* ------------------------------------------------------------------ */
/* ✅ Create invoice types (UPDATED to match POSTMAN payload)          */
/* ------------------------------------------------------------------ */
export type CreateInvoiceItem = {
  productId: string;
  batchItemId?: string;
  quantity: number;
};

export type CreateInvoiceBilling = {
  paymentMethod: "CASH" | "CARD" | "UPI" | string;
  tax: number;
  discount: number;
};

export type CreateInvoiceRequest = {
  pharmacyId: string;
  customerName: string;
  mobile: string;
  items: CreateInvoiceItem[];
  billing: CreateInvoiceBilling;
};

/* ---------- Invoice list types (GET /pharmacy/invoice?pharmacyId=...) ---------- */
export type InvoiceStatus = "Paid" | "Pending" | "Cancelled";

export type InvoiceListRow = {
  id: string;
  invoiceNo: string;
  customerName: string;
  qty: number;
  total: number;
  status: InvoiceStatus;
  createdAt?: string;
};

export type InvoiceSummary = {
  totalInvoices: number;
  pendingPayments: number;
  paidInvoices: number;
  cancelledInvoices: number;
};

export type InvoiceListResponse = {
  invoices: InvoiceListRow[];
  pagination: Pagination;
  summary: InvoiceSummary;
};

/* ---------- Invoice details types (UPDATED to match your response) ---------- */
export type InvoiceDetailsInvoiceEntity = {
  id: string;
  customerName: string;
  address?: string;
  mobile: string;
  clinicId: string;
  pharmacyId: string;
  doctorId: string | null;
  billingId?: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceDetailsClinic = {
  id: string;
  userId?: string;
  clinicName?: string;
  Tagline?: string;
  clinicAddress?: string;
  Country?: string;
  State?: string;
  City?: string;
  ZipCode?: number | string;
  clinicLogo?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InvoiceDetailsPharmacy = {
  id: string;
  clinicId?: string;
  name?: string;
  address?: string;
  contactNumber?: string;
  status?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * ✅ IMPORTANT:
 * Your UI (PharmacyInvoiceDetails.tsx) expects:
 * data.invoice.invoiceDetails.invoice
 */
export type InvoiceDetailsInvoiceWrapper = {
  invoiceDetails: {
    invoice: InvoiceDetailsInvoiceEntity;
    clinic: InvoiceDetailsClinic | null;
    pharmacy: InvoiceDetailsPharmacy | null;
  };
  billingId: string;
};

export type InvoiceDetailsBilling = {
  id: string;
  invoiceId: string;
  tax: string;
  discount: string;
  price: string;
  invoicePdf?: string | null;
  totalPrice: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceDetailsMedicine = {
  medicineId: string;
  medicineName: string;
  totalStrips: number;
  expiryDate: string;
  // optional but helpful for UI
  sellingPrice?: number;
  sku?: string;
};

export type InvoiceDetailsItem = {
  productId: string;
  sku?: string;
  drugName: string;
  strength?: string;
  packSize?: number;
  batchItemId?: string;
  expiryDate?: string;
  sellingPrice?: string | number;
  quantity?: number;
  gstPercentage?: number;
  gstAmount?: number;
  totalPrice?: number;
  sellingPriceExclGst?: number;
};

export type InvoiceDetailsPayload = {
  invoice: InvoiceDetailsInvoiceEntity | null;
  billing: InvoiceDetailsBilling | null;
  items: InvoiceDetailsItem[];
};

const toNum = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const pharmacyApi = createApi({
  reducerPath: "pharmacyApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Pharmacy", "PharmacyDetails", "Invoice"],
  endpoints: (b) => ({
    /* ---------- Pharmacies list ---------- */
    getPharmacies: b.query<
      PharmaciesResponse,
      { page?: number; pageSize?: number }
    >({
      query: ({ page = 1, pageSize = 10 }) => ({
        url: "/pharmacy/all",
        params: { page, pageSize },
      }),

      transformResponse: (res: any): PharmaciesResponse => {
        const data = res?.data ?? res?.result ?? res ?? {};
        const pharmacies: Pharmacy[] = Array.isArray(data?.pharmacies)
          ? data.pharmacies
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
              ? data
              : [];

        const pg = data?.pagination ?? data?.page ?? {};

        const fallbackPageSize = Number(pg?.pageSize ?? 10) || 10;

        const pagination: Pagination = {
          totalRecords:
            Number(pg?.totalRecords ?? pg?.total ?? pharmacies.length) || 0,
          totalPages: Number(pg?.totalPages ?? 1) || 1,
          currentPage: Number(pg?.currentPage ?? pg?.pageNumber ?? 1) || 1,
          pageSize: fallbackPageSize,
        };

        return { pharmacies, pagination };
      },

      providesTags: ["Pharmacy"],
    }),

    /* ---------- Create pharmacy ---------- */
    createPharmacy: b.mutation<any, CreatePharmacyRequest>({
      query: (body) => ({
        url: "/pharmacy",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Pharmacy"],
    }),

    /* ---------- Pharmacy details + staff ---------- */
    getPharmacyById: b.query<PharmacyDetailsResponse, string>({
      query: (id) => ({
        url: `/pharmacy/${id}`,
      }),
      transformResponse: (res: any): PharmacyDetailsResponse => ({
        pharmacy: res?.result?.pharmacy ?? ({} as Pharmacy),
        staff: res?.result?.users ?? [],
      }),
      providesTags: (_result, _error, id) => [{ type: "PharmacyDetails", id }],
    }),

    /* ✅ UPDATE Pharmacy PUT /pharmacy/:id */
    updatePharmacy: b.mutation<any, { id: string; body: UpdatePharmacyBody }>({
      query: ({ id, body }) => ({
        url: `/pharmacy/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "PharmacyDetails", id: arg.id },
        "Pharmacy",
      ],
    }),

    /* ---------- Add member ---------- */
    addMember: b.mutation<any, AddMemberRequest>({
      query: ({ pharmacyId, ...body }) => ({
        url: `/pharmacy/${pharmacyId}/member`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { pharmacyId }) => [
        { type: "PharmacyDetails", id: pharmacyId },
      ],
    }),

    /* ---------- ✅ Invoice medicine search (autocomplete) ---------- */
    searchInvoiceMedicines: b.query<InvoiceMedicineSearchResult, string>({
      query: (name) => ({
        url: "/pharmacy/invoice/medicine/search",
        method: "GET",
        params: { name },
      }),

      transformResponse: (res: any): InvoiceMedicineSearchResult => {
        /**
         * Your backend response:
         * {
         *   success: true,
         *   message: "...",
         *   data: [
         *     { productId, sku, drugName, packSize, expiryDate, sellingPrice, availableQuantity, ... }
         *   ]
         * }
         */
        const listNew: any[] = Array.isArray(res?.data) ? res.data : [];

        const message =
          String(res?.message ?? "").trim() ||
          "Medicines searched successfully";

        const items: InvoiceMedicineOption[] = listNew.map((d: any) => {
          const available = toNum(d?.availableQuantity, 0);
          const sellingPrice = toNum(d?.sellingPrice, 0);
          const gstPercentage = toNum(
            d?.gstPercentage ?? d?.gst ?? d?.GST ?? d?.tax ?? d?.Tax ?? 0,
            0,
          );

          return {
            medicineId: String(d?.productId ?? "").trim(),
            name: String(d?.drugName ?? "").trim(),
            strength: d?.strength != null ? String(d.strength) : undefined,
            genericName: String(d?.sku ?? "").trim() || undefined,
            manufacturer: undefined,
            form: undefined,
            gstPercentage, // ✅ Pass to top level

            stock: [
              {
                stockId: String(d?.productId ?? "").trim(),
                batchNumber: String(d?.sku ?? d?.batchItemId ?? "—"),
                totalStrips: available, // optional
                availableStrips: available,
                batchItemId: d?.batchItemId,
                stripQuantity: toNum(d?.packSize, 0),
                totalTablets: toNum(d?.packSize, 0) * available,
                expiryDate: String(d?.expiryDate ?? ""),
                sellingPrice, // ✅ THIS FIXES YOUR UI
                gstPercentage, // ✅ Pass to stock level
                pricePerStrip: sellingPrice, // ✅ calculations
                mrp: null,
                discount: null,
              },
            ],
          };
        });

        return {
          available: items.length > 0,
          message,
          items,
        };
      },
    }),

    /* ---------- ✅ Create invoice ---------- */
    createInvoice: b.mutation<any, CreateInvoiceRequest>({
      query: (body) => ({
        url: "/pharmacy/invoice",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Invoice", id: "LIST" }],
    }),

    /* ---------- GET invoices list ---------- */
    getInvoices: b.query<
      InvoiceListResponse,
      {
        pharmacyId: string;
        page?: number;
        pageSize?: number;
        search?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
      }
    >({
      query: ({
        pharmacyId,
        page = 1,
        pageSize = 10,
        search = "",
        startDate,
        endDate,
        status,
      }) => ({
        url: "/pharmacy/invoice",
        method: "GET",
        params: {
          pharmacyId,
          pageNumber: page,
          pageSize,
          search,
          startDate,
          endDate,
          status,
        },
      }),

      transformResponse: (res: any): InvoiceListResponse => {
        const data = res?.data ?? {};
        const rawList: any[] = Array.isArray(data?.invoices)
          ? data.invoices
          : [];
        const pg = data?.pagination ?? {};

        const invoices: InvoiceListRow[] = rawList.map((it: any) => {
          const id = String(it?.id ?? "");
          return {
            id,
            invoiceNo: `INV-${id.slice(0, 8).toUpperCase()}`,
            customerName: String(it?.customerName ?? "—"),
            qty: Number(it?.itemCount ?? 0) || 0,
            total: Number(it?.billing?.totalPrice ?? 0) || 0,
            status: "Pending",
            createdAt: it?.createdAt,
          };
        });

        const pagination: Pagination = {
          totalRecords: Number(pg?.total ?? invoices.length) || invoices.length,
          totalPages: Number(pg?.totalPages ?? 1) || 1,
          currentPage: Number(pg?.pageNumber ?? 1) || 1,
          pageSize: Number(pg?.pageSize ?? invoices.length) || invoices.length,
        };

        const summary: InvoiceSummary = invoices.reduce(
          (acc, inv) => {
            acc.totalInvoices += 1;
            acc.pendingPayments += inv.total;
            return acc;
          },
          {
            totalInvoices: 0,
            pendingPayments: 0,
            paidInvoices: 0,
            cancelledInvoices: 0,
          } as InvoiceSummary,
        );

        return { invoices, pagination, summary };
      },

      providesTags: (result) =>
        result
          ? [
              { type: "Invoice" as const, id: "LIST" },
              ...result.invoices.map((i) => ({
                type: "Invoice" as const,
                id: i.id,
              })),
            ]
          : [{ type: "Invoice" as const, id: "LIST" }],
    }),

    /* ---------- ✅ GET invoice details by invoiceId ---------- */
    getInvoiceById: b.query<
      InvoiceDetailsPayload,
      { invoiceId: string; pharmacyId?: string }
    >({
      query: ({ invoiceId, pharmacyId }) => ({
        url: "/pharmacy/invoice",
        method: "GET",
        params: { invoiceId, pharmacyId },
      }),

      transformResponse: (res: any): InvoiceDetailsPayload => {
        // ✅ backend: { success, message, data: { invoice, billing, items } }
        const inner = res?.data ?? res ?? {};

        return {
          invoice: inner?.invoice ?? null,
          billing: inner?.billing ?? null,
          items: Array.isArray(inner?.items) ? inner.items : [],
        };
      },

      providesTags: (_r, _e, arg) => [
        { type: "Invoice" as const, id: arg.invoiceId },
      ],
    }),
  }),
});

export const {
  useGetPharmaciesQuery,
  useCreatePharmacyMutation,
  useGetPharmacyByIdQuery,
  useUpdatePharmacyMutation,
  useAddMemberMutation,
  useSearchInvoiceMedicinesQuery,
  useLazySearchInvoiceMedicinesQuery,
  useCreateInvoiceMutation,
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
} = pharmacyApi;
