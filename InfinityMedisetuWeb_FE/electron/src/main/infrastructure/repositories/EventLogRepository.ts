import Database from 'better-sqlite3';

export interface SyncEventPayload {
  eventId: string;
  entityType: string;
  operation: string;
  httpMethod: string;
  endpoint: string;
  payload: any;
  headers: Record<string, string>;
}

export interface EventLogEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  payload: string; // JSON string of SyncEventPayload
  status?: string;
  retry_count?: number;
  last_attempt_at?: string;
  error_message?: string;
}

export class EventLogRepository {
  public insert(tx: Database.Database, entry: EventLogEntry): void {
    const stmt = tx.prepare(`
      INSERT INTO event_log (id, action_type, entity_type, entity_id, payload, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      entry.id,
      entry.action_type,
      entry.entity_type,
      entry.entity_id,
      entry.payload,
      entry.status || 'pending'
    );
  }

  public getPendingEvents(db: Database.Database, limit: number = 1): EventLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE status IN ('pending', 'failed') AND retry_count < 5
      ORDER BY created_at ASC, rowid ASC
      LIMIT ?
    `);
    return stmt.all(limit) as EventLogEntry[];
  }

  public markEventSynced(db: Database.Database, eventId: string): void {
    const stmt = db.prepare(`
      UPDATE event_log 
      SET status = 'synced', error_message = NULL 
      WHERE id = ?
    `);
    stmt.run(eventId);
  }

  public markEventFailed(db: Database.Database, eventId: string, errorMessage: string): void {
    const stmt = db.prepare(`
      UPDATE event_log 
      SET status = 'failed', 
          retry_count = retry_count + 1, 
          last_attempt_at = CURRENT_TIMESTAMP, 
          error_message = ? 
      WHERE id = ?
    `);
    stmt.run(errorMessage, eventId);
  }
}
