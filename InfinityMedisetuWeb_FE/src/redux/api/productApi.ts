// src/redux/api/productApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

/* ----------------------------- Common ----------------------------- */

export type ApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  status?: number | string;
  result?: T;
  data?: T;
};

/* ----------------------------- DTOs ----------------------------- */

export type ProductDto = {
  id?: string;
  _id?: string;
  productId?: string;

  drugName?: string;
  name?: string;

  brandName?: string;
  strength?: string;
  form?: string;

  packSize?: string | number;

  categoryName?: string;
  categoryCode?: string;

  manufacturerName?: string;

  mrp?: number;
  gstPercentage?: number;

  isPrescriptionRequired?: boolean;
};

export type CreateProductRequest = {
  // ✅ backend payload
  drugName: string;
  strength: string;
  composition?: string;
  packSize: number;
  categoryName: string;
  manufacturerName: string;
  mrp: number;

  hsnCode?: string;
  gstPercentage?: number;
  isPrescriptionRequired?: boolean;
};

export type CategoryDto = {
  id?: string;
  _id?: string;
  categoryName?: string;
  name?: string;
};

export type ManufacturerDto = {
  id?: string;
  _id?: string;
  manufacturerName?: string;
  name?: string;
};

export type HsnCodeDto = {
  id: string;
  hsnCode: string;
  gstPercentage: number;
  description: string;
  effectiveFrom: string;
  createdAt: string;
};

/* ----------------------------- API ----------------------------- */

export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Product", "Category", "Manufacturer"],
  endpoints: (builder) => ({
    /** ✅ GET /pharmacy/inventory/products?search=Amoxil */
    searchProducts: builder.query<ApiResponse<any>, string>({
      query: (search) => ({
        url: "/pharmacy/inventory/products",
        method: "GET",
        params: { search },
      }),
      providesTags: ["Product"],
    }),

    /** ✅ GET /pharmacy/inventory/product (list) */
    getInventoryProducts: builder.query<
      ApiResponse<any>,
      { search?: string } | void
    >({
      query: (arg) => ({
        url: "/pharmacy/inventory/product",
        method: "GET",
        params: arg?.search ? { search: arg.search } : undefined,
      }),
      providesTags: ["Product"],
    }),

    /** ✅ GET /pharmacy/inventory/categories */
    getInventoryCategories: builder.query<ApiResponse<CategoryDto[]>, void>({
      query: () => ({
        url: "/pharmacy/inventory/categories",
        method: "GET",
      }),
      providesTags: ["Category"],
    }),

    /** ✅ GET /pharmacy/inventory/manufacturers */
    getInventoryManufacturers: builder.query<
      ApiResponse<ManufacturerDto[]>,
      void
    >({
      query: () => ({
        url: "/pharmacy/inventory/manufacturers",
        method: "GET",
      }),
      providesTags: ["Manufacturer"],
    }),

    /** ✅ POST /pharmacy/inventory/product */
    createProduct: builder.mutation<
      ApiResponse<ProductDto>,
      CreateProductRequest
    >({
      query: (body) => ({
        url: "/pharmacy/inventory/product",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Product"],
    }),

    /** ✅ GET /pharmacy/inventory/hsn-codes */
    searchHsnCodes: builder.query<
      ApiResponse<{ data: HsnCodeDto[]; meta: any }>,
      { search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/pharmacy/inventory/hsn-codes",
        method: "GET",
        params,
      }),
    }),
  }),
});

/* ----------------------------- Hooks ----------------------------- */

export const {
  useLazySearchProductsQuery,

  useGetInventoryProductsQuery,

  // ✅ export BOTH normal + lazy (THIS WAS MISSING)
  useGetInventoryCategoriesQuery,
  useLazyGetInventoryCategoriesQuery,

  useGetInventoryManufacturersQuery,
  useLazyGetInventoryManufacturersQuery,

  useCreateProductMutation,
  useLazySearchHsnCodesQuery,
} = productApi;
