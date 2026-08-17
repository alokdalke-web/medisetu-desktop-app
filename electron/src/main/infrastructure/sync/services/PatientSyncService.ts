import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService.js';
import logger from '../../../../../utils/logger.js';
import { AuthStore } from '../../../configurations/AuthStore.js';
import { ConfigStore } from '../../../configurations/ConfigStore.js';
import { SqlitePatientRepository } from '../../../patient/repositories/SqlitePatientRepository.js';
import crypto from 'crypto';

export class PatientSyncService implements ISyncService {
  public entityName = 'patients';
  private patientRepo = new SqlitePatientRepository();

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching patients from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    const apiUrl = ConfigStore.getInstance().getBackendUrl();
    let totalSynced = 0;
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await fetch(`${apiUrl}/patient/all?pageNumber=${currentPage}&pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }

      const data: any = await response.json();
      const patients = data?.result?.petients || [];
      const pagination = data?.result?.pagination;

      if (pagination && pagination.totalPages) {
        totalPages = pagination.totalPages;
      }

      const processPatients = db.transaction((patientsList: any[]) => {
        let count = 0;
        
        // Prepare statement to check for existing cloud_id
        const checkStmt = db.prepare('SELECT id FROM patients WHERE cloud_id = ?');

        for (const cloudPatient of patientsList) {
          const cloudId = cloudPatient.id || cloudPatient._id;
          if (!cloudId) continue;

          // Check if we already have this patient locally
          const existing = checkStmt.get(cloudId);
          if (existing) {
            continue; // Skip, we already have it
          }

          // We don't have it locally, so map and insert
          const newLocalId = crypto.randomUUID();
          
          // Collect remaining properties into profile_data JSON string
          const {
            id, _id, name, email, mobile,
            updatedAt, createdAt, status,
            ...otherFields
          } = cloudPatient;

          const localPatient = {
            id: newLocalId,
            name: name || '',
            phone: mobile || '',
            created_at: new Date().toISOString(),
            sync_status: 'synced',
            cloud_id: cloudId,
            profile_data: Object.keys(otherFields).length > 0 ? JSON.stringify(otherFields) : undefined
          };

          this.patientRepo.create(db, localPatient);
          count++;
        }
        return count;
      });

      const syncedInPage = processPatients(patients);
      totalSynced += syncedInPage;
      currentPage++;
    } while (currentPage <= totalPages);

    return totalSynced;
  }
}
