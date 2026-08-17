// src/redux/api/securityApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type ChangePasswordRequest = {
  password: string;     // old password
  newPassword: string;  // new password
};

export type ChangePasswordResponse = {
  message?: string;
  success?: boolean;
};

export const securityApi = createApi({
  reducerPath: "securityApi",
  baseQuery: baseQueryWithAutoLogout,
  endpoints: (builder) => ({
    changePassword: builder.mutation<ChangePasswordResponse, ChangePasswordRequest>({
      query: (body) => ({
        url: "users/change-password",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useChangePasswordMutation } = securityApi;
