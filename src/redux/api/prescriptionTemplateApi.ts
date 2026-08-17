// src/redux/api/prescriptionTemplateApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type PrescriptionTemplate = {
  templateName: string;
  fontFamily: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
};

export type TemplateData = PrescriptionTemplate & {
  id?: string;
  doctorId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GetTemplateResponse = {
  success: boolean;
  data: {
    message?: string;
    defaultTemplate?: string;
    defaultColors?: PrescriptionTemplate;
    defaultFontFamily?: string;
    isCustom?: boolean;
    templateName?: string;
    fontFamily?: string;
    color1?: string;
    color2?: string;
    color3?: string;
    color4?: string;
    color5?: string;
    color6?: string;
    color7?: string;
    color8?: string;
    color9?: string;
    color10?: string;
  };
};

export type SaveTemplateResponse = {
  success: boolean;
  message: string;
  data: {
    action: "created" | "updated";
    template: TemplateData;
  };
};

export type TemplateInfoResponse = {
  success: boolean;
  data: {
    usingTemplate: string;
    templateType: "manual" | "doctor_html" | "prescription" | "quick-print" | "quick_print" | "quickPrint" | "default";
    updatedAt?: string;
    message?: string;
    templateName?: string;
  };
};

export type DoctorPrescriptionTypePayload = {
  templateType: "doctor_html" | "prescription";
};

export type DoctorPrescriptionTypeResponse = {
  success: boolean;
  message: string;
};

export const prescriptionTemplateApi = createApi({
  reducerPath: "prescriptionTemplateApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["PrescriptionTemplate"],
  endpoints: (builder) => ({
    getCurrentTemplateInfo: builder.query<TemplateInfoResponse, void>({
      query: () => ({
        url: "reports/template-info/current",
        method: "GET",
      }),
      providesTags: ["PrescriptionTemplate"],
    }),

    // Get doctor's template (returns default if no custom template exists)
    getDoctorTemplate: builder.query<GetTemplateResponse, void>({
      queryFn: async (_, _queryApi, _extraOptions, baseQuery) => {
        try {
          const { TransportLayer } = await import("../../services/TransportLayer");
          const response = await TransportLayer.execute<GetTemplateResponse>({
            ipcMethod: 'template.getDoctorTemplate',
            ipcPayload: {},
            preferCloud: true,
            restConfig: {
              url: 'reports/prescription-template',
              method: 'GET'
            }
          });
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } as any };
        }
      },
      providesTags: ["PrescriptionTemplate"],
    }),
    // Save (create or update) doctor's template
    saveDoctorTemplate: builder.mutation<
      SaveTemplateResponse,
      PrescriptionTemplate
    >({
      query: (templateData) => ({
        url: "reports/prescription-template",
        method: "POST",
        body: templateData,
      }),
      invalidatesTags: ["PrescriptionTemplate"],
    }),

    getTemplatePreview: builder.mutation<{ html: string }, any>({
      query: (previewData) => ({
        url: "reports/preview-prescription-template",
        method: "POST",
        body: previewData,
      }),
    }),

    setDoctorPrescriptionType: builder.mutation<
      DoctorPrescriptionTypeResponse,
      DoctorPrescriptionTypePayload
    >({
      query: (body) => ({
        url: "doctor/doctor-prescription-type",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PrescriptionTemplate"],
    }),
  }),
});

export const {
  useGetDoctorTemplateQuery,
  useSaveDoctorTemplateMutation,
  useGetTemplatePreviewMutation,
  useGetCurrentTemplateInfoQuery,
  useSetDoctorPrescriptionTypeMutation,
} = prescriptionTemplateApi;