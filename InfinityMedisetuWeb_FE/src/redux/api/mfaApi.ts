// src/redux/api/mfaApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { getAuthToken } from "../../utils/auth";

/* ─── Request Types ─── */
export interface VerifyLoginRequest {
  totpCode: string;
}

export interface RecoveryLoginRequest {
  recoveryCode: string;
}

export interface VerifyEnrollmentRequest {
  totpCode: string;
}

export interface DisableMfaRequest {
  password: string;
}

export interface RegenerateRecoveryRequest {
  totpCode: string;
}

/* ─── Response Types ─── */
export interface MfaVerifyLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Record<string, unknown>;
  data?: {
    token?: string;
    user?: Record<string, unknown>;
  };
}

export interface MfaRecoveryLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Record<string, unknown>;
  data?: {
    token?: string;
    user?: Record<string, unknown>;
    remainingCodes?: number;
    warning?: string | null;
  };
}

export interface MfaEnableResponse {
  success: boolean;
  message: string;
  data: {
    otpauthUri: string;
    base32Secret: string;
  };
}

export interface MfaVerifyEnrollmentResponse {
  success: boolean;
  message: string;
  data: {
    recoveryCodes: string[];
  };
}

export interface MfaStatusResponse {
  success: boolean;
  data: {
    mfaEnabled: boolean;
    recoveryCodesRemaining: number;
    lastModifiedAt: string | null;
  };
}

export interface MfaDisableResponse {
  success: boolean;
  message: string;
}

export interface MfaRegenerateResponse {
  success: boolean;
  message: string;
  data: {
    recoveryCodes: string[];
  };
}

/* ─── Base query for MFA login endpoints (uses tempToken from state) ─── */
const mfaTempTokenBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const tempToken = state.auth.tempToken;
    if (tempToken) {
      headers.set("Authorization", `Bearer ${tempToken}`);
    }
    return headers;
  },
});

/* ─── Base query for MFA management endpoints (uses full JWT) ─── */
const mfaAuthBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/* ─── MFA API (login verification — uses temp token) ─── */
export const mfaLoginApi = createApi({
  reducerPath: "mfaLoginApi",
  baseQuery: mfaTempTokenBaseQuery,
  endpoints: (builder) => ({
    verifyMfaLogin: builder.mutation<MfaVerifyLoginResponse, VerifyLoginRequest>(
      {
        query: (body) => ({
          url: "/mfa/verify-login",
          method: "POST",
          body,
        }),
      }
    ),

    recoveryLogin: builder.mutation<
      MfaRecoveryLoginResponse,
      RecoveryLoginRequest
    >({
      query: (body) => ({
        url: "/mfa/recovery-login",
        method: "POST",
        body,
      }),
    }),
  }),
});

/* ─── MFA API (management — uses full JWT) ─── */
export const mfaManagementApi = createApi({
  reducerPath: "mfaManagementApi",
  baseQuery: mfaAuthBaseQuery,
  tagTypes: ["MfaStatus"],
  endpoints: (builder) => ({
    getMfaStatus: builder.query<MfaStatusResponse, void>({
      query: () => "/mfa/status",
      providesTags: ["MfaStatus"],
    }),

    enableMfa: builder.mutation<MfaEnableResponse, void>({
      query: () => ({
        url: "/mfa/enable",
        method: "POST",
      }),
    }),

    verifyEnrollment: builder.mutation<
      MfaVerifyEnrollmentResponse,
      VerifyEnrollmentRequest
    >({
      query: (body) => ({
        url: "/mfa/verify-enrollment",
        method: "POST",
        body,
      }),
      invalidatesTags: ["MfaStatus"],
    }),

    disableMfa: builder.mutation<MfaDisableResponse, DisableMfaRequest>({
      query: (body) => ({
        url: "/mfa/disable",
        method: "POST",
        body,
      }),
      invalidatesTags: ["MfaStatus"],
    }),

    regenerateRecovery: builder.mutation<
      MfaRegenerateResponse,
      RegenerateRecoveryRequest
    >({
      query: (body) => ({
        url: "/mfa/regenerate-recovery",
        method: "POST",
        body,
      }),
      invalidatesTags: ["MfaStatus"],
    }),
  }),
});

export const { useVerifyMfaLoginMutation, useRecoveryLoginMutation } =
  mfaLoginApi;

export const {
  useGetMfaStatusQuery,
  useEnableMfaMutation,
  useVerifyEnrollmentMutation,
  useDisableMfaMutation,
  useRegenerateRecoveryMutation,
} = mfaManagementApi;
