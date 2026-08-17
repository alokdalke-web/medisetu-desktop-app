import dbManager from '../../../../database/DatabaseManager';
import { randomUUID } from 'crypto';

export class SqliteClinicSymptomRepository {
  public getAll(search?: string): any[] {
    const db = dbManager.getConnection();
    let query = `SELECT id, name, description, status, cloud_id FROM clinic_symptoms WHERE is_deleted = 0`;
    const params: any[] = [];

    if (search) {
      query += ` AND name LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY name ASC`;
    return db.prepare(query).all(...params) as any[];
  }

  public create(data: any, newId: string): void {
    const db = dbManager.getConnection();
    
    db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO clinic_symptoms (id, name, description, status, sync_status, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      stmt.run(newId, data.name, data.description || null, data.status || 'Active');

      // Add to event_log for pushing
      const logStmt = db.prepare(`
        INSERT INTO event_log (id, event_type, entity_type, entity_id, payload, timestamp)
        VALUES (?, 'CREATE', 'clinic_symptoms', ?, ?, ?)
      `);
      
      const eventId = randomUUID();
      logStmt.run(
        eventId,
        newId,
        JSON.stringify({
          eventId,
          entityType: 'clinic_symptoms',
          operation: 'CREATE',
          httpMethod: 'POST',
          endpoint: '/clinic/clinicsymptom',
          payload: {
            name: data.name,
            description: data.description || ''
          },
          headers: {}
        }),
        new Date().toISOString()
      );
    })();
  }
}
