import axios from 'axios';
import DatabaseManager from '../../../database/DatabaseManager';
import { EventLogRepository, type SyncEventPayload } from '../infrastructure/repositories/EventLogRepository';
import logger from '../../../utils/logger';
export class PushSyncEngine {
  private static instance: PushSyncEngine;
  private isOnline = false;
  private intervalId: NodeJS.Timeout | null = null;
  private eventLogRepository = new EventLogRepository();
  private isSyncing = false;
  private authToken: string | null = null;

  // The backend API base URL
  private readonly API_BASE_URL = 'http://localhost:5000/api/v1'; // TODO: inject from env/config

  private constructor() {}

  public static getInstance(): PushSyncEngine {
    if (!PushSyncEngine.instance) {
      PushSyncEngine.instance = new PushSyncEngine();
    }
    return PushSyncEngine.instance;
  }

  public setAuthToken(token: string) {
    this.authToken = token;
    // Trigger sync immediately upon getting a token
    this.triggerImmediateSync();
  }

  public start() {
    logger.info('Starting Sync Engine background worker...');
    
    // Immediate check
    this.checkConnectivity();

    // Periodic check every 15 seconds
    this.intervalId = setInterval(() => {
      this.checkConnectivity();
    }, 15000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkConnectivity() {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/health`, { timeout: 3000 });
      const wasOffline = !this.isOnline;
      if (response.status === 200) {
        this.isOnline = true;
        if (wasOffline) {
          logger.info('SyncEngine: Connection restored. Triggering sync loop.');
        }
        this.runSyncLoop();
      } else {
        this.isOnline = false;
      }
    } catch (e) {
      this.isOnline = false;
    }
  }

  public triggerImmediateSync() {
    if (this.isOnline && !this.isSyncing) {
      this.runSyncLoop();
    }
  }

  private async runSyncLoop() {
    if (this.isSyncing) return;
    if (!this.authToken) {
      logger.warn('SyncEngine: Cannot run sync loop. No auth token.');
      return;
    }

    this.isSyncing = true;
    const db = DatabaseManager.getConnection();

    try {
      while (this.isOnline) {
        // 1. Get the oldest pending event (any node) that hasn't synced to cloud
        const events = this.eventLogRepository.getPendingEvents(db, 1);
        if (events.length === 0) {
          break; // Queue is empty!
        }

        const event = events[0];
        logger.info(`SyncEngine: Processing event ${event.id} (${event.action_type})`);

        try {
          const payload: SyncEventPayload = JSON.parse(event.payload);

          // Map local UUIDs to cloud_ids for foreign keys before sending
          if (payload.entityType === 'patient' && payload.payload && payload.payload.primaryPatientId) {
            try {
              const patientRow = db.prepare(`SELECT cloud_id FROM patients WHERE id = ?`).get(payload.payload.primaryPatientId) as any;
              if (patientRow && patientRow.cloud_id) {
                payload.payload.primaryPatientId = patientRow.cloud_id;
                logger.info(`SyncEngine: Rewrote primaryPatientId to cloud_id ${patientRow.cloud_id}`);
              }
            } catch (e) {
              logger.error('SyncEngine: Failed to map patient primaryPatientId', e);
            }
          }

          if (payload.entityType === 'appointment' && payload.payload && payload.payload.patientId) {
            try {
              const patientRow = db.prepare(`SELECT cloud_id FROM patients WHERE id = ?`).get(payload.payload.patientId) as any;
              if (patientRow && patientRow.cloud_id) {
                payload.payload.patientId = patientRow.cloud_id;
                logger.info(`SyncEngine: Rewrote patientId to cloud_id ${patientRow.cloud_id}`);
              }
            } catch (e) {
              logger.error('SyncEngine: Failed to map patient cloud_id', e);
            }
          }

          if (payload.entityType === 'report_cards' && payload.payload && payload.payload.reportCard) {
            try {
              // 1. Map patientId
              const patientId = payload.payload.reportCard.patientId || payload.payload.reportCard.petientId;
              if (patientId) {
                const patientRow = db.prepare(`SELECT cloud_id FROM patients WHERE id = ?`).get(patientId) as any;
                if (patientRow && patientRow.cloud_id) {
                  if (payload.payload.reportCard.patientId) payload.payload.reportCard.patientId = patientRow.cloud_id;
                  if (payload.payload.reportCard.petientId) payload.payload.reportCard.petientId = patientRow.cloud_id;
                  logger.info(`SyncEngine: Rewrote reportCard patientId to cloud_id ${patientRow.cloud_id}`);
                }
              }

              // 2. Map appointmentId
              const appointmentId = payload.payload.reportCard.appointmentId;
              if (appointmentId) {
                const apptRow = db.prepare(`SELECT cloud_id FROM appointments WHERE id = ?`).get(appointmentId) as any;
                if (apptRow && apptRow.cloud_id) {
                  payload.payload.reportCard.appointmentId = apptRow.cloud_id;
                  logger.info(`SyncEngine: Rewrote reportCard appointmentId to cloud_id ${apptRow.cloud_id}`);
                }
              }
              
              // 3. Map medicineId in prescriptions
              if (Array.isArray(payload.payload.prescriptions)) {
                for (const rx of payload.payload.prescriptions) {
                  if (rx.medicineId) {
                    const medRow = db.prepare(`SELECT cloud_id FROM medicines WHERE id = ?`).get(rx.medicineId) as any;
                    if (medRow && medRow.cloud_id) {
                      rx.medicineId = medRow.cloud_id;
                      logger.info(`SyncEngine: Rewrote medicineId to cloud_id ${medRow.cloud_id}`);
                    }
                  }
                }
              }
            } catch (e) {
              logger.error('SyncEngine: Failed to map cloud_ids in report_cards', e);
            }
          }

          // 2. Execute HTTP Request
          const response = await axios({
            method: payload.httpMethod,
            url: `${this.API_BASE_URL}${payload.endpoint}`,
            data: payload.payload,
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
              ...payload.headers
            }
          });

          // 3. Handle Success
          logger.info(`SyncEngine: Successfully synced event ${event.id}`);
          
          // Check if it was a CREATE request and we got a cloud_id back
          if (payload.operation === 'CREATE' && response.data && response.data.result && response.data.result.id) {
            const cloudId = response.data.result.id;
            
            // Need to update the domain table with the cloud_id
            let tableName = '';
            if (payload.entityType === 'patient') tableName = 'patients';
            if (payload.entityType === 'appointment') tableName = 'appointments';
            if (payload.entityType === 'prescription') tableName = 'prescriptions';
            if (payload.entityType === 'medicines') tableName = 'medicines';

            if (tableName) {
              const stmt = db.prepare(`UPDATE ${tableName} SET cloud_id = ? WHERE id = ?`);
              stmt.run(cloudId, event.entity_id);
              logger.info(`SyncEngine: Mapped local_id ${event.entity_id} to cloud_id ${cloudId} in ${tableName}`);
            }
          }

          // 4. Mark event synced
          this.eventLogRepository.markEventSynced(db, event.id);
        } catch (error: any) {
          logger.error(`SyncEngine: Failed to sync event ${event.id}`, error);
          
          // Detect 409 Conflict (could add more specific handling later)
          let errorMsg = error.message;
          if (error.response) {
            errorMsg = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
          }

          // 5. Mark event failed and increment retry_count
          this.eventLogRepository.markEventFailed(db, event.id, errorMsg);

          // Stop loop for now if we hit an error to preserve sequential ordering.
          // Will retry on next periodic check.
          break; 
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Exposed methods for Debug Panel ---
  public getStatus() {
    const db = DatabaseManager.getConnection();
    const pendingCount = db.prepare(`SELECT count(*) as count FROM event_log WHERE status IN ('pending', 'failed')`).get() as any;
    const failedCount = db.prepare(`SELECT count(*) as count FROM event_log WHERE status = 'failed'`).get() as any;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: pendingCount.count,
      failedCount: failedCount.count,
      hasAuthToken: !!this.authToken
    };
  }
}
