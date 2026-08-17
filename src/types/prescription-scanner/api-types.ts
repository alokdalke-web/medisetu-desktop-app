import type { z } from "zod";

import {
  DummyPrescriptionResponseSchema,
  PrescriptionDataSchema,
  ScanInputSchema,
  ScanOutputSchema,
} from "./schema";

export type ScanInput = z.infer<typeof ScanInputSchema>;
export type PrescriptionData = z.infer<typeof PrescriptionDataSchema>;
export type ScanOutput = z.infer<typeof ScanOutputSchema>;
export type DummyPrescriptionResponse = z.infer<
  typeof DummyPrescriptionResponseSchema
>;
