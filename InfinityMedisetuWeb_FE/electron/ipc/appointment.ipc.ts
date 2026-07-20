import { ipcMain } from 'electron';
import { AppointmentAppService } from '../src/main/appointment/application/AppointmentAppService';
import logger from '../utils/logger';

export function registerAppointmentIpcHandlers() {
  const appointmentAppService = new AppointmentAppService();

  ipcMain.handle('appointment:book', async (_event, args: { patientId: string, doctorId: string, date: string, timeSlot: string, status?: string, serviceId?: string, paymentMode?: string, paymentStatus?: string, bookingSource?: string }) => {
    try {
      logger.info(`[IPC] Handling appointment:book for doctor ${args.doctorId} at ${args.timeSlot}`);
      return await appointmentAppService.bookAppointment(args.patientId, args.doctorId, args.date, args.timeSlot, args.status, args.serviceId, args.paymentMode, args.paymentStatus, args.bookingSource);
    } catch (error) {
      logger.error('[IPC] Error in appointment:book:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getQueue', async (_event, args: { doctorId: string, date: string }) => {
    try {
      logger.info(`[IPC] Handling appointment:getQueue for doctor ${args.doctorId}`);
      return appointmentAppService.getQueue(args.doctorId, args.date);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getQueue:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getAll', async (_event, date?: string) => {
    try {
      logger.info(`[IPC] Handling appointment:getAll for date ${date}`);
      return appointmentAppService.getClinicAppointments(date);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getAll:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getById', async (_event, id: string) => {
    try {
      return appointmentAppService.getAppointmentById(id);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getById:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getMultipleServices', async (_event, id: string) => {
    try {
      logger.info(`[IPC] Handling appointment:getMultipleServices for ${id}`);
      return appointmentAppService.getMultipleServices(id);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getMultipleServices:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:addMultipleServices', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling appointment:addMultipleServices for ${args.appointmentId}`);
      return await appointmentAppService.addMultipleServices(args.appointmentId, args.serviceIds, args.paymentMode, args.payment_notes);
    } catch (error) {
      logger.error('[IPC] Error in appointment:addMultipleServices:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getAllUser', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling appointment:getAllUser`);
      return appointmentAppService.getAllUserAppointments(args);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getAllUser:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getDetails', async (_event, date: string) => {
    try {
      logger.info(`[IPC] Handling appointment:getDetails for date ${date}`);
      return appointmentAppService.getClinicAppointmentDetails(date);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getDetails:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getAvailableSlots', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling appointment:getAvailableSlots`);
      return appointmentAppService.getAvailableSlots(args);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getAvailableSlots:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:update', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling appointment:update for ${args.appointmentId}`);
      return await appointmentAppService.updateAppointment(args.appointmentId, args.data);
    } catch (error) {
      logger.error('[IPC] Error in appointment:update:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getQueueState', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling appointment:getQueueState`);
      return appointmentAppService.getQueueState(args);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getQueueState:', error);
      throw error;
    }
  });
}
