import crypto from 'crypto';
import dbManager from '../../../database/DatabaseManager.js';
import logger from '../../../utils/logger.js';

class NodeIdentity {
  private localNodeId: string | null = null;

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
}

export default new NodeIdentity();
