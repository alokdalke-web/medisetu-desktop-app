import { ipcMain } from 'electron';
import logger from '../utils/logger';

import { clinicSymptomAppService } from '../src/main/clinic/application/ClinicSymptomAppService';

export function registerClinicHandlers() {
  ipcMain.handle('doctor:getClinicSymptoms', async (_event, search: string) => {
    try {
      logger.info(`[IPC] Handling doctor:getClinicSymptoms`);
      return clinicSymptomAppService.getClinicSymptoms(search);
    } catch (error) {
      logger.error('[IPC] Error in doctor:getClinicSymptoms:', error);
      throw error;
    }
  });

  ipcMain.handle('doctor:createClinicSymptom', async (_event, data: any) => {
    try {
      logger.info(`[IPC] Handling doctor:createClinicSymptom`);
      return clinicSymptomAppService.createClinicSymptom(data);
    } catch (error) {
      logger.error('[IPC] Error in doctor:createClinicSymptom:', error);
      throw error;
    }
  });
}
