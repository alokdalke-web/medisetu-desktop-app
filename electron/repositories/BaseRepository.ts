import Database from 'better-sqlite3';
import DatabaseManager from '../database/DatabaseManager.js';

export abstract class BaseRepository {
  protected get db(): Database.Database {
    return DatabaseManager.getConnection();
  }
}
