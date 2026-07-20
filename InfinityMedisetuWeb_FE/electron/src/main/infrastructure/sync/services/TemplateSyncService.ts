import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService';
import logger from '../../../../../utils/logger';
import { AuthStore } from '../../../configurations/AuthStore';

export class TemplateSyncService implements ISyncService {
  public entityName = 'prescription_templates';

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching prescription templates from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    // A bit hacky to decode the JWT here, but since this sync service runs globally, we might need the doctorId
    // Actually, getDoctorTemplate might be dependent on the token in the backend to know who the doctor is.
    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    
    // Fetch doctor's prescription template
    const response = await fetch(`${apiUrl}/reports/prescription-template`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prescription templates: ${response.statusText}`);
    }

    const data: any = await response.json();
    const template = data?.data; // Based on GetTemplateResponse schema

    // Wait, the API returns { message, defaultTemplate, defaultColors, templateName, isCustom, etc. }
    // Or if custom, it returns { action, template: { ... } } (for POST)
    // The GET returns flat properties inside `data` (e.g. `data.templateName`, `data.color1`, etc.) or nested `defaultColors`.
    
    // We only sync if there is valid template data.
    if (!template) {
        return 0;
    }

    const doctorId = AuthStore.getUserId() || 'unknown'; // Use the cached user ID
    // If we have an id from the backend, we use it, otherwise we make one up or use doctor_id as PK.
    const templateId = template.id || doctorId; 

    // We use a transaction
    const insertTemplate = db.transaction(() => {
      // In our sqlite schema, id is PRIMARY KEY
      const stmt = db.prepare(`
        INSERT INTO prescription_templates (
          id, doctor_id, template_name, font_family, 
          color1, color2, color3, color4, color5, 
          color6, color7, color8, color9, color10, 
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          template_name = EXCLUDED.template_name,
          font_family = EXCLUDED.font_family,
          color1 = EXCLUDED.color1,
          color2 = EXCLUDED.color2,
          color3 = EXCLUDED.color3,
          color4 = EXCLUDED.color4,
          color5 = EXCLUDED.color5,
          color6 = EXCLUDED.color6,
          color7 = EXCLUDED.color7,
          color8 = EXCLUDED.color8,
          color9 = EXCLUDED.color9,
          color10 = EXCLUDED.color10,
          updated_at = CURRENT_TIMESTAMP
      `);

      // Determine colors to use (it might be under defaultColors or flat)
      const t = template.defaultColors || template;

      stmt.run(
        templateId,
        doctorId,
        template.templateName || 'Default',
        template.fontFamily || t.fontFamily || 'sans-serif',
        t.color1 || '',
        t.color2 || '',
        t.color3 || '',
        t.color4 || '',
        t.color5 || '',
        t.color6 || '',
        t.color7 || '',
        t.color8 || '',
        t.color9 || '',
        t.color10 || ''
      );

      return 1;
    });

    return insertTemplate();
  }
}
