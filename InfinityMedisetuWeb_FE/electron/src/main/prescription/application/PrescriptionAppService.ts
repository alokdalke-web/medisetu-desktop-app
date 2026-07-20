import crypto from 'crypto';
import { SqlitePrescriptionRepository } from '../repositories/SqlitePrescriptionRepository';
import type { Prescription } from '../repositories/SqlitePrescriptionRepository';
import { PrescriptionDomainService } from '../domain/PrescriptionDomainService';
import { EventLogRepository } from '../../infrastructure/repositories/EventLogRepository';
import { TransactionManager } from '../../configurations/TransactionManager';

import { SqliteAppointmentRepository } from '../../appointment/repositories/SqliteAppointmentRepository';

export class PrescriptionAppService {
  private repository: SqlitePrescriptionRepository;
  private appointmentRepository: SqliteAppointmentRepository;
  private domainService: PrescriptionDomainService;
  private eventLogRepository: EventLogRepository;

  constructor() {
    this.repository = new SqlitePrescriptionRepository();
    this.appointmentRepository = new SqliteAppointmentRepository();
    this.domainService = new PrescriptionDomainService();
    this.eventLogRepository = new EventLogRepository();
  }

  /**
   * Creates a prescription locally. 
   * Orchestrates domain validation, and guarantees atomic writes using TransactionManager.
   */
  public async createPrescription(appointmentId: string, items: any[]) {
    // Look up the appointment to get patient, doctor, date
    const appointments = this.appointmentRepository.getClinicAppointments();
    const appointmentRow = appointments.find(a => a.appointmentId === appointmentId);
    
    if (!appointmentRow) {
      throw new Error(`Appointment not found for ID: ${appointmentId}`);
    }

    const newPrescription: Prescription = {
      id: appointmentId, // Use appointmentId as the primary key
      patient_id: appointmentRow.patientId,
      doctor_id: appointmentRow.doctor_id,
      date: appointmentRow.date,
      items
    };

    // 1. Run Pure Business Rules (Dosage and completeness validation)
    this.domainService.validatePrescription(newPrescription);

    // 2. Persist atomically
    await TransactionManager.run((tx) => {
      // Write to business table
      this.repository.create(tx, newPrescription);

      // Write to Event Log for the background sync engine
      this.eventLogRepository.insert(tx, {
        id: crypto.randomUUID(),
        action_type: 'PRESCRIPTION_CREATED',
        entity_type: 'prescription',
        entity_id: newPrescription.id,
        payload: JSON.stringify({
          eventId: crypto.randomUUID(),
          entityType: 'prescription',
          operation: 'CREATE',
          httpMethod: 'POST',
          endpoint: '/prescriptions',
          payload: {
            patientId: appointmentRow.patientId,
            doctorId: appointmentRow.doctor_id,
            appointmentId: appointmentId,
            clinicId: (appointmentRow as any).clinicId || '',
            items: items,
            symptoms: [],
            diagnosis: [],
            instructions: '',
            vitals: {}
          },
          headers: {}
        })
      });
    });

    return newPrescription;
  }

  public getPrescriptionsByPatient(patientId: string) {
    return this.repository.getByPatient(patientId);
  }

  public getPrescriptionByAppointment(appointmentId: string) {
    return this.repository.getByAppointment(appointmentId);
  }

  public async updatePrescription(appointmentId: string, data: any) {
    const existing = this.repository.getByAppointment(appointmentId);
    if (!existing) throw new Error("Prescription not found");

    const updatedItems = data.items || existing.items;

    await TransactionManager.run((tx) => {
      this.repository.update(tx, appointmentId, updatedItems);

      this.eventLogRepository.insert(tx, {
        id: crypto.randomUUID(),
        action_type: 'PRESCRIPTION_UPDATED',
        entity_type: 'prescription',
        entity_id: appointmentId,
        payload: JSON.stringify({
          eventId: crypto.randomUUID(),
          entityType: 'prescription',
          operation: 'UPDATE',
          httpMethod: 'PUT',
          endpoint: `/prescriptions/appointment/${appointmentId}`,
          payload: data,
          headers: {}
        })
      });
    });

    return { ...existing, items: updatedItems };
  }
}
