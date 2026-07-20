import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService';
import logger from '../../../../../utils/logger';
import { AuthStore } from '../../../configurations/AuthStore';

export class ServiceSyncService implements ISyncService {
  public entityName = 'services';

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching services from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    
    // Services are fetched via the logged-in doctor's profile endpoint
    const response = await fetch(`${apiUrl}/doctor/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }

    const data: any = await response.json();
    const services = data?.result?.services || [];

    const insertServices = db.transaction((srvs: any[]) => {
      let count = 0;
      const stmt = db.prepare(`
        INSERT INTO services (id, name, duration_minutes, price, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          name = EXCLUDED.name,
          duration_minutes = EXCLUDED.duration_minutes,
          price = EXCLUDED.price,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const srv of srvs) {
        stmt.run(srv.id || srv._id, srv.serviceName, srv.duration_minutes || 15, srv.price || 0);
        count++;
      }
      return count;
    });

    return insertServices(services);
  }
}
