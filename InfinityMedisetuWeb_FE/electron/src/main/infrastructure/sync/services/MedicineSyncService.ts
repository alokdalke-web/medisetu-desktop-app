import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService';
import logger from '../../../../../utils/logger';
import { AuthStore } from '../../../configurations/AuthStore';

export class MedicineSyncService implements ISyncService {
  public entityName = 'medicines';

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching medicines from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    // Fetch all active medicines (we don't paginate here currently, or we can assume it returns all we need)
    const response = await fetch(`${apiUrl}/medicine/medicines?isActive=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch medicines: ${response.statusText}`);
    }

    const data: any = await response.json();
    const medicines = data?.medicines || [];
    
    const insertMedicines = db.transaction((meds: any[]) => {
      let count = 0;
      const stmt = db.prepare(`
        INSERT INTO medicines (
          id, created_by_user_id, name, sku, generic_name, manufacturer, 
          composition, form, strength, category, requires_prescription, 
          is_favorite, is_active, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          name = EXCLUDED.name,
          sku = EXCLUDED.sku,
          generic_name = EXCLUDED.generic_name,
          manufacturer = EXCLUDED.manufacturer,
          composition = EXCLUDED.composition,
          form = EXCLUDED.form,
          strength = EXCLUDED.strength,
          category = EXCLUDED.category,
          requires_prescription = EXCLUDED.requires_prescription,
          is_favorite = EXCLUDED.is_favorite,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const med of meds) {
        stmt.run(
          med.id || med._id,
          med.created_by_user_id || null,
          med.name || med.medicineName,
          med.sku || null,
          med.generic_name || med.genericName || null,
          med.manufacturer || med.manufacturerName || null,
          med.composition || null,
          med.form || med.medicineForm || null,
          med.strength || null,
          med.category || null,
          med.requires_prescription || med.requiresPrescription ? 1 : 0,
          med.is_favorite || med.isFavorite ? 1 : 0,
          med.is_active !== undefined ? (med.is_active || med.isActive ? 1 : 0) : 1
        );
        count++;
      }
      return count;
    });

    return insertMedicines(medicines);
  }
}
