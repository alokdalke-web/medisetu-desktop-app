import type { Prescription } from '../repositories/SqlitePrescriptionRepository';

export class PrescriptionDomainService {
  /**
   * Validates if a prescription is logically sound (pure offline rules).
   */
  public validatePrescription(prescription: Prescription): void {
    if (!prescription.patient_id || !prescription.doctor_id || !prescription.date) {
      throw new Error('Incomplete prescription details.');
    }

    if (!prescription.items || prescription.items.length === 0) {
      throw new Error('A prescription must contain at least one item.');
    }

    for (const item of prescription.items) {
      if (!item.medicine_id || !item.dosage || item.duration_days <= 0) {
        throw new Error('Invalid prescription item. Dosage and positive duration are required.');
      }
    }
  }
}
