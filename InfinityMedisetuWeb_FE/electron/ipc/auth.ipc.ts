import { ipcMain } from 'electron';
import { AuthStore } from '../src/main/configurations/AuthStore';
import logger from '../utils/logger';

export function registerAuthIpcHandlers() {
  ipcMain.handle('auth:setCredentials', async (_, credentials) => {
    try {
      logger.info('[IPC] Handling auth:setCredentials');
      AuthStore.setCredentials(credentials);
      return { success: true };
    } catch (error) {
      logger.error('[IPC] Error in auth:setCredentials:', error);
      throw error;
    }
  });
}
