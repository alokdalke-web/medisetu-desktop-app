import Database from 'better-sqlite3';
import dbManager from '../../../../database/DatabaseManager';

export interface PrescriptionItem {
  medicine_id: string;
  dosage: string;
  frequency: string;
  duration_days: number;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  items: PrescriptionItem[];
}

export class SqlitePrescriptionRepository {
  /**
   * Creates a prescription locally. Requires a transaction connection `tx` for atomicity.
   */
  public create(tx: Database.Database, data: Prescription): void {
    const stmt = tx.prepare(`
      INSERT INTO prescriptions (id, patient_id, doctor_id, date, items_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      data.id,
      data.patient_id,
      data.doctor_id,
      data.date,
      JSON.stringify(data.items)
    );
  }

  /**
   * Fetches prescriptions for a specific patient. Read-only.
   */
  public getByPatient(patientId: string): Prescription[] {
    const db = dbManager.getConnection();
    const rows = db.prepare('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY date DESC')
      .all(patientId) as any[];
      
    return rows.map(row => ({
      id: row.id,
      patient_id: row.patient_id,
      doctor_id: row.doctor_id,
      date: row.date,
      items: JSON.parse(row.items_json)
    }));
  }

  public getByAppointment(appointmentId: string): Prescription | null {
    const db = dbManager.getConnection();
    const row = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(appointmentId) as any;
    if (!row) return null;
    return {
      id: row.id,
      patient_id: row.patient_id,
      doctor_id: row.doctor_id,
      date: row.date,
      items: JSON.parse(row.items_json)
    };
  }

  public update(tx: Database.Database, appointmentId: string, items: any[]): void {
    const stmt = tx.prepare(`
      UPDATE prescriptions SET items_json = ? WHERE id = ?
    `);
    stmt.run(JSON.stringify(items), appointmentId);
  }
}
