import { ipcMain } from 'electron';
import { SyncEngine } from '../src/main/infrastructure/sync/SyncEngine';
import { PushSyncEngine } from '../src/main/sync/SyncEngine';
import HostElectionService from '../src/main/cluster/HostElectionService.js';
import logger from '../utils/logger';
import dbManager from '../database/DatabaseManager';
import { EventLogRepository } from '../src/main/infrastructure/repositories/EventLogRepository';

export function registerSyncIpcHandlers() {
  const masterDataSync = new SyncEngine();

  // Legacy Master Data Sync
  ipcMain.handle('sync:start', async () => {
    try {
      logger.info('[IPC] Handling sync:start (Master Data Sync)');
      masterDataSync.triggerSync();
      return { status: 'started' };
    } catch (error) {
      logger.error('[IPC] Error in sync:start:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:status', () => {
    return { state: masterDataSync.getState() };
  });

  // New Push Sync Engine Panel
  ipcMain.handle('push_sync:status', () => {
    return PushSyncEngine.getInstance().getStatus();
  });

  ipcMain.handle('push_sync:trigger', () => {
    PushSyncEngine.getInstance().triggerImmediateSync();
    return { success: true };
  });

  ipcMain.handle('push_sync:retryEvent', (_, eventId: string) => {
    try {
      logger.info(`[IPC] push_sync:retryEvent requested for eventId: ${eventId}`);
      const db = dbManager.getConnection();
      const repo = new EventLogRepository();
      repo.resetEventForRetry(db, eventId);
      PushSyncEngine.getInstance().triggerImmediateSync();
      return { success: true };
    } catch (e: any) {
      logger.error('[IPC] Failed to retry event', e.message);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('push_sync:getEntityStatus', (_, entityId: string) => {
    try {
      logger.info(`[IPC] push_sync:getEntityStatus requested for entityId: ${JSON.stringify(entityId)}`);
      const db = dbManager.getConnection();
      const repo = new EventLogRepository();
      const event = repo.getLatestEventForEntity(db, entityId);
      
      if (event) {
        logger.info(`[IPC] Found event in event_log:`, event.id);
        return event;
      }

      logger.info(`[IPC] No event found, checking fallback tables...`);
      // Fallback: If no event in event_log (e.g. older records), check the entity tables directly
      try {
        const patient = db.prepare('SELECT sync_status, cloud_id FROM patients WHERE id = ?').get(entityId) as any;
        if (patient) {
          logger.info(`[IPC] Fallback found patient:`, patient);
          if (patient.cloud_id) {
            return { status: 'synced', synced_to_cloud: 1 };
          }
          return { status: patient.sync_status };
        }
      } catch (err: any) {
        logger.error('[IPC] Fallback patient query error:', err.message);
      }

      try {
        const appointment = db.prepare('SELECT cloud_id FROM appointments WHERE id = ?').get(entityId) as any;
        if (appointment) {
          logger.info(`[IPC] Fallback found appointment:`, appointment);
          if (appointment.cloud_id) {
            return { status: 'synced', synced_to_cloud: 1 };
          }
          return { status: 'pending' };
        }
      } catch (err: any) {
        logger.error('[IPC] Fallback appointment query error:', err.message);
      }

      try {
        const prescription = db.prepare('SELECT cloud_id FROM prescriptions WHERE id = ?').get(entityId) as any;
        if (prescription) {
          logger.info(`[IPC] Fallback found prescription:`, prescription);
          if (prescription.cloud_id) {
            return { status: 'synced', synced_to_cloud: 1 };
          }
          return { status: 'pending' };
        }
      } catch (err: any) {
        logger.error('[IPC] Fallback prescription query error:', err.message);
      }

      try {
        const medicine = db.prepare('SELECT sync_status, cloud_id FROM medicines WHERE id = ?').get(entityId) as any;
        if (medicine) {
          logger.info(`[IPC] Fallback found medicine:`, medicine);
          if (medicine.cloud_id) {
            return { status: 'synced', synced_to_cloud: 1 };
          }
          return { status: medicine.sync_status };
        }
      } catch (err: any) {
        logger.error('[IPC] Fallback medicine query error:', err.message);
      }

      logger.info(`[IPC] No event or entity found for:`, entityId);
      return null;
    } catch (e: any) {
      logger.error('[IPC] Failed to get entity status', e.message);
      return null;
    }
  });

  // Auto-trigger when node becomes host (just in case they need a fresh sync upon promotion)
  HostElectionService.onHostChange((isHost) => {
    if (isHost) {
      logger.info('[IPC] Node became Host. Auto-triggering Master Data Sync');
      masterDataSync.triggerSync();
    }
  });

  setTimeout(() => {
    logger.info('[IPC] Auto-triggering Startup Master Data Sync for all nodes');
    masterDataSync.triggerSync();
  }, 3000);

  setInterval(() => {
    logger.info('[IPC] Auto-triggering Periodic Master Data Sync');
    masterDataSync.triggerSync();
  }, 120000); // 2 minutes
}
