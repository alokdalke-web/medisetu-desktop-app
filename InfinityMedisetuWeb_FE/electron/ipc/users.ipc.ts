import { ipcMain } from 'electron';
import logger from '../utils/logger.js';
import DatabaseManager from '../database/DatabaseManager.js';

export function registerUsersIpcHandlers() {
  ipcMain.handle('users:getAll', async (_event, args: { userType?: string }) => {
    try {
      logger.info(`[IPC] Handling users:getAll for userType ${args.userType}`);
      const db = DatabaseManager.getConnection();
      
      // If asking for doctors, fetch from local 'doctors' table
      if (args.userType === 'Doctor') {
        const rows = db.prepare(`SELECT id, name, speciality FROM doctors`).all();
        
        // Map to the expected User format so the UI filters pass
        const mappedUsers = rows.map((r: any) => ({
          ...r,
          userType: 'Doctor',
          status: 'Active'
        }));
        
        return {
          result: {
            allUser: mappedUsers,
            pagination: {
              totalRecords: mappedUsers.length,
              totalPages: 1,
              currentPage: 1,
              pageSize: 100
            }
          }
        };
      }
      
      // Otherwise return empty to prevent crashes for unported user types
      return {
        result: {
          allUser: [],
          pagination: { totalRecords: 0, totalPages: 1, currentPage: 1, pageSize: 100 }
        }
      };
    } catch (error) {
      logger.error('[IPC] Error in users:getAll:', error);
      throw error;
    }
  });

  // NEW: IPC handler for fetching clinic services for appointment booking
  ipcMain.handle('users:getService', async (_event, args: { patientId: string, doctorId: string }) => {
    try {
      logger.info(`[IPC] Handling users:getService for doctorId ${args.doctorId}`);
      const db = DatabaseManager.getConnection();
      
      const rows = db.prepare(`SELECT id, name AS serviceName, price FROM services`).all();
      
      return {
        result: rows
      };
    } catch (error) {
      logger.error('[IPC] Error in users:getService:', error);
      throw error;
    }
  });
}
