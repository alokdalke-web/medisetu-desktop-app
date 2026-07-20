import { createApi } from "@reduxjs/toolkit/query/react";
import type { UpdateAppointmentDto } from "../../schemas/appointment";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { dashboardApi } from "./dashboardApi";
import { TransportLayer } from "../../services/TransportLayer";

/* ------------------- Types ------------------- */

export type CreateAppointmentDto = {
  appointmentType?: string;
  appointmentDate?: string; // ISO or "YYYY-MM-DDTHH:mm:ssZ"
  appointmentTime?: string | null;
  appointmentNotes?: string | null;
  appointmentStatus?: string;
  clinicId?: string;
  patientId?: string;
  doctorId?: string | null;
    price?: string | number;
paymentNotes?: string | null;
  // allow backend extra fields without TS errors
  [key: string]: any;
};

interface CreateAppointmentResponse {
  result: {
    id: string;
    appointmentType: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentStatus: string;
    appointmentNotes: string | null;
    clinicId: string;
    patientId: string;
    reReasonForCancellation: string | null;
    reasionForReSchedule: string | null;
    createdAt: string;
    updatedAt: string;
    doctorId: string | null;
  };
}

interface Pagination {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface AppointmentDetails {
  id: string;
  appointmentDate: string; // ISO datetime string
  appointmentTime: string; // "HH:mm"
  appointmentType: string;
  appointmentNotes: string | null;
  appointmentStatus: string;
  price: string;
  primaryServicePrice: string;
  reReasonForCancellation: string | null;
  reasionForReSchedule: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SendManualPrescriptionNotificationPayload = {
  appointmentId: string;
  otp: string;
};

interface DoctorDetails {
  id: string;
  name: string;
  email: string;
  mobile: string;
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
  speciality: string | null;
  profileImage: string | null;
  notesMedicalHistory: string | null;
  status: string;
  updatedAt: string;
  createdAt: string;
}

interface PatientDetails {
  id: string;
  name: string;
  email: string | null;
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
  status: string;
  updatedAt: string;
  createdAt: string;
  doctor?: DoctorDetails | null;
  appointment: AppointmentDetails;
}

interface AppointmentByIDResponse {
  result: PatientDetails;
}

interface AllAppointmentsResponse {
  success?: boolean;
  message?: string;
  result: {
    patients: PatientDetails[];
    pagination: Pagination;
  };
}

interface AppointmentReportsResponse {
  success?: boolean;
  result?: any;
  [key: string]: any;
}

interface ClinicAppointmentDetailsMetric {
  count?: number;
  previousCount?: number;
  changeCount?: number;
  percentageChange?: number;
  percentageLabel?: string;
  trend?: "increase" | "decrease" | "no_change" | string;
}

interface ClinicAppointmentDetailsResponse {
  success?: boolean;
  message?: string;
  result?: {
    date?: string;
    previousDate?: string;
    totalAppointments?: ClinicAppointmentDetailsMetric;
    completed?: ClinicAppointmentDetailsMetric;
    upcoming?: ClinicAppointmentDetailsMetric;
    confirmed?: ClinicAppointmentDetailsMetric;
    patientArrived?: ClinicAppointmentDetailsMetric;
    cancelled?: ClinicAppointmentDetailsMetric;
    noShow?: ClinicAppointmentDetailsMetric;
  };
  [key: string]: any;
}

export interface AppointmentHistoryItem {
  id: string;
  appointmentId: string;
  action:
    | "CREATED"
    | "UPDATED"
    | "CONFIRMED"
    | "STATUS_CHANGED"
    | "RESCHEDULED"
    | "CANCELLED"
    | "NOTES_ADDED"
    | "REMINDER_SENT";
  performedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  previousState?: any;
  newState?: any;
  remarks: string | null;
  createdAt: string;
}

interface AppointmentHistoryResponse {
  success: boolean;
  message: string;
  data: AppointmentHistoryItem[];
}

// 🔹 Doctor slots query
interface DoctorSlotsQueryArgs {
  date: string; // "YYYY-MM-DD"
  time: string;
  doctorId: string;
}

// ✅ List appointments args (backward-compatible)
interface GetAppointmentsArgs {
  // pagination (support multiple naming styles used across screens)
  page?: number;
  pageNumber?: number;
  currentPage?: number;

  pageSize?: number;
  limit?: number;

  // search (support both)
  search?: string;
  searchBy?: string;

  startDate?: string;
  endDate?: string;
  appointmentStatus?: string;
  doctorId?: string;
}

export interface MedicalCertificateData {
  appointmentId: string;
  medicalCondition: string;
  restDays: number;
  notes: string[];
}

export interface MedicalCertificateResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    appointmentId: string;
    medicalCondition: string;
    restDays: number;
    notes: string[];
    createdAt: string;
    updatedAt: string;
  };
}

