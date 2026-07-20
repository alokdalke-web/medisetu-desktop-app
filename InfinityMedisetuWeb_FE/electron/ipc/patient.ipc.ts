import { ipcMain } from 'electron';
import { PatientAppService } from '../src/main/patient/application/PatientAppService';
import logger from '../utils/logger';

export function registerPatientIpcHandlers() {
  const patientAppService = new PatientAppService();

  ipcMain.handle('patient:search', async (_event, query: string) => {
    // 1. Offline Authorization would happen here
    // const user = event.sender... check roles

    try {
      logger.info(`[IPC] Handling patient:search with query: ${query}`);
      return patientAppService.searchPatients(query);
    } catch (error) {
      logger.error('[IPC] Error in patient:search:', error);
      throw error;
    }
  });

  ipcMain.handle('patient:getProfile', async (_event, id: string) => {
    try {
      logger.info(`[IPC] Handling patient:getProfile for id: ${id}`);
      return patientAppService.getPatientProfile(id);
    } catch (error) {
      logger.error('[IPC] Error in patient:getProfile:', error);
      throw error;
    }
  });

  ipcMain.handle('patient:create', async (_event, data: any) => {
    try {
      logger.info(`[IPC] Handling patient:create for: ${data.name}`);
      return await patientAppService.createPatient(data);
    } catch (error) {
      logger.error('[IPC] Error in patient:create:', error);
      throw error;
    }
  });

  ipcMain.handle('patient:update', async (_event, data: any) => {
    try {
      logger.info(`[IPC] Handling patient:update for: ${data.name}`);
      return await patientAppService.updatePatient(data);
    } catch (error) {
      logger.error('[IPC] Error in patient:update:', error);
      throw error;
    }
  });

  ipcMain.handle('patient:getAll', async () => {
    try {
      logger.info(`[IPC] Handling patient:getAll`);
      return patientAppService.getAllPatients();
    } catch (error) {
      logger.error('[IPC] Error in patient:getAll:', error);
      throw error;
    }
  });

  ipcMain.handle('patient:checkMobile', async (_event, mobile: string) => {
    try {
      logger.info(`[IPC] Handling patient:checkMobile for: ${mobile}`);
      return await patientAppService.checkMobile(mobile);
    } catch (error) {
      logger.error('[IPC] Error in patient:checkMobile:', error);
      throw error;
    }
  });
}
