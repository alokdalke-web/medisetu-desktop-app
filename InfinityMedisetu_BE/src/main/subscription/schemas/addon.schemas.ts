// src/main/subscription/schemas/addon.schemas.ts
import { z } from 'zod';

export const createAddOnSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  featureKey: z.string().min(1, 'Feature key is required'),
  unitValue: z.number().int().positive().default(1),
  monthlyPrice: z.string().or(z.number()),
  yearlyPrice: z.string().or(z.number()),
  currency: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateAddOnSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  unitValue: z.number().int().positive().optional(),
  monthlyPrice: z.string().or(z.number()).optional(),
  yearlyPrice: z.string().or(z.number()).optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const initiatePurchaseSchema = z.object({
  addOns: z
    .array(
      z.object({
        addOnId: z.string().uuid('Invalid add-on ID'),
        billingCycle: z.enum(['monthly', 'yearly']),
        quantity: z.number().int().positive().default(1),
      })
    )
    .min(1, 'At least one add-on is required'),
  couponCode: z.string().optional(),
});

export const verifyPurchaseSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
  addOns: z
    .array(
      z.object({
        addOnId: z.string().uuid('Invalid add-on ID'),
        billingCycle: z.enum(['monthly', 'yearly']),
        quantity: z.number().int().positive().default(1),
      })
    )
    .min(1, 'At least one add-on is required'),
  couponId: z.string().optional(),
  originalAmount: z.string().or(z.number()).optional(),
  discountAmount: z.string().or(z.number()).optional(),
});

export const addOnIdParamsSchema = z.object({
  id: z.string().uuid('Invalid add-on ID'),
});

export const clinicIdParamsSchema = z.object({
  clinicId: z.string().uuid('Invalid clinic ID'),
});

export const clinicAddOnIdParamsSchema = z.object({
  clinicAddOnId: z.string().uuid('Invalid clinic add-on ID'),
});

export type CreateAddOnDto = z.infer<typeof createAddOnSchema>;
export type UpdateAddOnDto = z.infer<typeof updateAddOnSchema>;
export type InitiatePurchaseDto = z.infer<typeof initiatePurchaseSchema>;
export type VerifyPurchaseDto = z.infer<typeof verifyPurchaseSchema>;
