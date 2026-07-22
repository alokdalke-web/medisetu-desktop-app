import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  ClinicDetailsResponse,
  DoctorProfileDto,
  UpdateDoctorRequestDto,
} from "../../schemas/doctor";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { TransportLayer } from "../../services/TransportLayer";

/* ----------------------------- Existing Types ----------------------------- */

interface GetDoctorByIdResponse {
  success: boolean;
  result: DoctorProfileDto;
}

// 🔹 For /doctor/check-plains
export interface CheckDoctorPlansRequest {
  doctorId: string;
  patientId: string;
}

export interface CheckDoctorPlansResponse {
  success?: boolean;
  message?: string;
  status?: number | string;
  result?: any;
}

// 🔹 For /doctor/get-all-doctors-plains/:doctorId
export interface GetAllDoctorPlainsResponse {
  success: boolean;
  result: any[];
}

// 🔹 For /doctor/create/plains
export interface CreateDoctorPlainRequest {
  plainId: string;

  doctorId: string;
  patientId: string;

  doctorSubscriptionId: string;
  status: string;

  notes?: any;

  amount: string;
  paymentStatus: string;
  paymentMode: string;
}

export interface CreateDoctorPlainResponse {
  success: boolean;
  message: string;
}

/* ----------------------------- Symptom Types ----------------------------- */

export interface GetClinicSymptomsResponse {
  success: boolean;
  result: ClinicSymptomItem[];
}

/* ----------------------------- Availability Types ----------------------------- */

export interface BreakInfo {
  startTime: string;
  endTime: string;
}

export interface AvailabilityInfo {
  startTime: string;
  endTime: string;
  breaks: BreakInfo[];
}

export interface DoctorAvailabilityOnDateRequest {
  date: string; // YYYY-MM-DD
}

export interface DoctorAvailabilityOnDate {
  date: string;
  isAvailable: boolean;
  availability: AvailabilityInfo;
}

export interface DoctorAvailabilityOnDateResponse {
  success: boolean;
  result: DoctorAvailabilityOnDate[];
}

/* ----------------------------- Availability Range Types ----------------------------- */

