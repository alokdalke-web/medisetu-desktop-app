// import * as invoiceService from '../services/invoice.service';
// import { database } from '../../../configurations/dbConnection';

// function makeQueryResult<T>(resolved: T) {
//   const q: any = {};
//   q.from = jest.fn(() => q);
//   q.where = jest.fn(() => q);
//   q.limit = jest.fn(() => q);
//   q.offset = jest.fn(() => q);
//   q.innerJoin = jest.fn(() => q);
//   q.leftJoin = jest.fn(() => q);
//   q.groupBy = jest.fn(() => q);
//   q.having = jest.fn(() => q);
//   q.orderBy = jest.fn(() => q);
//   q.then = (onFulfilled: any, onRejected: any) =>
//     Promise.resolve(resolved).then(onFulfilled, onRejected);
//   return q;
// }

// // Mock dependencies
// jest.mock('../../../configurations/dbConnection', () => ({
//   database: {
//     select: jest.fn(),
//     from: jest.fn(),
//     where: jest.fn(),
//     limit: jest.fn(),
//     execute: jest.fn(),
//     transaction: jest.fn((callback) =>
//       callback({
//         insert: jest.fn().mockReturnThis(),
//         values: jest.fn().mockReturnThis(),
//         returning: jest.fn(),
//         select: jest.fn().mockReturnThis(),
//         from: jest.fn().mockReturnThis(),
//         where: jest.fn().mockReturnThis(),
//         limit: jest.fn().mockReturnThis(),
//         update: jest.fn().mockReturnThis(),
//         set: jest.fn().mockReturnThis(),
//         delete: jest.fn().mockReturnThis(),
//       })
//     ),
//   },
// }));

// describe('Invoice Service Unit Tests', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('resolvePharmacyIdForUser', () => {
//     it('should return pharmacyId if found', async () => {
//       (database.select as jest.Mock).mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockReturnValue({
//             limit: jest.fn().mockResolvedValue([{ pharmacyId: 'pharm123' }]),
//           }),
//         }),
//       });

//       const result = await invoiceService.resolvePharmacyIdForUser(
//         'clinic1',
//         'user1'
//       );
//       expect(result).toBe('pharm123');
//     });

//     it('should return null if not found', async () => {
//       (database.select as jest.Mock).mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockReturnValue({
//             limit: jest.fn().mockResolvedValue([]),
//           }),
//         }),
//       });

//       const result = await invoiceService.resolvePharmacyIdForUser(
//         'clinic1',
//         'user1'
//       );
//       expect(result).toBeNull();
//     });
//   });

//   describe('getMedicineStock', () => {
//     it('should return stock details', async () => {
//       const now = new Date();

//       (database.select as jest.Mock)
//         .mockImplementationOnce(() =>
//           makeQueryResult([
//             {
//               id: 'prod1',
//               sku: 'SKU1',
//               drugName: 'Paracetamol',
//               strength: '500mg',
//               packSize: 10,
//               hsnCode: null,
//               mrp: null,
//               gstPercentage: null,
//               isPrescriptionRequired: false,
//               status: 'active',
//               createdAt: now,
//               updatedAt: now,
//             },
//           ])
//         )
//         .mockImplementationOnce(() =>
//           makeQueryResult([
//             {
//               batchNo: 'BN-001',
//               expiryDate: now,
//               purchasePrice: null,
//               sellingPrice: null,
//               supplierName: null,
//               supplierCompanyName: null,
//               supplierLocation: null,
//               supplierPhone: null,
//               totalIn: 10,
//               totalOut: 0,
//               netQuantity: 10,
//               batchItemCreatedAt: now,
//             },
//           ])
//         )
//         .mockImplementationOnce(() => makeQueryResult([{ batchCount: 1 }]))
//         .mockImplementationOnce(() =>
//           makeQueryResult([{ totalIn: 10, totalOut: 0 }])
//         );

//       const result = await invoiceService.getMedicineStock(
//         'prod1',
//         'clinic1',
//         'pharm1'
//       );

//       expect(result.medicine.sku).toBe('SKU1');
//       expect(result.medicine.drugName).toBe('Paracetamol');
//       expect(result.batchCount).toBe(1);
//       expect(result.stock.stockStatus).toBe('IN_STOCK');
//       expect(result.stock.totalAvailable).toBe(10);
//       expect(result.batches).toHaveLength(1);
//       expect(result.issueSuggestion.allocationOrder).toHaveLength(1);
//     });

//     it('should return OUT_OF_STOCK if quantity is 0', async () => {
//       const now = new Date();

//       (database.select as jest.Mock)
//         .mockImplementationOnce(() =>
//           makeQueryResult([
//             {
//               id: 'prod1',
//               sku: 'SKU1',
//               drugName: 'Paracetamol',
//               strength: '500mg',
//               packSize: 10,
//               hsnCode: null,
//               mrp: null,
//               gstPercentage: null,
//               isPrescriptionRequired: false,
//               status: 'active',
//               createdAt: now,
//               updatedAt: now,
//             },
//           ])
//         )
//         .mockImplementationOnce(() => makeQueryResult([]))
//         .mockImplementationOnce(() => makeQueryResult([{ batchCount: 0 }]))
//         .mockImplementationOnce(() =>
//           makeQueryResult([{ totalIn: 0, totalOut: 0 }])
//         );

//       const result = await invoiceService.getMedicineStock(
//         'prod1',
//         'clinic1',
//         'pharm1'
//       );

//       expect(result.stock.stockStatus).toBe('OUT_OF_STOCK');
//       expect(result.stock.totalAvailable).toBe(0);
//     });
//   });

//   describe('getMedicineInventory', () => {
//     it('should return consumption details', async () => {
//       const now = new Date();

//       (database.select as jest.Mock)
//         .mockImplementationOnce(() =>
//           makeQueryResult([
//             {
//               id: 'prod1',
//               sku: 'SKU1',
//               drugName: 'Paracetamol',
//               strength: '500mg',
//               packSize: 10,
//               hsnCode: null,
//               mrp: null,
//               gstPercentage: null,
//               isPrescriptionRequired: false,
//               status: 'active',
//               createdAt: now,
//               updatedAt: now,
//             },
//           ])
//         )
//         .mockImplementationOnce(() =>
//           makeQueryResult([{ batchNo: 'BN-001', expiryDate: now, totalOut: 0 }])
//         )
//         .mockImplementationOnce(() =>
//           makeQueryResult([
//             {
//               batchNo: 'BN-001',
//               quantity: 2,
//               referenceType: 'INVOICE',
//               createdAt: now,
//             },
//           ])
//         );

//       const result = await invoiceService.getMedicineInventory(
//         'prod1',
//         'clinic1',
//         'pharm1'
//       );

//       expect(result.medicine.sku).toBe('SKU1');
//       expect(result.consumption.outByBatch).toHaveLength(1);
//       expect(result.consumption.recentOutMovements).toHaveLength(1);
//     });
//   });

//   // Add more tests for createInvoice, updateInvoice etc.
//   // Note: Mocking transaction and complex queries requires more detailed mocks.
// });
