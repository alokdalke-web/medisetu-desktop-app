// src/hooks/useDashboardInit.ts
import { useState, useEffect, useRef } from "react";

interface UseDashboardInitOptions {
  /**
   * Array of loading states from RTK Query hooks
   * Example: [isLoadingUser, isLoadingDashboard, isLoadingRevenue]
   */
  loadingStates: boolean[];
  /**
   * Minimum time to show the loader (in milliseconds)
   * Default: 3500ms (3.5 seconds)
   */
  minDisplayTime?: number;
  /**
   * Maximum time to wait for APIs (in milliseconds)
   * Default: 5000ms (5 seconds)
   */
  maxWaitTime?: number;
  /**
   * Session storage key to track if dashboard has been initialized
   * Default: 'dashboard_initialized'
   */
  sessionKey?: string;
}

interface UseDashboardInitReturn {
  /**
   * True if the loader should be displayed
   */
  showLoader: boolean;
  /**
   * True if this is the first load after login
   */
  isFirstLoad: boolean;
  /**
   * Manually reset the initialization state (for testing)
   */
  resetInit: () => void;
}

/**
 * Hook to manage dashboard initialization loader
 * 
 * This hook shows a loader on the first dashboard load after login,
 * ensuring all critical APIs have loaded before displaying the dashboard.
 * 
 * Features:
 * - Only shows on first load (tracked via sessionStorage)
 * - Waits for minimum display time to avoid flicker
 * - Waits for all critical APIs to resolve
 * - Has a maximum wait timeout for failed APIs
 * - Smooth transition to dashboard
 * 
 * @example
 * ```tsx
 * const { showLoader } = useDashboardInit({
 *   loadingStates: [
 *     isLoadingUser,
 *     isLoadingDashboard,
 *     isLoadingRevenue,
 *     isTodayLoading
 *   ]
 * });
 * 
 * if (showLoader) {
 *   return <AppLoader />;
 * }
 * ```
 */
export function useDashboardInit({
  loadingStates,
  minDisplayTime = 3500,
  maxWaitTime = 5000,
  sessionKey = 'dashboard_initialized',
}: UseDashboardInitOptions): UseDashboardInitReturn {
  const [showLoader, setShowLoader] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const maxTimeoutRef = useRef<number | null>(null);
  const minTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if this is the first load
    const hasInitialized = sessionStorage.getItem(sessionKey);
    
    if (!hasInitialized) {
      // First load - show loader
      setIsFirstLoad(true);
      setShowLoader(true);
      startTimeRef.current = Date.now();

      // Set maximum wait timeout
      maxTimeoutRef.current = setTimeout(() => {
        console.log('[Dashboard Init] Max wait time reached, hiding loader');
        setShowLoader(false);
        sessionStorage.setItem(sessionKey, 'true');
      }, maxWaitTime);

      // Set minimum display timeout
      minTimeoutRef.current = setTimeout(() => {
        console.log('[Dashboard Init] Minimum display time reached');
        // Check if APIs have finished loading
        const allLoaded = !loadingStates.some(state => state === true);
        if (allLoaded) {
          setShowLoader(false);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }, minDisplayTime);

      return () => {
        if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
        if (minTimeoutRef.current) clearTimeout(minTimeoutRef.current);
      };
    } else {
      // Not first load - don't show loader
      setIsFirstLoad(false);
      setShowLoader(false);
    }
  }, []); // Only run once on mount

  // Monitor loading states
  useEffect(() => {
    if (!isFirstLoad || !showLoader || !startTimeRef.current) {
      return;
    }

    const allLoaded = !loadingStates.some(state => state === true);
    
    if (allLoaded) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      console.log(`[Dashboard Init] All APIs loaded. Elapsed: ${elapsed}ms, Remaining: ${remaining}ms`);

      if (remaining > 0) {
        // Wait for minimum display time
        const timeout = setTimeout(() => {
          setShowLoader(false);
          sessionStorage.setItem(sessionKey, 'true');
          if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
        }, remaining);

        return () => clearTimeout(timeout);
      } else {
        // Minimum time already passed
        setShowLoader(false);
        sessionStorage.setItem(sessionKey, 'true');
        if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
      }
    }
  }, [loadingStates, showLoader, isFirstLoad, minDisplayTime, sessionKey]);

  const resetInit = () => {
    sessionStorage.removeItem(sessionKey);
    setIsFirstLoad(false);
    setShowLoader(false);
  };

  return {
    showLoader,
    isFirstLoad,
    resetInit,
  };
}
