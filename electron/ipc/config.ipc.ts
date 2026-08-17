import { ipcMain } from 'electron';
import { ConfigStore } from '../src/main/configurations/ConfigStore';
import logger from '../utils/logger';

export const registerConfigIPC = () => {
  logger.info('Registering Config IPC handlers');
  const configStore = ConfigStore.getInstance();

  ipcMain.handle('config:getBackendUrl', () => {
    return configStore.getBackendUrl();
  });

  ipcMain.handle('config:setBackendUrl', (_, url: string) => {
    configStore.setBackendUrl(url);
    return true;
  });
};
