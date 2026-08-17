import Database from 'better-sqlite3';
import NodeIdentity from '../../cluster/NodeIdentity.js';
import { EventEmitter } from 'events';

// Use a global variable to ensure localEventEmitter is a true singleton
// across different Vite/Webpack module chunks.
export const localEventEmitter = (global as any).__localEventEmitter || new EventEmitter();
(global as any).__localEventEmitter = localEventEmitter;

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
  next_retry_at?: string;
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

    // Emit event for push sync
    const fullyPopulatedEntry: EventLogEntry = {
      ...entry,
      status: entry.status || 'pending',
      node_id: entry.node_id || nodeId,
      lamport_clock: entry.lamport_clock || lamportClock,
      synced_to_cloud: entry.synced_to_cloud || false,
      created_at: entry.created_at || new Date().toISOString(),
    };
    localEventEmitter.emit('local_event_inserted', fullyPopulatedEntry);
  }

  public getPendingEvents(db: Database.Database, nodeId: string, limit: number = 1): EventLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE synced_to_cloud = 0 AND IFNULL(retry_count, 0) < 5 AND node_id = ?
      ORDER BY created_at ASC, rowid ASC
      LIMIT ?
    `);
    return stmt.all(nodeId, limit) as EventLogEntry[];
  }

  public getPendingEventsForHost(db: Database.Database, limit: number = 1): EventLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE synced_to_cloud = 0 
        AND IFNULL(retry_count, 0) < 5 
        AND status != 'stuck'
        AND (next_retry_at IS NULL OR datetime(next_retry_at) <= datetime('now'))
      ORDER BY lamport_clock ASC, rowid ASC
      LIMIT ?
    `);
    return stmt.all(limit) as EventLogEntry[];
  }

  public getPendingEventsCount(db: Database.Database, nodeId: string): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM event_log 
      WHERE synced_to_cloud = 0 AND IFNULL(retry_count, 0) < 5 AND node_id = ?
    `);
    const row = stmt.get(nodeId) as { count: number };
    return row.count;
  }

  public getEventsAfterClock(db: Database.Database, lamportClock: number): EventLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE lamport_clock > ?
      ORDER BY lamport_clock ASC
    `);
    return stmt.all(lamportClock) as EventLogEntry[];
  }

  public getMissingEvents(db: Database.Database, nodeClocks: Record<string, number>): EventLogEntry[] {
    const allEvents = db.prepare('SELECT * FROM event_log ORDER BY lamport_clock ASC').all() as EventLogEntry[];
    return allEvents.filter(event => {
      const nodeId = event.node_id || '';
      const nodeClock = nodeClocks[nodeId] || 0;
      return (event.lamport_clock || 0) > nodeClock;
    });
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
    // 1. Read current retry_count
    const row = db.prepare(`SELECT retry_count FROM event_log WHERE id = ?`).get(eventId) as { retry_count: number } | undefined;
    const currentRetryCount = row?.retry_count || 0;
    const newRetryCount = currentRetryCount + 1;

    // 2. Calculate exponential backoff: min(15 * (2 ^ retry_count), 1800) capped at 30 minutes
    const delaySeconds = Math.min(15 * Math.pow(2, newRetryCount), 1800);
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

    // 3. Update the event
    const stmt = db.prepare(`
      UPDATE event_log 
      SET status = 'failed', 
          retry_count = ?, 
          last_attempt_at = CURRENT_TIMESTAMP, 
          next_retry_at = ?,
          error_message = ? 
      WHERE id = ?
    `);
    stmt.run(newRetryCount, nextRetryAt, errorMessage, eventId);
  }
  public markEventPermanentlyFailed(db: Database.Database, eventId: string, errorMessage: string): void {
    const stmt = db.prepare(`
      UPDATE event_log 
      SET status = 'failed', 
          retry_count = 99, 
          last_attempt_at = CURRENT_TIMESTAMP, 
          error_message = ? 
      WHERE id = ?
    `);
    stmt.run(errorMessage, eventId);
  }

  /**
   * Marks an event as permanently stuck.
   * This should be called instead of leaving an event silently at status='failed'
   * once it has exhausted its retry attempts, allowing it to be surfaced in the UI.
   */
  public markEventStuck(db: Database.Database, eventId: string, errorMessage: string): void {
    const stmt = db.prepare(`
      UPDATE event_log 
      SET status = 'stuck', 
          last_attempt_at = CURRENT_TIMESTAMP, 
          error_message = ? 
      WHERE id = ?
    `);
    stmt.run(errorMessage, eventId);
  }

  /**
   * Retrieves all events that are currently stuck in the sync queue.
   * Useful for surfacing a list of problematic events to the user for manual intervention.
   */
  public getStuckEvents(db: Database.Database): EventLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE status = 'stuck'
      ORDER BY created_at ASC
    `);
    return stmt.all() as EventLogEntry[];
  }

  /**
   * Gets the total count of events that are currently stuck.
   * Useful for displaying lightweight status badges in the UI.
   */
  public getStuckEventsCount(db: Database.Database): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM event_log 
      WHERE status = 'stuck'
    `);
    const row = stmt.get() as { count: number } | undefined;
    return row?.count || 0;
  }

  /**
   * Resets a stuck or failed event back to pending state so it can be retried immediately.
   * This acts as a "Retry Now" action, allowing the event to be picked up by the normal
   * getPendingEventsForHost query on the next sync cycle.
   */
  public resetEventForRetry(db: Database.Database, eventId: string): void {
    const stmt = db.prepare(`
      UPDATE event_log 
      SET status = 'pending', 
          retry_count = 0, 
          next_retry_at = NULL, 
          error_message = NULL 
      WHERE id = ?
    `);
    stmt.run(eventId);
  }

  /**
   * Returns the most recent sync event for a specific entity ID.
   * Useful for displaying live sync status in the UI.
   */
  public getLatestEventForEntity(db: Database.Database, entityId: string): EventLogEntry | undefined {
    const stmt = db.prepare(`
      SELECT * FROM event_log 
      WHERE entity_id = ? 
      ORDER BY rowid DESC 
      LIMIT 1
    `);
    return stmt.get(entityId) as EventLogEntry | undefined;
  }
}
