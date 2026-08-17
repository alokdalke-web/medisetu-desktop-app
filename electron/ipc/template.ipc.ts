import { ipcMain } from 'electron';
import { TemplateAppService } from '../src/main/template/application/TemplateAppService';
import logger from '../utils/logger.js';
import { AuthStore } from '../src/main/configurations/AuthStore.js';

export function registerTemplateHandlers() {
  const templateAppService = new TemplateAppService();

  ipcMain.handle('template.getDoctorTemplate', async () => {
    try {
      const doctorId = AuthStore.getUserId() as string;
      if (!doctorId) {
        return { success: true, data: {} };
      }
      return await templateAppService.getDoctorTemplate(doctorId);
    } catch (error) {
      logger.error('[IPC] Error in template.getDoctorTemplate:', error);
      throw error;
    }
  });
}
