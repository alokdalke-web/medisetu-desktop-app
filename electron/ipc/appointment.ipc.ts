import { ipcMain } from 'electron';
import { AppointmentAppService } from '../src/main/appointment/application/AppointmentAppService.js';
import { SqliteAppointmentRepository } from '../src/main/appointment/repositories/SqliteAppointmentRepository.js';
import { TransactionManager } from '../src/main/configurations/TransactionManager.js';
import logger from '../utils/logger.js';
import syncServer from '../src/main/cluster/SyncServer.js';
import { z } from 'zod';
import { EventLogRepository } from '../src/main/infrastructure/repositories/EventLogRepository.js';
import crypto from 'crypto';

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

  ipcMain.handle('appointment:getAll', async (_event, args?: any) => {
    try {
      logger.info(`[IPC] Handling appointment:getAll with args: ${JSON.stringify(args)}`);
      return appointmentAppService.getClinicAppointments(args);
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

  ipcMain.handle('appointment:markAsNoShow', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling appointment:markAsNoShow`);
      return await appointmentAppService.markAsNoShow(args);
    } catch (error) {
      logger.error('[IPC] Error in appointment:markAsNoShow:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getClinicNoShowAnalytics', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling appointment:getClinicNoShowAnalytics`);
      return appointmentAppService.getClinicNoShowAnalytics(args);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getClinicNoShowAnalytics:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getConflicts', async () => {
    try {
      logger.info(`[IPC] Handling appointment:getConflicts`);
      const repo = new SqliteAppointmentRepository();
      const conflicts = repo.getConflicts();
      
      const grouped = conflicts.reduce((acc: any, curr: any) => {
        const groupId = curr.conflict_group_id;
        if (!groupId) return acc;
        
        if (!acc[groupId]) {
          acc[groupId] = { conflictGroupId: groupId, appointments: [] };
        }
        acc[groupId].appointments.push(curr);
        return acc;
      }, {});
      
      return Object.values(grouped);
    } catch (error) {
      logger.error('[IPC] Error in appointment:getConflicts:', error);
      throw error;
    }
  });

  const resolveConflictSchema = z.object({
    keepAppointmentId: z.string().min(1),
    conflictGroupId: z.string().min(1)
  });

  ipcMain.handle('appointment:resolveConflict', async (_event, args) => {
    try {
      const { keepAppointmentId, conflictGroupId } = resolveConflictSchema.parse(args);
      logger.info(`[IPC] Handling appointment:resolveConflict for group ${conflictGroupId}, keeping ${keepAppointmentId}`);
      
      const repo = new SqliteAppointmentRepository();
      const eventLogRepo = new EventLogRepository();
      
      await TransactionManager.run((tx) => {
        const appointmentsInGroup = repo.findByConflictGroupId(conflictGroupId);
        
        // Pass 1: Process the appointments being rescheduled FIRST. 
        // This ensures their Event Log entries are processed by SyncEngine before the kept appointment,
        // freeing up the slot on the cloud and preventing false 409 Overlap errors that would revert the conflict.
        for (const appt of appointmentsInGroup) {
          if (appt.id !== keepAppointmentId) {
            appt.status = 'Cancelled';
            appt.conflict_group_id = undefined;
            repo.update(tx, appt);

            const targetId = appt.cloud_id || appt.id;
            const eventId = crypto.randomUUID();
            eventLogRepo.insert(tx, {
              id: eventId,
              action_type: 'APPOINTMENT_UPDATED',
              entity_type: 'appointment',
              entity_id: appt.id,
              payload: JSON.stringify({
                eventId,
                entityType: 'appointment',
                operation: 'UPDATE',
                httpMethod: 'PUT',
                endpoint: `/appointments/${targetId}`,
                payload: {
                  appointmentStatus: appt.status
                },
                headers: {}
              })
            });
          }
        }

        // Pass 2: Process the appointment being kept.
        for (const appt of appointmentsInGroup) {
          if (appt.id === keepAppointmentId) {
            appt.status = 'Confirmed'; // Restore to normal state
            appt.conflict_group_id = undefined;
            repo.update(tx, appt);

            const targetId = appt.cloud_id || appt.id;
            const eventId = crypto.randomUUID();
            eventLogRepo.insert(tx, {
              id: eventId,
              action_type: 'APPOINTMENT_UPDATED',
              entity_type: 'appointment',
              entity_id: appt.id,
              payload: JSON.stringify({
                eventId,
                entityType: 'appointment',
                operation: 'UPDATE',
                httpMethod: 'PUT',
                endpoint: `/appointments/${targetId}`,
                payload: {
                  appointmentStatus: appt.status
                },
                headers: {}
              })
            });
          }
        }
      });
      
      syncServer.broadcastConflictResolution(conflictGroupId, keepAppointmentId);
      
      return { success: true };
    } catch (error) {
      logger.error('[IPC] Error in appointment:resolveConflict:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getConflictCount', async () => {
    try {
      const repo = new SqliteAppointmentRepository();
      return repo.getConflictCount();
    } catch (error) {
      logger.error('[IPC] Error in appointment:getConflictCount:', error);
      throw error;
    }
  });
}
