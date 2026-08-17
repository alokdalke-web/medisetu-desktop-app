import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export const globalApi = createApi({
  reducerPath: "globalApi",
baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Global"],
  endpoints: (builder) => ({
    // Upload a single file
    uploadSingleFile: builder.mutation<any, FormData | any>({
      query: (body) => ({
        url: "/global/upload/single",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Global"],
    }),

    // Upload multiple files
    uploadMultipleFiles: builder.mutation<any, FormData | any>({
      query: (body) => ({
        url: "/global/upload/multiple",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Global"],
    }),
  }),
});

export const { useUploadSingleFileMutation, useUploadMultipleFilesMutation } =
  globalApi;
