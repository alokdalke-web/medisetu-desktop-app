import { ipcMain } from 'electron';
import DatabaseManager from '../database/DatabaseManager.js';
import { PatientRepository } from '../repositories/PatientRepository.js';

export function setupIPC() {
  const patientRepo = new PatientRepository();

  ipcMain.handle('health-check', async () => {
    try {
      const dbStatus = DatabaseManager.healthCheck();
      return { status: 'ok', db: dbStatus };
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  });

  ipcMain.handle('patients:getAll', async () => {
    return patientRepo.getAll();
  });
}
