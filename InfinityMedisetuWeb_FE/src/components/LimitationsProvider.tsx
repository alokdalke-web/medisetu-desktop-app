import { useGetLimitationsOverviewQuery } from "../redux/api/limitationsApi";
import { useAuth } from "../hooks/useAuth";

/**
 * Mounts near the app root (inside auth boundary).
 * Triggers the initial limitations fetch when the user is authenticated.
 * Renders nothing — exists solely to initiate the query subscription.
 */
export function LimitationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  // Only fetch when authenticated — skip otherwise
  useGetLimitationsOverviewQuery(undefined, { skip: !isAuthenticated });

  return <>{children}</>;
}
