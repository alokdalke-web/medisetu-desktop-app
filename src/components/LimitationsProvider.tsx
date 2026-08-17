import { useGetLimitationsOverviewQuery } from "../redux/api/limitationsApi";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "react-router";
import type { ReactNode } from "react";

const normalizeStatus = (status?: string | null) =>
  String(status || "")
    .trim()
    .toLowerCase();

/**
 * Mounts near the app root (inside auth boundary).
 * Triggers the initial limitations fetch when the user is authenticated.
 * Renders nothing — exists solely to initiate the query subscription.
 */
export function LimitationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isClinicSetupRoute = location.pathname.endsWith("/clinic-setup");
  const userType = (user as { userType?: string | null } | null)?.userType;
  const isSuperAdmin = userType === "Super_Admin";
  const isPendingOnboardingUser =
    (userType === "Admin" || userType === "Doctor") &&
    normalizeStatus((user as { userStatus?: string | null } | null)?.userStatus) ===
      "pending";
  const isPublicAuthRoute =
    location.pathname === "/login" ||
    location.pathname.startsWith("/signup") ||
    location.pathname === "/mfa-verify" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/set-password" ||
    location.pathname === "/verify-email";

  // Only prefetch where subscription limits can actually be shown/enforced.
  useGetLimitationsOverviewQuery(undefined, {
    skip:
      !isAuthenticated ||
      isClinicSetupRoute ||
      isPendingOnboardingUser ||
      isPublicAuthRoute ||
      isSuperAdmin,
  });

  return <>{children}</>;
}
