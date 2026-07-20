// import request from 'supertest';
// import express from 'express';
// import pharmacyDashboardRouter from '../routes/v1/dashboard.route';
// import { errorHandler } from '../../../middlewear/errorHandler';
// import { PharmacyDashboardService } from '../services/dashboard.service';

// jest.mock('../services/dashboard.service', () => ({
//   PharmacyDashboardService: {
//     getSummary: jest.fn(),
//     getTopSellingMedicines: jest.fn(),
//     getStockHealth: jest.fn(),
//   },
// }));

// jest.mock('../../../middlewear/auth.middleware', () => ({
//   requireAuth: (req: any, _res: any, next: any) => {
//     req.user = { id: 'user123' };
//     next();
//   },
//   requireClinic: (req: any, _res: any, next: any) => {
//     req.clinicId = 'clinic123';
//     next();
//   },
//   requirePharmacist: (_req: any, _res: any, next: any) => {
//     next();
//   },
// }));

// const app = express();
// app.use(express.json());
// app.use('/api/v1/pharmacy/dashboard', pharmacyDashboardRouter);
// app.use(errorHandler);

// describe('Pharmacy Dashboard Integration Tests', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('GET /summary returns summary payload', async () => {
//     const mockResult = {
//       range: { start: new Date().toISOString(), end: new Date().toISOString() },
//       cards: {
//         totalSales: 100,
//         pendingPrescriptions: 2,
//         lowStockCount: 1,
//         expiredMedicineCount: 1,
//       },
//       revenue: { points: [{ date: '2026-01-01', value: 100 }] },
//       stockBreakdown: {
//         activeCount: 3,
//         lowCount: 1,
//         outOfStockCount: 0,
//         totalCount: 4,
//         activePercent: 75,
//         lowPercent: 25,
//         outPercent: 0,
//       },
//     };

//     (PharmacyDashboardService.getSummary as jest.Mock).mockResolvedValue(
//       mockResult
//     );

//     const response = await request(app).get(
//       '/api/v1/pharmacy/dashboard/summary?pharmacyId=123e4567-e89b-12d3-a456-426614174001'
//     );

//     expect(response.status).toBe(200);
//     expect(response.body).toEqual({
//       success: true,
//       message: 'Dashboard summary retrieved successfully',
//       data: mockResult,
//     });
//   });

//   it('GET /top-selling returns list', async () => {
//     const mockRows = [
//       {
//         sku: 'SKU1',
//         drugName: 'Paracetamol',
//         strength: '500mg',
//         packSize: '10',
//         soldQty: 12,
//       },
//     ];

//     (
//       PharmacyDashboardService.getTopSellingMedicines as jest.Mock
//     ).mockResolvedValue(mockRows);

//     const response = await request(app).get(
//       '/api/v1/pharmacy/dashboard/top-selling?pharmacyId=123e4567-e89b-12d3-a456-426614174001&limit=10'
//     );

//     expect(response.status).toBe(200);
//     expect(response.body).toEqual({
//       success: true,
//       message: 'Top selling medicines retrieved successfully',
//       data: mockRows,
//     });
//   });

//   it('GET /stock-health returns paginated result', async () => {
//     const mockResult = {
//       summary: { expiredCount: 1, nearExpiryCount: 2, totalCount: 3 },
//       items: [
//         {
//           batchNo: 'B-001',
//           expiryDate: '2026-02-01',
//           sku: 'SKU1',
//           drugName: 'Paracetamol',
//           strength: '500mg',
//           packSize: '10',
//           availableQty: 5,
//         },
//       ],
//       pagination: {
//         totalRecords: 3,
//         totalPages: 1,
//         currentPage: 1,
//         pageSize: 10,
//       },
//     };

//     (PharmacyDashboardService.getStockHealth as jest.Mock).mockResolvedValue(
//       mockResult
//     );

//     const response = await request(app).get(
//       '/api/v1/pharmacy/dashboard/stock-health?pharmacyId=123e4567-e89b-12d3-a456-426614174001&status=ALL&pageNumber=1&pageSize=10'
//     );

//     expect(response.status).toBe(200);
//     expect(response.body).toEqual({
//       success: true,
//       message: 'Stock health retrieved successfully',
//       data: mockResult,
//     });
//   });
// });
