import z from 'zod';

// ============ Medicine Schemas ============

export const createMedicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required').max(255),
  genericName: z.string().max(255).optional(),
  manufacturer: z.string().max(255).optional(),
  composition: z.string().optional(),
  form: z.string().max(50).optional(), // tablet, syrup, injection, etc.
  strength: z.string().max(50).optional(), // e.g., "500mg"
  category: z.string().max(100).optional(),
  requiresPrescription: z.boolean().optional().default(false),
});

export const updateMedicineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  genericName: z.string().max(255).optional(),
  manufacturer: z.string().max(255).optional(),
  composition: z.string().optional(),
  form: z.string().max(50).optional(),
  strength: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  requiresPrescription: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const searchMedicineQuerySchema = z.object({
  q: z.string().min(1).optional(), // search query
  category: z.string().optional(),
  requiresPrescription: z.boolean().optional(),
  isActive: z.boolean().optional(),
  pageNumber: z.string().optional(),
  pageSize: z.string().optional(),
});

export const medicineParamsSchema = z.object({
  medicineId: z.string().uuid('Invalid medicine ID'),
});

export const locationsQuerySchema = z.object({}).passthrough();

export const searchAllQuerySchema = z
  .object({
    q: z.string().optional(),
    page: z.string().optional(),
    per_page: z.string().optional(),
  })
  .passthrough();

export const searchAutoCompleteQuerySchema = z
  .object({
    q: z.string().optional(),
  })
  .passthrough();

export const drugstaticParamsSchemas = z.object({
  drug_sku_id: z.string().min(1),
});

export const drugstaticQuerySchemas = z.object({}).passthrough();

export const addStockSchema = z
  .object({
    medicineId: z.string().uuid().optional(),
    pharmacyId: z.string().uuid().optional(),
    clinicId: z.string().uuid().optional(),
    batchNo: z.string().min(1).optional(),
    expiryDate: z.coerce.date().optional(),
    quantity: z.coerce.number().int().positive(),
    purchasePrice: z.coerce.number().nonnegative().optional(),
    sellingPrice: z.coerce.number().nonnegative().optional(),
  })
  .passthrough();

export const updateStockSchema = z
  .object({
    batchNo: z.string().min(1).optional(),
    expiryDate: z.coerce.date().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    purchasePrice: z.coerce.number().nonnegative().optional(),
    sellingPrice: z.coerce.number().nonnegative().optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .passthrough();

export const stockQuerySchema = z
  .object({
    medicineId: z.string().uuid().optional(),
    q: z.string().optional(),
    pageNumber: z.string().optional(),
    pageSize: z.string().optional(),
    lowStockOnly: z.coerce.boolean().optional(),
    expiringBefore: z.coerce.date().optional(),
  })
  .passthrough();

export const stockParamsSchema = z.object({
  stockId: z.string().uuid(),
});

export const stockPricingSchema = z
  .object({
    mrp: z.coerce.number().nonnegative().optional(),
    sellingPrice: z.coerce.number().nonnegative().optional(),
    purchasePrice: z.coerce.number().nonnegative().optional(),
    effectiveFrom: z.coerce.date().optional(),
  })
  .passthrough();

export const pricingHistoryQuerySchema = z
  .object({
    pageNumber: z.string().optional(),
    pageSize: z.string().optional(),
  })
  .passthrough();
