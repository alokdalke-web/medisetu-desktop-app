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
      INSERT INTO patients (id, name, phone, created_at, sync_status, profile_data, cloud_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(patient.id, patient.name, patient.phone, patient.created_at, patient.sync_status, patient.profile_data || null, patient.cloud_id || null);
  }

  public update(tx: Database.Database, patient: Patient): void {
    const stmt = tx.prepare(`
      UPDATE patients
      SET name = ?, phone = ?, sync_status = ?, profile_data = ?
      WHERE id = ?
    `);
    stmt.run(patient.name, patient.phone, patient.sync_status, patient.profile_data || null, patient.id);
  }

  public getAll(args?: any): { data: Patient[], total: number } {
    const db = dbManager.getConnection();
    const rows = db.prepare('SELECT id, name, phone as mobile, created_at, sync_status, profile_data FROM patients ORDER BY created_at DESC').all() as Patient[];
    
    if (!args) return { data: rows.slice(0, 100), total: rows.length };

    let filtered = rows;

    if (args.searchBy) {
      const q = args.searchBy.toLowerCase();
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.phone && p.phone.includes(q)) || 
        ((p as any).mobile && (p as any).mobile.includes(q))
      );
    }

    if (args.gender || args.minAge !== undefined || args.maxAge !== undefined || args.startDate || args.endDate) {
      filtered = filtered.filter(p => {
        let profile: any = {};
        if (p.profile_data) {
          try { profile = JSON.parse(p.profile_data); } catch (e) {}
        }
        
        if (args.gender && profile.gender && profile.gender.toLowerCase() !== args.gender.toLowerCase()) {
          return false;
        }

        if (args.minAge !== undefined && profile.age !== undefined && profile.age < args.minAge) {
          return false;
        }

        if (args.maxAge !== undefined && profile.age !== undefined && profile.age > args.maxAge) {
          return false;
        }

        if (args.startDate || args.endDate) {
          const createdAt = new Date(p.created_at).getTime();
          if (args.startDate && createdAt < new Date(args.startDate).getTime()) return false;
          if (args.endDate && createdAt > new Date(args.endDate).getTime() + 86400000) return false;
        }

        return true;
      });
    }

    // Pagination
    const pageNumber = args.pageNumber ? parseInt(args.pageNumber, 10) : 1;
    const pageSize = args.pageSize ? parseInt(args.pageSize, 10) : 100;
    const start = (pageNumber - 1) * pageSize;
    return { data: filtered.slice(start, start + pageSize), total: filtered.length };
  }
}
