
import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { getAuthToken } from "../../utils/auth";
import { logApiError } from "../../utils/errorLogger";
import { logout } from "../slices/authSlice";

let isLoggingOut = false;

const rawBaseQuery = fetchBaseQuery({
  // ✅ uses your env: VITE_API_BASE_URL=http://localhost:5000/api/v1
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

function getUrlFromArgs(args: string | FetchArgs) {
  return typeof args === "string" ? args : args.url;
}

// ✅ helper: treat 204/empty/non-json response as success
function isSuccessButParseError(err: any) {
  return (
    err?.status === "PARSING_ERROR" &&
    typeof err?.originalStatus === "number" &&
    err.originalStatus >= 200 &&
    err.originalStatus < 300
  );
}

const CLOUD_WHITELIST_PREFIXES = [
  "/users",
  "/subscription",
  "/subscriptions",
  "/limitations",
  "/doctor",
  "/clinic",
  "/medicine/global-medicine",
  "/medicine/search"
];

const baseQueryWithErrorHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // If we are in Electron Desktop Mode, all data fetching should generally go through the IPC TransportLayer (queryFn).
  if (typeof window !== 'undefined' && (window as any).ipcAPI) {
    const url = getUrlFromArgs(args);
    const cleanUrl = url.split("?")[0];
    
    // Check if this route is allowed to bypass the interceptor and go to the cloud
    const isWhitelisted = CLOUD_WHITELIST_PREFIXES.some(prefix => cleanUrl.includes(prefix));

    if (!isWhitelisted) {
      console.warn(`[Electron Sync] Intercepted unported REST call to prevent offline crash: ${url}`);
      return {
        error: {
          status: "FETCH_ERROR",
          error: "Unported API endpoint intercepted in Offline Mode."
        }
      } as any;
    }

    // It is whitelisted. Let's ensure the user is actually online before allowing it to proceed.
    if (!navigator.onLine) {
       return {
        error: {
          status: "FETCH_ERROR",
          error: "Internet connection required for this action."
        }
      } as any;
    }
  }

  const result = await rawBaseQuery(args, api, extraOptions);

  // ✅ Network failure — backend is unreachable
  if (result.error?.status === "FETCH_ERROR") {
    const url = getUrlFromArgs(args);
    logApiError("FETCH_ERROR", url, (result.error as any)?.error);

    // Notify the NetworkStatusBanner
    window.dispatchEvent(new CustomEvent("server-unreachable"));

    return {
      error: {
        status: "FETCH_ERROR",
        error: navigator.onLine
          ? "Server is temporarily unavailable. Please try again in a moment."
          : "You appear to be offline. Check your internet connection.",
      },
    } as any;
  }

  // ✅ FIX 1: If server returned 2xx but body is empty/non-json => PARSING_ERROR
  // Convert it into success so `.unwrap()` won't reject.
  if (result.error && isSuccessButParseError(result.error as any)) {
    return { data: { success: true } } as any;
  }

  const status = result.error?.status;
  const token = getAuthToken();

  // ✅ Log 5xx server errors for monitoring
  if (typeof status === "number" && status >= 500) {
    const url = getUrlFromArgs(args);
    const errData = (result.error as any)?.data;
    logApiError(status, url, errData?.message || `Server error ${status}`);
  }

  // ✅ Skip logout for auth routes (login/register etc.)
  const url = getUrlFromArgs(args);
  const isAuthRoute =
    url.includes("/users/login") ||
    url.includes("/users/social-login") ||
    url.includes("/users/register") ||
    url.includes("/users/request-registration") ||
    url.includes("/users/verify-otp") ||
    url.includes("/users/verify-email") ||
    url.includes("/users/request-password-reset") ||
    url.includes("/users/reset-password") ||
    url.includes("/mfa/verify-login") ||
    url.includes("/mfa/recovery-login");

  // ✅ If 401 + token exists => expired/invalid token => force logout
  if (status === 401 && token && !isAuthRoute && !isLoggingOut) {
    isLoggingOut = true;

    api.dispatch(logout());

    sessionStorage.setItem(
      "postLoginToast",
      JSON.stringify({
        title: "Session Expired",
        description: "Your session has expired. Please login again.",
        color: "warning",
      }),
    );

    if (window.location.pathname !== "/app/login") {
      // udit: changed path to /app/login
      window.location.replace("/app/login");
    }

    setTimeout(() => {
      isLoggingOut = false;
    }, 0);
  }

  // ✅ If 403 + "account not active" message => force logout
  if (status === 403 && token && !isAuthRoute && !isLoggingOut) {
    const errorData = (result.error as any)?.data;
    const message = String(errorData?.message ?? "").toLowerCase();

    if (message.includes("account is not active")) {
      isLoggingOut = true;

      api.dispatch(logout());

      sessionStorage.setItem(
        "postLoginToast",
        JSON.stringify({
          title: "Account Not Active",
          description: "Your account is not active. Please contact support.",
          color: "danger",
        }),
      );

      if (window.location.pathname !== "/app/login") {
        window.location.replace("/app/login");
      }

      setTimeout(() => {
        isLoggingOut = false;
      }, 0);
    }
  }

  // ✅ If 403 for pharmacy endpoints => force logout and redirect with response message
  if (status === 403 && token && !isAuthRoute && !isLoggingOut) {
    const errorData = (result.error as any)?.data;
    const responseMessage = errorData?.message || "Your clinic subscription has expired. Access denied.";

    const cleanUrl = url.replace(/^\/+/, "").split("?")[0];
    const pharmacyEndpoints = [
      "pharmacies/dashboard/summary",
      "pharmacies/dashboard/sales-overview",
      "pharmacies/prescription/get-prescriptions",
      "pharmacies/patient-subscription/get-patient-subscriptions-notification",
      "pharmacies/medicine/get-all-medicines",
      "pharmacies/stock/get-all-stock",
      "pharmacies/sales/get-all-sales",
      "pharmacies/supplier/get-all-supplier",
      "lab/appointment-tests",
    ];

    if (pharmacyEndpoints.includes(cleanUrl)) {
      isLoggingOut = true;

      api.dispatch(logout());

      const title = responseMessage.toLowerCase().includes("subscription")
        ? "Subscription Expired"
        : "Access Denied";

      sessionStorage.setItem(
        "postLoginToast",
        JSON.stringify({
          title,
          description: responseMessage,
          color: "danger",
        }),
      );

      if (window.location.pathname !== "/app/login") {
        window.location.replace("/app/login");
      }

      setTimeout(() => {
        isLoggingOut = false;
      }, 0);
    }
  }

  return result;
};

// ✅ Wrap with retry — auto-retries network failures and 5xx errors
export const baseQueryWithAutoLogout = retry(baseQueryWithErrorHandling, {
  maxRetries: 3,
});
