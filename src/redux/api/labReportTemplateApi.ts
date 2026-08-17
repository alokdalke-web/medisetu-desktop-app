import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type LabReportTemplate = {
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

export type LabReportTemplateData = LabReportTemplate & {
  id?: string;
  labId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GetLabReportTemplateResponse = {
  success: boolean;
  data: {
    message?: string;
    defaultTemplate?: string;
    defaultColors?: LabReportTemplate;
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

export type SaveLabReportTemplateResponse = {
  success: boolean;
  message: string;
  data: {
    action: "created" | "updated";
    template: LabReportTemplateData;
  };
};

export type LabReportTemplateMetadata = {
  id: string;
  displayName: string;
  description: string;
  thumbnail: string;
};

export type ListLabReportTemplatesResponse = {
  success: boolean;
  data: LabReportTemplateMetadata[];
};

export const labReportTemplateApi = createApi({
  reducerPath: "labReportTemplateApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["LabReportTemplate"],
  endpoints: (builder) => ({
    getLabReportTemplate: builder.query<GetLabReportTemplateResponse, void>({
      query: () => ({
        url: "lab/lab-report-template",
        method: "GET",
      }),
      providesTags: ["LabReportTemplate"],
    }),

    saveLabReportTemplate: builder.mutation<
      SaveLabReportTemplateResponse,
      LabReportTemplate
    >({
      query: (templateData) => ({
        url: "lab/lab-report-template",
        method: "POST",
        body: templateData,
      }),
      invalidatesTags: ["LabReportTemplate"],
    }),

    listLabReportTemplates: builder.query<ListLabReportTemplatesResponse, void>({
      query: () => ({
        url: "lab/lab-report-templates/list",
        method: "GET",
      }),
      providesTags: ["LabReportTemplate"],
    }),
  }),
});

export const {
  useGetLabReportTemplateQuery,
  useSaveLabReportTemplateMutation,
  useListLabReportTemplatesQuery,
} = labReportTemplateApi;
