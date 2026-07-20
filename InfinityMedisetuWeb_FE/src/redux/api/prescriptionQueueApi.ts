import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  PrescriptionQueueDetailResponse,
  PrescriptionQueueListResponse,
  UpdatePrescriptionStatusRequest,
  UpdatePrescriptionStatusResponse,
} from "../../schemas/prescriptionQueue";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export const prescriptionQueueApi = createApi({
  reducerPath: "prescriptionQueueApi",
baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["PrescriptionQueue"],
  endpoints: (builder) => ({
    // getPrescriptionQueue list
    getPrescriptionQueue: builder.query<
      PrescriptionQueueListResponse,
      Record<string, unknown>
    >({
      query: (params) => ({
        url: "/pharmacy/prescription-queue/getPrescriptions",
        params,
      }),
      providesTags: ["PrescriptionQueue"],
    }),

    // getPrescriptionQueue by ID
    getPrescriptionQueueById: builder.query<
      PrescriptionQueueDetailResponse,
      string
    >({
      query: (id) => `/pharmacy/prescription-queue/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "PrescriptionQueue", id },
      ],
    }),

    // update prescription status
    updatePrescriptionStatus: builder.mutation<
      UpdatePrescriptionStatusResponse,
      UpdatePrescriptionStatusRequest
    >({
      query: ({ id, status }) => ({
        url: `/pharmacy/prescription-queue/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        "PrescriptionQueue",
        { type: "PrescriptionQueue", id },
      ],
    }),
  }),
});

export const {
  useGetPrescriptionQueueQuery,
  useGetPrescriptionQueueByIdQuery,
  useUpdatePrescriptionStatusMutation,
} = prescriptionQueueApi;
