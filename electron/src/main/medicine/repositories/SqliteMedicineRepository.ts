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
  public getAll(args?: any): Medicine[] {
    const db = dbManager.getConnection();
    let query = `SELECT * FROM medicines WHERE is_active = 1`;
    
    if (args?.isFavorite === 'true' || args?.isFavorite === true) {
      query += ` AND is_favorite = 1`;
    } else if (args?.isFavorite === 'false' || args?.isFavorite === false) {
      query += ` AND is_favorite = 0`;
    }
    
    // Fallback search logic since frontend sometimes passes q to getAll
    const queryParams: any[] = [];
    if (args?.q) {
      query += ` AND (name LIKE ? OR generic_name LIKE ? OR composition LIKE ?)`;
      queryParams.push(`%${args.q}%`, `%${args.q}%`, `%${args.q}%`);
    }

    query += ` ORDER BY name ASC LIMIT 200`;
    const rows = db.prepare(query).all(...queryParams) as Medicine[];
    return rows;
  }

  public search(query: string, args?: any): Medicine[] {
    const db = dbManager.getConnection();
    let sql = `
      SELECT * FROM medicines 
      WHERE is_active = 1 
        AND (name LIKE ? OR generic_name LIKE ? OR composition LIKE ?)
    `;
    const queryParams: any[] = [`%${query}%`, `%${query}%`, `%${query}%`];
    
    if (args?.isFavorite === 'true' || args?.isFavorite === true) {
      sql += ` AND is_favorite = 1`;
    } else if (args?.isFavorite === 'false' || args?.isFavorite === false) {
      sql += ` AND is_favorite = 0`;
    }

    sql += ` ORDER BY name ASC LIMIT 50`;
    const rows = db.prepare(sql).all(...queryParams) as Medicine[];
    return rows;
  }

  public toggleFavorite(tx: Database, medicineId: string): Medicine {
    // SQLite doesn't natively support returning from UPDATE unless RETURNING is supported (SQLite 3.35+).
    // Let's do it safely with two steps.
    let med = tx.prepare(`SELECT * FROM medicines WHERE id = ?`).get(medicineId) as Medicine;
    if (!med) throw new Error('Medicine not found');

    const newStatus = med.is_favorite ? 0 : 1;
    tx.prepare(`UPDATE medicines SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(newStatus, medicineId);
    
    med.is_favorite = newStatus === 1;
    return med;
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
