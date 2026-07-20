import { useEffect, useRef, useState } from "react";

/**
 * Displays a non-intrusive banner when the network is offline
 * or the backend server is unreachable.
 * Auto-dismisses and reloads the page when connectivity is restored
 * so all data is fresh.
 */
export function NetworkStatusBanner() {
    const isElectron = Boolean((window as any).ipcAPI);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [serverDown, setServerDown] = useState(false);
    const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasFailedOnce = useRef(false);

    // Completely disable this banner in Electron mode because of the Offline-First architecture.
    // The Sync Engine will handle network connectivity in the background without disturbing the user.
    if (isElectron) return null;

    useEffect(() => {
        const goOffline = () => setIsOffline(true);
        const goOnline = () => {
            setIsOffline(false);
            checkServer();
        };

        window.addEventListener("offline", goOffline);
        window.addEventListener("online", goOnline);
        return () => {
            window.removeEventListener("offline", goOffline);
            window.removeEventListener("online", goOnline);
        };
    }, []);

    useEffect(() => {
        const onFetchFail = () => {
            if (!hasFailedOnce.current) {
                hasFailedOnce.current = true;
                setServerDown(true);
                startHealthCheck();
            }
        };

        window.addEventListener("server-unreachable", onFetchFail);
        return () => window.removeEventListener("server-unreachable", onFetchFail);
    }, []);

    const checkServer = async () => {
        try {
            // Handles both absolute (http://localhost:5000/api/v1) and relative (/api/v1) URLs
            const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
            const isAbsolute = baseUrl.startsWith("http");
            const serverRoot = isAbsolute
                ? new URL(baseUrl).origin
                : window.location.origin;

            const res = await fetch(`${serverRoot}/api/health`, {
                method: "GET",
                cache: "no-store",
                signal: AbortSignal.timeout(5000),
            });

            if (res.ok || res.status < 500) {
                setServerDown(false);
                hasFailedOnce.current = false;
                stopHealthCheck();

                // ✅ Server is back — reload the page to get fresh data
                window.location.reload();
            }
        } catch {
            setServerDown(true);
        }
    };

    const startHealthCheck = () => {
        if (checkInterval.current) return;
        checkInterval.current = setInterval(checkServer, 10000);
    };

    const stopHealthCheck = () => {
        if (checkInterval.current) {
            clearInterval(checkInterval.current);
            checkInterval.current = null;
        }
    };

    useEffect(() => {
        return () => stopHealthCheck();
    }, []);

    if (!isOffline && !serverDown) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-red-500 px-4 py-2.5 text-center text-sm font-medium text-white shadow-md"
        >
            {isOffline ? (
                <>
                    <span aria-hidden="true">📡</span>
                    <span>You&apos;re offline. Please check your internet connection.</span>
                </>
            ) : (
                <>
                    <span aria-hidden="true">⚠️</span>
                    <span>
                        Server is temporarily unavailable. We&apos;ll reconnect
                        automatically.
                    </span>
                </>
            )}
        </div>
    );
}

export default NetworkStatusBanner;
