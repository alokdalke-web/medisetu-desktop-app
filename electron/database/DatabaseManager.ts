import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { runMigrations } from './migrations/index.js';

class DatabaseManager {
  private db: Database.Database | null = null;

  initialize() {
    try {
      const dbDir = path.dirname(config.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new Database(config.dbPath, {
        verbose: config.isDev ? (msg: unknown) => logger.debug(`[SQLite]: ${msg}`) : undefined
      });

      // Enable WAL mode, Foreign Keys, Busy Timeout
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('busy_timeout = 5000');

      logger.info(`SQLite initialized at ${config.dbPath}`);

      // Run Migrations
      runMigrations(this.db);

      // Verify Database Integrity
      logger.info('Verifying SQLite database integrity...');
      const integrity = this.db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      if (integrity.integrity_check !== 'ok') {
        throw new Error(`Database integrity check failed: ${integrity.integrity_check}`);
      }
      logger.info('Database integrity OK.');
    } catch (error) {
      logger.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  getConnection(): Database.Database {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }
    return this.db;
  }

  healthCheck() {
    if (!this.db) return false;
    try {
      const row = this.db.prepare('SELECT 1').get();
      return !!row;
    } catch (e) {
      return false;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('SQLite database closed.');
    }
  }
}

export default new DatabaseManager();
