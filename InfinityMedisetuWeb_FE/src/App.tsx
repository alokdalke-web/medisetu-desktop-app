import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLoaderProvider } from "./components/common/AppLoaderContext";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";

import AppRoutes from "./routes/AppRoutes";
import { NetworkStatusBanner } from "./components/shared/NetworkStatusBanner";
import { OfflineModeBanner } from "./components/shared/OfflineModeBanner";
import { connectSocket } from "./services/socket";
import { useSocketNotifications } from "./hooks/useSocketNotifications";
import { useLocalSocketNotifications } from "./hooks/useLocalSocketNotifications";
import type { RootState } from "./redux/store";
import { SiteTour } from "./components/shared/TourGuide";
import { checkTourCompleted, markTourCompleted } from "./utils/cookies";
import { useGetAllClinicsQuery } from "./redux/api/clinicApi";
import { initGA, trackPageView } from "./utils/analytics";
import { LimitationsProvider } from "./components/LimitationsProvider";
import CookieConsentBanner from "./components/shared/CookieConsentBanner";
import { isCategoryAllowed } from "./utils/cookieConsent";

const normalizeStatus = (status?: string | null) =>
  String(status || "").trim().toLowerCase();

function App() {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [runTour, setRunTour] = useState(false);
  const [pendingTourStart, setPendingTourStart] = useState(false);
  const [pendingTourTarget, setPendingTourTarget] = useState<string | null>(
    null,
  );
  const [stripTourParamAfterStart, setStripTourParamAfterStart] =
    useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuth = !!token;
  const userId = user?.id;
  const userType = (user as unknown as { userType?: string } | null)?.userType;
  const isFirstLogin = (user as unknown as { isFirstLogin?: boolean } | null)
    ?.isFirstLogin;

  const { data: clinics } = useGetAllClinicsQuery(undefined, {
    skip: userType !== "Admin",
  });

  // [Electron] Sync credentials to the main process on load/login
  useEffect(() => {
    if (token && userId && window.ipcAPI?.auth?.setCredentials) {
      window.ipcAPI.auth.setCredentials({ token, userId }).catch(console.error);
    }
  }, [token, userId]);

  const tourEntryRoute = useMemo(() => {
    if (userType === "Lab_Assistant") return "/lab/dashboard";
    if (userType === "Pharmacist") return "/pharmacy/dashboard";
    return "/dashboard";
  }, [userType]);

  const tourEntryTarget = useMemo(() => {
    if (userType === "Doctor") return "#tour-doctor-consultation-board";
    if (userType === "Receptionist") return "#tour-reception-dashboard-overview";
    if (userType === "Lab_Assistant") return "#tour-lab-dashboard-stats";
    if (userType === "Pharmacist") return "#tour-pharmacy-dashboard-overview";
    return "#tour-dashboard";
  }, [userType]);

  // 🎉 Check for first-time visitor (only for logged-in users)
  useEffect(() => {
    if (runTour || pendingTourStart) return;

    const urlParams = new URLSearchParams(location.search);
    const forceTour = urlParams.get("tour") === "true";

    // ⚠️ TEMPORARY TESTING BEHAVIOR: check if the tour was already shown in this session
    const hasSeenTourInSession = sessionStorage.getItem("tour_shown_in_session") === "true";
    if (!forceTour && hasSeenTourInSession) return;
    const isEligibleRole =
      userType === "Admin" ||
      userType === "Doctor" ||
      userType === "Lab_Assistant" ||
      userType === "Pharmacist" ||
      userType === "Receptionist";
    const userStatus = clinics?.profile?.userStatus ?? user?.userStatus;
    const needsClinicSetup =
      userType === "Admin" &&
      (!clinics?.clinic || normalizeStatus(userStatus) === "pending");
    const isOnboardingVisible = !!document.querySelector(
      "#clinic-setup-onboarding",
    );

    if (!isAuth || !userId) return;
    if (!isEligibleRole && !forceTour) return;
    if (!forceTour && needsClinicSetup) return;
    if (!forceTour && isOnboardingVisible) return;

    if (!forceTour && isFirstLogin !== true) return;

    // ⚠️ TEMPORARY TESTING BEHAVIOR: bypass tourCompleted check when isFirstLogin is true
    const bypassTourCheck = isFirstLogin === true;

    if (forceTour || bypassTourCheck || !checkTourCompleted(userId)) {
      if (location.pathname !== tourEntryRoute) {
        setPendingTourStart(true);
        setPendingTourTarget(tourEntryTarget);
        if (forceTour) setStripTourParamAfterStart(true);
        navigate(forceTour ? `${tourEntryRoute}?tour=true` : tourEntryRoute, {
          replace: true,
        });
        return;
      }

      if (isOnboardingVisible) {
        setPendingTourStart(true);
        setPendingTourTarget(tourEntryTarget);
        if (forceTour) setStripTourParamAfterStart(true);
      } else if (document.querySelector(tourEntryTarget)) {
        if (forceTour) setStripTourParamAfterStart(true);
        setRunTour(true);
      } else {
        setPendingTourStart(true);
        setPendingTourTarget(tourEntryTarget);
        if (forceTour) setStripTourParamAfterStart(true);
      }
    }
  }, [
    isAuth,
    userId,
    userType,
    isFirstLogin,
    clinics,
    location.pathname,
    location.search,
    navigate,
    pendingTourStart,
    runTour,
    tourEntryRoute,
    tourEntryTarget,
    user?.userStatus,
  ]);

  useEffect(() => {
    if (!pendingTourStart) return;
    if (location.pathname !== tourEntryRoute) return;
    if (!pendingTourTarget) return;

    const tick = () => {
      if (document.querySelector("#clinic-setup-onboarding")) return;
      if (document.querySelector(pendingTourTarget)) {
        setPendingTourStart(false);
        setPendingTourTarget(null);
        setRunTour(true);
      }
    };

    tick();
    const t = window.setInterval(tick, 200);
    return () => window.clearInterval(t);
  }, [location.pathname, pendingTourStart, pendingTourTarget, tourEntryRoute]);

  useEffect(() => {
    if (!runTour) return;
    if (!stripTourParamAfterStart) return;

    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("tour") !== "true") {
      setStripTourParamAfterStart(false);
      return;
    }

    urlParams.delete("tour");
    const nextSearch = urlParams.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, {
      replace: true,
    });
    setStripTourParamAfterStart(false);
  }, [
    location.pathname,
    location.search,
    navigate,
    runTour,
    stripTourParamAfterStart,
  ]);

  const handleTourFinish = useCallback(() => {
    setRunTour(false);
    markTourCompleted(userId);
    // ⚠️ TEMPORARY TESTING BEHAVIOR: set session flag to prevent infinite tour loops
    sessionStorage.setItem("tour_shown_in_session", "true");
  }, [userId]);

  // 🔗 Socket connect
  useEffect(() => {
    if (token) {
      connectSocket(token, userId);
    }
  }, [token, userId]);

  useSocketNotifications(isAuth);
  useLocalSocketNotifications();

  // Initialize Google Analytics only if user has consented to analytics cookies
  const [gaInitialized, setGaInitialized] = useState(false);

  const initAnalyticsIfAllowed = useCallback(() => {
    if (!gaInitialized && isCategoryAllowed("analytics")) {
      initGA();
      setGaInitialized(true);
    }
  }, [gaInitialized]);

  useEffect(() => {
    initAnalyticsIfAllowed();
  }, [initAnalyticsIfAllowed]);

  // Listen for consent changes (user accepts cookies after page load)
  useEffect(() => {
    const handler = () => initAnalyticsIfAllowed();
    window.addEventListener("cookie-consent-updated", handler);
    return () => window.removeEventListener("cookie-consent-updated", handler);
  }, [initAnalyticsIfAllowed]);

  useEffect(() => {
    if (gaInitialized) {
      trackPageView(location.pathname);
    }
  }, [location, gaInitialized]);

  return (
    <AppLoaderProvider>
      <LimitationsProvider>
        <NetworkStatusBanner />
        <OfflineModeBanner />
        <SiteTour run={runTour} onFinish={handleTourFinish} userType={userType} />

        <AppRoutes />
        <CookieConsentBanner />
      </LimitationsProvider>
    </AppLoaderProvider>
  );
}

export default App;
