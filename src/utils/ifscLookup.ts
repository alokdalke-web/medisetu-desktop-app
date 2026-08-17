import type { IfscLookupResult } from "../types/razorpayOnboarding";

/**
 * Looks up branch details for an IFSC code via Razorpay's public IFSC
 * directory. This is a direct external call (not proxied through our API/
 * baseQueryWithAutoLogout) since it needs no auth and isn't backend state.
 */
export async function lookupIfsc(
  ifscCode: string,
): Promise<IfscLookupResult | null> {
  const response = await fetch(
    `https://ifsc.razorpay.com/${encodeURIComponent(ifscCode)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to look up IFSC code");
  return (await response.json()) as IfscLookupResult;
}
