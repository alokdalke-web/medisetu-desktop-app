import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type SwitchableRole =
  | "Admin"
  | "Doctor"
  | "Lab_Assistant"
  | "Pharmacist"
  | "Receptionist";

interface RoleState {
  activeRole: SwitchableRole | null;
}

const getInitialActiveRole = (): SwitchableRole | null => {
  return (localStorage.getItem("activeRole") ||
    sessionStorage.getItem("activeRole")) as SwitchableRole | null;
};

const initialState: RoleState = {
  activeRole: getInitialActiveRole(),
};

const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    setActiveRole: (state, action: PayloadAction<SwitchableRole>) => {
      state.activeRole = action.payload;
      // Store in the same storage as authToken
      if (localStorage.getItem("authToken")) {
        localStorage.setItem("activeRole", action.payload);
        sessionStorage.removeItem("activeRole");
      } else {
        sessionStorage.setItem("activeRole", action.payload);
        localStorage.removeItem("activeRole");
      }
    },
    clearActiveRole: (state) => {
      state.activeRole = null;
      localStorage.removeItem("activeRole");
      sessionStorage.removeItem("activeRole");
    },
  },
});

export const { setActiveRole, clearActiveRole } = roleSlice.actions;
export default roleSlice.reducer;
