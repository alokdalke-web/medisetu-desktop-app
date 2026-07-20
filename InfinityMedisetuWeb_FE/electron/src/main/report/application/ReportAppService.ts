import crypto from 'crypto';
import { TransactionManager } from '../../configurations/TransactionManager';
import { EventLogRepository } from '../../infrastructure/repositories/EventLogRepository';
import { ReportRepository } from '../infrastructure/ReportRepository';

export class ReportAppService {
  private repository: ReportRepository;
  private eventLogRepository: EventLogRepository;

  constructor() {
    this.repository = new ReportRepository();
    this.eventLogRepository = new EventLogRepository();
  }

  public async createReportCard(payload: { reportCard: any, prescriptions: any[] }): Promise<any> {
    const reportCardId = payload.reportCard.id || crypto.randomUUID();
    const eventId = crypto.randomUUID();

    await TransactionManager.run((tx) => {
      // 1. Create Report Card
      const reportData = {
        ...payload.reportCard,
        id: reportCardId
      };
      this.repository.createReportCard(tx, reportData);

      // 2. Add Prescriptions
      const prescriptionIds: string[] = [];
      if (payload.prescriptions && payload.prescriptions.length > 0) {
        for (const p of payload.prescriptions) {
          const pId = p.id || crypto.randomUUID();
          prescriptionIds.push(pId);
          this.repository.addPrescription(tx, {
            ...p,
            id: pId,
            reportCardId,
            petientId: payload.reportCard.petientId
          });
        }
      }

      // 3. Log Event
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'REPORT_CARD_CREATED',
        entity_type: 'report_cards',
        entity_id: reportCardId,
        payload: JSON.stringify({
          eventId,
          entityType: 'report_cards',
          operation: 'CREATE',
          httpMethod: 'POST',
          endpoint: '/reports/card',
          payload: {
            reportCard: reportData,
            prescriptions: payload.prescriptions.map((p, idx) => ({ ...p, id: prescriptionIds[idx] }))
          },
          headers: {}
        })
      });
    });

    return { 
      success: true, 
      reportCardId 
    };
  }

  public async updateReportCard(reportCardId: string, prescriptionId: string, payload: { reportCard: any, prescriptions: any[] }): Promise<any> {
    const eventId = crypto.randomUUID();

    await TransactionManager.run((tx) => {
      // 1. Update Report Card
      this.repository.updateReportCard(tx, reportCardId, payload.reportCard);

      // 2. Overwrite Prescriptions
      this.repository.deletePrescriptionsByReportCardId(tx, reportCardId);
      
      const prescriptionIds: string[] = [];
      if (payload.prescriptions && payload.prescriptions.length > 0) {
        for (const p of payload.prescriptions) {
          const pId = p.id || crypto.randomUUID();
          prescriptionIds.push(pId);
          this.repository.addPrescription(tx, {
            ...p,
            id: pId,
            reportCardId,
            petientId: payload.reportCard.petientId || payload.reportCard.patientId
          });
        }
      }

      // 3. Log Event
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'REPORT_CARD_UPDATED',
        entity_type: 'report_cards',
        entity_id: reportCardId,
        payload: JSON.stringify({
          eventId,
          entityType: 'report_cards',
          operation: 'UPDATE',
          httpMethod: 'PUT',
          endpoint: `/reports/card/update?reportCardId=${reportCardId}&prescriptionId=${prescriptionId}`,
          payload: {
            reportCard: payload.reportCard,
            prescriptions: payload.prescriptions.map((p, idx) => ({ ...p, id: prescriptionIds[idx] }))
          },
          headers: {}
        })
      });
    });

    return { 
      success: true, 
      reportCardId 
    };
  }
}
