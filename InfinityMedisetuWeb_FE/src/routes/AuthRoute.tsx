

import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router";
import type { RootState } from "../redux/store";

type UserRole =
  | "Doctor"
  | "Patient"
  | "Admin"
  | "Super_Admin"
  | "Lab_Assistant"
  | "Pharmacist"
  | "Receptionist";

interface AuthRouteProps {
  type?: "public" | "protected";
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const getDashboardPath = (userType?: UserRole, activeRole?: string | null) => {

  // If admin has switched roles, redirect to appropriate dashboard
  if (userType === "Admin" && activeRole) {
    switch (activeRole) {
      case "Lab_Assistant":
        return "/lab/dashboard";
      case "Pharmacist":
        return "/pharmacy/dashboard";
      case "Receptionist":
        return "/appointment";
      case "Doctor":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  }

  switch (userType) {
    case "Patient":
      return "/patient-dashboard";
    case "Pharmacist":
      return "/pharmacy/dashboard";
    case "Receptionist":
      return "/appointment";
    case "Lab_Assistant":
      return "/lab/dashboard"; 
    case "Doctor":
    case "Admin":
    case "Super_Admin":
      return "/dashboard";
    default:
      return "/dashboard";
  }
};

const AuthRoute: React.FC<AuthRouteProps> = ({
  type = "protected",
  allowedRoles,
  redirectTo,
}) => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const activeRole = useSelector((state: RootState) => state.role.activeRole);
  const location = useLocation();

  // ✅ Public routes: logged-in users go to their dashboard
  if (type === "public" && user && token) {
    return (
      <Navigate
        to={getDashboardPath(user.userType as UserRole, activeRole)}
        replace
      />
    );
  }

  // ✅ Protected routes: unauthenticated users go to login
  if (type === "protected" && (!token || !user)) {
    return (
      <Navigate
        to={redirectTo || "/login"}
        state={{ from: location }}
        replace
      />
    );
  }

  // ✅ Role-based access check — Admins with a switched role can access that role's routes
  if (allowedRoles && user) {
    const userType = user.userType as UserRole;

    // Admin with activeRole can access routes for the switched role
    if (userType === "Admin" && activeRole && allowedRoles.includes(activeRole as UserRole)) {
      return <Outlet />;
    }

    // Normal role check
    if (!allowedRoles.includes(userType)) {
      return (
        <Navigate
          to={getDashboardPath(userType, activeRole)}
          replace
        />
      );
    }
  }

  return <Outlet />;
};

export default AuthRoute;
