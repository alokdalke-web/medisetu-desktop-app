import crypto from 'crypto';
import dbManager from '../../../database/DatabaseManager.js';
import logger from '../../../utils/logger.js';

class NodeIdentity {
  private localNodeId: string | null = null;
  private priority: number | null = null;
  private lastKnownTerm: number | null = null;

  /**
   * Initializes the Node Identity. Retrieves the UUID from clinic_settings
   * or generates a new one if it doesn't exist.
   */
  public initialize() {
    try {
      const db = dbManager.getConnection();
      
      const row = db.prepare('SELECT value FROM clinic_settings WHERE key = ?').get('local_node_id') as { value: string } | undefined;
      
      if (row && row.value) {
        this.localNodeId = row.value;
        logger.info(`[NodeIdentity] Loaded existing Node ID: ${this.localNodeId}`);
      } else {
        this.localNodeId = crypto.randomUUID();
        
        db.prepare(`
          INSERT INTO clinic_settings (key, value, updated_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run('local_node_id', this.localNodeId);
        
        logger.info(`[NodeIdentity] Generated and saved new Node ID: ${this.localNodeId}`);
      }
    } catch (e) {
      logger.error('[NodeIdentity] Failed to initialize Node Identity:', e);
      // Fallback for extreme cases to avoid crash
      if (!this.localNodeId) {
         this.localNodeId = crypto.randomUUID();
      }
    }
  }

  /**
   * Returns the persistent UUID of this local node.
   */
  public getNodeId(): string {
    if (!this.localNodeId) {
      this.initialize();
    }
    return this.localNodeId!;
  }

  /**
   * Gets the current logical clock by finding the maximum clock in the event log.
   */
  public getCurrentLamportClock(): number {
    try {
      const db = dbManager.getConnection();
      const result = db.prepare('SELECT MAX(lamport_clock) as max_clock FROM event_log').get() as { max_clock: number | null };
      return result.max_clock || 0;
    } catch (e) {
      logger.error('[NodeIdentity] Failed to read max lamport clock:', e);
      return 0;
    }
  }

  /**
   * Increments and returns the next logical clock for a new local event.
   */
  public getNextLamportClock(): number {
    return this.getCurrentLamportClock() + 1;
  }

  /**
   * Returns the permanent priority number of this machine.
   * Earlier setup gets a numerically larger priority.
   */
  public getPriority(): number {
    if (this.priority !== null) return this.priority;
    
    try {
      const db = dbManager.getConnection();
      const row = db.prepare('SELECT value FROM clinic_settings WHERE key = ?').get('node_priority') as { value: string } | undefined;
      
      if (row && row.value) {
        this.priority = parseInt(row.value, 10);
      } else {
        this.priority = Number.MAX_SAFE_INTEGER - Date.now();
        db.prepare(`
          INSERT INTO clinic_settings (key, value, updated_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run('node_priority', this.priority.toString());
      }
    } catch (e) {
      logger.error('[NodeIdentity] Failed to get priority:', e);
      if (this.priority === null) this.priority = Number.MAX_SAFE_INTEGER - Date.now();
    }
    
    return this.priority;
  }

  /**
   * Returns the highest host election term this machine has ever seen.
   */
  public getLastKnownTerm(): number {
    if (this.lastKnownTerm !== null) return this.lastKnownTerm;
    
    try {
      const db = dbManager.getConnection();
      const row = db.prepare('SELECT value FROM clinic_settings WHERE key = ?').get('host_election_term') as { value: string } | undefined;
      
      if (row && row.value) {
        this.lastKnownTerm = parseInt(row.value, 10);
      } else {
        this.lastKnownTerm = 0;
      }
    } catch (e) {
      logger.error('[NodeIdentity] Failed to get last known term:', e);
      if (this.lastKnownTerm === null) this.lastKnownTerm = 0;
    }
    
    return this.lastKnownTerm;
  }

  /**
   * Persists a new host election term, but only if it's strictly greater than the current one.
   */
  public setLastKnownTerm(term: number): void {
    const currentTerm = this.getLastKnownTerm();
    
    if (term <= currentTerm) {
      if (term < currentTerm) {
        logger.warn(`[NodeIdentity] Attempted to decrease host_election_term from ${currentTerm} to ${term}. Ignored.`);
      }
      return;
    }
    
    try {
      const db = dbManager.getConnection();
      db.prepare(`
        INSERT INTO clinic_settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `).run('host_election_term', term.toString());
      
      this.lastKnownTerm = term;
    } catch (e) {
      logger.error('[NodeIdentity] Failed to set last known term:', e);
    }
  }
}

export default new NodeIdentity();
