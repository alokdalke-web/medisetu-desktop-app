/**
 * Centralized error logger.
 *
 * Currently logs to console in development.
 * Replace the implementation with Sentry, Datadog, or any error
 * tracking service when ready:
 *
 * ```
 * import * as Sentry from "@sentry/react";
 * Sentry.captureException(error, { extra: context });
 * ```
 */

type ErrorContext = {
    /** Where the error happened (e.g. "baseQuery", "appointmentApi") */
    source?: string;
    /** The API endpoint or URL that failed */
    url?: string;
    /** HTTP status or RTK error status */
    status?: string | number;
    /** Any additional metadata */
    [key: string]: unknown;
};

const IS_DEV = import.meta.env.DEV;

/**
 * Log an error with context. In production, this should send to
 * your error tracking service (Sentry, etc.)
 */
export function logError(error: unknown, context?: ErrorContext) {
    if (IS_DEV) {
        console.error("[ErrorLogger]", context?.source ?? "unknown", {
            error,
            ...context,
        });
        return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TODO: Replace with your error tracking service
    //
    // Example with Sentry:
    //   import * as Sentry from "@sentry/react";
    //   Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    //     extra: context,
    //   });
    //
    // Example with custom API:
    //   fetch("/api/v1/logs/error", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ error: String(error), ...context, timestamp: Date.now() }),
    //   }).catch(() => {});
    // ──────────────────────────────────────────────────────────────────────────

    // Fallback: log to console in production too (visible in browser devtools)
    console.error("[ErrorLogger]", context?.source ?? "unknown", {
        error,
        ...context,
    });
}

/**
 * Log a network/API failure specifically.
 * Provides structured context for debugging connectivity issues.
 */
export function logApiError(
    status: string | number,
    url: string,
    errorMessage?: string,
) {
    logError(errorMessage ?? `API request failed: ${url}`, {
        source: "api",
        url,
        status,
        online: navigator.onLine,
        timestamp: new Date().toISOString(),
    });
}
