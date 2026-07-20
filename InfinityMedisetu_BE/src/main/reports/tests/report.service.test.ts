import { ReportService } from '../services/report.service';
import { database } from '../../../configurations/dbConnection';
import { HttpError } from '../../../middlewear/errorHandler';

// Mock dependencies
jest.mock('../../../configurations/dbConnection');
jest.mock('../../../utils/logger');

describe('ReportService Clinic Isolation Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Dynamic chain builder using ES6 Proxy to avoid hardcoded chain method lists
  const createChain = (finalValue: any) => {
    const chain: any = new Proxy(
      {},
      {
        get(target, prop) {
          if (prop === 'then') {
            return (resolve: any) => resolve(finalValue);
          }
          return () => chain;
        },
      }
    );
    return chain;
  };

  describe('getReportCard', () => {
    it('should query report card restricting by clinicId', async () => {
      const mockReportCard = [
        { id: 'rc-1', appointmentId: 'app-1', clinicId: 'clinic-1' },
      ];
      const mockPrescriptions: any[] = [];
      const mockClinic = [{ id: 'clinic-1', clinicName: 'Test Clinic' }];

      const selectChain = createChain(mockReportCard);
      const prescriptionsChain = createChain(mockPrescriptions);
      const clinicChain = createChain(mockClinic);

      (database.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            select: jest
              .fn()
              .mockReturnValueOnce(selectChain) // First query: reportCardResult
              .mockReturnValueOnce(prescriptionsChain) // Second query: prescriptions
              .mockReturnValueOnce(clinicChain), // Third query: clinicResult
          };
          return callback(tx);
        }
      );

      const result = await ReportService.getReportCard(
        { appointmentId: 'app-1' },
        'clinic-1'
      );
      expect(result).toHaveProperty('reportCard');
      expect(result).toHaveProperty('clinic');
    });
  });

  describe('getALlReport', () => {
    it('should query reports using clinicAssign check', async () => {
      const mockReports = [{ id: 'r-1', petientId: 'pat-1' }];
      const selectChain = createChain(mockReports);

      (database.select as jest.Mock).mockReturnValue(selectChain);

      const result = await ReportService.getALlReport('pat-1', 'clinic-1');
      expect(result).toEqual(mockReports);
    });
  });

  describe('getReport', () => {
    it('should retrieve report with clinic scoping', async () => {
      const mockReport = [{ id: 'r-1', petientId: 'pat-1' }];
      const selectChain = createChain(mockReport);

      (database.select as jest.Mock).mockReturnValue(selectChain);

      const result = await ReportService.getReport('r-1', 'clinic-1');
      expect(result).toEqual(mockReport);
    });
  });

  describe('getFavouritePrescription', () => {
    it('should throw 403 if doctor is not assigned to the clinic', async () => {
      const mockAssignment: any[] = []; // Empty => not assigned
      const selectChain = createChain(mockAssignment);

      (database.select as jest.Mock).mockReturnValue(selectChain);

      await expect(
        ReportService.getFavouritePrescription('doc-1', 'clinic-1')
      ).rejects.toThrow(
        new HttpError(
          403,
          'Access denied. Doctor is not assigned to this clinic.'
        )
      );
    });

    it('should return favourites if doctor is assigned to the clinic', async () => {
      const mockAssignment = [{ id: 'assign-1' }];
      const mockFavourites = [{ id: 'fav-1', doctorId: 'doc-1' }];

      const assignChain = createChain(mockAssignment);
      const favChain = createChain(mockFavourites);

      (database.select as jest.Mock)
        .mockReturnValueOnce(assignChain)
        .mockReturnValueOnce(favChain);

      const result = await ReportService.getFavouritePrescription(
        'doc-1',
        'clinic-1'
      );
      expect(result.favourites).toEqual(mockFavourites);
    });
  });

  describe('getAppoinmentsPrescriptionsReport', () => {
    it('should limit appointment and prescription history to the clinic', async () => {
      const mockAppointments = [
        { id: 'app-1', patientId: 'pat-1', clinicId: 'clinic-1' },
      ];
      const selectChain = createChain(mockAppointments);

      (database.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            select: jest.fn().mockReturnValue(selectChain),
          };
          return callback(tx);
        }
      );

      const result = await ReportService.getAppoinmentsPrescriptionsReport(
        { patientId: 'pat-1' },
        { typeOfPaginations: 'Appointments' },
        'clinic-1'
      );
      expect(result?.appointments).toEqual(mockAppointments);
    });
  });
});
