import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService';
import logger from '../../../../../utils/logger';
import { AuthStore } from '../../../configurations/AuthStore';

export class ClinicSymptomSyncService implements ISyncService {
  public entityName = 'clinic_symptoms';

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching clinic symptoms from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    
    const response = await fetch(`${apiUrl}/clinic/clinicsymptom`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch clinic symptoms: ${response.statusText}`);
    }

    const data: any = await response.json();
    const symptoms = data?.result || [];

    const insertSymptoms = db.transaction((symps: any[]) => {
      let count = 0;
      const stmt = db.prepare(`
        INSERT INTO clinic_symptoms (id, cloud_id, name, description, status, is_deleted, sync_status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'synced', CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          cloud_id = EXCLUDED.cloud_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          is_deleted = EXCLUDED.is_deleted,
          sync_status = 'synced',
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const s of symps) {
        // Use cloud id as local id since we are downloading from cloud
        stmt.run(s.id, s.id, s.name, s.description || null, s.status || 'Active', s.isDeleted ? 1 : 0);
        count++;
      }
      return count;
    });

    return insertSymptoms(symptoms);
  }
}
