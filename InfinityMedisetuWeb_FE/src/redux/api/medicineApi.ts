import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export interface MedicineLocationResponse {
  data: {
    serviceable: boolean;
    otc_available: boolean;
    pharma_available: boolean;
    city: string;
  };
}

export type CreateMedicineRequest = {
  name: string;
  form?: string;
  composition?: string;
  manufacturer?: string;
  // strength?: string;
  // requiresPrescription: boolean;
};

export type CreateMedicineResponse = {
  success?: boolean;
  message?: string;
  status?: number | string;
  data?: any;
  result?: any;
};

export type UploadMedicinesResponse = {
  success?: boolean;
  message?: string;
  status?: number | string;
  data?: any;
  result?: any;
};

export type DeleteMedicineResponse = {
  success?: boolean;
  message?: string;
  status?: number | string;
  data?: any;
  result?: any;
};

export type MedicineDto = {
  id: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  composition?: string;
  form: string | null;
  strength: string | null;
  category?: string;
  requiresPrescription: boolean;
  isFavorite?: boolean;
  isActive?: boolean;
};

export type GetMedicinesResponse = {
  success: boolean;
  medicines: MedicineDto[];
  pagination?: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type SearchMedicineAllArgs = {
  q?: string;
  city?: string;
  per_page?: number;
  search_term?: string;
  url?: string;
};

type ListResponse =
  | string[]
  | {
      success?: boolean;
      data?: string[];
      result?: string[];
      items?: string[];
      generics?: string[];
      brands?: string[];
      manufacturers?: string[];
      categories?: string[];
    };

export type ListArgs = { q?: string };

export type TopUsedMedicinesResponse = {
  success: boolean;
  medicines: MedicineDto[];
  pagination?: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

export type DoctorPreferences = {
  id?: string;
  doctorId?: string;
  consultationMode?: string;
  followUpDays?: number | null;
  slotMinutes?: number | null;
  bufferTime?: number | null;
  headerOrder?: string[];
  habitList?: string[];
  surgerySuggestedList?: string[];
  allergyList?: string[];
  diagnosisList?: string[];
  [key: string]: any;
};

export type DoctorPreferencesResponse = {
  success: boolean;
  message?: string;
  result: DoctorPreferences | null;
};

/* =========================
   Helpers
========================= */

const mapAnyToMedicineDto = (x: any): MedicineDto => {
  const id = String(x?.medicineId ?? x?.id ?? "");
  const name = String(x?.medicineName ?? x?.name ?? "");
  const form =
    x?.form ??
    x?.medicineForm ??
    x?.medicine_form ??
    x?.formName ??
    x?.dosageForm ??
    x?.dosage_form ??
    x?.details?.form ??
    x?.details?.medicineForm ??
    x?.details?.medicine_form ??
    x?.details?.medicine?.form ??
    x?.medicine?.form ??
    x?.medicine?.medicineForm ??
    x?.medicine?.medicine_form ??
    null;

  return {
    id,
    name,
    genericName: x?.genericName ?? x?.generic_name ?? x?.generic ?? "",
    manufacturer: x?.manufacturer ?? x?.manufacturerName ?? x?.manufacturer_name ?? "",
    composition: x?.composition ?? "",
    form,
    strength: x?.strength ?? null,
    category: x?.category ?? "",
    requiresPrescription: Boolean(x?.requiresPrescription ?? false),
    isFavorite: Boolean(x?.isFavorite ?? false),
    isActive: x?.isActive !== undefined ? Boolean(x.isActive) : true,
  };
};

/* =========================
   API
========================= */

export const medicineApi = createApi({
  reducerPath: "medicineApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Medicine", "Doctor"],
  endpoints: (builder) => ({
    getMedicineLocations: builder.query<MedicineLocationResponse, { city: string }>({
      query: ({ city }) => ({ url: "/medicine", params: { city } }),
      providesTags: ["Medicine"],
    }),

    getDrugStatic: builder.query<any, string>({
      query: (drugSkuId) => `/medicine/drug-static/${drugSkuId}`,
      providesTags: ["Medicine"],
    }),

    getAllMedicines: builder.query<any, void>({
      query: () => "/medicine/search/all",
      providesTags: ["Medicine"],
    }),

    getMedicineSuggestions: builder.query<any, void>({
      query: () => "/medicine/search/suggestion",
      providesTags: ["Medicine"],
    }),

    searchMedicineSuggestions: builder.query<any, { q: string; city?: string; per_page?: number }>({
      query: ({ q, city = "Indore", per_page = 10 }) => ({
        url: "/medicine/search/suggestion",
        params: { q, city, per_page },
      }),
      providesTags: ["Medicine"],
    }),

    searchMedicineAll: builder.query<any, SearchMedicineAllArgs>({
      queryFn: async ({ q, city, per_page, search_term, url }) => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            const result = await (window as any).ipcAPI.medicine.search({ query: q || search_term || '' });
            return { data: { success: true, data: result.result || [] } };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Medicine"],
    }),

    getMedicines: builder.query<GetMedicinesResponse, { q?: string; isActive?: boolean } | void>({
      queryFn: async () => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
             const result = await (window as any).ipcAPI.medicine.getAll();
             const mappedMeds = (result.result?.medicines || []).map(mapAnyToMedicineDto);
             return { data: { success: true, medicines: mappedMeds } as GetMedicinesResponse };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Medicine"],
    }),

    getDoctorTopUsedMedicines: builder.query<TopUsedMedicinesResponse, void>({
      query: () => ({
        url: "/doctor/top-used-medicines",
        method: "GET",
      }),
      transformResponse: (resp: any): TopUsedMedicinesResponse => {
        const raw: any[] =
          (Array.isArray(resp?.data?.data) && resp.data.data) ||
          (Array.isArray(resp?.data?.medicines) && resp.data.medicines) ||
          (Array.isArray(resp?.medicines) && resp.medicines) ||
          (Array.isArray(resp?.data) && resp.data) ||
          (Array.isArray(resp?.result) && resp.result) ||
          [];

        const medicines: MedicineDto[] = raw
          .map(mapAnyToMedicineDto)
          .filter((m) => m.id && m.name);

        return {
          success: Boolean(resp?.success ?? true),
          medicines,
          pagination: resp?.data?.pagination ?? resp?.pagination,
        };
      },
      providesTags: ["Medicine"],
    }),

    toggleFavoriteMedicine: builder.mutation({
      query: (medicineId) => ({
        url: `/doctor/favorite-medicine/${medicineId}`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Medicine'],
    }),

    getDoctorPreferences: builder.query<DoctorPreferencesResponse, string>({
      query: (doctorId) => ({
        url: `/doctor/doctor-preferences/${doctorId}`,
        method: "GET",
      }),
      transformResponse: (resp: any): DoctorPreferencesResponse => {
        return {
          success: Boolean(resp?.success),
          message: resp?.message,
          result: resp?.result ?? null,
        };
      },
      providesTags: ["Doctor"],
    }),

    createMedicine: builder.mutation<CreateMedicineResponse, CreateMedicineRequest>({
      queryFn: async (body) => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
             const result = await (window as any).ipcAPI.medicine.create(body);
             if (result && result.success === false) {
                 return { error: { status: 'CUSTOM_ERROR', error: result.error || 'Failed to create medicine' } };
             }
             return { data: result };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ["Medicine"],
    }),

    updateMedicine: builder.mutation<
      CreateMedicineResponse,
      { medicineId: string; body: Partial<CreateMedicineRequest> }
    >({
      query: ({ medicineId, body }) => ({
        url: `/medicine/medicines/${medicineId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Medicine"],
    }),

    deleteMedicine: builder.mutation<DeleteMedicineResponse, { medicineId: string }>({
      query: ({ medicineId }) => ({
        url: `/medicine/medicines/${medicineId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Medicine"],
    }),

    toggleMedicineStatus: builder.mutation<
      CreateMedicineResponse,
      { medicineId: string; isActive: boolean }
    >({
      query: ({ medicineId, isActive }) => ({
        url: `/medicine/medicines/${medicineId}/toggle-status`,
        method: "PATCH",
        body: { isActive },
      }),
      invalidatesTags: ["Medicine"],
    }),

    uploadMedicinesCsv: builder.mutation<UploadMedicinesResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);

        return {
          url: "/medicine/medicines/upload",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Medicine"],
    }),

    getMedicineGenerics: builder.query<ListResponse, ListArgs | void>({
      query: (arg) => {
        const q = (arg as ListArgs | undefined)?.q?.trim();

        return {
          url: "/medicine/medicines/lists/generics",
          params: q ? { q } : undefined,
        };
      },
      providesTags: ["Medicine"],
    }),

    getMedicineBrands: builder.query<ListResponse, ListArgs | void>({
      query: (arg) => {
        const q = (arg as ListArgs | undefined)?.q?.trim();

        return {
          url: "/medicine/medicines/lists/brands",
          params: q ? { q } : undefined,
        };
      },
      providesTags: ["Medicine"],
    }),

    getMedicineManufacturers: builder.query<ListResponse, ListArgs | void>({
      query: (arg) => {
        const q = (arg as ListArgs | undefined)?.q?.trim();

        return {
          url: "/medicine/medicines/lists/manufacturers",
          params: q ? { q } : undefined,
        };
      },
      providesTags: ["Medicine"],
    }),

    getMedicineCategories: builder.query<ListResponse, ListArgs | void>({
      query: (arg) => {
        const q = (arg as ListArgs | undefined)?.q?.trim();

        return {
          url: "/medicine/medicines/lists/categories",
          params: q ? { q } : undefined,
        };
      },
      providesTags: ["Medicine"],
    }),

    getUniqueForms: builder.query<{ success: boolean; forms: string[] }, void>({
      query: () => ({
        url: "/medicine/medicines/forms",
        method: "GET",
      }),
      providesTags: ["Medicine"],
    }),

    getMedicineData: builder.query<
      {
        success: boolean;
        data: {
          medicine_name: string;
          manufacturer_name: string;
          composition: string;
          source: string;
        }[];
        pagination?: {
          totalRecords: number;
          totalPages: number;
          currentPage: number;
          pageSize: number;
        };
      },
      { medicine_name?: string; composition?: string; page?: number; limit?: number }
    >({
      queryFn: async ({ medicine_name, composition, page = 1, limit = 5 }) => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            const query = medicine_name || composition || '';
            const result = await (window as any).ipcAPI.medicine.search({ query });
            const localMeds = result.result || [];
            const mappedData = localMeds.map((med: any) => ({
              id: med.id,
              medicine_name: med.name,
              manufacturer_name: med.manufacturer || "",
              composition: med.composition || "",
              source: 'local'
            }));
            return { 
              data: { 
                success: true, 
                data: mappedData,
                pagination: { totalRecords: mappedData.length, totalPages: 1, currentPage: 1, pageSize: 50 } 
              } 
            };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Medicine"],
    }),
  }),
});

/* =========================
   Hooks
========================= */
export const {
  useGetMedicineLocationsQuery,
  useGetDrugStaticQuery,
  useLazyGetDrugStaticQuery,
  useGetAllMedicinesQuery,
  useGetMedicineSuggestionsQuery,
  useSearchMedicineSuggestionsQuery,
  useSearchMedicineAllQuery,
  useLazySearchMedicineAllQuery,
  useLazyGetAllMedicinesQuery,
  useGetMedicinesQuery,
  useGetDoctorTopUsedMedicinesQuery,
  useLazyGetDoctorTopUsedMedicinesQuery,
  useGetDoctorPreferencesQuery,
  useLazyGetDoctorPreferencesQuery,
  useCreateMedicineMutation,
  useUpdateMedicineMutation,
  useDeleteMedicineMutation,
  useToggleMedicineStatusMutation,
  useUploadMedicinesCsvMutation,
  useGetMedicineGenericsQuery,
  useLazyGetMedicineGenericsQuery,
  useGetMedicineBrandsQuery,
  useLazyGetMedicineBrandsQuery,
  useGetMedicineManufacturersQuery,
  useLazyGetMedicineManufacturersQuery,
  useGetMedicineCategoriesQuery,
  useLazyGetMedicineCategoriesQuery,
  useToggleFavoriteMedicineMutation,
  useGetUniqueFormsQuery,
  useGetMedicineDataQuery,
  useLazyGetMedicineDataQuery,
} = medicineApi;
