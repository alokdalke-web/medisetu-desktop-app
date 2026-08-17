import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export interface UpdateDoctorPrescriptionTemplateRequest {
  doctorId: string;
  template: string;
}

export interface UpdateDoctorPrescriptionTemplateResponse {
  success: boolean;
  message?: string;
  result?: any;
  raw?: string;
}

export interface GetDoctorPrescriptionTemplateResponse {
  success: boolean;
  message?: string;
  result?: any;
  raw?: string;
}

export interface DeleteDoctorPrescriptionTemplateResponse {
  success: boolean;
  message?: string;
  result?: any;
  raw?: string;
}

async function parseApiResponse<T extends { success: boolean; message?: string; raw?: string }>(
  response: Response,
  successMessage: string,
  errorMessage: string,
): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {
      success: response.ok,
      message: response.ok ? successMessage : errorMessage,
    } as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      success: response.ok,
      raw: text,
      message: response.ok ? successMessage : errorMessage,
    } as T;
  }
}

export const doctorPrescriptionTemplateApi = createApi({
  reducerPath: "doctorPrescriptionTemplateApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["DoctorPrescriptionTemplate"],
  endpoints: (builder) => ({
    updateDoctorPrescriptionTemplate: builder.mutation<
      UpdateDoctorPrescriptionTemplateResponse,
      UpdateDoctorPrescriptionTemplateRequest
    >({
      query: ({ doctorId, template }) => ({
        url: `/doctor/update-doctor-prescription-template/${doctorId}`,
        method: "POST",
        body: {
          templateHtml: template,
        },
        responseHandler: (response: Response) =>
          parseApiResponse<UpdateDoctorPrescriptionTemplateResponse>(
            response,
            "Prescription template saved successfully.",
            "Failed to save prescription template.",
          ),
      }),
      invalidatesTags: ["DoctorPrescriptionTemplate"],
    }),

    getDoctorPrescriptionTemplate: builder.query<
      GetDoctorPrescriptionTemplateResponse,
      string
    >({
      query: (doctorId) => ({
        url: `/doctor/get-doctor-prescription-template/${doctorId}?_t=${Date.now()}`,
        method: "GET",
        responseHandler: (response: Response) =>
          parseApiResponse<GetDoctorPrescriptionTemplateResponse>(
            response,
            "Prescription template fetched successfully.",
            "Failed to fetch prescription template.",
          ),
      }),
      providesTags: ["DoctorPrescriptionTemplate"],
    }),

    deleteDoctorPrescriptionTemplate: builder.mutation<
      DeleteDoctorPrescriptionTemplateResponse,
      string
    >({
      query: (doctorId) => ({
        url: `/doctor/delete-doctor-prescription-template/${doctorId}`,
        method: "DELETE",
        responseHandler: (response: Response) =>
          parseApiResponse<DeleteDoctorPrescriptionTemplateResponse>(
            response,
            "Prescription template deleted successfully.",
            "Failed to delete prescription template.",
          ),
      }),
      invalidatesTags: ["DoctorPrescriptionTemplate"],
    }),
  }),
});

export const {
  useUpdateDoctorPrescriptionTemplateMutation,
  useLazyGetDoctorPrescriptionTemplateQuery,
  useGetDoctorPrescriptionTemplateQuery,
  useDeleteDoctorPrescriptionTemplateMutation,
} = doctorPrescriptionTemplateApi;