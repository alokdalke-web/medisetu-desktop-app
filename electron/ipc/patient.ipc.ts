import { ipcMain } from 'electron';
import { PatientAppService } from '../src/main/patient/application/PatientAppService';
import logger from '../utils/logger';

export function registerPatientIpcHandlers() {
  const patientAppService = new PatientAppService();

  ipcMain.handle('patient:search', async (_event, args: any) => {
    try {
      logger.info(`[IPC] Handling patient:search with args:`, args);
      return patientAppService.searchPatients(args);
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

  ipcMain.handle('patient:getAll', async (_event, args?: any) => {
    try {
      logger.info(`[IPC] Handling patient:getAll`);
      return patientAppService.getAllPatients(args);
    } catch (error) {
      logger.error('[IPC] Error in patient:getAll:', error);
      throw error;
    }
  });

  ipcMain.handle('patient:getReportCards', async (_event, args: any) => {
    try {
      logger.info(`[IPC] Handling patient:getReportCards for ${args.patientId}`);
      const db = require('../database/DatabaseManager').default.getConnection();
      
      const appointments = db.prepare(`
        SELECT a.*, s.name as serviceName, d.name as doctorName, d.speciality as doctorSpeciality
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN services s ON a.service_id = s.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = ? OR p.cloud_id = ?
        ORDER BY a.date DESC, a.time_slot DESC
      `).all(args.patientId, args.patientId);
      
      const mappedAppointments = appointments.map((row: any) => ({
        id: row.id,
        appointmentDate: row.date,
        appointmentTime: row.time_slot,
        appointmentType: row.serviceName || 'Consultation',
        appointmentStatus: row.status,
        doctor: {
          name: row.doctorName,
          speciality: row.doctorSpeciality
        }
      }));

      return {
        success: true,
        pagination: { current_page: args.pageNumber || 1, last_page: 1, per_page: args.pageSize || 10, total: appointments.length },
        appointments: mappedAppointments,
        prescriptions: [],
        reports: [],
        others: []
      };
    } catch (error) {
      logger.error('[IPC] Error in patient:getReportCards:', error);
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
