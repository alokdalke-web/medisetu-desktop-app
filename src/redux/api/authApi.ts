// src/redux/api/authApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  AddUserDto,
  LoginDto,
  RegisterDto,
  RequestRegistrationDto,
  ResetPasswordDto,
  UserDto,
  VerifyOtpDto,
} from "../../schemas/auth";
import type {
  CheckUsernameRequest,
  CheckUsernameResponse,
  UpdateUsernameRequest,
  UpdateUsernameResponse,
} from "../../types/profile";
import { setCredentials, setMfaPending } from "../slices/authSlice";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { limitationsApi } from "./limitationsApi";
import { subscriptionApi } from "./subscriptionApi";
import { clinicApi } from "./clinicApi";
import { getAuthUser, setAuthTokens, getRefreshToken } from "../../utils/auth";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  isFirstLogin?: boolean;
  mfaRequired?: boolean;
  tempToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    userStatus: string;
    userType: string;
    pharmacyDetails: string;
    emailVerifiedAt: string;
    isFirstLogin?: boolean;
  };
}

interface SocialLoginRequest {
  provider: "google";
  idToken: string;
}

interface SocialLoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  isFirstLogin?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    userStatus: string;
    userType: string;
    emailVerifiedAt: string;
  };
}

/** Register API returns accessToken + refreshToken + user */
interface RegisterResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  isFirstLogin?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    userStatus?: string;
    userType?: string;
    pharmacyDetails?: string;
    emailVerifiedAt?: string;
    password?: null;
    isFirstLogin?: boolean;
  };
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Auth", "User"],
  endpoints: (builder) => ({
    // Login
    login: builder.mutation<LoginResponse, LoginDto>({
      query: (body) => ({
        url: "/users/login",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const response = await queryFulfilled;
          const data = (response.data as any).data || response.data;

          if (data.mfaRequired && data.tempToken) {
            dispatch(setMfaPending({ tempToken: data.tempToken }));
            return;
          }

          const { rememberMe } = arg;
          const responseIsFirstLogin =
            typeof data.isFirstLogin === "boolean"
              ? data.isFirstLogin
              : typeof data.user?.isFirstLogin === "boolean"
                ? data.user.isFirstLogin
                : undefined;

          const actualToken = data.accessToken || data.token;
          const actualRefreshToken = data.refreshToken || "";

          setAuthTokens(actualToken, actualRefreshToken, Boolean(rememberMe));

          // [Electron] Cache credentials in Main Process
          if (window.ipcAPI?.auth?.setCredentials && data.user?.id) {
            window.ipcAPI.auth.setCredentials({
              token: actualToken,
              userId: data.user.id,
            }).catch(console.error);
          }

          try {
            const fullUserData = await dispatch(
              authApi.endpoints.getUser.initiate(undefined, { forceRefetch: true })
            ).unwrap();

            const mergedIsFirstLogin =
              typeof (fullUserData as any).isFirstLogin === "boolean"
                ? (fullUserData as any).isFirstLogin
                : responseIsFirstLogin;
            const finalUser =
              typeof mergedIsFirstLogin === "boolean"
                ? { ...fullUserData, isFirstLogin: mergedIsFirstLogin }
                : fullUserData;
            dispatch(
              setCredentials({
                token: actualToken,
                refreshToken: actualRefreshToken,
                user: finalUser,
                rememberMe,
              }),
            );
          } catch (error) {
            const fallbackUser =
              typeof responseIsFirstLogin === "boolean"
                ? { ...data.user, isFirstLogin: responseIsFirstLogin }
                : data.user;
            dispatch(
              setCredentials({
                token: actualToken,
                refreshToken: actualRefreshToken,
                user: fallbackUser,
                rememberMe,
              }),
            );
          }
        } catch {
          console.log("Login failed");
        }
      },
    }),

    // Social Login (Google)
    socialLogin: builder.mutation<SocialLoginResponse, SocialLoginRequest>({
      query: (body) => ({
        url: "/users/social-login",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const response = await queryFulfilled;
          const data = (response.data as any).data || response.data;
          
          const responseIsFirstLogin =
            typeof data.isFirstLogin === "boolean"
              ? data.isFirstLogin
              : undefined;

          const actualToken = data.accessToken || data.token;
          const actualRefreshToken = data.refreshToken || "";

          setAuthTokens(actualToken, actualRefreshToken, true);

          // [Electron] Cache credentials in Main Process
          if (window.ipcAPI?.auth?.setCredentials && data.user?.id) {
            window.ipcAPI.auth.setCredentials({
              token: actualToken,
              userId: data.user.id,
            }).catch(console.error);
          }

          try {
            const fullUserData = await dispatch(
              authApi.endpoints.getUser.initiate(undefined, { forceRefetch: true })
            ).unwrap();

            const mergedIsFirstLogin =
              typeof (fullUserData as any).isFirstLogin === "boolean"
                ? (fullUserData as any).isFirstLogin
                : responseIsFirstLogin;
            const finalUser =
              typeof mergedIsFirstLogin === "boolean"
                ? { ...fullUserData, isFirstLogin: mergedIsFirstLogin }
                : fullUserData;
            dispatch(
              setCredentials({
                token: actualToken,
                refreshToken: actualRefreshToken,
                user: finalUser,
                rememberMe: true,
              }),
            );
          } catch (error) {
            const fallbackUser =
              typeof responseIsFirstLogin === "boolean"
                ? { ...data.user, isFirstLogin: responseIsFirstLogin }
                : data.user;
            dispatch(
              setCredentials({
                token: actualToken,
                refreshToken: actualRefreshToken,
                user: fallbackUser,
                rememberMe: true,
              }),
            );
          }
        } catch {
          console.log("Social login failed");
        }
      },
    }),

    // Register (Auto login using tokens from register response)
    registerUser: builder.mutation<RegisterResponse, RegisterDto>({
      query: (body) => ({
        url: "/users/register",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const response = await queryFulfilled;
          const data = (response.data as any).data || response.data;
          const responseIsFirstLogin =
            typeof data.isFirstLogin === "boolean"
              ? data.isFirstLogin
              : typeof data.user?.isFirstLogin === "boolean"
                ? data.user.isFirstLogin
                : undefined;

          const actualToken = data.accessToken || data.token;
          const actualRefreshToken = data.refreshToken || "";

          setAuthTokens(actualToken, actualRefreshToken, true);

          // [Electron] Cache credentials in Main Process
          if (window.ipcAPI?.auth?.setCredentials && data.user?.id) {
            window.ipcAPI.auth.setCredentials({
              token: actualToken,
              userId: data.user.id,
            }).catch(console.error);
          }

          try {
            const fullUserData = await dispatch(
              authApi.endpoints.getUser.initiate(undefined, { forceRefetch: true })
            ).unwrap();

            const mergedIsFirstLogin =
              typeof (fullUserData as any).isFirstLogin === "boolean"
                ? (fullUserData as any).isFirstLogin
                : responseIsFirstLogin;
            const finalUser =
              typeof mergedIsFirstLogin === "boolean"
                ? { ...fullUserData, isFirstLogin: mergedIsFirstLogin }
                : fullUserData;
            dispatch(
              setCredentials({
                token: actualToken,
                refreshToken: actualRefreshToken,
                user: finalUser,
                rememberMe: true,
              }),
            );
          } catch (error) {
            const fallbackUser =
              typeof responseIsFirstLogin === "boolean"
                ? { ...data.user, isFirstLogin: responseIsFirstLogin }
                : data.user;
            dispatch(
              setCredentials({
                token: actualToken,
                refreshToken: actualRefreshToken,
                user: fallbackUser,
                rememberMe: true,
              }),
            );
          }
        } catch {
          console.log("Register failed");
        }
      },
    }),

    requestRegistration: builder.mutation<
      { message: string },
      RequestRegistrationDto
    >({
      query: (body) => ({
        url: "/users/request-registration",
        method: "POST",
        body,
      }),
    }),

    verifyOtp: builder.mutation<{ token: string }, VerifyOtpDto>({
      query: (body) => ({
        url: "/users/verify-otp",
        method: "POST",
        body,
      }),
    }),

    addUser: builder.mutation<{ message: string }, AddUserDto>({
      query: (body) => ({
        url: "/users/adduser",
        method: "POST",
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
          dispatch(subscriptionApi.util.invalidateTags(["SubscriptionPlans", "MyAddons"]));
        } catch {
          // ignore
        }
      },
    }),

    // Get current login user — cache-first in Electron to avoid blocking UI when cloud is unreachable
    getUser: builder.query<UserDto, void>({
      queryFn: async (_, _queryApi, _extraOptions, baseQuery) => {
        const isElectron = Boolean((window as any).ipcAPI);

        if (isElectron) {
          const authUser = getAuthUser();
          if (authUser) {
            return { data: authUser as UserDto };
          }
        }

        const result = await baseQuery("/users");

        if (result.error) {
          if (result.error.status === "FETCH_ERROR") {
            const authUser = getAuthUser();
            if (authUser) {
              return { data: authUser as UserDto };
            }
          }
          return { error: result.error as any };
        }

        return { data: result.data as UserDto };
      },
      providesTags: ["User"],
    }),

    requestPasswordReset: builder.mutation<
      void,
      { email: string; captchaToken?: string }
    >({
      query: (body) => ({
        url: "/users/request-password-reset",
        method: "POST",
        body,
      }),
    }),

    resetPassword: builder.mutation<
      { success?: boolean; message?: string; email?: string } | any,
      ResetPasswordDto
    >({
      query: (body) => ({
        url: "/users/reset-password",
        method: "POST",
        body,
      }),
    }),

    sendVerification: builder.mutation<void, { email: string }>({
      query: (body) => ({
        url: "/users/send-verification",
        method: "POST",
        body,
      }),
    }),

    verifyEmail: builder.query<void, string>({
      query: (token) => `/users/verify-email/${token}`,
    }),

    updateAdminDoctorPermission: builder.mutation<
      { success: boolean; message: string },
      { isAdminDoctorAccess: boolean; speciality: string }
    >({
      query: (body) => ({
        url: "/users/update-admin-permission-to-doctor",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    updatePaymentHistoryVisibility: builder.mutation<
      { success?: boolean; message?: string; paymentVisible?: boolean },
      void
    >({
      query: () => ({
        url: "/users/update-payment-history",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),

    updateOnboardingProgress: builder.mutation<
      { success: boolean; message?: string },
      { onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; currentStep: number }
    >({
      query: (body) => ({
        url: "/users/onboarding/progress",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // Error handled by mutation caller
        }
      },
    }),

    submitOnboarding: builder.mutation<
      { success: boolean; message?: string },
      void
    >({
      query: () => ({
        url: "/users/onboarding/submit",
        method: "POST",
      }),
      invalidatesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // Error handled by mutation caller
        }
      },
    }),

    activateFreeTrial: builder.mutation<
      { success: boolean; message?: string },
      void
    >({
      query: () => ({
        url: "/users/verify-subscription",
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
          dispatch(subscriptionApi.util.invalidateTags(["SubscriptionPlans", "MyAddons"]));
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // Error handled by mutation caller
        }
      },
    }),

    // Exchange a refresh token for a new access/refresh token pair
    refreshToken: builder.mutation<RefreshTokenResponse, { refreshToken: string }>({
      query: (body) => ({
        url: "/users/refresh-token",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: RefreshTokenResponse }) =>
        response.data,
    }),

    checkUsername: builder.mutation<CheckUsernameResponse, CheckUsernameRequest>({
      query: (body) => ({
        url: "/users/check-username",
        method: "POST",
        body,
      }),
    }),

    updateUsername: builder.mutation<UpdateUsernameResponse, UpdateUsernameRequest>({
      query: (body) => ({
        url: "/users/update-username",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // Error handled by mutation caller
        }
      },
    }),

    // Revoke a refresh token, ending that session server-side
    logoutUser: builder.mutation<void, void>({
      query: () => {
        const refreshToken = getRefreshToken();
        return {
          url: "/users/logout",
          method: "POST",
          body: { refreshToken },
        };
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useSocialLoginMutation,
  useRegisterUserMutation,
  useRequestRegistrationMutation,
  useVerifyOtpMutation,
  useAddUserMutation,
  useGetUserQuery,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useSendVerificationMutation,
  useRefreshTokenMutation,
  useLogoutUserMutation,
  useVerifyEmailQuery,
  useUpdateAdminDoctorPermissionMutation,
  useUpdatePaymentHistoryVisibilityMutation,
  useUpdateOnboardingProgressMutation,
  useSubmitOnboardingMutation,
  useActivateFreeTrialMutation,
  useCheckUsernameMutation,
  useUpdateUsernameMutation,
} = authApi;
