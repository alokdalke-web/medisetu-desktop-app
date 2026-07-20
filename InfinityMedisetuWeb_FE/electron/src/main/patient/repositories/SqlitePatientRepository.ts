import dbManager from '../../../../database/DatabaseManager';
import Database from 'better-sqlite3';

export interface Patient {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  sync_status: string;
  profile_data?: string;
  cloud_id?: string;
}

export class SqlitePatientRepository {
  public findById(id: string): Patient | null {
    const db = dbManager.getConnection();
    const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Patient | undefined;
    return row || null;
  }

  public findByPhone(phone: string): Patient | null {
    const db = dbManager.getConnection();
    const row = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone) as Patient | undefined;
    return row || null;
  }

  public search(query: string): Patient[] {
    const db = dbManager.getConnection();
    const rows = db.prepare('SELECT id, name, phone as mobile, created_at, profile_data FROM patients WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC LIMIT 50')
      .all(`%${query}%`, `%${query}%`) as Patient[];
    return rows;
  }

  public create(tx: Database.Database, patient: Patient): void {
    const stmt = tx.prepare(`
      INSERT INTO patients (id, name, phone, created_at, sync_status, profile_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(patient.id, patient.name, patient.phone, patient.created_at, patient.sync_status, patient.profile_data || null);
  }

  public update(tx: Database.Database, patient: Patient): void {
    const stmt = tx.prepare(`
      UPDATE patients
      SET name = ?, phone = ?, sync_status = ?, profile_data = ?
      WHERE id = ?
    `);
    stmt.run(patient.name, patient.phone, patient.sync_status, patient.profile_data || null, patient.id);
  }

  public getAll(): Patient[] {
    const db = dbManager.getConnection();
    const rows = db.prepare('SELECT id, name, phone as mobile, created_at, profile_data FROM patients ORDER BY created_at DESC LIMIT 100').all() as Patient[];
    return rows;
  }
}
