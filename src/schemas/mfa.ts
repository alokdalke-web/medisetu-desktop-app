import { z } from "zod";

/* ─── TOTP Code (6 digits) ─── */
export const totpCodeSchema = z.object({
  totpCode: z
    .string()
    .min(1, "Code is required")
    .regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

/* ─── Recovery Code (8 alphanumeric) ─── */
export const recoveryCodeSchema = z.object({
  recoveryCode: z
    .string()
    .min(1, "Recovery code is required")
    .regex(
      /^[a-zA-Z0-9]{8}$/,
      "Recovery code must be exactly 8 alphanumeric characters"
    ),
});

/* ─── Disable MFA (password) ─── */
export const disableMfaSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

/* ─── Types ─── */
export type TotpCodeDto = z.infer<typeof totpCodeSchema>;
export type RecoveryCodeDto = z.infer<typeof recoveryCodeSchema>;
export type DisableMfaDto = z.infer<typeof disableMfaSchema>;
