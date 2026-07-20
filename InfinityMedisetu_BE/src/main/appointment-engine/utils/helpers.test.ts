import {
  resolveAppointmentDuration,
  getRedisKey,
  isTerminalStatus,
  isShiftableStatus,
} from './helpers';

describe('appointment-engine/utils/helpers', () => {
  describe('resolveAppointmentDuration', () => {
    it('parses a valid varchar duration string', () => {
      expect(resolveAppointmentDuration('15', null)).toBe(15);
      expect(resolveAppointmentDuration('45', 20)).toBe(45);
    });

    it('falls back to slotMinutes when varchar is null', () => {
      expect(resolveAppointmentDuration(null, 20)).toBe(20);
    });

    it('falls back to slotMinutes when varchar is non-numeric', () => {
      expect(resolveAppointmentDuration('abc', 20)).toBe(20);
    });

    it('falls back to slotMinutes when varchar is empty string', () => {
      expect(resolveAppointmentDuration('', 25)).toBe(25);
    });

    it('falls back to slotMinutes when varchar is zero', () => {
      expect(resolveAppointmentDuration('0', 20)).toBe(20);
    });

    it('falls back to slotMinutes when varchar is negative', () => {
      expect(resolveAppointmentDuration('-5', 20)).toBe(20);
    });

    it('defaults to 30 when both are null', () => {
      expect(resolveAppointmentDuration(null, null)).toBe(30);
    });

    it('defaults to 30 when varchar is invalid and slotMinutes is zero', () => {
      expect(resolveAppointmentDuration('abc', 0)).toBe(30);
    });

    it('defaults to 30 when varchar is invalid and slotMinutes is negative', () => {
      expect(resolveAppointmentDuration('abc', -10)).toBe(30);
    });
  });

  describe('getRedisKey', () => {
    it('generates delay key with clinicId, doctorId, and date', () => {
      expect(getRedisKey('delay', 'clinic1', 'doctor1', '2025-01-15')).toBe(
        'appointment_engine:delay:clinic1:doctor1:2025-01-15'
      );
    });

    it('generates notified key with appointmentId', () => {
      expect(getRedisKey('notified', 'appt123')).toBe(
        'appointment_engine:notified:appt123'
      );
    });

    it('generates time_to_next key with clinicId and doctorId', () => {
      expect(getRedisKey('time_to_next', 'clinic1', 'doctor1')).toBe(
        'appointment_engine:time_to_next:clinic1:doctor1'
      );
    });

    it('handles type with no additional parts', () => {
      expect(getRedisKey('test')).toBe('appointment_engine:test');
    });
  });

  describe('isTerminalStatus', () => {
    it('returns true for Completed', () => {
      expect(isTerminalStatus('Completed')).toBe(true);
    });

    it('returns true for Cancelled', () => {
      expect(isTerminalStatus('Cancelled')).toBe(true);
    });

    it('returns true for NoShow', () => {
      expect(isTerminalStatus('NoShow')).toBe(true);
    });

    it('returns false for Upcoming', () => {
      expect(isTerminalStatus('Upcoming')).toBe(false);
    });

    it('returns false for Confirmed', () => {
      expect(isTerminalStatus('Confirmed')).toBe(false);
    });

    it('returns false for Patient Arrived', () => {
      expect(isTerminalStatus('Patient Arrived')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isTerminalStatus('completed')).toBe(false);
      expect(isTerminalStatus('CANCELLED')).toBe(false);
    });
  });

  describe('isShiftableStatus', () => {
    it('returns true for Upcoming', () => {
      expect(isShiftableStatus('Upcoming')).toBe(true);
    });

    it('returns true for Confirmed', () => {
      expect(isShiftableStatus('Confirmed')).toBe(true);
    });

    it('returns false for Completed', () => {
      expect(isShiftableStatus('Completed')).toBe(false);
    });

    it('returns false for Cancelled', () => {
      expect(isShiftableStatus('Cancelled')).toBe(false);
    });

    it('returns false for NoShow', () => {
      expect(isShiftableStatus('NoShow')).toBe(false);
    });

    it('returns false for Patient Arrived', () => {
      expect(isShiftableStatus('Patient Arrived')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isShiftableStatus('upcoming')).toBe(false);
      expect(isShiftableStatus('CONFIRMED')).toBe(false);
    });
  });
});
