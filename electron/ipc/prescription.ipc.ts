import { ipcMain } from 'electron';
import { PrescriptionAppService } from '../src/main/prescription/application/PrescriptionAppService';
import logger from '../utils/logger';

export function registerPrescriptionIpcHandlers() {
  const prescriptionAppService = new PrescriptionAppService();

  ipcMain.handle('prescription:create', async (_event, args: { appointmentId: string, items: any[] }) => {
    try {
      logger.info(`[IPC] Handling prescription:create for appointment ${args.appointmentId}`);
      return await prescriptionAppService.createPrescription(args.appointmentId, args.items);
    } catch (error) {
      logger.error('[IPC] Error in prescription:create:', error);
      throw error;
    }
  });

  ipcMain.handle('prescription:getByPatient', async (_event, patientId: string) => {
    try {
      logger.info(`[IPC] Handling prescription:getByPatient for patient ${patientId}`);
      return prescriptionAppService.getPrescriptionsByPatient(patientId);
    } catch (error) {
      logger.error('[IPC] Error in prescription:getByPatient:', error);
      throw error;
    }
  });
  ipcMain.handle('prescription:getByAppointment', async (_event, appointmentId: string) => {
    try {
      logger.info(`[IPC] Handling prescription:getByAppointment for ${appointmentId}`);
      return prescriptionAppService.getPrescriptionByAppointment(appointmentId);
    } catch (error) {
      logger.error('[IPC] Error in prescription:getByAppointment:', error);
      throw error;
    }
  });

  ipcMain.handle('prescription:update', async (_event, args: { appointmentId: string, data: any }) => {
    try {
      logger.info(`[IPC] Handling prescription:update for ${args.appointmentId}`);
      return await prescriptionAppService.updatePrescription(args.appointmentId, args.data);
    } catch (error) {
      logger.error('[IPC] Error in prescription:update:', error);
      throw error;
    }
  });
}
