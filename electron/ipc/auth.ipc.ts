import { ipcMain } from 'electron';
import { AuthStore } from '../src/main/configurations/AuthStore.js';
import logger from '../utils/logger.js';
import GoogleOAuthService from '../src/main/auth/GoogleOAuthService.js';

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

  ipcMain.handle('auth:googleLogin', async (_, clientId: string) => {
    try {
      logger.info('[IPC] Handling auth:googleLogin');
      const idToken = await GoogleOAuthService.login(clientId);
      return { success: true, idToken };
    } catch (error: any) {
      logger.error('[IPC] Error in auth:googleLogin:', error);
      return { success: false, error: error.message || 'Google login failed' };
    }
  });
}
