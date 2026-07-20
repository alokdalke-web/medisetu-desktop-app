import { PatientService } from '../services/patient.service';
import { database } from '../../../configurations/dbConnection';
import { AppointmentService } from '../../appointments/services/appointment.service';
import {
  createRazorpaySplitOrder,
  createRazorpayAppointmentOrder,
  verifyRazorpayPayment,
} from '../../../utils/razorpay';
import { envConfig } from '../../../utils/envConfig';

jest.mock('../../../configurations/dbConnection');
jest.mock('../../../utils/logger');
jest.mock('../../appointments/services/appointment.service');
jest.mock('../../../utils/razorpay');
jest.mock('../../../utils/notificationHelpers');
jest.mock('../../../utils/appointmentRealtime');

describe('PatientService.searchDirectory Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createChain = (finalValue: any) => {
    const chain: any = {};
    const methods = [
      'from',
      'leftJoin',
      'innerJoin',
      'where',
      '$dynamic',
      'orderBy',
      'limit',
      'offset',
    ];
    methods.forEach((method) => {
      chain[method] = jest.fn().mockImplementation(() => chain);
    });
    chain.then = (resolve: any) => resolve(finalValue);
    return chain;
  };

  it('should successfully search the directory and calculate proximity distance when lat/lng are provided', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const mockData = [
      {
        doctor: {
          id: 'doctor-1',
          name: 'Dr. Smith',
          totalLikes: 0,
          averageRating: '4.50',
          reviewCount: 12,
        },
        clinic: { id: 'clinic-1', clinicName: 'Healthy Care' },
        distance: 4.5,
      },
    ];
    const mockCount = [{ count: 1 }];
    const mockServices = [
      {
        id: 's-1',
        clinicId: 'clinic-1',
        serviceName: 'Consultation',
        price: 500,
        currency: 'INR',
        additionalServices: 'None',
        durationDays: 30,
      },
    ];

    const dataChain = createChain(mockData);
    const countChain = createChain(mockCount);
    const serviceChain = createChain(mockServices);

    (database.select as jest.Mock)
      .mockReturnValueOnce(dataChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(serviceChain);

    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockResolvedValue({
      slots: [
        {
          start: `${todayStr}T10:00:00`,
          end: `${todayStr}T10:30:00`,
          status: 'available',
        },
      ],
    });

    const result = await PatientService.searchDirectory({
      search: 'Smith',
      speciality: 'Cardiologist',
      latitude: 19.076,
      longitude: 72.8777,
      radius: 10,
      pageNumber: '1',
      pageSize: '10',
      date: '2026-06-16',
    });

    expect(database.select).toHaveBeenCalledTimes(3);
    expect(result.data[0].nextAvailableSlot).toEqual({
      date: todayStr,
      time: '10:00 AM',
      endTime: '10:30 AM',
      start: `${todayStr}T10:00:00`,
      end: `${todayStr}T10:30:00`,
      availableTokens: null,
      totalTokens: null,
    });
    expect(result.data[0].clinic.services).toEqual(mockServices);
  });

  it('should search the directory without distance field when lat/lng are not provided', async () => {
    const mockData = [
      {
        doctor: {
          id: 'doctor-2',
          name: 'Dr. Jones',
          totalLikes: 0,
          averageRating: '4.20',
          reviewCount: 8,
        },
        clinic: { id: 'clinic-2', clinicName: 'Wellness Clinic' },
      },
    ];
    const mockCount = [{ count: 1 }];
    const mockServices: any[] = [];

    const dataChain = createChain(mockData);
    const countChain = createChain(mockCount);
    const serviceChain = createChain(mockServices);

    (database.select as jest.Mock)
      .mockReturnValueOnce(dataChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(serviceChain);

    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockResolvedValue({
      slots: [],
    });

    const result = await PatientService.searchDirectory({
      search: 'Jones',
      radius: 10,
      pageNumber: '1',
      pageSize: '10',
    });

    expect(database.select).toHaveBeenCalledTimes(3);
    expect(result.data[0].nextAvailableSlot).toBeNull();
    expect(result.data[0].clinic.services).toEqual(mockServices);
  });

  it('should successfully search the directory and filter by city when city is provided', async () => {
    const mockData = [
      {
        doctor: {
          id: 'doctor-3',
          name: 'Dr. Adams',
          totalLikes: 0,
          averageRating: '4.80',
          reviewCount: 5,
        },
        clinic: { id: 'clinic-3', clinicName: 'City Clinic', city: 'Mumbai' },
      },
    ];
    const mockCount = [{ count: 1 }];
    const mockServices: any[] = [];

    const dataChain = createChain(mockData);
    const countChain = createChain(mockCount);
    const serviceChain = createChain(mockServices);

    (database.select as jest.Mock)
      .mockReturnValueOnce(dataChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(serviceChain);

    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockResolvedValue({
      slots: [],
    });

    const result = await PatientService.searchDirectory({
      city: 'Mumbai',
      radius: 10,
      pageNumber: '1',
      pageSize: '10',
    });

    expect(database.select).toHaveBeenCalledTimes(3);
    expect(result.data[0].clinic.city).toEqual('Mumbai');
  });

  it('should filter search results by availability and correctly paginate in-memory when available=true is passed', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const mockData = [
      {
        doctor: {
          id: 'doctor-1',
          name: 'Dr. Available',
          totalLikes: 0,
          averageRating: '4.80',
          reviewCount: 15,
        },
        clinic: { id: 'clinic-1', clinicName: 'Active Care' },
      },
      {
        doctor: {
          id: 'doctor-2',
          name: 'Dr. Busy',
          totalLikes: 0,
          averageRating: '3.90',
          reviewCount: 5,
        },
        clinic: { id: 'clinic-2', clinicName: 'Busy Clinic' },
      },
    ];
    const mockServices = [
      {
        id: 's-1',
        clinicId: 'clinic-1',
        serviceName: 'Consultation',
        price: 500,
        currency: 'INR',
        additionalServices: 'None',
        durationDays: 30,
      },
    ];

    const dataChain = createChain(mockData);
    const serviceChain = createChain(mockServices);

    (database.select as jest.Mock)
      .mockReturnValueOnce(dataChain)
      .mockReturnValueOnce(serviceChain);

    // Doctor 1 has available slots
    // Doctor 2 has no slots
    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockImplementation(async (clinicId, query, params) => {
      if (params.doctorId === 'doctor-1') {
        return {
          slots: [
            {
              start: `${todayStr}T14:30:00`,
              end: `${todayStr}T15:00:00`,
              status: 'available',
            },
          ],
        };
      }
      return { slots: [] };
    });

    const result = await PatientService.searchDirectory({
      available: true,
      date: todayStr,
      radius: 10,
      pageNumber: '1',
      pageSize: '10',
    });

    expect(database.select).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].doctor.id).toBe('doctor-1');
    expect(result.data[0].nextAvailableSlot).toEqual({
      date: todayStr,
      time: '2:30 PM',
      endTime: '3:00 PM',
      start: `${todayStr}T14:30:00`,
      end: `${todayStr}T15:00:00`,
      availableTokens: null,
      totalTokens: null,
    });
    expect(result.data[0].clinic.services).toEqual(mockServices);
    expect(result.pagination.totalRecords).toBe(1);
  });

  it('should return token capacity and auto-assigned token details for token-based slots', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const mockData = [
      {
        doctor: {
          id: 'doctor-1',
          name: 'Dr. Token',
          totalLikes: 0,
          averageRating: '4.70',
          reviewCount: 18,
        },
        clinic: { id: 'clinic-1', clinicName: 'Token Care' },
        distance: 2.0,
      },
    ];
    const mockCount = [{ count: 1 }];
    const mockServices = [
      {
        id: 's-1',
        clinicId: 'clinic-1',
        serviceName: 'Consultation',
        price: 500,
        currency: 'INR',
        additionalServices: 'None',
        durationDays: 30,
      },
    ];

    const dataChain = createChain(mockData);
    const countChain = createChain(mockCount);
    const serviceChain = createChain(mockServices);

    (database.select as jest.Mock)
      .mockReturnValueOnce(dataChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(serviceChain);

    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockResolvedValue({
      slots: [
        {
          start: `${todayStr}T09:00:00`,
          end: `${todayStr}T13:00:00`,
          totalTokens: 30,
          availableTokens: 25,
          status: 'available',
        },
      ],
    });

    const result = await PatientService.searchDirectory({
      search: 'Token',
      radius: 10,
      pageNumber: '1',
      pageSize: '10',
    });

    expect(result.data[0].nextAvailableSlot).toEqual({
      date: todayStr,
      time: '9:00 AM',
      endTime: '1:00 PM',
      start: `${todayStr}T09:00:00`,
      end: `${todayStr}T13:00:00`,
      availableTokens: 25,
      totalTokens: 30,
    });
  });

  it('should include totalLikes in select and order query by totalLikes descending and distance ascending', async () => {
    const mockData = [
      {
        doctor: {
          id: 'doctor-liked',
          name: 'Dr. Liked',
          totalLikes: 25,
          averageRating: '4.90',
          reviewCount: 32,
        },
        clinic: { id: 'clinic-1', clinicName: 'Care Center' },
        distance: 1.2,
      },
    ];
    const mockCount = [{ count: 1 }];
    const mockServices: any[] = [];

    const dataChain = createChain(mockData);
    const countChain = createChain(mockCount);
    const serviceChain = createChain(mockServices);

    (database.select as jest.Mock)
      .mockReturnValueOnce(dataChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(serviceChain);

    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockResolvedValue({
      slots: [],
    });

    const result = await PatientService.searchDirectory({
      search: 'Liked',
      latitude: 19.076,
      longitude: 72.8777,
      radius: 10,
      pageNumber: '1',
      pageSize: '10',
    });

    expect(database.select).toHaveBeenCalled();
    expect(dataChain.orderBy).toHaveBeenCalled();
    expect(result.data[0].doctor.totalLikes).toBe(25);
  });
});

