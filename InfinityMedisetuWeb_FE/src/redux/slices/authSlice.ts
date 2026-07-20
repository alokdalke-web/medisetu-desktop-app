
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  getAuthToken,
  getAuthUser,
  clearAuthToken,
  clearAuthUser,
} from "../../utils/auth"; // ✅ updated imports

export type Role = "doctor" | "patient" | "admin" | "pharmacy" | "Pharmacist";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pharmacyDetails?: {
    pharmacyId: string;
    pharmacyName: string;
    pharmacyAddress: string;
    pharmacyContactNumber: string;
    pharmacyStatus: string;
  };
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  // MFA
  mfaPending: boolean;
  tempToken: string | null;
}

const initialState: AuthState = {
  token: getAuthToken(),
  user: getAuthUser(),
  mfaPending: false,
  tempToken: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<
        { token?: string; user?: User; rememberMe?: boolean } | any
      >
    ) => {
      const { token, user, rememberMe } = action.payload;

      // ✅ default sessionStorage if rememberMe not provided
      const storage = rememberMe ? localStorage : sessionStorage;

      if (token) {
        state.token = token;
        storage.setItem("authToken", token);
        (rememberMe ? sessionStorage : localStorage).removeItem("authToken");
      }

      if (user) {
        state.user = user;
        storage.setItem("authUser", JSON.stringify(user));
        (rememberMe ? sessionStorage : localStorage).removeItem("authUser");
      } else if (action.payload?.id) {
        const userObj = action.payload as User;
        state.user = userObj;
        storage.setItem("authUser", JSON.stringify(userObj));
        (rememberMe ? sessionStorage : localStorage).removeItem("authUser");
      }
    },

    // MFA: store temp token when MFA is required during login
    setMfaPending: (
      state,
      action: PayloadAction<{ tempToken: string }>
    ) => {
      state.mfaPending = true;
      state.tempToken = action.payload.tempToken;
    },

    // MFA: clear MFA pending state (after successful verification or timeout)
    clearMfaPending: (state) => {
      state.mfaPending = false;
      state.tempToken = null;
    },

    // ✅ update logout to use helpers
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.mfaPending = false;
      state.tempToken = null;
      clearAuthToken(); // removes from local + session
      clearAuthUser();  // removes from local + session
    },
  },
});

export const { setCredentials, setMfaPending, clearMfaPending, logout } = authSlice.actions;
export default authSlice.reducer;
