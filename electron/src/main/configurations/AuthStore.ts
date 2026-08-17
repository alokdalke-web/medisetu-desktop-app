import dbManager from '../../../database/DatabaseManager';
import logger from '../../../utils/logger';

// A persistent store for Authentication details in the Main process using SQLite clinic_settings table.

export class AuthStore {
  private static setSetting(key: string, value: string | null) {
    try {
      const db = dbManager.getConnection();
      if (value === null) {
        db.prepare('DELETE FROM clinic_settings WHERE key = ?').run(key);
      } else {
        db.prepare(`
          INSERT INTO clinic_settings (key, value, updated_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `).run(key, value);
      }
    } catch (e) {
      logger.error(`[AuthStore] Failed to set ${key}:`, e);
    }
  }

  private static getSetting(key: string): string | null {
    try {
      const db = dbManager.getConnection();
      const row = db.prepare('SELECT value FROM clinic_settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row ? row.value : null;
    } catch (e) {
      logger.error(`[AuthStore] Failed to get ${key}:`, e);
      return null;
    }
  }

  public static setCredentials(credentials: { token: string; userId: string; clinicId?: string }) {
    this.setSetting('auth_token', credentials.token);
    this.setSetting('auth_userId', credentials.userId);
    this.setSetting('auth_clinicId', credentials.clinicId || null);
    
    // Notify SyncEngine
    // Notify SyncEngine
    import('../sync/SyncEngine').then(({ PushSyncEngine }) => {
      PushSyncEngine.getInstance().setAuthToken(credentials.token);
    }).catch(e => {
      logger.error('[AuthStore] Failed to notify PushSyncEngine:', e);
    });
    
    logger.info('[AuthStore] Credentials securely cached in SQLite.');
  }

  public static getToken(): string | null {
    return this.getSetting('auth_token');
  }

  public static getUserId(): string | null {
    return this.getSetting('auth_userId');
  }

  public static getClinicId(): string | null {
    return this.getSetting('auth_clinicId');
  }

  public static clear() {
    this.setSetting('auth_token', null);
    this.setSetting('auth_userId', null);
    this.setSetting('auth_clinicId', null);
    logger.info('[AuthStore] Credentials cleared from SQLite.');
  }
}
