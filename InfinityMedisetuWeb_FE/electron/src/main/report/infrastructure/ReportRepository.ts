import type { Database } from 'better-sqlite3';
import dbManager from '../../../../database/DatabaseManager';

export class ReportRepository {
  public createReportCard(tx: Database, data: any): void {
    const stmt = tx.prepare(`
      INSERT INTO report_cards (
        id, petient_id, appointment_id, report_id, comorbidities, habits,
        general_examination, system_examination, provisional_diagnosis,
        differential_diagnosis, final_diagnosis, investigations, advice,
        clinical_notes, allergies, surgerySuggested, visitingDays,
        visiting_notes, prescription_pdf, follow_up_in_days, follow_up_date, vitals
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.petientId,
      data.appointmentId,
      data.reportId || null,
      data.comorbidities ? JSON.stringify(data.comorbidities) : null,
      data.habits ? JSON.stringify(data.habits) : null,
      data.generalExamination ? JSON.stringify(data.generalExamination) : null,
      data.systemExamination || null,
      data.provisionalDiagnosis || null,
      data.differentialDiagnosis || null,
      data.finalDiagnosis || null,
      data.investigations || null,
      data.advice || null,
      data.clinicalNotes || null,
      data.allergies ? JSON.stringify(data.allergies) : null,
      data.surgerySuggested ? JSON.stringify(data.surgerySuggested) : null,
      data.visitingDays ? JSON.stringify(data.visitingDays) : null,
      data.visitingNotes || null,
      data.prescriptionPdf || null,
      data.followUpInDays || null,
      data.followUpDate || null,
      data.vitals ? JSON.stringify(data.vitals) : null
    );
  }

  public updateReportCard(tx: Database, id: string, data: any): void {
    const stmt = tx.prepare(`
      UPDATE report_cards SET
        comorbidities = ?, habits = ?, general_examination = ?, system_examination = ?,
        provisional_diagnosis = ?, differential_diagnosis = ?, final_diagnosis = ?,
        investigations = ?, advice = ?, clinical_notes = ?, allergies = ?,
        surgerySuggested = ?, visitingDays = ?, visiting_notes = ?,
        prescription_pdf = ?, follow_up_in_days = ?, follow_up_date = ?, vitals = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      data.comorbidities ? JSON.stringify(data.comorbidities) : null,
      data.habits ? JSON.stringify(data.habits) : null,
      data.generalExamination ? JSON.stringify(data.generalExamination) : null,
      data.systemExamination || null,
      data.provisionalDiagnosis || null,
      data.differentialDiagnosis || null,
      data.finalDiagnosis || null,
      data.investigations || null,
      data.advice || null,
      data.clinicalNotes || null,
      data.allergies ? JSON.stringify(data.allergies) : null,
      data.surgerySuggested ? JSON.stringify(data.surgerySuggested) : null,
      data.visitingDays ? JSON.stringify(data.visitingDays) : null,
      data.visitingNotes || null,
      data.prescriptionPdf || null,
      data.followUpInDays || null,
      data.followUpDate || null,
      data.vitals ? JSON.stringify(data.vitals) : null,
      id
    );
  }

  public addPrescription(tx: Database, data: any): void {
    const stmt = tx.prepare(`
      INSERT INTO report_prescriptions (
        id, report_card_id, petient_id, medicine_id, prescribed_by,
        medicine_name, composition, strength, dosage, frequency,
        duration, manufacturer, medicine_count, marketer, image_url,
        notes, uses
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.reportCardId,
      data.petientId,
      data.medicineId || null,
      data.prescribedBy || null,
      data.medicineName,
      data.composition || null,
      data.strength || null,
      data.dosage,
      data.frequency,
      data.duration,
      data.manufacturer || null,
      data.medicineCount || null,
      data.marketer || null,
      data.imageUrl || null,
      data.notes || null,
      data.uses ? JSON.stringify(data.uses) : null
    );
  }

  public deletePrescriptionsByReportCardId(tx: Database, reportCardId: string): void {
    const stmt = tx.prepare('DELETE FROM report_prescriptions WHERE report_card_id = ?');
    stmt.run(reportCardId);
  }

  public getReportCardByAppointmentId(appointmentId: string): any {
    const db = dbManager.getConnection();
    const query = 'SELECT * FROM report_cards WHERE appointment_id = ?';
    return db.prepare(query).get(appointmentId);
  }

  public getPrescriptionsByReportCardId(reportCardId: string): any[] {
    const db = dbManager.getConnection();
    const query = 'SELECT * FROM report_prescriptions WHERE report_card_id = ?';
    return db.prepare(query).all(reportCardId) as any[];
  }
}
