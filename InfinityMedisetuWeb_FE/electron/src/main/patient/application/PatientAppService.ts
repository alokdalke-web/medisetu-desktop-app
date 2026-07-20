import { SqlitePatientRepository } from '../repositories/SqlitePatientRepository';
import type { Patient } from '../repositories/SqlitePatientRepository';
import { PatientDomainService } from '../domain/PatientDomainService';
import { TransactionManager } from '../../configurations/TransactionManager';
import { EventLogRepository } from '../../infrastructure/repositories/EventLogRepository';
import crypto from 'crypto';

export class PatientAppService {
  private repository: SqlitePatientRepository;
  private domainService: PatientDomainService;
  private eventLogRepository: EventLogRepository;

  constructor() {
    this.repository = new SqlitePatientRepository();
    this.domainService = new PatientDomainService();
    this.eventLogRepository = new EventLogRepository();
  }

  /**
   * Orchestrates the search workflow by validating the request and querying the repository.
   */
  public searchPatients(query: string): Patient[] {
    // 1. Domain Validation
    this.domainService.validateSearchQuery(query);
    
    // 2. Repository Fetch
    return this.repository.search(query);
  }

  /**
   * Orchestrates fetching a profile and appending domain-derived business logic flags.
   */
  public getPatientProfile(id: string) {
    const patient = this.repository.findById(id);
    if (!patient) throw new Error('Patient not found');

    let profileData = {};
    if (patient.profile_data) {
      try {
        profileData = JSON.parse(patient.profile_data);
      } catch (e) {
        // ignore JSON parse errors
      }
    }

    return {
      ...profileData,
      ...patient,
      isProfileComplete: this.domainService.isProfileComplete(patient)
    };
  }

  public async createPatient(data: any): Promise<Patient> {
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      name: data.name,
      phone: data.mobile || data.phone || '',
      created_at: new Date().toISOString(),
      sync_status: 'pending',
      profile_data: JSON.stringify(data)
    };

    await TransactionManager.run((tx) => {
      // 1. Insert patient
      this.repository.create(tx, newPatient);
      
      // 2. Log generic event for sync engine
      const eventId = crypto.randomUUID();
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'CREATE',
        entity_type: 'PATIENT',
        entity_id: newPatient.id,
        payload: JSON.stringify({
          eventId,
          entityType: 'patient',
          operation: 'CREATE',
          httpMethod: 'POST',
          endpoint: '/patient',
          payload: {
            ...data,
            gender: data.gender || 'Other',
            age: data.age ? Number(data.age) : 0,
            city: data.city || 'Unknown',
            state: data.state || 'Unknown',
          },
          headers: {}
        })
      });
    });

    return newPatient;
  }

  public async updatePatient(data: any): Promise<Patient> {
    const existingPatient = this.repository.findById(data.id);
    if (!existingPatient) {
      throw new Error('Patient not found');
    }

    const updatedPatient: Patient = {
      ...existingPatient,
      name: data.name || existingPatient.name,
      phone: data.mobile || data.phone || existingPatient.phone,
      sync_status: 'pending',
      profile_data: JSON.stringify(data)
    };

    await TransactionManager.run((tx) => {
      // 1. Update patient
      this.repository.update(tx, updatedPatient);
      
      // 2. Log generic event for sync engine
      // If we have a cloud_id, we MUST update the cloud endpoint with that ID, not the local UUID
      const targetId = existingPatient.cloud_id || existingPatient.id;
      const eventId = crypto.randomUUID();
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'UPDATE',
        entity_type: 'PATIENT',
        entity_id: updatedPatient.id,
        payload: JSON.stringify({
          eventId,
          entityType: 'patient',
          operation: 'UPDATE',
          httpMethod: 'PUT',
          endpoint: `/patient/${targetId}`,
          payload: data,
          headers: {}
        })
      });
    });

    return updatedPatient;
  }

  public getAllPatients() {
    const patients = this.repository.getAll();
    
    const mappedPatients = patients.map(patient => {
      let profileData = {};
      if (patient.profile_data) {
        try { profileData = JSON.parse(patient.profile_data); } catch (e) {}
      }
      return {
        ...profileData,
        ...patient,
        // Override id/name/mobile just in case the JSON payload drifted
        id: patient.id,
        name: patient.name,
        mobile: patient.phone || (patient as any).mobile
      };
    });

    return {
      success: true,
      result: {
        petients: mappedPatients, // Note: backend typo 'petients' expected by UI
        pagination: {
          totalRecords: patients.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: 100
        }
      }
    };
  }

  public async checkMobile(mobile: string) {
    const patient = this.repository.findByPhone(mobile);
    if (patient) {
      let profileData = {};
      try {
        if (patient.profile_data) profileData = JSON.parse(patient.profile_data);
      } catch (e) {}

      return {
        success: true,
        data: {
          exists: true,
          patient: {
            id: patient.id,
            name: patient.name,
            mobile: patient.phone,
            ...profileData
          }
        }
      };
    }
    
    return {
      success: true,
      data: { exists: false }
    };
  }
}
