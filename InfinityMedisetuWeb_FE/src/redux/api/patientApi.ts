// src/redux/api/patientApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import type { CreatePetientDto, UpdatePetientDto } from "../../schemas/patient";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { dashboardApi } from "./dashboardApi";
import { TransportLayer } from "../../services/TransportLayer";

/** ---------- Patients list types ---------- */
export interface Patient {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  gender: string | null;
  age: number | null;
  dob: string | null;
  alternateMobile: string | null;
  countryCallingCode: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  countryCode: string | null;
  profileImage: string | null;
  notesMedicalHistory: string | null;
  bloodGroup: string | null;
  height: string | null;
  weight: string | null;
  allergies: string[] | null;
  chronicConditions: string[] | null;
  status: "Active" | "Inactive" | string;
  updatedAt: string;
  createdAt: string;
}

export interface Pagination {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface GetPatientsArgs {
  page?: number;
  pageSize?: number;
  q?: string; // searchBy
  status?: string; // userStatus
  patientId?: string;
  // New filter fields
  gender?: string;
  city?: string;
  minAge?: number;
  maxAge?: number;
  startDate?: string;
  endDate?: string;
}

export interface GetPatientsResult {
  success: boolean;
  patients: Patient[];
  pagination: Pagination;
}

export interface PatientsResponse {
  success: boolean;
  result: {
    petients: Patient[];
    pagination: Pagination;
  };
}

/** ---------- Patient search (typeahead for family linking) ---------- */
export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  gender?: string | null;
  age?: number | null;
}

export interface PatientSearchItem {
  id: string;
  name: string;
  mobile: string | null;
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  state?: string | null;
  familyMembers?: FamilyMember[];
}

