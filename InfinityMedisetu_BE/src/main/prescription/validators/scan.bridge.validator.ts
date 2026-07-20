import { z } from 'zod';
import { scanPrescriptionSchema } from './prescription.validator';

const OTP_REGEX = /^[A-Z0-9]{6}$/;
const MAX_IMAGE_BASE64_LENGTH = 8_000_000;

export const scanBridgeOtpQuerySchema = z.object({
  otp: z.string().trim().toUpperCase().regex(OTP_REGEX, 'Invalid OTP format'),
});

export const scanBridgeUploadSchema = scanPrescriptionSchema.superRefine(
  (value, context) => {
    if (
      value.imageBase64 &&
      value.imageBase64.length > MAX_IMAGE_BASE64_LENGTH
    ) {
      context.addIssue({
        code: 'custom',
        message: 'imageBase64 payload too large',
        path: ['imageBase64'],
      });
    }
  }
);

export type ScanBridgeOtpQuery = z.infer<typeof scanBridgeOtpQuerySchema>;
export type ScanBridgeUploadPayload = z.infer<typeof scanBridgeUploadSchema>;
