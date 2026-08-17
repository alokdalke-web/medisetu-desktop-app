export type Clinic = {
  id: string;
  clinicName?: string;
  clinicPhone?: string;
  Tagline?: string;
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

export type UpdateDetailsProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinic?: Clinic | null;
  onSaved?: () => void;
};

export type ClinicFormValues = {
  clinicName: string;
  Tagline: string;
  phoneNo: string;
  alternatePhoneNo: string;
  ZipCode: string;
  clinicAddress: string;
  City: string;
  /**
   * The lowercase twin `CitySelector` registers and reads. `City` is what the
   * update payload sends; this one exists so the selector's displayed value can
   * be kept in step when the map fills the address.
   */
  city?: string;
  State: string;
  Country: string;
  clinicLogo: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type OnboardingClinicFormChangeValues = {
  clinicName?: string;
  clinicPhone?: string;
  tagline?: string;
  clinicAddress?: string;
  city?: string;
  logoPreviewUrl?: string;
};

export type OnboardingClinicDetailsProps = {
  onNext?: () => void | Promise<void>;
  onBack?: () => void;
  adminProfileData?: any;
  onFormChange?: (data: OnboardingClinicFormChangeValues) => void;
  submitLabel?: string;
  loadExistingClinic?: boolean;
};

export type OnboardingClinicFormValues = {
  clinicName: string;
  clinicPhone: string;
  tagline: string;
  zipCode: string;
  clinicAddress: string;
  city: string;
  state: string;
  country: string;
  clinicLogo: string;
  latitude: string;
  longitude: string;
};
