import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export interface UploadManualTemplateRequest {
  templateImage?: File | Blob | string;
  templateHtml: string;
  printType: "With Background" | "Without Background";
}

export interface ManualTemplate {
  id?: string;
  doctorId?: string;
  /** Preview-rendered HTML returned by the backend GET endpoint.
   *  All Handlebars tokens ({{#if}}, {{/if}}, etc.) are stripped
   *  and sample data is injected — use for display ONLY. */
  templateHtml?: string;
  /** Raw template HTML as stored in the database.
   *  Contains valid Handlebars blocks — use this when writing back to the DB. */
  rawHtml?: string;
  templateImage?: string;
  templateImageUrl?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  printType?: "With Background" | "Without Background";
  [key: string]: unknown;
}

export interface ManualTemplateResponse {
  success: boolean;
  message?: string;
  result?: ManualTemplate | ManualTemplate[] | null;
  data?: ManualTemplate | ManualTemplate[] | null;
  raw?: string;
}

export interface UpdatePrintTypeRequest {
  printType: "With Background" | "Without Background";
  templateHtml?: string;
  templateImage?: string;
}

export interface UpdatePrintTypeResponse {
  success: boolean;
  message: string;
  data: {
    printType: string;
  };
}

function resolveTemplateImageUrl(response: ManualTemplateResponse): string | null {
  const container = response.data ?? response.result ?? null;

  if (!container) return null;

  const item = Array.isArray(container) ? container[0] : container;

  if (!item) return null;

  const candidate =
    item.templateImage ?? item.templateImageUrl ?? item.imageUrl;

  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function injectTemplateImageUrlIntoHtml(
  html: string,
  templateImageUrl?: string,
  printType?: "With Background" | "Without Background",
): string {
  let result = html.replace(/\r/g, "");

  // 1. Sync Print Type Classes (With Background vs Without Background)
  if (printType) {
    const isWithBackground = printType === "With Background";
    // Target the div with 'template-canvas' class
    const canvasClassRegex =
      /(<div[^>]+class=["'])([^"']*template-canvas[^"']*)(["'])/;
    const canvasMatch = result.match(canvasClassRegex);

    if (canvasMatch) {
      const [fullMatch, prefix, classes, suffix] = canvasMatch;
      let updatedClasses = classes;

      if (isWithBackground) {
        updatedClasses = updatedClasses.replace("without-image", "with-image");
        if (!updatedClasses.includes("with-image")) {
          updatedClasses += " with-image";
        }
      } else {
        updatedClasses = updatedClasses.replace("with-image", "without-image");
        if (!updatedClasses.includes("without-image")) {
          updatedClasses += " without-image";
        }
      }

      // Clean up multiple spaces and trim
      updatedClasses = updatedClasses.replace(/\s+/g, " ").trim();
      result = result.replace(
        fullMatch,
        () => `${prefix}${updatedClasses}${suffix}`
      );
    }
  }

  // 2. Sync Image URL if provided
  if (templateImageUrl) {
    const imgTagRegex = /<img[^>]+class=["'][^"']*template-image[^"']*["'][^>]*>/;
    const imgMatch = result.match(imgTagRegex);

    if (imgMatch) {
      const fullTag = imgMatch[0];
      const newTag = fullTag.replace(
        /src=["']([^"']*)["']/,
        () => `src="${templateImageUrl}"`
      );

      result = result.replace(fullTag, () => newTag);
    }
  }

  return result;
}

async function parseApiResponse<
  T extends { success: boolean; message?: string; raw?: string },
>(
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

export const manualPrescriptionApi = createApi({
  reducerPath: "manualPrescriptionApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["ManualPrescriptionTemplate"],
  endpoints: (builder) => ({
    uploadManualTemplate: builder.mutation<
      ManualTemplateResponse,
      UploadManualTemplateRequest
    >({
      queryFn: async (
        { templateImage, templateHtml, printType },
        _api,
        _extraOptions,
        fetchWithBQ,
      ) => {
        let uploadedTemplateImageUrl: string | undefined = undefined;

        // If templateImage is already a string (URL), we use it directly
        if (typeof templateImage === "string") {
          uploadedTemplateImageUrl = templateImage;
        } else if (templateImage) {
          // Otherwise if it's a File/Blob, we upload it first
          const firstRequestFormData = new FormData();

          firstRequestFormData.append("templateImage", templateImage);

          const firstRequest = await fetchWithBQ({
            url: "/doctor/update-doctor-manual-template",
            method: "POST",
            body: firstRequestFormData,
            responseHandler: (response: Response) =>
              parseApiResponse<ManualTemplateResponse>(
                response,
                "Template image uploaded successfully.",
                "Failed to upload template image.",
              ),
          });

          if (firstRequest.error) {
            return { error: firstRequest.error };
          }

          const firstRequestResponse =
            firstRequest.data as ManualTemplateResponse;

          if (!firstRequestResponse?.success) {
            return {
              data: {
                ...firstRequestResponse,
                success: false,
                message:
                  firstRequestResponse?.message ||
                  "Failed to upload template image.",
              },
            };
          }

          uploadedTemplateImageUrl =
            resolveTemplateImageUrl(firstRequestResponse) || undefined;
        }

        // Finalize HTML: Inject backend URL and Sync classes
        const finalHtml = injectTemplateImageUrlIntoHtml(
          templateHtml,
          uploadedTemplateImageUrl,
          printType,
        );

        const secondRequestFormData = new FormData();

        if (uploadedTemplateImageUrl) {
          secondRequestFormData.append("templateImage", uploadedTemplateImageUrl);
        }

        secondRequestFormData.append("templateHtml", finalHtml);
        secondRequestFormData.append("printType", printType);

        const secondRequest = await fetchWithBQ({
          url: "/doctor/update-doctor-manual-template",
          method: "POST",
          body: secondRequestFormData,
          responseHandler: (response: Response) =>
            parseApiResponse<ManualTemplateResponse>(
              response,
              "Manual template saved successfully.",
              "Failed to save manual template.",
            ),
        });

        if (secondRequest.error) {
          return { error: secondRequest.error };
        }

        return { data: secondRequest.data as ManualTemplateResponse };
      },
      invalidatesTags: ["ManualPrescriptionTemplate"],
    }),

    getManualTemplate: builder.query<ManualTemplateResponse, void>({
      query: () => ({
        url: `/doctor/get-doctor-manual-template?_t=${Date.now()}`,
        method: "GET",
        responseHandler: async (response: Response) => {
          const parsed = await parseApiResponse<ManualTemplateResponse>(
            response,
            "Manual template fetched successfully.",
            "Failed to fetch manual template.",
          );

          const normalize = (item: ManualTemplate | null | undefined) => {
            if (item?.templateHtml && typeof item.templateHtml === "string") {
              item.templateHtml = item.templateHtml.replace(/\r/g, "");
            }
          };

          if (parsed.data) {
            if (Array.isArray(parsed.data)) {
              parsed.data.forEach(normalize);
            } else {
              normalize(parsed.data);
            }
          }

          if (parsed.result) {
            if (Array.isArray(parsed.result)) {
              parsed.result.forEach(normalize);
            } else {
              normalize(parsed.result);
            }
          }

          return parsed;
        },
      }),
      providesTags: ["ManualPrescriptionTemplate"],
    }),

    deleteManualTemplate: builder.mutation<ManualTemplateResponse, void>({
      query: () => ({
        url: "/doctor/delete-doctor-manual-template",
        method: "DELETE",
        responseHandler: (response: Response) =>
          parseApiResponse<ManualTemplateResponse>(
            response,
            "Manual template deleted successfully.",
            "Failed to delete manual template.",
          ),
      }),
      invalidatesTags: ["ManualPrescriptionTemplate"],
    }),

    updatePrescriptionPrintType: builder.mutation<
      UpdatePrintTypeResponse,
      UpdatePrintTypeRequest
    >({
      queryFn: async (
        { printType, templateHtml, templateImage },
        _api,
        _extraOptions,
        fetchWithBQ,
      ) => {
        // 1. Update the print type flag in the doctor settings
        const firstRequest = await fetchWithBQ({
          url: "/doctor/doctor-prescription-print-type",
          method: "POST",
          body: { printType },
        });

        if (firstRequest.error) {
          return { error: firstRequest.error };
        }

        // 2. Second instance: Synchronize the HTML class in the database
        // This ensures the template HTML reflects the new print type
        if (templateHtml) {
          const finalHtml = injectTemplateImageUrlIntoHtml(
            templateHtml,
            templateImage,
            printType,
          );

          const secondRequestFormData = new FormData();

          if (templateImage) {
            secondRequestFormData.append("templateImage", templateImage);
          }

          secondRequestFormData.append("templateHtml", finalHtml);
          secondRequestFormData.append("printType", printType);

          const secondRequest = await fetchWithBQ({
            url: "/doctor/update-doctor-manual-template",
            method: "POST",
            body: secondRequestFormData,
            responseHandler: (response: Response) =>
              parseApiResponse<ManualTemplateResponse>(
                response,
                "Manual template saved successfully.",
                "Failed to save manual template.",
              ),
          });

          if (secondRequest.error) {
            return { error: secondRequest.error };
          }
        }

        return { data: firstRequest.data as UpdatePrintTypeResponse };
      },
      invalidatesTags: ["ManualPrescriptionTemplate"],
    }),
  }),
});

export const {
  useUploadManualTemplateMutation,
  useUploadManualTemplateMutation: useUploadDoctorManualTemplateMutation,
  useGetManualTemplateQuery,
  useLazyGetManualTemplateQuery,
  useGetManualTemplateQuery: useGetDoctorManualTemplateQuery,
  useLazyGetManualTemplateQuery: useLazyGetDoctorManualTemplateQuery,
  useDeleteManualTemplateMutation,
  useDeleteManualTemplateMutation: useDeleteDoctorManualTemplateMutation,
  useUpdatePrescriptionPrintTypeMutation,
} = manualPrescriptionApi;
