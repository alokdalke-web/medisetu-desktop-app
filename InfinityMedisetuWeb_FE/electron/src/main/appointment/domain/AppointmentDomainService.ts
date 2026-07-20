import type { Appointment } from '../repositories/SqliteAppointmentRepository';

export class AppointmentDomainService {
  /**
   * Validates if a booking is logically sound (pure offline rules).
   */
  public validateBooking(appointment: Appointment, existingQueue: Appointment[]): void {
    // 1. Basic structural validation
    if (!appointment.patient_id || !appointment.doctor_id || !appointment.time_slot) {
      throw new Error('Incomplete appointment details.');
    }

    // 2. Conflict checking
    const conflict = existingQueue.find(
      (appt) => appt.time_slot === appointment.time_slot && appt.status !== 'Cancelled'
    );

    if (conflict) {
      throw new Error('Time slot is already booked offline.');
    }
  }
}
