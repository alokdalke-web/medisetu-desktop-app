
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  getAuthToken,
  getRefreshToken,
  getAuthUser,
  clearAuthToken,
  clearAuthUser,
  setAuthTokens,
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
  refreshToken: string | null;
  // MFA
  mfaPending: boolean;
  tempToken: string | null;
}

const initialState: AuthState = {
  token: getAuthToken(),
  refreshToken: getRefreshToken(),
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
        | {
            token?: string;
            refreshToken?: string;
            user?: User;
            rememberMe?: boolean;
          }
        | any
      >
    ) => {
      const { token, refreshToken, user, rememberMe } = action.payload;

      // ✅ default sessionStorage if rememberMe not provided
      const storage = rememberMe ? localStorage : sessionStorage;

      if (token) {
        state.token = token;
        storage.setItem("authToken", token);
        (rememberMe ? sessionStorage : localStorage).removeItem("authToken");
      }

      if (refreshToken) {
        state.refreshToken = refreshToken;
        storage.setItem("authRefreshToken", refreshToken);
        (rememberMe ? sessionStorage : localStorage).removeItem(
          "authRefreshToken",
        );
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

    // Applied after a silent background refresh — updates tokens only, leaves `user` untouched.
    setTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) => {
      const { accessToken, refreshToken } = action.payload;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      const persistent = Boolean(localStorage.getItem("authToken"));
      setAuthTokens(accessToken, refreshToken, persistent);
    },

    // ✅ update logout to use helpers
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.mfaPending = false;
      state.tempToken = null;
      clearAuthToken(); // removes from local + session
      clearAuthUser();  // removes from local + session
    },
  },
});

export const { setCredentials, setMfaPending, clearMfaPending, setTokens, logout } =
  authSlice.actions;
export default authSlice.reducer;
