export type MfaStep =
  | "idle"
  | "qr-scan"
  | "recovery-codes"
  | "disable-confirm"
  | "regenerate-confirm";
