import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { logout } from "../redux/slices/authSlice";
import type { RootState } from "../redux/store";

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const isAuthenticated = !!user && !!token;
  const userRole = user?.role || "patient";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const isDoctor = userRole === "doctor";
  const isPatient = userRole === "patient";
  const isAdmin = userRole === "admin";

  return {
    user,
    token,
    isAuthenticated,
    userRole,
    isDoctor,
    isPatient,
    isAdmin,
    logout: handleLogout,
  };
};
