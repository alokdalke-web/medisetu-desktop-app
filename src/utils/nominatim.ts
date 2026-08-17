type NominatimEndpoint = "search" | "reverse";

type NominatimParamValue = string | number | boolean | null | undefined;

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const nominatimContactEmail = (
  import.meta.env.VITE_NOMINATIM_CONTACT_EMAIL as string | undefined
)?.trim();

export const buildNominatimUrl = (
  endpoint: NominatimEndpoint,
  params: Record<string, NominatimParamValue>,
) => {
  const url = new URL(endpoint, `${NOMINATIM_BASE_URL}/`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (nominatimContactEmail) {
    url.searchParams.set("email", nominatimContactEmail);
  }

  return url.toString();
};

export const getNominatimHeaders = (
  acceptLanguage = "en-IN,en;q=0.9",
): HeadersInit => ({
  "Accept-Language": acceptLanguage,
});
