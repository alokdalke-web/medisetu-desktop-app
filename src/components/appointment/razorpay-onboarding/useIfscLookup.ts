import { useEffect, useRef, useState } from "react";
import { lookupIfsc } from "../../../utils/ifscLookup";
import type { IfscLookupResult } from "../../../types/razorpayOnboarding";

export type IfscLookupState = "idle" | "loading" | "valid" | "invalid";

const ifscFormatRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Debounced lookup against Razorpay's public IFSC directory as the user types. */
export function useIfscLookup(rawCode: string | undefined) {
  const [state, setState] = useState<IfscLookupState>("idle");
  const [branchInfo, setBranchInfo] = useState<IfscLookupResult | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const code = (rawCode || "").trim().toUpperCase();

    if (!ifscFormatRegex.test(code)) {
      setState("idle");
      setBranchInfo(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setState("loading");

    const timer = setTimeout(async () => {
      try {
        const result = await lookupIfsc(code);
        if (requestIdRef.current !== requestId) return;
        if (result) {
          setBranchInfo(result);
          setState("valid");
        } else {
          setBranchInfo(null);
          setState("invalid");
        }
      } catch {
        if (requestIdRef.current !== requestId) return;
        // Lookup service unreachable — don't hard-block on a network hiccup.
        setBranchInfo(null);
        setState("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [rawCode]);

  return { state, branchInfo };
}
