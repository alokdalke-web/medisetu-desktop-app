import { ipcMain } from 'electron';
import { DashboardAppService } from '../src/main/dashboard/application/DashboardAppService';
import logger from '../utils/logger';

export function registerDashboardIpcHandlers() {
  const dashboardAppService = new DashboardAppService();

  ipcMain.handle('dashboard:getDoctorDashboard', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling dashboard:getDoctorDashboard`);
      return dashboardAppService.getDoctorDashboard(args);
    } catch (error) {
      logger.error('[IPC] Error in dashboard:getDoctorDashboard:', error);
      throw error;
    }
  });

  ipcMain.handle('dashboard:getRevenueOverview', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling dashboard:getRevenueOverview`);
      return dashboardAppService.getRevenueOverview(args);
    } catch (error) {
      logger.error('[IPC] Error in dashboard:getRevenueOverview:', error);
      throw error;
    }
  });

  ipcMain.handle('dashboard:getTodayOverview', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling dashboard:getTodayOverview`);
      return dashboardAppService.getTodayOverview(args);
    } catch (error) {
      logger.error('[IPC] Error in dashboard:getTodayOverview:', error);
      throw error;
    }
  });

  ipcMain.handle('dashboard:getPaymentTransactions', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling dashboard:getPaymentTransactions`);
      return dashboardAppService.getPaymentTransactions(args);
    } catch (error) {
      logger.error('[IPC] Error in dashboard:getPaymentTransactions:', error);
      throw error;
    }
  });
}
