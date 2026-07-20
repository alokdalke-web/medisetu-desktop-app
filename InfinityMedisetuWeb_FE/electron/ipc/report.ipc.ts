import { ipcMain } from 'electron';
import logger from '../utils/logger';
import { ReportAppService } from '../src/main/report/application/ReportAppService';
import { ReportRepository } from '../src/main/report/infrastructure/ReportRepository';

export function registerReportHandlers() {
  const reportAppService = new ReportAppService();
  const reportRepository = new ReportRepository();

  ipcMain.handle('report:createCard', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling report:createCard`);
      return await reportAppService.createReportCard(args);
    } catch (error) {
      logger.error('[IPC] Error in report:createCard:', error);
      throw error;
    }
  });

  ipcMain.handle('report:updateCard', async (_event, args) => {
    try {
      logger.info(`[IPC] Handling report:updateCard for ${args.reportCardId}`);
      return await reportAppService.updateReportCard(args.reportCardId, args.prescriptionId, args.body);
    } catch (error) {
      logger.error('[IPC] Error in report:updateCard:', error);
      throw error;
    }
  });

  ipcMain.handle('appointment:getReports', async (_event, appointmentId: string) => {
    try {
      logger.info(`[IPC] Handling appointment:getReports for appointment ${appointmentId}`);
      const reportCard = reportRepository.getReportCardByAppointmentId(appointmentId);
      if (reportCard) {
        const prescriptions = reportRepository.getPrescriptionsByReportCardId(reportCard.id);
        // Map back to frontend expected structure
        reportCard.comorbidities = reportCard.comorbidities ? JSON.parse(reportCard.comorbidities) : [];
        reportCard.habits = reportCard.habits ? JSON.parse(reportCard.habits) : [];
        reportCard.generalExamination = reportCard.general_examination ? JSON.parse(reportCard.general_examination) : [];
        reportCard.allergies = reportCard.allergies ? JSON.parse(reportCard.allergies) : [];
        reportCard.surgerySuggested = reportCard.surgerySuggested ? JSON.parse(reportCard.surgerySuggested) : [];
        reportCard.visitingDays = reportCard.visitingDays ? JSON.parse(reportCard.visitingDays) : [];
        reportCard.vitals = reportCard.vitals ? JSON.parse(reportCard.vitals) : {};
        
        prescriptions.forEach(p => {
          if (p.uses) p.uses = JSON.parse(p.uses);
        });

        return {
          success: true,
          result: [
            {
              ...reportCard,
              prescriptions
            }
          ]
        };
      }
      return { success: true, result: [] };
    } catch (error) {
      logger.error('[IPC] Error in report:getByAppointmentId:', error);
      throw error;
    }
  });
}
