import type { Middleware } from "@reduxjs/toolkit";
import { allApiSlices } from "../api/apiRoot";
import { logout } from "../slices/authSlice";

export const logoutMiddleware: Middleware =
  (storeAPI) => (next) => (action) => {
    const typedAction = action as { type?: string };

    if (typedAction.type === logout.type) {
      // Reset all RTK Query API states on logout
      allApiSlices.forEach((api) => {
        storeAPI.dispatch(api.util.resetApiState());
      });
    }
    return next(action);
  };
