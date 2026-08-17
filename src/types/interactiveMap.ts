export type InteractiveMapLocation = {
  lat: number;
  lng: number;
};

export type InteractiveMapAddressDetails = {
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  city_district?: string;
  district?: string;
  county?: string;
  state_district?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
};

export type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
};

export type InteractiveMapProps = {
  initialLocation?: InteractiveMapLocation | null;
  initialAddress?: InteractiveMapAddressDetails | null;
  onLocationChange: (
    location: InteractiveMapLocation,
    address: InteractiveMapAddressDetails,
  ) => void;
  locationIqApiKey?: string;
  height?: string;
  /** Display-only mode: hides search/GPS/zoom controls and disables drag/click. */
  readOnly?: boolean;
};
