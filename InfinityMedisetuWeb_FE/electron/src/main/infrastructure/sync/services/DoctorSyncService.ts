import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService';
import logger from '../../../../../utils/logger';
import { AuthStore } from '../../../configurations/AuthStore';

export class DoctorSyncService implements ISyncService {
  public entityName = 'doctors';

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching doctors from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const response = await fetch(`${apiUrl}/users/get-all-user?userType=Doctor&page=1&pageSize=100`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch doctors: ${response.statusText}`);
    }

    const data: any = await response.json();
    const doctors = data?.result?.allUser || [];
    const insertDoctors = db.transaction((docs: any[]) => {
      let count = 0;
      const stmt = db.prepare(`
        INSERT INTO doctors (id, name, speciality, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          name = EXCLUDED.name,
          speciality = EXCLUDED.speciality,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const doc of docs) {
        stmt.run(doc.id || doc._id, doc.name, doc.speciality || '');
        count++;
      }
      return count;
    });

    return insertDoctors(doctors);
  }
}
