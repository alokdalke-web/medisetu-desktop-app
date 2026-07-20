/**
 * Extracts a user-friendly error message from RTK Query error objects.
 * Handles network failures, timeouts, and server errors gracefully.
 */
export function getApiErrorText(
    err: unknown,
    fallback = "Something went wrong.",
): string {
    if (!err) return fallback;

    if (typeof err === "object" && err && "status" in err) {
        const typed = err as {
            status: unknown;
            error?: string;
            data?: { errors?: { message?: string }[]; message?: string };
        };

        // Network failure — backend unreachable
        if (typed.status === "FETCH_ERROR") {
            return (
                typed.error || "Unable to reach the server. Please try again later."
            );
        }

        // Timeout
        if (typed.status === "TIMEOUT_ERROR") {
            return "Request timed out. Please try again.";
        }

        // Server returned structured error
        const data = typed.data;
        if (data?.errors?.[0]?.message) return data.errors[0].message;
        if (data?.message) return data.message;

        // Generic status code
        if (typeof typed.status === "number") {
            return `Request failed (${typed.status}).`;
        }

        return fallback;
    }

    if ((err as { message?: string })?.message) {
        return (err as { message: string }).message;
    }

    return fallback;
}

/**
 * Returns true if the error is a network connectivity issue
 * (backend down or user offline). Use this to suppress
 * individual error toasts when the NetworkStatusBanner is visible.
 */
export function isNetworkError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    return (err as { status?: unknown }).status === "FETCH_ERROR";
}
