import type {
  InteractiveMapAddressDetails,
  NominatimReverseResponse,
} from "../types/interactiveMap";
import { buildNominatimUrl, getNominatimHeaders } from "./nominatim";
import {
  isIndianPincode,
  normalizeIndianState,
  parseIndianAddress,
} from "./indianAddress";

type ReverseGeocodeOptions = {
  nominatimLanguage?: string;
};

const preciseGoogleResultTypes = new Set([
  "street_address",
  "premise",
  "subpremise",
  "plus_code",
  "establishment",
  "point_of_interest",
  "route",
  "neighborhood",
  "sublocality",
  "sublocality_level_1",
]);

const compactAddressParts = (parts: Array<string | undefined>) => {
  const seen = new Set<string>();

  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
};

/**
 * First component matching the *earliest* type in `types`, not the first
 * component matching any of them.
 *
 * Google returns address components most-specific-first, so scanning the
 * components and accepting any listed type made `sublocality_level_1` win over
 * `locality` — a pin dropped in Indore filled City with "Ratna Lok Colony".
 * `types` is a priority list, so it has to be the outer loop.
 */
const getAddressComponent = (
  components: google.maps.GeocoderAddressComponent[] | undefined,
  types: string[],
) => {
  for (const type of types) {
    const match = components?.find((component) =>
      component.types.includes(type),
    );
    if (match?.long_name) return match.long_name;
  }
  return "";
};

const hasPostalCode = (result: google.maps.GeocoderResult) =>
  result.address_components.some((component) =>
    component.types.includes("postal_code"),
  );

const isPreciseGoogleResult = (result: google.maps.GeocoderResult) =>
  result.types.some((type) => preciseGoogleResultTypes.has(type));

const selectBestGoogleResult = (results: google.maps.GeocoderResult[]) =>
  results.find((result) => isPreciseGoogleResult(result) && hasPostalCode(result)) ||
  results.find(hasPostalCode) ||
  results[0];

/** Real city/town/district components, in the order a city should be read. */
const CITY_COMPONENT_TYPES = [
  "locality",
  "administrative_area_level_3",
  "administrative_area_level_2",
];

/**
 * Neighbourhood-level components. Last resort only — "Ratna Lok Colony" is a
 * colony inside Indore, not the city, so these are used only when neither the
 * components nor the formatted address name an actual city.
 */
const SUBLOCALITY_COMPONENT_TYPES = ["sublocality", "sublocality_level_1"];

/**
 * Components first, formatted address second.
 */
const buildAddressDetails = (
  address: string,
  components: google.maps.GeocoderAddressComponent[] | undefined,
): InteractiveMapAddressDetails => {
  const parsed = parseIndianAddress(address);

  const componentCity = getAddressComponent(components, CITY_COMPONENT_TYPES);
  const componentState = normalizeIndianState(
    getAddressComponent(components, ["administrative_area_level_1"]),
  );
  const componentPincode = getAddressComponent(components, ["postal_code"]);

  return {
    address,
    city:
      componentCity ||
      parsed.city ||
      getAddressComponent(components, SUBLOCALITY_COMPONENT_TYPES),
    state: componentState || parsed.state,
    pincode: isIndianPincode(componentPincode)
      ? componentPincode
      : parsed.pincode,
  };
};

export const getAddressDetailsFromGoogleResult = (
  result: google.maps.GeocoderResult,
): InteractiveMapAddressDetails =>
  buildAddressDetails(result.formatted_address || "", result.address_components);

export const getAddressDetailsFromGooglePlace = (
  place: google.maps.places.PlaceResult,
): InteractiveMapAddressDetails =>
  buildAddressDetails(
    place.formatted_address || place.name || "",
    place.address_components,
  );

export const reverseGeocodeGoogle = async (
  lat: number,
  lng: number,
): Promise<InteractiveMapAddressDetails> => {
  if (typeof google === "undefined" || !google.maps?.Geocoder) {
    throw new Error("Google Maps geocoder is not available");
  }

  const geocoder = new google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results || results.length === 0) {
        reject(new Error("Google geocoder failed: " + status));
        return;
      }

      resolve(getAddressDetailsFromGoogleResult(selectBestGoogleResult(results)));
    });
  });
};

export const reverseGeocodeNominatim = async (
  lat: number,
  lng: number,
  acceptLanguage = "en-IN,en;q=0.9",
): Promise<InteractiveMapAddressDetails> => {
  const url = buildNominatimUrl("reverse", {
    format: "jsonv2",
    lat,
    lon: lng,
    addressdetails: "1",
  });

  const response = await fetch(url, {
    headers: getNominatimHeaders(acceptLanguage),
  });

  if (!response.ok) {
    throw new Error(`Nominatim failed with status ${response.status}`);
  }

  const data = (await response.json()) as NominatimReverseResponse;
  if (data.error || (!data.address && !data.display_name)) {
    throw new Error(data.error || "Nominatim did not return an address");
  }

  const addr = data.address ?? {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.city_district ||
    addr.district ||
    addr.county ||
    "";
  const state = addr.state || addr.region || "";
  const pincode = addr.postcode || "";
  const address =
    data.display_name ||
    compactAddressParts([
      addr.house_number,
      addr.road,
      addr.neighbourhood,
      addr.suburb,
      addr.city_district,
      city,
      addr.state_district,
      state,
      pincode,
      addr.country,
    ]);

  // Same India validation as the Google path: the state has to be a real state
  // or union territory and the PIN a real 6-digit code, otherwise fall back to
  // what the address string itself spells out.
  const parsed = parseIndianAddress(address);

  return {
    address,
    city: city || parsed.city,
    state: normalizeIndianState(state) || parsed.state,
    pincode: isIndianPincode(pincode) ? pincode : parsed.pincode,
  };
};

export const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number,
  options: ReverseGeocodeOptions = {},
) => {
  try {
    return await reverseGeocodeGoogle(lat, lng);
  } catch (googleError) {
    console.warn(
      "Google reverse geocoding failed; falling back to Nominatim.",
      googleError,
    );
    return reverseGeocodeNominatim(lat, lng, options.nominatimLanguage);
  }
};
