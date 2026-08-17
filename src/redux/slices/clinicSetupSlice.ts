import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/* ========= Types ========= */
export type BreakSlot = { start: string; end: string };

export type AvailabilityRow = {
  day: string;
  start: string | null; // "HH:mm"
  end: string | null;   // "HH:mm"
  breaks: number | null;
  closed?: boolean;
  breaksList?: BreakSlot[];
};

export interface ClinicDetailsForm {
  clinicName: string;
  tagline: string;
  address: string;
  country: "India";
  state: string;
  city: string;
  pincode: string;
  clinicLogoUrl?: string | null;
}

export interface DoctorProfileForm {
  doctorName: string;
  email: string;
  phone: string;      // allow +91...
  altPhone?: string;  // allow +91...
  qualification: string;
  experience: string; // years (string; sent as number)
  license: string;
  department: string; // speciality
  photoUrl?: string | null;
}

export interface ClinicServiceItem {
  serviceName: string;
  price: string; // string in UI; sent as number
  currency: "INR" | "USD" | "EUR";
  additionalService: string; // maps to additionalServices
}

export interface ClinicSetupState {
  clinicDetails?: ClinicDetailsForm;
  doctorProfile?: DoctorProfileForm;
  clinicServices?: ClinicServiceItem[];  // ⬅️ now an array
  availability?: AvailabilityRow[];
}

const initialState: ClinicSetupState = {};

/* ========= Slice ========= */
const clinicSetupSlice = createSlice({
  name: "clinicSetup",
  initialState,
  reducers: {
    setClinicDetails(state, action: PayloadAction<ClinicDetailsForm>) {
      state.clinicDetails = action.payload;
    },
    setDoctorProfile(state, action: PayloadAction<DoctorProfileForm>) {
      state.doctorProfile = action.payload;
    },
    setClinicServices(state, action: PayloadAction<ClinicServiceItem[]>) {
      state.clinicServices = action.payload;
    },
    setAvailability(state, action: PayloadAction<AvailabilityRow[]>) {
      state.availability = action.payload;
    },
    resetClinicSetup() {
      return initialState;
    },
  },
});

export const {
  setClinicDetails,
  setDoctorProfile,
  setClinicServices,
  setAvailability,
  resetClinicSetup,
} = clinicSetupSlice.actions;

export default clinicSetupSlice.reducer;

/* ========= Selectors ========= */
import type { RootState } from "../store";
export const selectClinicSetup = (s: RootState) => s.clinicSetup;

/* ========= Utils ========= */
export const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
};

export const genId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`);
