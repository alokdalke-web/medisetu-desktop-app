import dbManager from '../../../../database/DatabaseManager';
import logger from '../../../../utils/logger';
import { BrowserWindow } from 'electron';
import type { ISyncService } from './services/ISyncService';
import { DoctorSyncService } from './services/DoctorSyncService';
import { DoctorAvailabilitySyncService } from './services/DoctorAvailabilitySyncService';
import { ServiceSyncService } from './services/ServiceSyncService';
import { MedicineSyncService } from './services/MedicineSyncService';
import { TemplateSyncService } from './services/TemplateSyncService';
import { ClinicSymptomSyncService } from './services/ClinicSymptomSyncService';

export type SyncState = 'Idle' | 'Syncing' | 'Completed' | 'Failed';

export class SyncEngine {
  private currentState: SyncState = 'Idle';
  private services: ISyncService[] = [
    new DoctorSyncService(),
    new DoctorAvailabilitySyncService(),
    new ServiceSyncService(),
    new MedicineSyncService(),
    new TemplateSyncService(),
    new ClinicSymptomSyncService(),
  ];

  public getState(): SyncState {
    return this.currentState;
  }

  private setState(state: SyncState) {
    this.currentState = state;
    logger.info(`[SyncEngine] State changed to: ${state}`);
    
    // Broadcast state to UI if mainWindow exists
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('sync:state_change', { state });
    }
  }

  private updateSyncMetadata(
    entityName: string, 
    status: 'success' | 'failed', 
    recordCount: number = 0, 
    lastError: string | null = null
  ) {
    const db = dbManager.getConnection();
    const stmt = db.prepare(`
      INSERT INTO sync_metadata (id, entity_type, last_sync_time, status, record_count, last_error)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        last_sync_time = CURRENT_TIMESTAMP,
        status = EXCLUDED.status,
        record_count = EXCLUDED.record_count,
        last_error = EXCLUDED.last_error
    `);
    
    stmt.run(
      `sync_${entityName}`, 
      entityName, 
      status, 
      recordCount, 
      lastError
    );
  }

  public async triggerSync(): Promise<void> {
    if (this.currentState === 'Syncing') {
      logger.warn('[SyncEngine] Sync already in progress. Ignoring trigger.');
      return;
    }

    try {
      this.setState('Syncing');
      
      let overallSuccess = true;

      for (const service of this.services) {
        try {
          logger.info(`[SyncEngine] Starting sync for entity: ${service.entityName}`);
          
          let recordsSynced = 0;
          
          const db = dbManager.getConnection();
          recordsSynced = await service.sync(db);
          
          logger.info(`[SyncEngine] Successfully synced ${recordsSynced} records for ${service.entityName}`);
          this.updateSyncMetadata(service.entityName, 'success', recordsSynced, null);
          
        } catch (error: any) {
          logger.error(`[SyncEngine] Failed to sync entity: ${service.entityName}`, error);
          overallSuccess = false;
          this.updateSyncMetadata(service.entityName, 'failed', 0, error.message || String(error));
          // Continue to the next entity if one fails, as requested
        }
      }

      this.setState(overallSuccess ? 'Completed' : 'Failed');
    } catch (error) {
      logger.error('[SyncEngine] Master Sync process failed critically:', error);
      this.setState('Failed');
    } finally {
      // Auto reset to idle after 5 seconds so it can run again
      setTimeout(() => {
        if (this.currentState === 'Completed' || this.currentState === 'Failed') {
          this.setState('Idle');
        }
      }, 5000);
    }
  }
}