export interface SearchPatientsArgs {
  search: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface SearchPatientsResult {
  success: boolean;
  data: PatientSearchItem[];
  pagination: Pagination;
}

/** ---------- check-mobile ---------- */
export interface CheckMobileResult {
  success: boolean;
  message?: string;
  data: {
    exists: true;
    patient: {
      id: string;
      name: string;
      mobile: string;
      gender?: string | null;
      age?: number | null;
      city?: string | null;
      state?: string | null;
    };
  } | {
    exists: false;
  };
}

/** ---------- Dashboard summary types ---------- */
export interface DashboardCompletedAppointmentsSeries {
  labels: string[];
  data: number[];
  keys: string[];
  range: { start: string; end: string };
  raw: unknown[];
}

export interface DashboardPatientDataItem {
  id: string;
  name: string;
  email?: string | null;
  profileImage?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  appointmentType?: string | null;
  appointmentStatus?: "Confirmed" | "Cancelled" | "Incoming" | string;
}

export interface DashboardSummaryResponse {
  success: boolean;
  result: {
    newPatients: number;
    totalNewAppointments: number;
    completedAppointmentsSeries: DashboardCompletedAppointmentsSeries;
    upcomingAppointmentsRes: any[];
    totalPatientsCount: number;
    totalAppointmentsCount: number;
    patientData: DashboardPatientDataItem[];
  };
}

/** ---------- Report Card (by patient) types ---------- */

export type TypeOfPaginations =
  | "Appointments"
  | "Prescriptions"
  | "Medcial history"; // backend typo ko bhi handle kar rahe

export interface GetReportCardsByPatientIdArgs {
  patientId: string;
  pageSize?: number;
  pageNumber?: number;
  searchBy?: string;
  typeOfPaginations: TypeOfPaginations;
}

export interface ReportCardsByPatientIdResult {
  success: boolean;
  pagination?: Pagination;
  appointments?: any[];
  prescriptions?: any[];
  medicalHistories?: any[];
}

/** ---------- API slice ---------- */
export const patientApi = createApi({
  reducerPath: "patientApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Patient"],
  endpoints: (builder) => ({
    /** Get all patients */
    getAllPatients: builder.query<GetPatientsResult, void | GetPatientsArgs>({
      queryFn: async (args) => {
        try {
          const {
            page = 1,
            pageSize = 10,
            q,
            status,
            patientId,
            gender,
            city,
            minAge,
            maxAge,
            startDate,
            endDate,
          } = args ?? {};

          const queryParams = {
            pageNumber: page,
            pageSize,
            searchBy: q,
            userStatus: status,
            patientId,
            ...(gender && { gender }),
            ...(city && { city }),
            ...(minAge !== undefined && { minAge }),
            ...(maxAge !== undefined && { maxAge }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
          };

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'patient.getAll',
            restConfig: {
              url: '/patient/all',
              method: 'GET',
              params: queryParams
            }
          });
          
          const transformedData = (() => {
            const resp = response.data;
            const fallback: Pagination = {
              totalRecords: 0,
              totalPages: 1,
              currentPage: 1,
              pageSize: 10,
            };
            return {
              success: !!resp?.success,
              patients: resp?.result?.petients ?? [],
              pagination: resp?.result?.pagination ?? fallback,
            };
          })();
          
          return { data: transformedData, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: (result) =>
        result?.patients
          ? [
              ...result.patients.map((p) => ({
                type: "Patient" as const,
                id: p.id,
              })),
              { type: "Patient" as const, id: "LIST" },
            ]
          : [{ type: "Patient" as const, id: "LIST" }],
    }),

    /** Get patient by ID */
    getPatientById: builder.query<CreatePetientDto, string>({
      queryFn: async (patientId) => {
        try {
          const response = await TransportLayer.execute<CreatePetientDto>({
            ipcMethod: 'patient.getProfile',
            ipcPayload: patientId,
            restConfig: {
              url: `/patient/${patientId}`,
              method: 'GET'
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      // ✅ FIX TS6133: rename unused params
      providesTags: (_res, _err, id) => [
        { type: "Patient", id },
        { type: "Patient", id: "LIST" },
      ],
    }),

    /** Create patient */
    createPatient: builder.mutation<
      {
        success?: boolean;
        result: {
          id: string;
          name?: string;
          email?: string;
          /** Set when a family link was requested; null otherwise. */
          primaryPatientId: string | null;
        };
      },
      CreatePetientDto
    >({
      queryFn: async (body) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'patient.create',
            ipcPayload: body,
            restConfig: {
              url: '/patient',
              method: 'POST',
              data: body
            }
          });
          return { 
            data: { success: true, result: response.data } as any, 
            meta: { source: response.meta.source } 
          };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: [{ type: "Patient", id: "LIST" }],
      // New patient affects dashboard "Total Patients" + "Patient Overview" cards.
      // Cross-slice refresh; only refetches active dashboard subscriptions.
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          dispatch(
            dashboardApi.util.invalidateTags(["Dashboard", "DoctorDashboard"]),
          );
        } catch {
          /* mutation failed — nothing to refresh */
        }
      },
    }),

    /** Search patients (typeahead for family-relation linking) */
    searchPatients: builder.query<SearchPatientsResult, SearchPatientsArgs>({
      queryFn: async ({ search, pageNumber = 1, pageSize = 30 }) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'patient.search',
            ipcPayload: search,
            restConfig: {
              url: '/patient/search',
              method: 'GET',
              params: { search, pageNumber, pageSize }
            }
          });
          
          const resp = response.data;
          const fallback: Pagination = {
            totalRecords: 0,
            totalPages: 1,
            currentPage: 1,
            pageSize: 30,
          };
          
          const nested = resp?.data ?? resp?.result ?? {};
          const data = Array.isArray(resp) ? resp : (nested?.data ?? nested?.patients ?? resp?.data ?? []);
          const pagination = nested?.pagination ?? resp?.pagination ?? fallback;
          const success = Array.isArray(resp) ? true : !!resp?.success;
          
          return {
            data: {
              success,
              data: Array.isArray(data) ? data : [],
              pagination,
            },
            meta: { source: response.meta.source }
          };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),

    /** Check if a mobile number belongs to an existing patient */
    checkMobile: builder.query<CheckMobileResult, string>({
      queryFn: async (mobile) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'patient.checkMobile',
            ipcPayload: mobile,
            restConfig: {
              url: '/patient/check-mobile',
              method: 'GET',
              params: { mobile }
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
    }),

    /** Update patient */
    updatePatient: builder.mutation<CreatePetientDto, UpdatePetientDto>({
      queryFn: async (body) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'patient.update',
            ipcPayload: body,
            restConfig: {
              url: '/patient',
              method: 'PUT',
              data: body
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      // ✅ FIX TS6133: rename unused params
      invalidatesTags: (_res, _err, body) => [
        { type: "Patient", id: (body as any)?.id },
        { type: "Patient", id: "LIST" },
      ],
    }),

    /** Dashboard summary */
    getDashboardSummary: builder.query<DashboardSummaryResponse, void>({
      query: () => `/dashboard/summary`,
    }),

    /**
     * Report cards by patient (Appointments / Prescriptions / Medical history)
     */
    getReportCardsByPatientId: builder.query<
      ReportCardsByPatientIdResult,
      GetReportCardsByPatientIdArgs
    >({
      query: ({
        patientId,
        pageSize = 10,
        pageNumber = 1,
        searchBy,
        typeOfPaginations,
      }) => {
        const params: Record<string, string> = {
          pageSize: String(pageSize),
          pageNumber: String(pageNumber),
          typeOfPaginations,
        };
        if (searchBy) params.searchBy = searchBy;

        return {
          url: `/reports/card/all/${patientId}`,
          params,
        };
      },
      transformResponse: (resp: any, _meta, arg): ReportCardsByPatientIdResult => {
        const result = resp?.result ?? {};
        const pagination: Pagination | undefined =
          result.pagination ?? resp?.pagination ?? undefined;

        const base: ReportCardsByPatientIdResult = {
          success: !!resp?.success,
          pagination,
        };

        switch (arg.typeOfPaginations) {
          case "Appointments":
            return {
              ...base,
              appointments: Array.isArray(result.appointments)
                ? result.appointments
                : [],
            };

          case "Prescriptions":
            return {
              ...base,
              prescriptions: Array.isArray(result.prescriptions)
                ? result.prescriptions
                : [],
            };

          case "Medcial history":
          default:
            return {
              ...base,
              medicalHistories: Array.isArray(result.medicalHistories)
                ? result.medicalHistories
                : [],
            };
        }
      },
      // ✅ FIX TS6133: result not used, keep _result
      providesTags: (_result, _err, arg) => [{ type: "Patient", id: arg.patientId }],
    }),
  }),
});

export const {
  useGetAllPatientsQuery,
  useGetPatientByIdQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useGetDashboardSummaryQuery,
  useGetReportCardsByPatientIdQuery,
  useSearchPatientsQuery,
  useLazySearchPatientsQuery,
  useCheckMobileQuery,
  useLazyCheckMobileQuery,
} = patientApi;
