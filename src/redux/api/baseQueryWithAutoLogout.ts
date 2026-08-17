
import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import {
  getAuthToken,
  getRefreshToken,
  setAuthTokens,
} from "../../utils/auth";
import { logApiError } from "../../utils/errorLogger";
import { logout, setTokens } from "../slices/authSlice";
import { getBackendUrlAsync } from "../../utils/config";

let isLoggingOut = false;

// Dedupes concurrent 401s: the first one triggers the refresh call, the rest
// await the same in-flight promise instead of firing their own.
// null token          => refresh truly rejected (invalid/expired refresh token) => caller should log out.
// "transient" sentinel => refresh call itself failed (network/5xx/timeout)      => caller should NOT log out.
const TRANSIENT_FAILURE = Symbol("transient-refresh-failure");
let refreshPromise: Promise<string | typeof TRANSIENT_FAILURE | null> | null =
  null;

// Refresh tokens live in localStorage, which is shared across every tab of
// the same browser, but each tab has its own JS heap — the `refreshPromise`
// dedup above only protects one tab. Without this lock, two tabs whose
// access tokens expire close together both rotate the SAME refresh token at
// once; the backend's one-active-session-per-platform model deletes the
// loser's row, so that tab gets a hard "session expired" logout even though
// the other tab just refreshed successfully. This lock makes losing tabs
// wait for the winner's new token instead of racing the backend.
const REFRESH_LOCK_KEY = "authRefreshLock";
const REFRESH_LOCK_TTL_MS = 8000;

function acquireRefreshLock(): boolean {
  const now = Date.now();
  const existing = localStorage.getItem(REFRESH_LOCK_KEY);
  if (existing) {
    const ts = Number(existing);
    if (!Number.isNaN(ts) && now - ts < REFRESH_LOCK_TTL_MS) {
      return false;
    }
  }
  localStorage.setItem(REFRESH_LOCK_KEY, String(now));
  return true;
}

function releaseRefreshLock() {
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

// Waits for whichever tab holds the refresh lock to finish, then adopts
// whatever token it wrote to localStorage instead of firing a second
// refresh request. Resolves TRANSIENT_FAILURE (never a hard logout) if the
// other tab doesn't finish within the lock TTL — the caller just surfaces
// the original 401 and the next request retries.
function waitForTokenFromOtherTab(
  previousAccessToken: string | null,
): Promise<string | typeof TRANSIENT_FAILURE | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("storage", onStorage);
      resolve(TRANSIENT_FAILURE);
    }, REFRESH_LOCK_TTL_MS + 1000);

    function finish(result: string | typeof TRANSIENT_FAILURE | null) {
      clearTimeout(timeout);
      window.removeEventListener("storage", onStorage);
      resolve(result);
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== "authToken" && e.key !== REFRESH_LOCK_KEY) return;

      const newToken = getAuthToken();
      if (newToken && newToken !== previousAccessToken) {
        finish(newToken);
      } else if (e.key === REFRESH_LOCK_KEY && e.newValue === null) {
        // Lock released but token never changed. This is ambiguous — the
        // other tab's refresh could have been genuinely rejected, or just
        // hit a transient network/5xx failure. Don't guess "logout": the
        // owning tab already handles a real rejection itself (dispatches
        // logout + redirects), so treat this as transient here too and let
        // the next request retry rather than risk a false logout.
        finish(TRANSIENT_FAILURE);
      }
    }

    window.addEventListener("storage", onStorage);
  });
}