describe('PatientService.getDoctorPublicProfile Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createChain = (finalValue: any) => {
    const chain: any = {};
    const methods = [
      'from',
      'leftJoin',
      'innerJoin',
      'where',
      '$dynamic',
      'orderBy',
      'limit',
      'offset',
    ];
    methods.forEach((method) => {
      chain[method] = jest.fn().mockImplementation(() => chain);
    });
    chain.then = (resolve: any) => resolve(finalValue);
    return chain;
  };

  it('should fetch doctor public profile, clinics, qualifications and active services, and group services by clinic', async () => {
    const mockDoctor = {
      id: 'doctor-1',
      name: 'Dr. John Doe',
      gender: 'Male',
      profileImage: 'doctor.jpg',
      qualification: 'MBBS',
      yearsOfExperience: 10,
      speciality: 'General Medicine',
      registrationNumber: 'REG123',
      isVerified: true,
      about: 'Highly experienced doctor',
      averageRating: '4.60',
      reviewCount: 20,
    };

    const mockQualifications = [
      {
        id: 'q-1',
        userId: 'doctor-1',
        degree: 'MBBS',
        college: 'Medical College',
        year: '2015',
      },
    ];

    const mockClinics = [
      { id: 'clinic-1', clinicName: 'Clinic One' },
      { id: 'clinic-2', clinicName: 'Clinic Two' },
    ];

    const mockServices = [
      {
        id: 's-1',
        clinicId: 'clinic-1',
        serviceName: 'Consultation',
        price: 500,
        currency: 'INR',
        additionalServices: 'None',
        durationDays: 30,
      },
      {
        id: 's-2',
        clinicId: 'clinic-1',
        serviceName: 'Follow Up',
        price: 300,
        currency: 'INR',
        additionalServices: 'None',
        durationDays: 30,
      },
    ];

    const mockPatientCount = [{ count: 5 }];
    const mockFavorite = [{ id: 'fav-1' }];

    const profileChain = createChain([mockDoctor]);
    const qualificationChain = createChain(mockQualifications);
    const clinicChain = createChain(mockClinics);
    const serviceChain = createChain(mockServices);
    const countChain = createChain(mockPatientCount);
    const favoriteChain = createChain(mockFavorite);

    (database.select as jest.Mock)
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(qualificationChain)
      .mockReturnValueOnce(clinicChain)
      .mockReturnValueOnce(serviceChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(favoriteChain);

    const result = await PatientService.getDoctorPublicProfile(
      'doctor-1',
      'patient-1'
    );

    expect(database.select).toHaveBeenCalledTimes(6);
    expect(result).toEqual({
      ...mockDoctor,
      qualifications: mockQualifications,
      clinics: [
        { ...mockClinics[0], services: [mockServices[0], mockServices[1]] },
        { ...mockClinics[1], services: [] },
      ],
      totalPatients: 5,
      isFavorite: true,
    });
  });

  it('should throw an error if doctor profile is not found', async () => {
    const profileChain = createChain([]);

    (database.select as jest.Mock).mockReturnValueOnce(profileChain);

    await expect(
      PatientService.getDoctorPublicProfile('non-existent-doctor')
    ).rejects.toThrow('Doctor profile not found or inactive');
  });
});

