import type { Patient } from '../repositories/SqlitePatientRepository';

export class PatientDomainService {
  /**
   * Encapsulates the pure business rule for whether a patient profile is considered "complete".
   */
  public isProfileComplete(patient: Patient): boolean {
    return Boolean(patient.name?.trim() && patient.phone?.trim());
  }

  /**
   * Encapsulates the pure business rule for validating search queries.
   */
  public validateSearchQuery(query: string): void {
    if (!query || query.length < 3) {
      throw new Error('Search query must be at least 3 characters long.');
    }
  }
}
