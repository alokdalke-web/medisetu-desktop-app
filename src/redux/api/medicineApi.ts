import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { TransportLayer } from "../../services/TransportLayer";

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

const transformMedicinesResponse = (resp: any): GetMedicinesResponse => {
  if (Array.isArray(resp?.medicines)) {
    return {
      success: Boolean(resp?.success ?? true),
      medicines: resp.medicines.map(mapAnyToMedicineDto),
      pagination: resp?.pagination,
    };
  }

  if (Array.isArray(resp?.data?.medicines)) {
    return {
      success: Boolean(resp?.success ?? true),
      medicines: resp.data.medicines.map(mapAnyToMedicineDto),
      pagination: resp.data.pagination ?? resp.pagination,
    };
  }

  if (Array.isArray(resp?.data)) {
    return {
      success: Boolean(resp?.success ?? true),
      medicines: resp.data.map(mapAnyToMedicineDto),
      pagination: resp?.pagination,
    };
  }

  return {
    success: false,
    medicines: [],
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
      queryFn: async ({ q, city = "Indore", per_page = 10, search_term, url }) => {
        try {
          const params: Record<string, string | number> = { city, per_page };
          if (q) params.q = q;
          if (search_term) params.search_term = search_term;
          if (url) params.url = url;

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'medicine.search',
            ipcPayload: { query: q || search_term || '' },
            restConfig: {
              url: "/medicine/search/all",
              method: "GET",
              params,
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Medicine"],
    }),

    getMedicines: builder.query<GetMedicinesResponse, { q?: string; isActive?: boolean; isFavorite?: boolean } | void>({
      queryFn: async (arg) => {
        try {
          const q = (arg as any)?.q?.trim();
          const isActive = (arg as any)?.isActive;
          const isFavorite = (arg as any)?.isFavorite;

          const params: Record<string, string> = {};
          if (q) params.q = q;
          if (isActive === true) params.isActive = "true";
          if (isActive === false) params.isActive = "false";
          if (isFavorite === true) params.isFavorite = "true";
          if (isFavorite === false) params.isFavorite = "false";

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'medicine.getAll',
            ipcPayload: params,
            restConfig: {
              url: "/medicine/medicines",
              method: "GET",
              params: Object.keys(params).length > 0 ? params : undefined,
            }
          });

          return {
            data: transformMedicinesResponse(response.data),
            meta: { source: response.meta.source },
          };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Medicine"],
    }),

    getDoctorTopUsedMedicines: builder.query<TopUsedMedicinesResponse, void>({
      queryFn: async () => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'medicine.getAll',
            preferCloud: true,
            restConfig: {
              url: "/doctor/top-used-medicines",
              method: "GET",
            }
          });

          const raw = 
            (Array.isArray(response.data?.data) && response.data.data) ||
            (Array.isArray(response.data?.medicines) && response.data.medicines) ||
            (Array.isArray(response.data?.result?.medicines) && response.data.result.medicines) ||
            (Array.isArray(response.data?.result) && response.data.result) ||
            (Array.isArray(response.data) && response.data) ||
            [];

          const medicines: MedicineDto[] = raw
            .map(mapAnyToMedicineDto)
            .filter((m: any) => m.id && m.name);

          return { 
            data: {
              success: Boolean(response.data?.success ?? true),
              medicines,
              pagination: response.data?.data?.pagination ?? response.data?.pagination,
            } 
          };
        } catch (error: any) {
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      providesTags: ["Medicine"],
    }),

    toggleFavoriteMedicine: builder.mutation({
      queryFn: async (medicineId: string) => {
        try {
          const res = await TransportLayer.execute<any>({
            ipcMethod: 'medicine.toggleFavorite',
            ipcPayload: medicineId,
            restConfig: {
              url: `/doctor/favorite-medicine/${medicineId}`,
              method: 'PATCH',
            }
          });
          return { data: res.data };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
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
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'medicine.create',
            ipcPayload: body,
            restConfig: {
              url: "/medicine/medicines",
              method: "POST",
              data: body,
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
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
      queryFn: async () => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'medicine.getAll',
            preferCloud: true,
            restConfig: {
              url: "/medicine/medicines/forms",
              method: "GET",
            }
          });
          
          let forms: string[] = [];
          if (response.meta?.source === 'local_sqlite') {
            const raw = response.data?.result?.medicines || [];
            const allForms = raw.map((m: any) => m.form).filter(Boolean);
            forms = Array.from(new Set(allForms));
          } else {
            forms = response.data?.forms || response.data?.data || [];
          }
          return { data: { success: true, forms } };
        } catch (error: any) {
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
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
          const params: Record<string, string> = {
            page: String(page),
            limit: String(limit),
          };
          if (medicine_name) params.medicine_name = medicine_name;
          if (composition) params.composition = composition;

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'medicine.search',
            ipcPayload: { query: medicine_name || composition || '' },
            restConfig: {
              url: "/medicine/global-medicine/medicine-data",
              method: "GET",
              params,
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
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
