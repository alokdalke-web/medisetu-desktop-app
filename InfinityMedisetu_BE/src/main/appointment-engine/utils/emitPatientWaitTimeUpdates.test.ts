import { AppointmentDelayEntry } from '../interfaces';

// Mock the socketManager before importing the module under test
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));
jest.mock('../../../app', () => ({
  socketManager: {
    io: {
      to: mockTo,
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
}));

import { emitPatientWaitTimeUpdates } from './emitPatientWaitTimeUpdates';

describe('emitPatientWaitTimeUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits appointment.updated to each non-terminal patient room', () => {
    const appointments: AppointmentDelayEntry[] = [
      {
        appointmentId: 'appt-1',
        patientId: 'patient-1',
        userId: 'user-1',
        status: 'Upcoming',
        scheduledTime: '09:00',
        tokenNo: null,
        projectedStartTime: '09:15',
        estimatedWaitMinutes: 15,
        durationMinutes: 30,
      },
      {
        appointmentId: 'appt-2',
        patientId: 'patient-2',
        userId: 'user-2',
        status: 'Confirmed',
        scheduledTime: '09:30',
        tokenNo: null,
        projectedStartTime: '09:45',
        estimatedWaitMinutes: 15,
        durationMinutes: 30,
      },
    ];

    emitPatientWaitTimeUpdates(appointments);

    expect(mockTo).toHaveBeenCalledTimes(2);
    expect(mockTo).toHaveBeenCalledWith('user:user-1');
    expect(mockTo).toHaveBeenCalledWith('user:user-2');

    expect(mockEmit).toHaveBeenCalledTimes(2);
    expect(mockEmit).toHaveBeenCalledWith('appointment.updated', {
      appointmentId: 'appt-1',
      estimatedWaitMinutes: 15,
    });
    expect(mockEmit).toHaveBeenCalledWith('appointment.updated', {
      appointmentId: 'appt-2',
      estimatedWaitMinutes: 15,
    });
  });

  it('skips terminal status appointments (Completed, Cancelled, NoShow)', () => {
    const appointments: AppointmentDelayEntry[] = [
      {
        appointmentId: 'appt-done',
        patientId: 'patient-done',
        userId: 'user-done',
        status: 'Completed',
        scheduledTime: '08:00',
        tokenNo: null,
        projectedStartTime: '08:00',
        estimatedWaitMinutes: 0,
        durationMinutes: 30,
      },
      {
        appointmentId: 'appt-cancelled',
        patientId: 'patient-cancelled',
        userId: 'user-cancelled',
        status: 'Cancelled',
        scheduledTime: '08:30',
        tokenNo: null,
        projectedStartTime: '08:30',
        estimatedWaitMinutes: 0,
        durationMinutes: 30,
      },
      {
        appointmentId: 'appt-noshow',
        patientId: 'patient-noshow',
        userId: 'user-noshow',
        status: 'NoShow',
        scheduledTime: '09:00',
        tokenNo: null,
        projectedStartTime: '09:00',
        estimatedWaitMinutes: 0,
        durationMinutes: 30,
      },
      {
        appointmentId: 'appt-active',
        patientId: 'patient-active',
        userId: 'user-active',
        status: 'Upcoming',
        scheduledTime: '09:30',
        tokenNo: null,
        projectedStartTime: '09:45',
        estimatedWaitMinutes: 15,
        durationMinutes: 30,
      },
    ];

    emitPatientWaitTimeUpdates(appointments);

    // Only the active appointment should be emitted
    expect(mockTo).toHaveBeenCalledTimes(1);
    expect(mockTo).toHaveBeenCalledWith('user:user-active');
    expect(mockEmit).toHaveBeenCalledWith('appointment.updated', {
      appointmentId: 'appt-active',
      estimatedWaitMinutes: 15,
    });
  });

  it('includes Patient Arrived status in emission (non-terminal)', () => {
    const appointments: AppointmentDelayEntry[] = [
      {
        appointmentId: 'appt-arrived',
        patientId: 'patient-arrived',
        userId: 'user-arrived',
        status: 'Patient Arrived',
        scheduledTime: '09:00',
        tokenNo: null,
        projectedStartTime: '09:00',
        estimatedWaitMinutes: 0,
        durationMinutes: 30,
      },
    ];

    emitPatientWaitTimeUpdates(appointments);

    expect(mockTo).toHaveBeenCalledWith('user:user-arrived');
    expect(mockEmit).toHaveBeenCalledWith('appointment.updated', {
      appointmentId: 'appt-arrived',
      estimatedWaitMinutes: 0,
    });
  });

  it('handles empty appointments array gracefully', () => {
    emitPatientWaitTimeUpdates([]);

    expect(mockTo).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('continues emitting to other patients when one emission throws', () => {
    const logger = require('../../../utils/logger');

    // Make the first emit call throw
    mockEmit.mockImplementationOnce(() => {
      throw new Error('Socket error');
    });

    const appointments: AppointmentDelayEntry[] = [
      {
        appointmentId: 'appt-1',
        patientId: 'patient-1',
        userId: 'user-1',
        status: 'Upcoming',
        scheduledTime: '09:00',
        tokenNo: null,
        projectedStartTime: '09:15',
        estimatedWaitMinutes: 15,
        durationMinutes: 30,
      },
      {
        appointmentId: 'appt-2',
        patientId: 'patient-2',
        userId: 'user-2',
        status: 'Confirmed',
        scheduledTime: '09:30',
        tokenNo: null,
        projectedStartTime: '09:45',
        estimatedWaitMinutes: 15,
        durationMinutes: 30,
      },
    ];

    // Should not throw
    emitPatientWaitTimeUpdates(appointments);

    // Both rooms should be targeted
    expect(mockTo).toHaveBeenCalledTimes(2);
    // Warning should be logged for the failed one
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to emit appointment.updated'),
      expect.objectContaining({ appointmentId: 'appt-1' })
    );
  });
});
