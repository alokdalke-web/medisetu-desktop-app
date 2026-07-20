import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export interface CancellationReason {
  code: string;
  displayName: string;
}

export interface ClinicCancellationPolicy {
  allowPatientCancel: boolean;
  allowDoctorCancel: boolean;
  allowReceptionistCancel: boolean;
  allowClinicAdminCancel: boolean;
  windowOnlineHours: number;
  windowOfflineHours: number;
  dailyLimitPerPatient: number;
  weeklyLimitPerPatient: number;
  monthlyLimitPerPatient: number;
  cooldownSecondsBetweenCancellations: number;
  reasonMandatory: boolean;
  allowAdditionalComments: boolean;
  minCommentLength: number;
  maxCommentLength: number;
  allowReschedule: boolean;
  maxReschedules: number;
  rescheduleWindowHours: number;
  preservePaymentOnReschedule: boolean;
  isActive: boolean;
}

export const cancellationPolicyApi = createApi({
  reducerPath: "cancellationPolicyApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["CancellationPolicy"],
  endpoints: (builder) => ({
    getCancellationReasons: builder.query<CancellationReason[], void>({
      query: () => ({
        url: "/cancellation-policy/reasons",
        method: "GET",
      }),
      transformResponse: (response: any) => {
        return response?.result ?? response?.data ?? response ?? [];
      },
    }),

    getClinicCancellationPolicy: builder.query<ClinicCancellationPolicy, void>({
      query: () => ({
        url: "/cancellation-policy/clinic",
        method: "GET",
      }),
      providesTags: ["CancellationPolicy"],
      transformResponse: (response: any) => {
        return response?.result ?? response?.data ?? response;
      },
    }),

    updateClinicCancellationPolicy: builder.mutation<
      { success: boolean; message?: string; version?: number },
      ClinicCancellationPolicy
    >({
      query: (body) => ({
        url: "/cancellation-policy/clinic",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["CancellationPolicy"],
    }),

    getDefaultCancellationPolicy: builder.query<ClinicCancellationPolicy, void>({
      query: () => ({
        url: "/cancellation-policy/default",
        method: "GET",
      }),
      transformResponse: (response: any) => {
        return response?.result ?? response?.data ?? response;
      },
    }),

    cancelAppointmentStaff: builder.mutation<
      { success: boolean; message?: string; refundStatus?: string },
      { appointmentId: string; reasonCode: string; comments?: string }
    >({
      query: ({ appointmentId, reasonCode, comments }) => ({
        url: `/cancellation-policy/appointment/${appointmentId}/cancel`,
        method: "POST",
        body: { reasonCode, comments },
      }),
    }),
  }),
});

export const {
  useGetCancellationReasonsQuery,
  useGetClinicCancellationPolicyQuery,
  useUpdateClinicCancellationPolicyMutation,
  useLazyGetDefaultCancellationPolicyQuery,
  useCancelAppointmentStaffMutation,
} = cancellationPolicyApi;