async function refreshAccessToken(
  dispatch: (action: unknown) => void,
): Promise<string | typeof TRANSIENT_FAILURE | null> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) return null;

  if (!refreshPromise) {
    if (!acquireRefreshLock()) {
      const previousAccessToken = getAuthToken();
      refreshPromise = waitForTokenFromOtherTab(previousAccessToken).finally(
        () => {
          refreshPromise = null;
        },
      );
      return refreshPromise;
    }

    refreshPromise = (async () => {
      let response: Response;
      try {
        response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/users/refresh-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
          },
        );
      } catch {
        // Network error / offline / timeout reaching the refresh endpoint —
        // not proof the session is invalid, so don't force a logout for it.
        return TRANSIENT_FAILURE;
      }

      try {
        if (!response.ok) {
          // Only a 401/403 means the backend actually rejected this refresh
          // token (see TokenService.rotateRefreshToken). A 5xx/408/429 etc.
          // is a transient failure of the refresh call itself.
          return response.status === 401 || response.status === 403
            ? null
            : TRANSIENT_FAILURE;
        }

        const body = (await response.json()) as {
          data?: { accessToken?: string; refreshToken?: string };
        };
        const newAccessToken = body.data?.accessToken;
        const newRefreshToken = body.data?.refreshToken;
        if (!newAccessToken || !newRefreshToken) return TRANSIENT_FAILURE;

        const persistent = Boolean(localStorage.getItem("authToken"));
        setAuthTokens(newAccessToken, newRefreshToken, persistent);
        dispatch(
          setTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          }),
        );
        return newAccessToken;
      } catch {
        // Response received but couldn't be parsed — treat as transient.
        return TRANSIENT_FAILURE;
      } finally {
        refreshPromise = null;
        releaseRefreshLock();
      }
    })();
  }

  return refreshPromise;
}

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

const CORE_LOCAL_ENDPOINTS = [
  "/patient",
  "/appointments",
  "/prescriptions",
  "/reports/card",
];

const baseQueryWithErrorHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseUrl = await getBackendUrlAsync();

  // If we are in Electron Desktop Mode, all data fetching should generally go through the IPC TransportLayer (queryFn).
  if (typeof window !== "undefined" && (window as any).ipcAPI) {
    const url = getUrlFromArgs(args);
    const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
    const cleanUrl = normalizedUrl.split("?")[0];

    // Check if this route is a core local endpoint that shouldn't be hitting the REST API in Electron mode
    const isCoreLocal = CORE_LOCAL_ENDPOINTS.some(
      (prefix) =>
        cleanUrl === prefix ||
        cleanUrl.startsWith(`${prefix}/`) ||
        cleanUrl.startsWith(`${prefix}?`),
    );

    if (isCoreLocal) {
      console.warn(
        `[Electron Sync] Intercepted core local REST call: ${url}. This should have been handled by IPC queryFn.`,
      );
      return {
        error: {
          status: "FETCH_ERROR",
          error:
            "This action is only supported via the local Desktop App database.",
        },
      } as any;
    }

    // It is NOT a core local endpoint, so we route it to the cloud.
    // Let's ensure the user is actually online before allowing it to proceed.
    if (!navigator.onLine) {
      retry.fail({
        status: "FETCH_ERROR",
        error: "Internet connection required for this action.",
      });
    }

    // In Electron, if we already know the cloud is down (via ConnectivityStateService), fail fast.
    if ((window as any).ipcAPI?.connectivity) {
      try {
        const state = await (window as any).ipcAPI.connectivity.getState();
        if (state !== 'online') {
          retry.fail({
            status: "FETCH_ERROR",
            error: "Cloud connection unavailable in offline mode.",
          });
        }
      } catch (e) {
        console.warn("Failed to check connectivity state:", e);
      }
    }
  }

  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    timeout: 8000,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  });

  const result = await rawBaseQuery(args, api, extraOptions);

  // ✅ Network failure — backend is unreachable
  if (result.error?.status === "FETCH_ERROR") {
    const url = getUrlFromArgs(args);
    logApiError("FETCH_ERROR", url, (result.error as any)?.error);

    // Notify the NetworkStatusBanner
    window.dispatchEvent(new CustomEvent("server-unreachable"));

    const isElectron = typeof window !== "undefined" && (window as any).ipcAPI;
    const errObj = {
      status: "FETCH_ERROR",
      error:
        navigator.onLine && !isElectron
          ? "Server is temporarily unavailable. Please try again in a moment."
          : "You appear to be offline. Check your internet connection.",
    };

    // In Electron Desktop App, a FETCH_ERROR generally means the main cloud server is unreachable.
    // Retrying 3 times with an 8-second timeout each time creates a massive 24-second UI hang.
    // Therefore, if we are in Electron, or if the OS strictly reports we are offline, fail immediately.
    if (!navigator.onLine || isElectron) {
      retry.fail(errObj);
    }

    return { error: errObj } as any;
  }

  // ✅ FIX 1: If server returned 2xx but body is empty/non-json => PARSING_ERROR
  // Convert it into success so `.unwrap()` won't reject.
  if (result.error && isSuccessButParseError(result.error as any)) {
    return { data: { success: true } } as any;
  }

  // ✅ 502 Bad Gateway: proxy/load-balancer returned a non-JSON HTML error
  // page because the upstream app server is down. This is the only case
  // (besides the FETCH_ERROR above) that triggers the NetworkStatusBanner —
  // not other 5xx/4xx API errors.
  const originalStatus = (result.error as any)?.originalStatus;
  if (result.error?.status === "PARSING_ERROR" && originalStatus === 502) {
    const url = getUrlFromArgs(args);
    logApiError(502, url, "Bad Gateway (non-JSON response)");

    window.dispatchEvent(new CustomEvent("server-unreachable"));

    return {
      error: {
        status: "FETCH_ERROR",
        error: "Server is temporarily unavailable. Please try again in a moment.",
      },
    } as any;
  }

  // RTK's `retry()` wrapper (below) retries ANY returned error by default —
  // fine for FETCH_ERROR/502 (genuinely transient), but a plain 400/403/404/
  // 422 etc. would otherwise get retried 3 times for nothing. Anything that
  // reaches this helper is a final answer as far as this function's concerned.
  const finalize = (r: typeof result) => {
    const s = r.error?.status;
    if (typeof s === "number" && s < 500) {
      retry.fail(r.error);
    }
    return r;
  };

  const status = result.error?.status;
  const token = getAuthToken();

  // ✅ Log 5xx server errors for monitoring
  if (typeof status === "number" && status >= 500) {
    const url = getUrlFromArgs(args);
    const errData = (result.error as any)?.data;
    logApiError(status, url, errData?.message || `Server error ${status}`);
  }

  // ✅ Skip logout/refresh for auth routes (login/register/refresh/logout etc.)
  const url = getUrlFromArgs(args);
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  const isAuthRoute =
    normalizedUrl.includes("/users/login") ||
    normalizedUrl.includes("/users/social-login") ||
    normalizedUrl.includes("/users/register") ||
    normalizedUrl.includes("/users/request-registration") ||
    normalizedUrl.includes("/users/verify-otp") ||
    normalizedUrl.includes("/users/verify-email") ||
    normalizedUrl.includes("/users/request-password-reset") ||
    normalizedUrl.includes("/users/reset-password") ||
    normalizedUrl.includes("/users/refresh-token") ||
    normalizedUrl.includes("/users/logout") ||
    normalizedUrl.includes("/mfa/verify-login") ||
    normalizedUrl.includes("/mfa/recovery-login");

  // ✅ If 401 + token exists => try a silent refresh-and-retry once before
  // treating the session as terminated.
  if (status === 401 && token && !isAuthRoute && !isLoggingOut) {
    const refreshResult = await refreshAccessToken(api.dispatch);

    if (refreshResult && refreshResult !== TRANSIENT_FAILURE) {
      return finalize(await rawBaseQuery(args, api, extraOptions));
    }

    // Refresh call itself failed (network/5xx) rather than being rejected —
    // surface this request's original 401 but don't tear down the session;
    // the next request can retry the refresh once connectivity recovers.
    if (refreshResult === TRANSIENT_FAILURE) {
      return finalize(result);
    }

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

  return finalize(result);
};

// ✅ Wrap with retry — auto-retries network failures and 5xx errors
export const baseQueryWithAutoLogout = retry(baseQueryWithErrorHandling, {
  maxRetries: 3,
});
