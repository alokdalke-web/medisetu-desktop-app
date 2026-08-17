import crypto from 'crypto';
import dbManager from '../../../database/DatabaseManager.js';
import logger from '../../../utils/logger.js';

class ClinicSecret {
  private static instance: ClinicSecret;
  private cachedSecret: string | null = null;
  private rateLimitMap = new Map<string, { count: number, resetAt: number }>();

  private constructor() {}

  public static getInstance(): ClinicSecret {
    if (!ClinicSecret.instance) {
      ClinicSecret.instance = new ClinicSecret();
    }
    return ClinicSecret.instance;
  }

  public getClinicSecret(): string | null {
    if (this.cachedSecret) return this.cachedSecret;
    try {
      const db = dbManager.getConnection();
      const row = db.prepare('SELECT value FROM clinic_settings WHERE key = ?').get('clinic_sync_secret') as { value: string } | undefined;
      if (row) {
        this.cachedSecret = row.value;
        return this.cachedSecret;
      }
      return null;
    } catch (e) {
      logger.error('[ClinicSecret] Failed to get clinic_sync_secret', e);
      return null;
    }
  }

  public generateClinicSecret(): string {
    const secret = crypto.randomBytes(32).toString('hex');
    try {
      const db = dbManager.getConnection();
      db.prepare(`
        INSERT INTO clinic_settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `).run('clinic_sync_secret', secret);
      this.cachedSecret = secret;
      logger.info('[ClinicSecret] Generated new permanent clinic_sync_secret.');
      return secret;
    } catch (e) {
      logger.error('[ClinicSecret] Failed to generate clinic_sync_secret', e);
      throw e;
    }
  }

  public saveReceivedSecret(secret: string): void {
    try {
      const db = dbManager.getConnection();
      db.prepare(`
        INSERT INTO clinic_settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `).run('clinic_sync_secret', secret);
      this.cachedSecret = secret;
      logger.info('[ClinicSecret] Saved received permanent clinic_sync_secret.');
    } catch (e) {
      logger.error('[ClinicSecret] Failed to save received clinic_sync_secret', e);
      throw e;
    }
  }

  public generatePairingCode(): { code: string, expiresAt: Date } {
    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      code += charset[randomIndex];
    }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    try {
      const db = dbManager.getConnection();
      db.prepare(`
        INSERT INTO pairing_codes (code, expires_at) VALUES (?, ?)
      `).run(code, expiresAt.toISOString());
      logger.info(`[ClinicSecret] Generated new pairing code.`);
      return { code, expiresAt };
    } catch (e) {
      logger.error('[ClinicSecret] Failed to generate pairing code', e);
      throw e;
    }
  }

  public verifyAndConsumePairingCode(code: string, ipOrNodeId: string): boolean {
    const now = Date.now();
    const rateLimit = this.rateLimitMap.get(ipOrNodeId);
    
    // Check if currently blocked
    if (rateLimit && now < rateLimit.resetAt) {
      if (rateLimit.count >= 5) {
        logger.warn(`[ClinicSecret] Rate limit exceeded for ${ipOrNodeId}. Blocked.`);
        return false;
      }
    } else if (rateLimit && now >= rateLimit.resetAt) {
      this.rateLimitMap.delete(ipOrNodeId); // Reset block
    }

    try {
      const db = dbManager.getConnection();
      const info = db.prepare(`
        UPDATE pairing_codes 
        SET used = 1 
        WHERE code = ? 
        AND used = 0 
        AND expires_at > datetime('now')
      `).run(code);

      if (info.changes > 0) {
        logger.info(`[ClinicSecret] Successfully verified and consumed pairing code from ${ipOrNodeId}`);
        // Reset rate limit on success
        this.rateLimitMap.delete(ipOrNodeId);
        return true;
      } else {
        // Record failed attempt
        const currentLimit = this.rateLimitMap.get(ipOrNodeId);
        if (currentLimit) {
          currentLimit.count++;
          if (currentLimit.count >= 5) {
            currentLimit.resetAt = now + 5 * 60 * 1000; // block for 5 minutes
            logger.warn(`[ClinicSecret] Blocking ${ipOrNodeId} for 5 minutes due to 5 failed attempts.`);
          }
        } else {
          this.rateLimitMap.set(ipOrNodeId, { count: 1, resetAt: now + 60 * 1000 });
        }
        return false;
      }
    } catch (e) {
      logger.error('[ClinicSecret] Error during verifyAndConsumePairingCode', e);
      return false;
    }
  }
}

export default ClinicSecret.getInstance();
