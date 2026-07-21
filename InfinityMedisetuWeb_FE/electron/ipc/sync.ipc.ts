import { ipcMain } from 'electron';
import { SyncEngine } from '../src/main/infrastructure/sync/SyncEngine';
import { PushSyncEngine } from '../src/main/sync/SyncEngine';
import logger from '../utils/logger';

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

  // Auto-trigger on startup and then run periodically every 2 minutes
  setTimeout(() => {
    logger.info('[IPC] Auto-triggering Startup Master Data Sync');
    masterDataSync.triggerSync();
  }, 3000);

  setInterval(() => {
    logger.info('[IPC] Auto-triggering Periodic Master Data Sync');
    masterDataSync.triggerSync();
  }, 120000); // 2 minutes
}
