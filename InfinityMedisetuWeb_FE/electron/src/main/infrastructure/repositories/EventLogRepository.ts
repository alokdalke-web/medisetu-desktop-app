import Database from 'better-sqlite3';
import NodeIdentity from '../../cluster/NodeIdentity.js';

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
  node_id?: string;
  lamport_clock?: number;
  synced_to_cloud?: boolean;
  created_at?: string;
}

export class EventLogRepository {
  public insert(tx: Database.Database, entry: EventLogEntry): void {
    const nodeId = NodeIdentity.getNodeId();
    const lamportClock = NodeIdentity.getNextLamportClock();

    const stmt = tx.prepare(`
      INSERT INTO event_log (id, action_type, entity_type, entity_id, payload, status, node_id, lamport_clock, synced_to_cloud)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      entry.id,
      entry.action_type,
      entry.entity_type,
      entry.entity_id,
      entry.payload,
      entry.status || 'pending',
      entry.node_id || nodeId,
      entry.lamport_clock || lamportClock,
      entry.synced_to_cloud ? 1 : 0
    );
  }

  public getPendingEvents(db: Database.Database, nodeId: string, limit: number = 1): EventLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE synced_to_cloud = 0 AND retry_count < 5 AND node_id = ?
      ORDER BY created_at ASC, rowid ASC
      LIMIT ?
    `);
    return stmt.all(nodeId, limit) as EventLogEntry[];
  }

  public getEventsAfterClock(db: Database.Database, lamportClock: number): EventLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE lamport_clock > ?
      ORDER BY lamport_clock ASC
    `);
    return stmt.all(lamportClock) as EventLogEntry[];
  }

  public getEventById(db: Database.Database, eventId: string): EventLogEntry | undefined {
    const stmt = db.prepare('SELECT * FROM event_log WHERE id = ?');
    return stmt.get(eventId) as EventLogEntry | undefined;
  }

  public upsertEvent(db: Database.Database, entry: EventLogEntry): void {
    const stmt = db.prepare(`
      INSERT INTO event_log (id, action_type, entity_type, entity_id, payload, status, node_id, lamport_clock, synced_to_cloud, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        action_type = EXCLUDED.action_type,
        entity_type = EXCLUDED.entity_type,
        entity_id = EXCLUDED.entity_id,
        payload = EXCLUDED.payload,
        status = EXCLUDED.status,
        node_id = EXCLUDED.node_id,
        lamport_clock = EXCLUDED.lamport_clock,
        synced_to_cloud = EXCLUDED.synced_to_cloud,
        created_at = EXCLUDED.created_at
    `);
    
    stmt.run(
      entry.id,
      entry.action_type,
      entry.entity_type,
      entry.entity_id,
      entry.payload,
      entry.status || 'synced', // events from peers are technically synced locally
      entry.node_id,
      entry.lamport_clock,
      entry.synced_to_cloud ? 1 : 0,
      entry.created_at || new Date().toISOString()
    );
  }

  public markEventSynced(db: Database.Database, eventId: string): void {
    const stmt = db.prepare(`
      UPDATE event_log 
      SET status = 'synced', synced_to_cloud = 1, error_message = NULL 
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
