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
import { setCredentials, setMfaPending } from "../slices/authSlice";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { limitationsApi } from "./limitationsApi";
import { subscriptionApi } from "./subscriptionApi";
import { clinicApi } from "./clinicApi";

interface LoginResponse {
  token: string;
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
  token: string;
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

/** ✅ Your actual register API returns token + user */
interface RegisterResponse {
  success: boolean;
  token: string;
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
          const { data } = await queryFulfilled;

          // ✅ MFA required — store temp token and stop here
          if (data.mfaRequired && data.tempToken) {
            dispatch(setMfaPending({ tempToken: data.tempToken }));
            return;
          }

          const { rememberMe } = arg;
          const storage = rememberMe ? localStorage : sessionStorage;
          const responseIsFirstLogin =
            typeof data.isFirstLogin === "boolean"
              ? data.isFirstLogin
              : typeof data.user?.isFirstLogin === "boolean"
                ? data.user.isFirstLogin
                : undefined;

          // Store token first
          storage.setItem("authToken", data.token);
          (rememberMe ? sessionStorage : localStorage).removeItem("authToken");

          // [Electron] Cache credentials in Main Process
          if (window.ipcAPI?.auth?.setCredentials && data.user?.id) {
            window.ipcAPI.auth.setCredentials({
              token: data.token,
              userId: data.user.id,
            }).catch(console.error);
          }

          // Fetch full user profile to get pharmacyDetails
          const userResponse = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/users`,
            {
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            },
          );

          if (userResponse.ok) {
            const fullUserData = (await userResponse.json()) as Record<
              string,
              unknown
            >;
            const mergedIsFirstLogin =
              typeof fullUserData.isFirstLogin === "boolean"
                ? fullUserData.isFirstLogin
                : responseIsFirstLogin;
            const finalUser =
              typeof mergedIsFirstLogin === "boolean"
                ? { ...fullUserData, isFirstLogin: mergedIsFirstLogin }
                : fullUserData;
            dispatch(
              setCredentials({
                token: data.token,
                user: finalUser,
                rememberMe,
              }),
            );
          } else {
            const fallbackUser =
              typeof responseIsFirstLogin === "boolean"
                ? { ...data.user, isFirstLogin: responseIsFirstLogin }
                : data.user;
            dispatch(
              setCredentials({
                token: data.token,
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
          const { data } = await queryFulfilled;
          const responseIsFirstLogin =
            typeof data.isFirstLogin === "boolean"
              ? data.isFirstLogin
              : undefined;

          // Always use localStorage for social login (persistent session)
          const storage = localStorage;
          storage.setItem("authToken", data.token);
          sessionStorage.removeItem("authToken");

          // Fetch full user profile (same as login flow)
          const userResponse = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/users`,
            {
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            },
          );

