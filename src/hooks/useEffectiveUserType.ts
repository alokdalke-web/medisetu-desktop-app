import { useSelector } from "react-redux";
import { useGetUserQuery } from "../redux/api/authApi";
import type { RootState } from "../redux/store";

/**
 * Custom hook to get the effective user type.
 *
 * When an Admin has switched roles (e.g. to Lab_Assistant, Pharmacist, Receptionist),
 * this returns the switched role so the sidebar and routing behave accordingly.
 * Otherwise, returns the user's primary userType.
 */
export const useEffectiveUserType = () => {
  const { data: user } = useGetUserQuery();
  const activeRole = useSelector((state: RootState) => state.role.activeRole);
  const actualUserType = (user as { userType?: string })?.userType || "";

  // Only allow role switching for Admins
  if (actualUserType === "Admin" && activeRole) {
    return activeRole;
  }

  return actualUserType;
};
