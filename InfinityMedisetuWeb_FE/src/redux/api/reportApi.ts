import { createApi } from "@reduxjs/toolkit/query/react";
import type { createReportDto, updateReportDto } from "../../schemas/report";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { TransportLayer } from "../../services/TransportLayer";

export const reportApi = createApi({
  reducerPath: "reportApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Report"],
  endpoints: (builder) => ({
    // ---------------- Old report endpoints ----------------

    // Get all reports for a patient
    getReportsByPatientId: builder.query<createReportDto[], string>({
      query: (patientId) => `/reports/${patientId}`,
      providesTags: ["Report"],
    }),

    // Get a single report by report ID
    getReportById: builder.query<createReportDto, string>({
      query: (reportId) => `/reports/${reportId}`,
      providesTags: ["Report"],
    }),

    deleteFavouritePrescription: builder.mutation<any, string>({
  query: (id) => ({
    url: `/reports/delete-favourite-prescription/${id}`,
    method: "DELETE",
  }),
  invalidatesTags: ["Report"],
}),

    getFavouritePrescriptionsByDoctorId: builder.query<any, string>({
      query: (doctorId) => `/reports/favourite-prescription/${doctorId}`,
      providesTags: ["Report"],
    }),
    // Create a simple report (old)
    createReport: builder.mutation<createReportDto, createReportDto>({
      query: (body) => ({
        url: "/reports",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Report"],
    }),

    // Update a simple report (old)
    updateReport: builder.mutation<createReportDto, updateReportDto>({
      query: (body) => ({
        url: "/reports",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Report"],
    }),

    // ---------------- New report card + prescription ----------------

    // POST /reports/card
    // POST /reports/card
    createReportCard: builder.mutation<
      {
        reportCardId?: string;
        prescriptionId?: string;
        [key: string]: any;
      },
      {
        reportCard: any;
        prescriptions: any;
      }
    >({
      queryFn: async (body) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'report.createCard',
            ipcPayload: body,
            restConfig: {
              url: "/reports/card",
              method: "POST",
              data: body
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ["Report"],
    }),

    // PUT /reports/card/update?reportCardId=...&prescriptionId=...
    updateReportCard: builder.mutation<
      any,
      {
        reportCardId: string;
        prescriptionId: string;
        body: {
          reportCard: any;
          prescriptions: any;
        };
      }
    >({
      queryFn: async (args) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'report.updateCard',
            ipcPayload: args,
            restConfig: {
              url: `/reports/card/update?reportCardId=${args.reportCardId}&prescriptionId=${args.prescriptionId}`,
              method: "PUT",
              data: args.body
            }
          });
          return { data: response.data, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ["Report"],
    }),
  }),
});

export const {
  useGetReportsByPatientIdQuery,
  useGetReportByIdQuery,
  useCreateReportMutation,
  useUpdateReportMutation,
  useCreateReportCardMutation,
  useUpdateReportCardMutation,
  useDeleteFavouritePrescriptionMutation,
  useGetFavouritePrescriptionsByDoctorIdQuery,
} = reportApi;
