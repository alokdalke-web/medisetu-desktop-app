
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface IncomingCall {
  doctorId: string;
  doctorName: string;
  clinicId: string;
  profileImage?: string;
  ts: string;
  callType?: "RECEPTION" | "NEXT_PATIENT";
}

interface CallState {
  activeCalls: IncomingCall[];
  doctorCallStatus: string | null;
}

const STORAGE_KEY = "medisetu_call_state";

const loadState = (): CallState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized) {
      return JSON.parse(serialized);
    }
  } catch (e) {
    console.error("Failed to load call state", e);
  }
  return {
    activeCalls: [],
    doctorCallStatus: null,
  };
};

const initialState: CallState = loadState();

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    addActiveCall: (state, action: PayloadAction<IncomingCall>) => {
      if (!state.activeCalls.some((c) => c.doctorId === action.payload.doctorId)) {
        state.activeCalls.push(action.payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    },
    removeActiveCall: (state, action: PayloadAction<string>) => {
      state.activeCalls = state.activeCalls.filter(
        (c) => c.doctorId !== action.payload
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    setDoctorCallStatus: (state, action: PayloadAction<string | null>) => {
      state.doctorCallStatus = action.payload;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    clearAllCalls: (state) => {
      state.activeCalls = [];
      state.doctorCallStatus = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const {
  addActiveCall,
  removeActiveCall,
  setDoctorCallStatus,
  clearAllCalls,
} = callSlice.actions;

export default callSlice.reducer;
