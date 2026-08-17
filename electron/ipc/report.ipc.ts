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
        const mappedReportCard = {
          id: reportCard.id,
          petientId: reportCard.petient_id,
          appointmentId: reportCard.appointment_id,
          reportId: reportCard.report_id,
          comorbidities: reportCard.comorbidities ? JSON.parse(reportCard.comorbidities) : [],
          habits: reportCard.habits ? JSON.parse(reportCard.habits) : [],
          generalExamination: reportCard.general_examination ? JSON.parse(reportCard.general_examination) : [],
          systemExamination: reportCard.system_examination,
          provisionalDiagnosis: reportCard.provisional_diagnosis,
          differentialDiagnosis: reportCard.differential_diagnosis,
          finalDiagnosis: reportCard.final_diagnosis,
          investigations: reportCard.investigations,
          advice: reportCard.advice,
          clinicalNotes: reportCard.clinical_notes,
          allergies: reportCard.allergies ? JSON.parse(reportCard.allergies) : [],
          surgerySuggested: reportCard.surgerySuggested ? JSON.parse(reportCard.surgerySuggested) : [],
          visitingDays: reportCard.visitingDays ? JSON.parse(reportCard.visitingDays) : [],
          visitingNotes: reportCard.visiting_notes,
          prescriptionPdf: reportCard.prescription_pdf,
          followUpInDays: reportCard.follow_up_in_days,
          followUpDate: reportCard.follow_up_date,
          vitals: reportCard.vitals ? JSON.parse(reportCard.vitals) : {},
          createdAt: reportCard.created_at,
          updatedAt: reportCard.updated_at
        };

        const mappedPrescriptions = prescriptions.map(p => ({
          id: p.id,
          reportCardId: p.report_card_id,
          petientId: p.petient_id,
          medicineId: p.medicine_id,
          prescribedBy: p.prescribed_by,
          medicineName: p.medicine_name,
          composition: p.composition,
          strength: p.strength,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          manufacturer: p.manufacturer,
          medicineCount: p.medicine_count,
          marketer: p.marketer,
          imageUrl: p.image_url,
          notes: p.notes,
          uses: p.uses ? JSON.parse(p.uses) : {},
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));

        return {
          success: true,
          result: {
            clinic: {},
            reportCard: mappedReportCard,
            prescriptions: mappedPrescriptions
          }
        };
      }
      return { success: true, result: null };
    } catch (error) {
      logger.error('[IPC] Error in report:getByAppointmentId:', error);
      throw error;
    }
  });
}
