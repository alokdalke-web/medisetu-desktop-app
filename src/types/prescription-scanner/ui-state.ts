export type ScanInputPayload = { imageBase64?: string; imageUrl?: string };

/**
 * Page-level state machine.
 *
 * idle          -> The page just loaded; no session yet.
 * session_ready -> OTP session created; waiting for phone upload OR direct input.
 * uploaded      -> Phone (or direct) payload received; ready to scan.
 * scanning      -> /scan request in-flight.
 * result        -> Scan complete; showing result.
 * error         -> Unrecoverable error that needs user action.
 */
export type PagePhase =
  | "idle"
  | "session_ready"
  | "uploaded"
  | "scanning"
  | "result"
  | "error";