export interface DoctorAvailabilityRangeRequest {
  doctorId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface DoctorAvailabilityRangeItem {
  date: string;
  dayOfWeek: string;
  isAvailable: boolean;
  availability: {
    startTime: string;
    endTime: string;
    breaks: BreakInfo[];
  } | null;
}

export interface DoctorAvailabilityRangeResponse {
  success: boolean;
  result: DoctorAvailabilityRangeItem[];
}

/* ----------------------------- Clinic Symptom Types ----------------------------- */

export interface CreateClinicSymptomRequest {
  name: string;
  description: string;
  status: "Active" | "Inactive";
}

export interface CreateClinicSymptomResponse {
  success?: boolean;
  message?: string;
  status?: number | string;
  result?: any;
}

export type ClinicSymptomItem = {
  id: string;
  name: string;
  description: string;
  status: string;
};

/* ✅ UpdateDoctor response safe type */
export type UpdateDoctorResponse = {
  success: boolean;
  message?: string;
  result?: any;
  raw?: string; // when server returns text (rare)
};

/* ✅ NEW: /users/get-service/{patientId}/{doctorId} types */
export type ClinicServiceDto = {
  id?: string;
  _id?: string;
  serviceName?: string;
  price?: number;
  isDeleted?: boolean;
  createdAt?: string;
  canBeBookedByPatient?: boolean;
};

export interface GetUserServiceRequest {
  patientId: string;
  doctorId: string;
}

export interface GetUserServiceResponse {
  success?: boolean;
  message?: string;
  result?: any; // response shape can vary, we safely extract in UI
}

export const doctorApi = createApi({
  reducerPath: "doctorApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Doctor", "ClinicSymptom", "User", "Clinic"],
  endpoints: (builder) => ({
    // Get Doctor Profile (current logged-in doctor)
    getDoctor: builder.query<ClinicDetailsResponse, void>({
      query: () => "/doctor/user",
      providesTags: ["Doctor"],
    }),

    // Get Doctor Profile by ID
    getDoctorById: builder.query<GetDoctorByIdResponse, string>({
      query: (doctorId) => `/doctor/single/${doctorId}`,
      providesTags: ["Doctor"],
    }),

    // 🔹 Check plans for patient + doctor
    checkDoctorPlans: builder.query<
      CheckDoctorPlansResponse,
      CheckDoctorPlansRequest
    >({
      query: ({ doctorId, patientId }) => ({
        url: "/doctor/check-plains",
        method: "GET",
        params: { doctorId, patientId },
      }),
    }),

    // 🔹 Get all plans for a doctor
    getAllDoctorPlains: builder.query<GetAllDoctorPlainsResponse, string>({
      query: (doctorId) => `/doctor/get-all-doctors-plains/${doctorId}`,
    }),

    // 🔹 Create doctor subscription (doctor/create/plains)
    createDoctorPlain: builder.mutation<
      CreateDoctorPlainResponse,
      CreateDoctorPlainRequest
    >({
      query: (body) => ({
        url: "/doctor/create/plains",
        method: "POST",
        body,
      }),
    }),

    deleteService: builder.mutation<{ success: boolean }, string>({
      query: (serviceId) => ({
        url: `/doctor/delete-service/${serviceId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Doctor"],
    }),

    // PUT /doctor/update-service/:serviceId — update a single service
    updateService: builder.mutation<
      UpdateDoctorResponse,
      { serviceId: string; body: { serviceName?: string; price?: number; currency?: string; durationDays?: number; canBeBookedByPatient?: boolean } }
    >({
      query: ({ serviceId, body }) => ({
        url: `/doctor/update-service/${serviceId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Doctor"],
    }),

    // PATCH /doctor/toggle-service/:serviceId — disable/enable a service
    toggleService: builder.mutation<
      { success: boolean; result?: any },
      { serviceId: string; action: "disable" | "enable" }
    >({
      query: ({ serviceId, action }) => ({
        url: `/doctor/toggle-service/${serviceId}`,
        method: "PATCH",
        body: { action },
      }),
      invalidatesTags: ["Doctor"],
    }),

    // ✅ Delete Leave
    deleteLeave: builder.mutation<{ success: boolean }, string>({
      query: (leaveId) => ({
        url: `/doctor/delete-leave/${leaveId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Doctor"],
    }),

    // ✅ Update Doctor Profile (FIXED: no PARSING_ERROR on empty/204 response)
    updateDoctor: builder.mutation<UpdateDoctorResponse, UpdateDoctorRequestDto>({
      query: (body) => ({
        url: "/doctor",
        method: "PUT",
        body,

        // ✅ IMPORTANT: backend may return 204/empty body
        responseHandler: async (response: Response) => {
          const text = await response.text();

          if (!text) return { success: true } as UpdateDoctorResponse;

          try {
            return JSON.parse(text) as UpdateDoctorResponse;
          } catch {
            return { success: true, raw: text } as UpdateDoctorResponse;
          }
        },
      }),
      // ✅ OPTIMIZED: Only invalidate Doctor tag during onboarding to prevent unnecessary refetches
      // User and Clinic tags are not needed since doctor profile changes don't affect them
      invalidatesTags: ["Doctor"],
    }),

    // ✅ POST /doctor/profile-update-request — request doctor profile changes
    updateDoctorProfileRequest: builder.mutation<
      UpdateDoctorResponse,
      UpdateDoctorRequestDto
    >({
      query: (body) => ({
        url: "/doctor/profile-update-request",
        method: "POST",
        body,

        responseHandler: async (response: Response) => {
          const text = await response.text();

          if (!text) return { success: true } as UpdateDoctorResponse;

          try {
            return JSON.parse(text) as UpdateDoctorResponse;
          } catch {
            return { success: true, raw: text } as UpdateDoctorResponse;
          }
        },
      }),
      invalidatesTags: ["Doctor"],
    }),

    // ✅ PUT /doctor/update-profile-image — update doctor/admin profile image
    updateDoctorProfileImage: builder.mutation<UpdateDoctorResponse, FormData>({
      query: (body) => ({
        url: "/doctor/update-profile-image",
        method: "PUT",
        body,

        responseHandler: async (response: Response) => {
          const text = await response.text();

          if (!text) return { success: true } as UpdateDoctorResponse;

          try {
            return JSON.parse(text) as UpdateDoctorResponse;
          } catch {
            return { success: true, raw: text } as UpdateDoctorResponse;
          }
        },
      }),
      // Invalidate multiple tags to auto-refresh profile data
      invalidatesTags: ["Doctor", "User", "Clinic"],
    }),

    /* ✅ POST /clinic/clinicsymptom */
    createClinicSymptom: builder.mutation<
      CreateClinicSymptomResponse,
      CreateClinicSymptomRequest
    >({
      query: (body) => ({
        url: "/clinic/clinicsymptom",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicSymptom"],
    }),

    /* ✅ GET /clinic/clinicsymptom?search=Fever */
    getClinicSymptoms: builder.query<GetClinicSymptomsResponse, string>({
      query: (search) => ({
        url: "/clinic/clinicsymptom",
        method: "GET",
        params: { search },
      }),
      providesTags: ["ClinicSymptom"],
    }),

    /* ✅ GET /doctor/availability-on-date?date=2026-01-05 */
    getDoctorAvailabilityOnDate: builder.query<
      DoctorAvailabilityOnDateResponse,
      DoctorAvailabilityOnDateRequest
    >({
      query: (params) => ({
        url: "/doctor/availability-on-date",
        method: "GET",
        params,
      }),
      providesTags: ["Doctor"],
    }),

    /* ✅ GET /doctor/availability-range?doctorId=...&startDate=...&endDate=... */
    getDoctorAvailabilityRange: builder.query<
      DoctorAvailabilityRangeResponse,
      DoctorAvailabilityRangeRequest
    >({
      query: (params) => ({
        url: "/doctor/availability-range",
        method: "GET",
        params,
      }),
    }),

    /* ✅ NEW: GET /users/get-service/{patientId}/{doctorId} */
    getUserService: builder.query<GetUserServiceResponse, GetUserServiceRequest>({
      queryFn: async (args) => {
        try {
          const { data } = await TransportLayer.execute<GetUserServiceResponse>({
            ipcMethod: "users.getService",
            ipcPayload: args,
            restConfig: {
              url: `/users/get-service/${args.patientId}/${args.doctorId}`,
              method: "GET"
            },
          });
          return { data: data ?? { result: [] } };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Doctor"],
    }),
  }),
});

export const {
  useGetDoctorQuery,
  useGetDoctorByIdQuery,
  useUpdateDoctorMutation,
  useUpdateDoctorProfileRequestMutation,
  useUpdateDoctorProfileImageMutation,
  useCheckDoctorPlansQuery,
  useLazyCheckDoctorPlansQuery,
  useGetAllDoctorPlainsQuery,
  useCreateDoctorPlainMutation,
  useDeleteServiceMutation,
  useDeleteLeaveMutation,
  useUpdateServiceMutation,
  useToggleServiceMutation,

  useCreateClinicSymptomMutation,
  useGetClinicSymptomsQuery,
  useLazyGetClinicSymptomsQuery,

  useGetDoctorAvailabilityOnDateQuery,
  useLazyGetDoctorAvailabilityOnDateQuery,
  useGetDoctorAvailabilityRangeQuery,
  useLazyGetDoctorAvailabilityRangeQuery,

  /* ✅ NEW hooks */
  useGetUserServiceQuery,
  useLazyGetUserServiceQuery,
} = doctorApi;

