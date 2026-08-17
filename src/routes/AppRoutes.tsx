import { Navigate, Route, Routes } from "react-router";
import { Suspense } from "react";
import { useSelector } from "react-redux";

import AppLoader from "../components/common/AppLoader";
import { routes } from "./routes";
import type { RootState } from "../redux/store";
import type { AppRoute, AppRouteElement } from "./routes.types";

const normalizeStatus = (status?: string | null) =>
  String(status || "")
    .trim()
    .toLowerCase();

const getDashboardPath = (user?: {
  userType?: string | null;
  userStatus?: string | null;
}) => {
  const userType = user?.userType;

  if (
    (userType === "Admin" || userType === "Doctor") &&
    normalizeStatus(user?.userStatus) === "pending"
  ) {
    return "/clinic-setup";
  }

  switch (userType) {
    case "Patient":
      return "/patient-dashboard";
    case "Pharmacist":
      return "/pharmacy/dashboard";
    case "Receptionist":
      return "/dashboard";
    case "Lab_Assistant":
      return "/lab/dashboard"; // ✅ NEW
    case "Doctor":
    case "Admin":
    case "Super_Admin":
      return "/dashboard";
    default:
      return "/appointment";
  }
};

const renderRouteElement = (Component?: AppRouteElement) =>
  Component ? (
    <Suspense
      fallback={<AppLoader message="Loading page..." rotateMessages={false} />}
    >
      <Component />
    </Suspense>
  ) : undefined;

const renderRoutes = (
  routeList: AppRoute[],
  isAuth: boolean,
  authedRedirect: string,
): React.JSX.Element[] =>
  routeList.map((route) => {
    const Component = route.element;

    // Nested route groups
    if (route.children) {
      return (
        <Route
          key={route.key}
          path={route.path}
          element={
            Component ? (
              route.authRequired && !isAuth ? (
                <Navigate to="/login" replace />
              ) : route.public && isAuth ? (
                <Navigate to={authedRedirect} replace />
              ) : (
                renderRouteElement(Component)
              )
            ) : undefined
          }
        >
          {renderRoutes(route.children, isAuth, authedRedirect)}
        </Route>
      );
    }

    // Auth required route
    if (route.authRequired && !isAuth) {
      return (
        <Route
          key={route.key}
          path={route.path}
          element={<Navigate to="/login" replace />}
        />
      );
    }

    // Guest-only route
    if (route.public && isAuth) {
      return (
        <Route
          key={route.key}
          path={route.path}
          element={<Navigate to={authedRedirect} replace />}
        />
      );
    }

    return (
      <Route
        key={route.key}
        index={route.index}
        path={route.path}
        element={renderRouteElement(Component)}
      />
    );
  });

const AppRoutes = () => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const isAuth = !!token;

  const authedRedirect = getDashboardPath({
    userType: user?.userType,
    userStatus: user?.userStatus,
  });

  return <Routes>{renderRoutes(routes, isAuth, authedRedirect)}</Routes>;
};

export default AppRoutes;
