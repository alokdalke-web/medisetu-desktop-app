import Database from 'better-sqlite3';

export class MasterDataRepository {
  /**
   * Generically UPSERTs a record into any given table using the provided transaction.
   * Note: This is an abstraction meant purely for the Pull Sync Engine, 
   * which assumes payload fields match the table columns exactly.
   */
  public upsert(tx: Database.Database, tableName: string, payload: any): void {
    const keys = Object.keys(payload);
    const placeholders = keys.map(() => '?').join(', ');
    const updatePlaceholders = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ');
    const values = Object.values(payload);

    // Basic safety check for table names to prevent SQL injection 
    // even though it's internal.
    const allowedTables = ['doctors', 'departments', 'rooms', 'services', 'doctor_availability', 'holidays', 'appointment_types', 'clinic_settings'];
    if (!allowedTables.includes(tableName)) {
      throw new Error(`Attempted to sync to unknown table: ${tableName}`);
    }

    const query = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updatePlaceholders}
    `;

    // For clinic_settings which uses 'key' as PRIMARY KEY instead of 'id'
    const finalQuery = tableName === 'clinic_settings' 
      ? query.replace('ON CONFLICT(id)', 'ON CONFLICT(key)')
      : query;

    tx.prepare(finalQuery).run(...values);
  }

  public delete(tx: Database.Database, tableName: string, id: string): void {
    const primaryKey = tableName === 'clinic_settings' ? 'key' : 'id';
    tx.prepare(`DELETE FROM ${tableName} WHERE ${primaryKey} = ?`).run(id);
  }
}
