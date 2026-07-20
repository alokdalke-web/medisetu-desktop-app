import multer from 'multer';
import { createS3Storage } from './client';

const pharmacySupplierInvoiceStorage = createS3Storage(
  'pharmacy_supplier_invoice',
  ['pdf', 'jpg', 'png', 'jpeg', 'webp']
);

export const uploadPharmacySupplierInvoice = multer({
  storage: pharmacySupplierInvoiceStorage,
});

export const uploadMedicineImport = multer({
  storage: multer.memoryStorage(),
});

export const uploadSupplierImport = multer({
  storage: multer.memoryStorage(),
});

export const uploadStockImport = multer({
  storage: multer.memoryStorage(),
});
