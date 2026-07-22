import { SqliteClinicSymptomRepository } from '../repositories/SqliteClinicSymptomRepository';
import { randomUUID } from 'crypto';

export class ClinicSymptomAppService {
  private repository: SqliteClinicSymptomRepository;

  constructor() {
    this.repository = new SqliteClinicSymptomRepository();
  }

  public getClinicSymptoms(search?: string): any {
    const data = this.repository.getAll(search);
    return { success: true, result: data };
  }

  public createClinicSymptom(data: any): any {
    const newId = randomUUID();
    this.repository.create(data, newId);
    return { success: true, message: 'Clinic symptom created offline' };
  }
}

export const clinicSymptomAppService = new ClinicSymptomAppService();
