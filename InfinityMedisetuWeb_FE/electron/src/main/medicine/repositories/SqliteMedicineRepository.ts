import type { Database } from 'better-sqlite3';
import dbManager from '../../../../database/DatabaseManager';

export interface Medicine {
  id: string;
  created_by_user_id?: string;
  name: string;
  sku?: string;
  generic_name?: string;
  manufacturer?: string;
  composition?: string;
  form?: string;
  strength?: string;
  category?: string;
  requires_prescription?: boolean;
  is_favorite?: boolean;
  is_active?: boolean;
  sync_status?: string;
  cloud_id?: string;
  created_at?: string;
  updated_at?: string;
}

export class SqliteMedicineRepository {
  public getAll(): Medicine[] {
    const db = dbManager.getConnection();
    const rows = db.prepare(`
      SELECT * FROM medicines 
      WHERE is_active = 1 
      ORDER BY name ASC 
      LIMIT 200
    `).all() as Medicine[];
    return rows;
  }

  public search(query: string): Medicine[] {
    const db = dbManager.getConnection();
    const rows = db.prepare(`
      SELECT * FROM medicines 
      WHERE is_active = 1 
        AND (name LIKE ? OR generic_name LIKE ? OR composition LIKE ?) 
      ORDER BY name ASC 
      LIMIT 50
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as Medicine[];
    return rows;
  }

  public create(tx: Database, med: Medicine): void {
    const stmt = tx.prepare(`
      INSERT INTO medicines (
        id, name, generic_name, manufacturer, composition, form, strength, 
        requires_prescription, is_favorite, is_active, sync_status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      med.id,
      med.name,
      med.generic_name || null,
      med.manufacturer || null,
      med.composition || null,
      med.form || null,
      med.strength || null,
      med.requires_prescription ? 1 : 0,
      med.is_favorite ? 1 : 0,
      med.is_active !== false ? 1 : 0,
      med.sync_status || 'pending'
    );
  }
}
