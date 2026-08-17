export type Clinic = {
  id: string;
  clinicName?: string;
  clinicPhone?: string;
  Tagline?: string;

  // UI-only for now
  phoneNo?: string;
  alternatePhoneNo?: string;

  ZipCode?: number | string;
  clinicAddress?: string;
  City?: string;
  State?: string;
  Country?: string;
  clinicLogo?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

export type ClinicEditFormValues = {
  clinicName: string;
  clinicPhone: string;
  Tagline: string;

  // UI-only for now (not sent to API)
  phoneNo: string;
  alternatePhoneNo: string;

  clinicAddress: string;
  city?: string;
  City: string;
  State: string;
  Country: string;
  ZipCode: string;
  clinicLogo: string;
  latitude: string;
  longitude: string;
};
