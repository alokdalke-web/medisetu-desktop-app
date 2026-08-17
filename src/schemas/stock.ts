import { z } from "zod";

export const stockSchema = z.object({
    medicineName: z.string().min(1, "Medicine name is required"),
    supplierName: z.string().min(1, "Supplier name is required"),
    quantity: z.number().positive("Quantity must be positive"),
    price: z.number().positive("Price must be positive"),
    batchNo: z.string().min(1, "Batch number is required"),
    expiryDate: z.string().min(1, "Expiry date is required"),
    status: z.enum(["healthy", "low_stock", "out_of_stock"]),
});

export type StockDto = z.infer<typeof stockSchema>;

export interface Stock extends StockDto {
    id: string;
    availableQty: string;
    lastAdded: string;
    currentQty: number;
    createdAt?: string;
    updatedAt?: string;
}