describe('PatientService.getDoctorPublicSlots Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty slots list if the requested date is in the past', async () => {
    const now = new Date();
    const istDateParts = now
      .toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .split('/');
    const istToday = new Date(
      `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}T00:00:00Z`
    );
    const yesterday = new Date(istToday);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = await PatientService.getDoctorPublicSlots('doctor-1', {
      date: yesterdayStr,
      clinicId: 'clinic-1',
    });

    expect(result).toEqual({ slots: [] });
    expect(AppointmentService.getAvailableSlotsForDate).not.toHaveBeenCalled();
  });

  it('should pass current IST time as time filter when the requested date is today', async () => {
    const now = new Date();
    const istDateParts = now
      .toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .split('/');
    const istTodayStr = `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}`;

    const expectedTime = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mockSlotsResult = {
      slots: [
        {
          start: `${istTodayStr}T10:00:00`,
          end: `${istTodayStr}T10:30:00`,
          source: 'availability',
          status: 'available',
        },
      ],
    };
    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockResolvedValue(mockSlotsResult);

    const result = await PatientService.getDoctorPublicSlots('doctor-1', {
      date: istTodayStr,
      clinicId: 'clinic-1',
    });

    expect(AppointmentService.getAvailableSlotsForDate).toHaveBeenCalledWith(
      'clinic-1',
      {
        date: istTodayStr,
        time: expectedTime,
      },
      { doctorId: 'doctor-1' }
    );
    expect(result).toEqual(mockSlotsResult);
  });

  it('should call slots service without time filter if requested date is in the future', async () => {
    const now = new Date();
    const istDateParts = now
      .toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .split('/');
    const istToday = new Date(
      `${istDateParts[2]}-${istDateParts[1]}-${istDateParts[0]}T00:00:00Z`
    );
    const tomorrow = new Date(istToday);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const mockSlotsResult = {
      slots: [
        {
          start: `${tomorrowStr}T10:00:00`,
          end: `${tomorrowStr}T10:30:00`,
          source: 'availability',
          status: 'available',
        },
      ],
    };
    (
      AppointmentService.getAvailableSlotsForDate as jest.Mock
    ).mockResolvedValue(mockSlotsResult);

    const result = await PatientService.getDoctorPublicSlots('doctor-1', {
      date: tomorrowStr,
      clinicId: 'clinic-1',
    });

    expect(AppointmentService.getAvailableSlotsForDate).toHaveBeenCalledWith(
      'clinic-1',
      {
        date: tomorrowStr,
        time: undefined,
      },
      { doctorId: 'doctor-1' }
    );
    expect(result).toEqual(mockSlotsResult);
  });
});

