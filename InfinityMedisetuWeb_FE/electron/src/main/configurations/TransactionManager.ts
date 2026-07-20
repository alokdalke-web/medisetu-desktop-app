import Database from 'better-sqlite3';
import dbManager from '../../../database/DatabaseManager';

/**
 * TransactionManager guarantees that multiple repository operations
 * execute atomically in SQLite.
 */
export class TransactionManager {
  /**
   * Executes a callback within a SQLite transaction.
   * Ensures that all writes (business tables + event_log) are atomic.
   */
  public static async run<T>(
    callback: (tx: Database.Database) => Promise<T> | T
  ): Promise<T> {
    const db = dbManager.getConnection();
    if (!db) throw new Error('Database not initialized');

    // better-sqlite3 transactions run synchronously on the thread, but we allow 
    // the callback to be async if it needs to do minimal non-DB awaiting, though
    // it's highly recommended to only use synchronous db methods inside.
    const runTransaction = db.transaction((innerDb: Database.Database) => {
      // In a real advanced setup, we might pass a wrapped connection.
      // better-sqlite3 handles nested queries within this block automatically.
      return callback(innerDb);
    });

    return runTransaction(db);
  }
}
