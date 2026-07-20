import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type PrescriptionPreferencePayload = {
  headerOrder: string[];
  habitList: string[];
  surgerySuggestedList: string[];
  allergyList: string[];
   diagnosisList: string[];
};

export type UpdateDoctorPreferencesRequest = {
  doctorId: string;
  data: PrescriptionPreferencePayload;
};

export type PrescriptionPreferenceResponse = {
  success: boolean;
  message?: string;
  result?: PrescriptionPreferencePayload;
};

export const prescriptionPreferenceApi = createApi({
  reducerPath: "prescriptionPreferenceApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["PrescriptionPreference"],
  endpoints: (b) => ({
    updateDoctorPreferences: b.mutation<
      PrescriptionPreferenceResponse,
      UpdateDoctorPreferencesRequest
    >({
      query: ({ doctorId, data }) => ({
        url: `/doctor/update-doctor-preferences/${doctorId}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "PrescriptionPreference", id: arg.doctorId },
      ],
    }),
  }),
});

export const { useUpdateDoctorPreferencesMutation } =
  prescriptionPreferenceApi;