describe('PatientService.bookPatientAppointment & verifyAppointmentPayment Route Tests', () => {
  const createUpdateChain = () => {
    const chain: any = {};
    const methods = ['set', 'where'];
    methods.forEach((method) => {
      chain[method] = jest.fn().mockImplementation(() => chain);
    });
    chain.then = (resolve: any) => resolve(chain);
    return chain;
  };

  const createDeleteChain = () => {
    const chain: any = {};
    const methods = ['where'];
    methods.forEach((method) => {
      chain[method] = jest.fn().mockImplementation(() => chain);
    });
    chain.then = (resolve: any) => resolve(chain);
    return chain;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (database.update as jest.Mock).mockReturnValue(createUpdateChain());
    (database.delete as jest.Mock).mockReturnValue(createDeleteChain());
  });

  const createChain = (finalValue: any) => {
    const chain: any = {};
    const methods = [
      'from',
      'where',
      'limit',
      'select',
      'orderBy',
      'leftJoin',
      'innerJoin',
    ];
    methods.forEach((method) => {
      chain[method] = jest.fn().mockImplementation(() => chain);
    });
    chain.then = (resolve: any) => resolve(finalValue);
    return chain;
  };

  describe('bookPatientAppointment', () => {
    it('should throw 400 error if ENABLE_RAZORPAY_ROUTE is true and clinic Route status is not ACTIVE', async () => {
      envConfig.ENABLE_RAZORPAY_ROUTE = true;
      const mockClinic = [
        { id: 'clinic-123', razorpayAccountId: null, routeStatus: 'INACTIVE' },
      ];
      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockClinic)
      );

      await expect(
        PatientService.bookPatientAppointment('user-123', {
          doctorId: 'doctor-123',
          clinicId: 'clinic-123',
          clinicServiceId: 'service-123',
          appointmentDate: '2026-06-20',
          appointmentTime: '10:00 AM',
          patientId: 'user-123',
          paymentMode: 'razorpay',
          price: '500',
        })
      ).rejects.toThrow('Online payment is not enabled for this clinic.');
    });

    it('should succeed and create split order if ENABLE_RAZORPAY_ROUTE is true and clinic Route status is ACTIVE', async () => {
      envConfig.ENABLE_RAZORPAY_ROUTE = true;
      const mockClinic = [
        {
          id: 'clinic-123',
          razorpayAccountId: 'acc_123',
          routeStatus: 'ACTIVE',
        },
      ];
      const mockCommission = [
        { commissionType: 'percentage', commissionValue: '10.00' },
      ];
      const mockAppointment = { id: 'apt-123', patientId: 'user-123' };

      // Mock database calls: Clinic selection, Commission selection, Family links check (bypassed if patientId === userId)
      (database.select as jest.Mock)
        .mockReturnValueOnce(createChain(mockClinic))
        .mockReturnValueOnce(createChain(mockCommission));

      // Mock AppointmentService.createAppointment
      (AppointmentService.createAppointment as jest.Mock).mockResolvedValue(
        mockAppointment
      );

      // Mock Razorpay split order creation
      (createRazorpaySplitOrder as jest.Mock).mockResolvedValue({
        id: 'order_123',
        amount: 50000,
        currency: 'INR',
      });

      const result = await PatientService.bookPatientAppointment('user-123', {
        doctorId: 'doctor-123',
        clinicId: 'clinic-123',
        clinicServiceId: 'service-123',
        appointmentDate: '2026-06-20',
        appointmentTime: '10:00 AM',
        patientId: 'user-123',
        paymentMode: 'razorpay',
        price: '500',
      });

      expect(createRazorpaySplitOrder).toHaveBeenCalledWith(
        500,
        'acc_123',
        450, // 500 - 10% commission platform fee
        'apt-123',
        'clinic-123',
        'user-123'
      );
      expect(result.requiresPayment).toBe(true);
      expect(result.paymentDetails?.orderId).toBe('order_123');
    });

    it('should succeed and create regular order if ENABLE_RAZORPAY_ROUTE is false, even if clinic Route status is not ACTIVE', async () => {
      envConfig.ENABLE_RAZORPAY_ROUTE = false;
      const mockClinic = [
        {
          id: 'clinic-123',
          razorpayAccountId: null,
          routeStatus: 'INACTIVE',
        },
      ];
      const mockAppointment = { id: 'apt-123', patientId: 'user-123' };

      // Mock database calls
      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockClinic)
      );

      // Mock AppointmentService.createAppointment
      (AppointmentService.createAppointment as jest.Mock).mockResolvedValue(
        mockAppointment
      );

      // Mock Razorpay regular order creation
      (createRazorpayAppointmentOrder as jest.Mock).mockResolvedValue({
        id: 'order_regular_123',
        amount: 50000,
        currency: 'INR',
      });

      const result = await PatientService.bookPatientAppointment('user-123', {
        doctorId: 'doctor-123',
        clinicId: 'clinic-123',
        clinicServiceId: 'service-123',
        appointmentDate: '2026-06-20',
        appointmentTime: '10:00 AM',
        patientId: 'user-123',
        paymentMode: 'razorpay',
        price: '500',
      });

      expect(createRazorpayAppointmentOrder).toHaveBeenCalledWith(
        500,
        'apt-123',
        'clinic-123',
        'user-123'
      );
      expect(result.requiresPayment).toBe(true);
      expect(result.paymentDetails?.orderId).toBe('order_regular_123');
    });
  });

  describe('verifyAppointmentPayment', () => {
    it('should verify payment successfully and confirm the appointment', async () => {
      const mockAppointment = [
        {
          id: 'apt-123',
          patientId: 'user-123',
          clinicId: 'clinic-123',
          appointmentStatus: 'Pending',
        },
      ];
      (database.select as jest.Mock)
        .mockReturnValueOnce(createChain(mockAppointment)) // for verifyAppointmentPayment select
        .mockReturnValueOnce(createChain(mockAppointment)); // for confirmPaymentAndAppoint select

      (verifyRazorpayPayment as jest.Mock).mockReturnValue(true);

      // Mock transaction executer
      (database.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const mockTx = {
            update: jest.fn().mockImplementation(() => mockTx),
            set: jest.fn().mockImplementation(() => mockTx),
            where: jest.fn().mockImplementation(() => mockTx),
            insert: jest.fn().mockImplementation(() => mockTx),
            values: jest.fn().mockImplementation(() => mockTx),
            delete: jest.fn().mockImplementation(() => mockTx),
          };
          return await callback(mockTx);
        }
      );

      const result = await PatientService.verifyAppointmentPayment('user-123', {
        appointmentId: 'apt-123',
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'sig_123',
      });

      expect(verifyRazorpayPayment).toHaveBeenCalledWith(
        'order_123',
        'pay_123',
        'sig_123'
      );
      expect(result.success).toBe(true);
    });

    it('should throw 400 error on invalid signature', async () => {
      const mockAppointment = [
        {
          id: 'apt-123',
          patientId: 'user-123',
          clinicId: 'clinic-123',
          appointmentStatus: 'Pending',
        },
      ];
      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockAppointment)
      );
      (verifyRazorpayPayment as jest.Mock).mockReturnValue(false);

      await expect(
        PatientService.verifyAppointmentPayment('user-123', {
          appointmentId: 'apt-123',
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'sig_123',
        })
      ).rejects.toThrow('Invalid payment signature');
    });
  });

  describe('confirmPaymentAndAppoint', () => {
    it('should process payment successfully', async () => {
      const mockAppointment = [
        {
          id: 'apt-123',
          patientId: 'user-123',
          clinicId: 'clinic-123',
          appointmentStatus: 'Pending',
          price: '500',
          paymentStatus: 'Pending',
        },
      ];

      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockAppointment)
      );

      const mockTx = {
        update: jest.fn().mockImplementation(() => mockTx),
        set: jest.fn().mockImplementation(() => mockTx),
        where: jest.fn().mockImplementation(() => mockTx),
        insert: jest.fn().mockImplementation(() => mockTx),
        values: jest.fn().mockImplementation(() => mockTx),
      };

      (database.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        }
      );

      const result = await PatientService.confirmPaymentAndAppoint(
        'apt-123',
        'pay_123',
        'user-123'
      );
      expect(result.success).toBe(true);
    });

    it('should return already paid if paymentStatus is Paid', async () => {
      const mockAppointment = [
        {
          id: 'apt-123',
          patientId: 'user-123',
          clinicId: 'clinic-123',
          appointmentStatus: 'Pending',
          price: '500',
          paymentStatus: 'Paid',
        },
      ];
      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockAppointment)
      );

      const result = await PatientService.confirmPaymentAndAppoint(
        'apt-123',
        'pay_123',
        'user-123'
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Already paid');
    });
  });

  describe('handlePaymentFailure', () => {
    it('should cancel appointment successfully on failure', async () => {
      const mockAppointment = [
        {
          id: 'apt-123',
          patientId: 'user-123',
          appointmentStatus: 'Pending',
        },
      ];
      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockAppointment)
      );

      const mockTx = {
        update: jest.fn().mockImplementation(() => mockTx),
        set: jest.fn().mockImplementation(() => mockTx),
        where: jest.fn().mockImplementation(() => mockTx),
        insert: jest.fn().mockImplementation(() => mockTx),
        values: jest.fn().mockImplementation(() => mockTx),
      };

      (database.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        }
      );

      const result = await PatientService.handlePaymentFailure(
        'apt-123',
        'pay_123',
        'user-123'
      );
      expect(result.success).toBe(true);
    });

    it('should return already cancelled if status is Cancelled', async () => {
      const mockAppointment = [
        {
          id: 'apt-123',
          patientId: 'user-123',
          appointmentStatus: 'Cancelled',
        },
      ];
      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockAppointment)
      );

      const result = await PatientService.handlePaymentFailure(
        'apt-123',
        'pay_123',
        'user-123'
      );
      expect(result.message).toBe('Already cancelled');
    });
  });

  describe('PatientService.toggleDoctorFavorite Unit Tests', () => {
    const createInsertChain = () => {
      const chain: any = {};
      const methods = ['values'];
      methods.forEach((method) => {
        chain[method] = jest.fn().mockImplementation(() => chain);
      });
      chain.then = (resolve: any) => resolve(chain);
      return chain;
    };

    beforeEach(() => {
      (database.insert as jest.Mock).mockReturnValue(createInsertChain());
    });

    it('should add to favorites if not already favorited', async () => {
      const mockDoctor = [{ id: 'doctor-1' }];
      const mockExisting: any[] = [];

      (database.select as jest.Mock)
        .mockReturnValueOnce(createChain(mockDoctor))
        .mockReturnValueOnce(createChain(mockExisting));

      const result = await PatientService.toggleDoctorFavorite(
        'patient-1',
        'doctor-1'
      );

      expect(result).toEqual({ isFavorite: true });
      expect(database.insert).toHaveBeenCalled();
    });

    it('should remove from favorites if already favorited', async () => {
      const mockDoctor = [{ id: 'doctor-1' }];
      const mockExisting = [{ id: 'fav-1' }];

      (database.select as jest.Mock)
        .mockReturnValueOnce(createChain(mockDoctor))
        .mockReturnValueOnce(createChain(mockExisting));

      const result = await PatientService.toggleDoctorFavorite(
        'patient-1',
        'doctor-1'
      );

      expect(result).toEqual({ isFavorite: false });
      expect(database.delete).toHaveBeenCalled();
    });

    it('should throw 404 error if doctor does not exist', async () => {
      const mockDoctor: any[] = [];

      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockDoctor)
      );

      await expect(
        PatientService.toggleDoctorFavorite('patient-1', 'non-existent-doctor')
      ).rejects.toThrow('Doctor not found or inactive');
    });
  });

  describe('PatientService.getPatientAppointmentDetail Unit Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve appointment details including review if it exists', async () => {
      const mockAppointment = [
        {
          id: 'apt-123',
          patientId: 'user-123',
          clinicId: 'clinic-123',
        },
      ];
      const mockDetails = {
        id: 'user-123',
        name: 'John Doe',
        appointment: {
          id: 'apt-123',
          appointmentStatus: 'Completed',
        },
        review: {
          id: 'rev-123',
          rating: 5,
          reviewText: 'Great!',
        },
      };

      (database.select as jest.Mock).mockReturnValueOnce(
        createChain(mockAppointment)
      );
      (AppointmentService.getAppointment as jest.Mock).mockResolvedValue(
        mockDetails
      );

      const result = await PatientService.getPatientAppointmentDetail(
        'user-123',
        'apt-123'
      );

      expect(result).toBeDefined();
      expect(result.review).toEqual({
        id: 'rev-123',
        rating: 5,
        reviewText: 'Great!',
      });
    });
  });

  describe('PatientService.listPatientAppointments Unit Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should query with upcomingOnly filter and exclude past appointments', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          appointmentDate: new Date(),
          appointmentTime: '10:00 AM',
          appointmentStatus: 'Confirmed',
        },
      ];

      (database.select as jest.Mock).mockReturnValue(
        createChain(mockAppointments)
      );

      const result = await PatientService.listPatientAppointments(
        'user-123',
        'patient-123',
        {
          pageNumber: '1',
          pageSize: '10',
          upcomingOnly: true,
        }
      );

      expect(result).toBeDefined();
    });

    it('should query with pastOnly filter and exclude future appointments', async () => {
      const mockAppointments = [
        {
          id: 'apt-2',
          appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          appointmentTime: '10:00 AM',
          appointmentStatus: 'Confirmed',
        },
      ];

      (database.select as jest.Mock).mockReturnValue(
        createChain(mockAppointments)
      );

      const result = await PatientService.listPatientAppointments(
        'user-123',
        'patient-123',
        {
          pageNumber: '1',
          pageSize: '10',
          pastOnly: true,
        }
      );

      expect(result).toBeDefined();
    });

    it('should apply asc order on appointmentDate and appointmentTime when sortBy is appointmentDate and sortOrder is asc', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          appointmentDate: new Date(),
          appointmentTime: '10:00 AM',
          appointmentStatus: 'Confirmed',
        },
      ];

      const chain = createChain(mockAppointments);
      (database.select as jest.Mock).mockReturnValue(chain);

      await PatientService.listPatientAppointments('user-123', 'patient-123', {
        pageNumber: '1',
        pageSize: '10',
        sortBy: 'appointmentDate',
        sortOrder: 'asc',
      });

      expect(database.select).toHaveBeenCalled();
      expect(chain.orderBy).toHaveBeenCalled();
    });

    it('should apply desc order on createdAt when sortBy is createdAt and sortOrder is desc', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          appointmentDate: new Date(),
          appointmentTime: '10:00 AM',
          appointmentStatus: 'Confirmed',
        },
      ];

      const chain = createChain(mockAppointments);
      (database.select as jest.Mock).mockReturnValue(chain);

      await PatientService.listPatientAppointments('user-123', 'patient-123', {
        pageNumber: '1',
        pageSize: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(database.select).toHaveBeenCalled();
      expect(chain.orderBy).toHaveBeenCalled();
    });
  });

  describe('PatientService.listFavoriteDoctors Unit Tests', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should successfully retrieve favorite doctors with pagination info', async () => {
      const mockFavorite = [{ doctorId: 'doctor-1' }];
      const mockCount = [{ count: 1 }];
      const mockProfile = {
        id: 'doctor-1',
        name: 'Dr. John Doe',
        isFavorite: true,
      };

      (database.select as jest.Mock)
        .mockReturnValueOnce(createChain(mockFavorite))
        .mockReturnValueOnce(createChain(mockCount));

      const spy = jest
        .spyOn(PatientService, 'getDoctorPublicProfile')
        .mockResolvedValue(mockProfile as any);

      const result = await PatientService.listFavoriteDoctors('patient-1', {
        pageNumber: '1',
        pageSize: '10',
      });

      expect(result.data).toEqual([mockProfile]);
      expect(result.pagination).toEqual({
        totalRecords: 1,
        totalPages: 1,
        pageNumber: 1,
        pageSize: 10,
      });
      expect(spy).toHaveBeenCalledWith('doctor-1', 'patient-1');
    });

    it('should return empty list when there are no favorites', async () => {
      const mockFavorite: any[] = [];
      const mockCount = [{ count: 0 }];

      (database.select as jest.Mock)
        .mockReturnValueOnce(createChain(mockFavorite))
        .mockReturnValueOnce(createChain(mockCount));

      const result = await PatientService.listFavoriteDoctors('patient-1', {
        pageNumber: '1',
        pageSize: '10',
      });

      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        totalRecords: 0,
        totalPages: 0,
        pageNumber: 1,
        pageSize: 10,
      });
    });
  });
});
