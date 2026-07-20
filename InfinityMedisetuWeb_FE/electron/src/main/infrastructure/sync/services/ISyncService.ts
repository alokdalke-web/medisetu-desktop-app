import type { Database } from 'better-sqlite3';

export interface ISyncService {
  /**
   * The name of the entity being synchronized (e.g., 'doctors', 'services')
   */
  entityName: string;

  /**
   * Perform the synchronization. 
   * Fetches data from REST API and inserts/updates it in the local SQLite DB.
   */
  sync(db: Database): Promise<number>;
}
