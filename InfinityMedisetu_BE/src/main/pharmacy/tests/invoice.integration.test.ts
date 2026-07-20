// import request from 'supertest';
// import express from 'express';
// import * as invoiceService from '../services/invoice.service';
// import invoiceRouter from '../routes/v1/invoice.route';
// import { errorHandler } from '../../../middlewear/errorHandler';

// // Mock the service
// jest.mock('../services/invoice.service');

// // Mock middlewares
// jest.mock('../../../middlewear/auth.middleware', () => ({
//   requireAuth: (req: any, res: any, next: any) => {
//     req.user = { id: 'user123' };
//     next();
//   },
//   requireClinic: (req: any, res: any, next: any) => {
//     req.clinicId = 'clinic123';
//     next();
//   },
//   requirePharmacist: (req: any, res: any, next: any) => {
//     next();
//   },
// }));

// const app = express();
// app.use(express.json());
// app.use('/api/v1/pharmacy/invoice', invoiceRouter);
// app.use(errorHandler);

// describe('Invoice Integration Tests', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('GET /api/v1/pharmacy/invoice/stock/:medicineId', () => {
//     it('should return stock info', async () => {
//       const mockStockInfo = {
//         medicine: {
//           sku: 'SKU1',
//           drugName: 'Paracetamol',
//         },
//         batchCount: 1,
//         stock: {
//           totalAvailable: 10,
//           stockStatus: 'IN_STOCK',
//         },
//         batches: [],
//       };

//       (invoiceService.resolvePharmacyIdForUser as jest.Mock).mockResolvedValue(
//         '123e4567-e89b-12d3-a456-426614174001'
//       );
//       (invoiceService.getMedicineStock as jest.Mock).mockResolvedValue(
//         mockStockInfo
//       );

//       const response = await request(app).get(
//         '/api/v1/pharmacy/invoice/stock/123e4567-e89b-12d3-a456-426614174000'
//       );

//       expect(response.status).toBe(200);
//       expect(response.body).toEqual({
//         success: true,
//         message: 'Stock info retrieved successfully',
//         data: mockStockInfo,
//       });
//     });
//   });

//   describe('GET /api/v1/pharmacy/invoice/inventory/:medicineId', () => {
//     it('should return medicine inventory info', async () => {
//       const mockInventoryInfo = {
//         medicine: {
//           sku: 'SKU1',
//           drugName: 'Paracetamol',
//         },
//         consumption: {
//           outByBatch: [],
//           recentOutMovements: [],
//         },
//       };

//       (invoiceService.resolvePharmacyIdForUser as jest.Mock).mockResolvedValue(
//         '123e4567-e89b-12d3-a456-426614174001'
//       );
//       (invoiceService.getMedicineInventory as jest.Mock).mockResolvedValue(
//         mockInventoryInfo
//       );

//       const response = await request(app).get(
//         '/api/v1/pharmacy/invoice/inventory/123e4567-e89b-12d3-a456-426614174000'
//       );

//       expect(response.status).toBe(200);
//       expect(response.body).toEqual({
//         success: true,
//         message: 'Medicine inventory retrieved successfully',
//         data: mockInventoryInfo,
//       });
//     });
//   });

//   describe('POST /api/v1/pharmacy/invoice', () => {
//     it('should create invoice successfully', async () => {
//       const mockInvoice = {
//         id: '123e4567-e89b-12d3-a456-426614174002',
//         customerName: 'John Doe',
//         totalPrice: '100.00',
//       };

//       (invoiceService.createInvoice as jest.Mock).mockResolvedValue(
//         mockInvoice
//       );

//       const response = await request(app)
//         .post('/api/v1/pharmacy/invoice')
//         .send({
//           customerName: 'John Doe',
//           items: [
//             { productId: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 },
//           ],
//           billing: { paymentMethod: 'CASH' },
//         });

//       expect(response.status).toBe(201);
//       expect(response.body).toEqual({
//         success: true,
//         message: 'Invoice created successfully',
//         data: mockInvoice,
//       });
//     });
//   });

//   describe('GET /api/v1/pharmacy/invoice', () => {
//     it('should get invoices list', async () => {
//       const mockResult = {
//         invoices: [],
//         totalCount: 0,
//         totalPages: 0,
//         currentPage: 1,
//         pageSize: 20,
//       };

//       (invoiceService.resolvePharmacyIdForUser as jest.Mock).mockResolvedValue(
//         'pharm123'
//       );
//       (invoiceService.getInvoiceDetails as jest.Mock).mockResolvedValue(
//         mockResult
//       );

//       const response = await request(app).get('/api/v1/pharmacy/invoice');

//       expect(response.status).toBe(200);
//       expect(response.body).toEqual({
//         success: true,
//         message: 'Invoices retrieved successfully',
//         data: mockResult,
//       });
//     });
//   });
// });
