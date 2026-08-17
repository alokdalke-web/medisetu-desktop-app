import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export const labDashboardApi = createApi({
  reducerPath: "labDashboardApi",
  baseQuery: baseQueryWithAutoLogout,
  endpoints: (builder) => ({
    getLabDashboard: builder.query<any, string>({
      query: (_labAssistantId) => `/test/lab-tests/matching-tests`,
    }),
  }),
});

export const { useGetLabDashboardQuery } = labDashboardApi;
