import { z } from 'zod';

// Schema for subscribing with add-ons in one call
export const subscribeWithAddOnsSchema = z.object({
  planId: z.string().uuid('Invalid planId'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  addOns: z
    .array(
      z.object({
        addOnId: z.string().uuid('Invalid addOnId'),
        quantity: z.number().int().positive().default(1),
      })
    )
    .optional(),
});

// Schema for verifying combined purchase
export const verifyCombinedPurchaseSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
  planId: z.string().uuid('Invalid planId'),
  billingCycle: z.enum(['monthly', 'yearly']),
  addOns: z
    .array(
      z.object({
        addOnId: z.string().uuid('Invalid addOnId'),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
});

export type SubscribeWithAddOnsDto = z.infer<typeof subscribeWithAddOnsSchema>;
export type VerifyCombinedPurchaseDto = z.infer<
  typeof verifyCombinedPurchaseSchema
>;
