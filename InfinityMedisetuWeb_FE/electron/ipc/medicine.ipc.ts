import { ipcMain } from 'electron';
import { MedicineAppService } from '../src/main/medicine/application/MedicineAppService';
import logger from '../utils/logger';

export function registerMedicineIpcHandlers() {
  const medicineAppService = new MedicineAppService();

  ipcMain.handle('medicine:getAll', async () => {
    try {
      logger.info('[IPC] Handling medicine:getAll');
      return await medicineAppService.getAllMedicines();
    } catch (error: any) {
      logger.error('[IPC] Error in medicine:getAll:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('medicine:search', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling medicine:search for ${args?.query}`);
      return await medicineAppService.searchMedicines(args?.query || '');
    } catch (error: any) {
      logger.error('[IPC] Error in medicine:search:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('medicine:create', async (_event, args) => {
    try {
      logger.info('[IPC] Handling medicine:create');
      return await medicineAppService.createMedicine(args);
    } catch (error: any) {
      logger.error('[IPC] Error in medicine:create:', error);
      return { success: false, error: error.message };
    }
  });
}
