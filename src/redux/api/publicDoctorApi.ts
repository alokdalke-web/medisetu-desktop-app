import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import type { PublicDoctorProfile } from "../../types/doctor";

export const publicDoctorApi = createApi({
  reducerPath: "publicDoctorApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["PublicDoctor"],
  endpoints: (builder) => ({
    // GET /doctor/public/:doctorId — the whole profile page in one call
    getPublicDoctorProfile: builder.query<PublicDoctorProfile, string>({
      query: (doctorId) => `/doctor/public/${doctorId}`,
      transformResponse: (res: { data: PublicDoctorProfile }) => res.data,
      providesTags: (_res, _err, doctorId) => [
        { type: "PublicDoctor", id: doctorId },
      ],
    }),
  }),
});

export const { useGetPublicDoctorProfileQuery } = publicDoctorApi;