          if (userResponse.ok) {
            const fullUserData = (await userResponse.json()) as Record<
              string,
              unknown
            >;
            const mergedIsFirstLogin =
              typeof fullUserData.isFirstLogin === "boolean"
                ? fullUserData.isFirstLogin
                : responseIsFirstLogin;
            const finalUser =
              typeof mergedIsFirstLogin === "boolean"
                ? { ...fullUserData, isFirstLogin: mergedIsFirstLogin }
                : fullUserData;
            dispatch(
              setCredentials({
                token: data.token,
                user: finalUser,
                rememberMe: true,
              }),
            );
          } else {
            const fallbackUser =
              typeof responseIsFirstLogin === "boolean"
                ? { ...data.user, isFirstLogin: responseIsFirstLogin }
                : data.user;
            dispatch(
              setCredentials({
                token: data.token,
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

    // ✅ Register (Auto login using token from register response)
    registerUser: builder.mutation<RegisterResponse, RegisterDto>({
      query: (body) => ({
        url: "/users/register",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const responseIsFirstLogin =
            typeof data.isFirstLogin === "boolean"
              ? data.isFirstLogin
              : typeof data.user?.isFirstLogin === "boolean"
                ? data.user.isFirstLogin
                : undefined;

          // ✅ choose where to store token after signup:
          // - localStorage = stay logged in
          // - sessionStorage = logout on tab close
          const storage = localStorage;

          storage.setItem("authToken", data.token);
          sessionStorage.removeItem("authToken"); // keep only one place

          // Fetch full profile (same like login) to get pharmacyDetails etc.
          const userResponse = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/users`,
            {
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            },
          );

          if (userResponse.ok) {
            const fullUserData = (await userResponse.json()) as Record<
              string,
              unknown
            >;
            const mergedIsFirstLogin =
              typeof fullUserData.isFirstLogin === "boolean"
                ? fullUserData.isFirstLogin
                : responseIsFirstLogin;
            const finalUser =
              typeof mergedIsFirstLogin === "boolean"
                ? { ...fullUserData, isFirstLogin: mergedIsFirstLogin }
                : fullUserData;
            dispatch(
              setCredentials({
                token: data.token,
                user: finalUser,
                rememberMe: true, // since we stored in localStorage
              }),
            );
          } else {
            const fallbackUser =
              typeof responseIsFirstLogin === "boolean"
                ? { ...data.user, isFirstLogin: responseIsFirstLogin }
                : data.user;
            // fallback to response user
            dispatch(
              setCredentials({
                token: data.token,
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

    // Request registration (OTP)
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

    // Verify OTP
    verifyOtp: builder.mutation<{ token: string }, VerifyOtpDto>({
      query: (body) => ({
        url: "/users/verify-otp",
        method: "POST",
        body,
      }),
    }),

    // Add user
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

    // Get current login user
    getUser: builder.query<UserDto, void>({
      queryFn: async (_, _queryApi, _extraOptions, baseQuery) => {
        const isElectron = Boolean((window as any).ipcAPI);

        // If we are offline inside Electron, return the cached user from authSlice's localStorage
        if (isElectron && !navigator.onLine) {
          const authUserStr = localStorage.getItem("authUser");
          if (authUserStr) {
            try {
              return { data: JSON.parse(authUserStr) as UserDto };
            } catch {
              /* ignore parse errors */
            }
          }
        }

        const result = await baseQuery("/users");

        if (result.error) {
          if (result.error.status === "FETCH_ERROR") {
            const authUserStr = localStorage.getItem("authUser");
            if (authUserStr) {
              try {
                return { data: JSON.parse(authUserStr) as UserDto };
              } catch {
                /* ignore */
              }
            }
          }
          return { error: result.error as any };
        }

        return { data: result.data as UserDto };
      },
      providesTags: ["User"],
    }),

    // Request password reset
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

    // Reset password
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

    // Send email verification
    sendVerification: builder.mutation<void, { email: string }>({
      query: (body) => ({
        url: "/users/send-verification",
        method: "POST",
        body,
      }),
    }),

    // Verify email with token
    verifyEmail: builder.query<void, string>({
      query: (token) => `/users/verify-email/${token}`,
    }),

    // Update admin doctor permission
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

    // Toggle payment visibility (no payload required)
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

    // Update onboarding progress
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
          // Invalidate clinic data to refetch with updated onboarding state
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // Error handled by mutation caller
        }
      },
    }),

    // Submit onboarding for approval
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
          // Invalidate clinic data to refetch with updated state
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // Error handled by mutation caller
        }
      },
    }),

    // Activate free 1-month trial subscription
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
          // Invalidate subscription data to refetch updated status
          dispatch(subscriptionApi.util.invalidateTags(["SubscriptionPlans", "MyAddons"]));
        } catch {
          // Error handled by mutation caller
        }
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
  useVerifyEmailQuery,
  useUpdateAdminDoctorPermissionMutation,
  useUpdatePaymentHistoryVisibilityMutation,
  useUpdateOnboardingProgressMutation,
  useSubmitOnboardingMutation,
  useActivateFreeTrialMutation,
} = authApi;
