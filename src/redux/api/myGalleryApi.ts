import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export interface DoctorGalleryImage {
  id: string;
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  description?: string;
  imageUrl: string;
  createdAt: string;
}

export interface DoctorGalleryPagination {
  total?: number;
  totalPages?: number;
  currentPage?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
}

export interface DoctorGalleryResponse {
  success?: boolean;
  message?: string;
  data?: DoctorGalleryImage[];
  result?: DoctorGalleryImage[];
  pagination?: DoctorGalleryPagination;
}

export interface GetDoctorGalleryArgs {
  page?: number;
  limit?: number;
}

export interface UploadDoctorGalleryImageArgs {
  description?: string;
  imageFile: File;
}

export const myGalleryApi = createApi({
  reducerPath: "myGalleryApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["MyGallery"],

  endpoints: (builder) => ({
    getDoctorGallery: builder.query<
      DoctorGalleryResponse,
      GetDoctorGalleryArgs | void
    >({
      query: (args) => ({
        url: `/appointments/get-doctor-gallery`,
        method: "GET",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 12,
        },
      }),
      providesTags: ["MyGallery"],
    }),

    getDoctorGalleryBySpecialty: builder.query<
      DoctorGalleryResponse,
      GetDoctorGalleryArgs | void
    >({
      query: (args) => ({
        url: `/appointments/get-doctor-gallery-by-specialty`,
        method: "GET",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 12,
        },
      }),
      providesTags: ["MyGallery"],
    }),

    uploadDoctorGalleryImage: builder.mutation<
      any,
      UploadDoctorGalleryImageArgs
    >({
      query: ({ description, imageFile }) => {
        const formData = new FormData();

        if (description?.trim()) {
          formData.append("description", description.trim());
        }

        formData.append("imageUrl", imageFile);

        return {
          url: `/appointments/add-doctor-gallery`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["MyGallery"],
    }),

    deleteDoctorGalleryImage: builder.mutation<any, string>({
      query: (galleryId) => ({
        url: `/appointments/delete-doctor-gallery/${galleryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["MyGallery"],
    }),
  }),
});

export const {
  useGetDoctorGalleryQuery,
  useGetDoctorGalleryBySpecialtyQuery,
  useUploadDoctorGalleryImageMutation,
  useDeleteDoctorGalleryImageMutation,
} = myGalleryApi;