/* ------------------- small helpers ------------------- */

const pickPage = (p?: GetAppointmentsArgs) =>
  p?.pageNumber ?? p?.page ?? p?.currentPage ?? 1;

const pickPageSize = (p?: GetAppointmentsArgs) => p?.pageSize ?? p?.limit ?? 10;

/* ------------------- API ------------------- */

export const appointmentApi = createApi({
  reducerPath: "appointmentApi",
  baseQuery: baseQueryWithAutoLogout,

  // ✅ separated tags (important for no-show policy refresh)
  tagTypes: ["Appointment", "NoShowPolicy", "NoShowAnalytics"] as const,

  endpoints: (builder) => ({
    /* ---------- Get all appointments for current user ---------- */
    getUserAppointments: builder.query<
      AllAppointmentsResponse,
      GetAppointmentsArgs | undefined
    >({
      queryFn: async (params) => {
        const page = pickPage(params);
        const pageSize = pickPageSize(params);

        const search = params?.search;
        const searchBy = params?.searchBy;

        const queryParams: Record<string, any> = { page, pageSize };
        if (search) queryParams.search = search;
        if (searchBy) queryParams.searchBy = searchBy;

        return TransportLayer.execute<any>({
          ipcMethod: 'appointment.getAllUser',
          ipcPayload: queryParams,
          restConfig: {
            url: "/appointments/all/user",
            method: "GET",
            params: queryParams,
          }
        }).then(res => ({ data: res.data, meta: { source: res.meta.source } }))
        .catch(err => ({ error: { status: 'CUSTOM_ERROR', error: err.message } }));
      },
      providesTags: ["Appointment"],
    }),

    /* ---------- Get all appointments for a clinic ---------- */
    getClinicAppointments: builder.query<
      AllAppointmentsResponse,
      GetAppointmentsArgs | undefined
    >({
      queryFn: async (params) => {
        try {
          const pageNumber = pickPage(params);
          const pageSize = pickPageSize(params);
          const search = params?.search ?? params?.searchBy;
          const startDate = params?.startDate;
          const endDate = params?.endDate;
          const appointmentStatus = params?.appointmentStatus;
          const doctorId = params?.doctorId;

          const queryParams: Record<string, any> = { pageNumber, pageSize };
          if (search) queryParams.search = search;
          if (startDate) queryParams.startDate = startDate;
          if (endDate) queryParams.endDate = endDate;
          if (appointmentStatus) queryParams.appointmentStatus = appointmentStatus;
          if (doctorId) queryParams.doctorId = doctorId;

          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.getAll',
            // Pass startDate as the single parameter for SQLite filtering in Phase 3
            ipcPayload: startDate,
            restConfig: {
              url: '/appointments/all/clicnic',
              method: 'GET',
              params: queryParams
            }
          });
          
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Appointment"],
    }),

    /* ---------- Get clinic appointment details by date ---------- */
    getClinicAppointmentDetails: builder.query<
      ClinicAppointmentDetailsResponse,
      { date: string }
    >({
      queryFn: async ({ date }) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.getDetails',
            ipcPayload: date,
            restConfig: {
              url: "/appointments/details/clinic",
              method: "GET",
              params: { date },
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Appointment"],
    }),

    /* ---------- Single appointment by ID ---------- */
    getAppointmentById: builder.query<AppointmentByIDResponse, string>({
      queryFn: async (appointmentId) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.getById',
            ipcPayload: appointmentId,
            restConfig: {
              url: `/appointments/${appointmentId}`,
              method: 'GET'
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Appointment"],
    }),

    uploadAppointmentConsent: builder.mutation<
  any,
  {
    appointmentId: string;
    file: File;
    note?: string;
  }
>({
  query: ({ appointmentId, file, note }) => {
    const formData = new FormData();
    formData.append("consentFile", file);

    if (note?.trim()) {
      formData.append("note", note.trim());
    }

    return {
      url: `/appointments/consent/${appointmentId}`,
      method: "PUT",
      body: formData,
    };
  },
  invalidatesTags: ["Appointment"],
}),

    /* ---------- Reports for an appointment ---------- */
    getAppointmentReports: builder.query<AppointmentReportsResponse, string>({
      queryFn: async (appointmentId) => {
        try {
          const response = await TransportLayer.execute<AppointmentReportsResponse>({
            ipcMethod: 'appointment.getReports',
            ipcPayload: appointmentId,
            restConfig: {
              url: `/reports/card/appointments-reports`,
              method: "GET",
              params: { appointmentId },
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Appointment"],
    }),

    /* ---------- Doctor available slots by date for clinic ---------- */
    getDoctorAvailableSlots: builder.query<any, DoctorSlotsQueryArgs>({
      queryFn: async ({ date, time, doctorId }) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.getAvailableSlots',
            ipcPayload: { date, time, doctorId },
            restConfig: {
              url: `/appointments/doctor/available/slot-date-clinic/${doctorId}`,
              method: "GET",
              params: { date, time },
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      keepUnusedDataFor: 0,
    }),

    /* ---------- Create a new appointment ---------- */
    createAppointment: builder.mutation<
      CreateAppointmentResponse,
      CreateAppointmentDto
    >({
      queryFn: async (body) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.book',
            // Map the DTO to the exact args expected by the IPC handler
            ipcPayload: {
              patientId: body.patientId,
              doctorId: body.doctorId,
              date: body.appointmentDate,
              timeSlot: body.appointmentTime,
              status: body.appointmentStatus,
              serviceId: body.clinicServiceId || body.serviceId || body.clinicService,
              paymentMode: body.paymentMode,
              paymentStatus: body.paymentStatus,
              bookingSource: body.bookingSource
            },
            restConfig: {
              url: '/appointments',
              method: 'POST',
              data: body
            }
          });
          return { 
            data: { result: response.data } as any, 
            meta: { source: response.meta.source } 
          };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ["Appointment"],
      // Keep the dashboard summary cards in sync live (cross-slice refresh).
      // Only refetches active dashboard subscriptions — no-op when not mounted.
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

    /* ---------- Update an existing appointment ---------- */
updateAppointment: builder.mutation<
  CreateAppointmentResponse,
  { appointmentId: string; data: UpdateAppointmentDto | UpdateAppointmentDto[] }
>({
  queryFn: async ({ appointmentId, data }) => {
    try {
      const response = await TransportLayer.execute<any>({
        ipcMethod: 'appointment.update',
        ipcPayload: { appointmentId, data },
        restConfig: {
          url: `/appointments/${appointmentId}`,
          method: "PUT",
          data,
        }
      });
      return { data: response.data, meta: { source: response.meta.source } };
    } catch (error: any) {
      return { error: { status: 'CUSTOM_ERROR', error: error.message } };
    }
  },
  invalidatesTags: ["Appointment", "NoShowAnalytics"],
  // Status changes (Confirmed/Completed/Cancelled) affect dashboard counts,
  // revenue and the "Today's Summary" bar — refresh them live.
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

    /* ---------- Get activity history for an appointment ---------- */
    getAppointmentHistory: builder.query<AppointmentHistoryResponse, string>({
      query: (appointmentId) => ({
        url: `/appointments/${appointmentId}/history`,
        method: "GET",
      }),
      providesTags: ["Appointment"],
    }),

    /* ---------- No Show Policies ---------- */
    getNoShowPolicy: builder.query<any, void>({
      query: () => ({
        url: `/appointments/no-show/policy`,
        method: "GET",
      }),
      // ✅ separate tag so toggle/save refresh only this properly
      providesTags: ["NoShowPolicy"],
    }),

    setNoShowPolicy: builder.mutation<any, any>({
      query: (body) => ({
        url: `/appointments/no-show/policy`,
        method: "POST", // if backend expects PUT, change this to "PUT"
        body,
      }),
      // ✅ invalidate policy + analytics (if no-show settings impact analytics screens)
      invalidatesTags: ["NoShowPolicy", "NoShowAnalytics"],
    }),

    /* ---------- Mark as No Show ---------- */
    markAsNoShow: builder.mutation<
      any,
      { appointmentId: string; reason?: string }
    >({
      query: ({ appointmentId, reason }) => ({
        url: `/appointments/${appointmentId}/no-show`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Appointment", "NoShowAnalytics"],
      // No-show changes the "No Shows" stat card + alerts — refresh dashboard live.
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

    /* ---------- No Show History & Analytics ---------- */
    getPatientNoShowHistory: builder.query<any, string>({
      query: (patientId) => ({
        url: `/appointments/no-show/history/patient/${patientId}`,
        method: "GET",
      }),
      providesTags: ["NoShowAnalytics"],
    }),

    getClinicNoShowAnalytics: builder.query<
      any,
      { startDate?: string; endDate?: string; search?: string }
    >({
      query: (params) => ({
        url: `/appointments/no-show/analytics/clinic`,
        method: "GET",
        params,
      }),
      providesTags: ["NoShowAnalytics"],
    }),

    /* ---------- Patient Gallery ---------- */
    getAppointmentGallery: builder.query<
      any,
      { appointmentId: string }
    >({
      query: ({ appointmentId }) => ({
        url: `/appointments/get-patient-gallery`,
        method: "GET",
        params: { appointmentId },
      }),
      providesTags: ["Appointment"],
    }),

    getPatientGallery: builder.query<
      any,
      { patientId: string; page?: number; limit?: number }
    >({
      query: ({ patientId, page = 1, limit = 30 }) => ({
        url: `/appointments/get-patient-gallery`,
        method: "GET",
        params: { patientId, page, limit },
      }),
      providesTags: ["Appointment"],
    }),

    uploadPatientGalleryImage: builder.mutation<
      any,
      { appointmentId: string; patientId: string; description: string; imageFile: File }
    >({
      query: ({ appointmentId, patientId, description, imageFile }) => {
        const formData = new FormData();
        formData.append("appointmentId", appointmentId);
        formData.append("patientId", patientId);
        formData.append("description", description);
        formData.append("imageUrl", imageFile);

        return {
          url: `/appointments/add-patient-gallery`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Appointment"],
    }),

    deletePatientGalleryImage: builder.mutation<any, string>({
      query: (galleryId) => ({
        url: `/appointments/delete-patient-gallery/${galleryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Appointment"],
    }),

    getMedicalCertificate: builder.query<MedicalCertificateResponse, string>({
      query: (appointmentId) => ({
        url: `/appointments/medical-certificate/${appointmentId}`,
        method: "GET",
      }),
      providesTags: ["Appointment"],
    }),

    saveMedicalCertificate: builder.mutation<
      MedicalCertificateResponse,
      MedicalCertificateData
    >({
      query: (data) => ({
        url: `/appointments/medical-certificate/${data.appointmentId}`,
        method: "POST",
        body: {
          medicalCondition: data.medicalCondition,
          restDays: data.restDays,
          notes: data.notes,
        },
      }),
      invalidatesTags: ["Appointment"],
    }),

    getRemainingServices: builder.query<any, string>({
      query: (appointmentId) => ({
        url: `/appointments/get-remaining-service/${appointmentId}`,
        method: "GET",
      }),
    }),

    addMultipleServices: builder.mutation<
      any,
      {
        appointmentId: string;
        serviceIds: string[];
        paymentMode: string;
        payment_notes?: string;
      }
    >({
      queryFn: async ({ appointmentId, ...body }) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.addMultipleServices',
            ipcPayload: { appointmentId, ...body },
            restConfig: {
              url: `/appointments/multiple-service/${appointmentId}`,
              method: 'POST',
              data: body
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ["Appointment"],
      // Adding paid services affects Revenue + Pending Payments cards — refresh live.
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

    getMultipleServices: builder.query<any, string>({
      queryFn: async (appointmentId) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.getMultipleServices',
            ipcPayload: appointmentId,
            restConfig: {
              url: `/appointments/multiple-service/${appointmentId}`,
              method: 'GET'
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["Appointment"],
    }),

    sendManualPrescriptionNotification: builder.mutation<
      any,
      SendManualPrescriptionNotificationPayload
    >({
      query: ({ appointmentId, otp }) => ({
        url: `/appointments/${appointmentId}/send-manual-prescription-notification`,
        method: "POST",
        body: { otp },
      }),
    }),

    /* ---------- Queue State (Appointment Engine) ---------- */
    getQueueState: builder.query<
      any,
      { clinicId: string; doctorId?: string }
    >({
      queryFn: async ({ clinicId, doctorId }) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'appointment.getQueueState',
            ipcPayload: { clinicId, doctorId },
            restConfig: {
              url: `/appointments/queue-state`,
              method: "GET",
              params: { clinicId, ...(doctorId ? { doctorId } : {}) },
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      // Keep cached for 5 minutes — socket events override this data anyway
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetUserAppointmentsQuery,
  useGetClinicAppointmentsQuery,
  useGetClinicAppointmentDetailsQuery,
  useGetAppointmentByIdQuery,
  useGetAppointmentReportsQuery,
  useGetDoctorAvailableSlotsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useGetAppointmentHistoryQuery,
  useGetNoShowPolicyQuery,
  useSetNoShowPolicyMutation,
  useMarkAsNoShowMutation,
  useGetPatientNoShowHistoryQuery,
  useGetClinicNoShowAnalyticsQuery,
  useGetAppointmentGalleryQuery,
  useGetPatientGalleryQuery,
  useUploadPatientGalleryImageMutation,
  useDeletePatientGalleryImageMutation,
  useUploadAppointmentConsentMutation,
  useGetMedicalCertificateQuery,
  useSaveMedicalCertificateMutation,
  useGetRemainingServicesQuery,
  useLazyGetRemainingServicesQuery,
  useAddMultipleServicesMutation,
  useGetMultipleServicesQuery,
  useGetQueueStateQuery,
  useSendManualPrescriptionNotificationMutation,
} = appointmentApi;
