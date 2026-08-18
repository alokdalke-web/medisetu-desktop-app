
import crypto from 'crypto';
import axios from 'axios';
import { BrowserWindow } from 'electron';
import DatabaseManager from '../../../database/DatabaseManager';
import { EventLogRepository, type SyncEventPayload } from '../infrastructure/repositories/EventLogRepository';
import logger from '../../../utils/logger';
import NodeIdentity from '../cluster/NodeIdentity';
import HostElectionService from '../cluster/HostElectionService.js';
import { AuthStore } from '../configurations/AuthStore.js';
import { ConfigStore } from '../configurations/ConfigStore.js';
import SyncServer from '../cluster/SyncServer.js';
export class PushSyncEngine {
  private static instance: PushSyncEngine;
  private isOnline = false;
  private intervalId: NodeJS.Timeout | null = null;
  private eventLogRepository = new EventLogRepository();
  private isSyncing = false;
  private authToken: string | null = null;
  private onlineStatusSubscribers: ((isOnline: boolean) => void)[] = [];

  public onOnlineStatusChange(callback: (isOnline: boolean) => void) {
    this.onlineStatusSubscribers.push(callback);
  }

  private notifyOnlineStatusChange() {
    for (const callback of this.onlineStatusSubscribers) {
      callback(this.isOnline);
    }
  }


  // The backend API base URL is dynamically fetched
  private get API_BASE_URL() {
    return ConfigStore.getInstance().getBackendUrl();
  }

  private constructor() { }

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

    try {
      const db = DatabaseManager.getConnection();
      const res = this.eventLogRepository.autoResetStuckEvents(db);
      logger.info(`[SyncEngine] Auto-reset ${res} stuck/failed events to pending`);
    } catch (e) {
      logger.error('Failed to auto-reset stuck events', e);
    }

    HostElectionService.onHostChange((isHost) => {
      if (isHost) {
        logger.info('SyncEngine: Became host. Re-authenticating and starting push.');
        const token = AuthStore.getToken();
        if (token) this.setAuthToken(token);
      } else {
        logger.info('SyncEngine: Lost host status. Stopping push and clearing token.');
        this.authToken = null;
        this.isSyncing = false;
      }
    });

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
      const serverRoot = new URL(this.API_BASE_URL).origin;
      const response = await axios.get(`${serverRoot}/api/health`, { timeout: 3000 });
      const wasOffline = !this.isOnline;
      if (response.status === 200) {
        if (!this.isOnline) {
          this.isOnline = true;
          this.notifyOnlineStatusChange();
        }
        if (wasOffline) {
          logger.info('SyncEngine: Connection restored. Triggering sync loop.');
        }
        this.runSyncLoop();
      } else {
        if (this.isOnline) {
          this.isOnline = false;
          this.notifyOnlineStatusChange();
          this.broadcastProgress(DatabaseManager.getConnection(), 'Offline');
        }
      }
    } catch (e) {
      if (this.isOnline) {
        this.isOnline = false;
        this.notifyOnlineStatusChange();
        this.broadcastProgress(DatabaseManager.getConnection(), 'Offline');
      }
    }
  }

  public triggerImmediateSync() {
    if (this.isOnline && !this.isSyncing) {
      this.runSyncLoop();
    } else {
      this.broadcastProgress(DatabaseManager.getConnection(), this.isSyncing ? 'Syncing...' : 'Idle');
    }
  }

  private broadcastProgress(db: any, currentAction: string = '') {
    try {
      const localNodeId = NodeIdentity.getNodeId();
      const count = this.eventLogRepository.getPendingEventsCount(db, localNodeId);
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send('push_sync:progress', {
          isOnline: this.isOnline,
          isSyncing: this.isSyncing,
          pendingCount: count,
          stuckCount: this.eventLogRepository.getStuckEventsCount(db),
          currentAction
        });
      }
    } catch (e) {
      logger.error('Failed to broadcast push sync progress', e);
    }
  }

  private async runSyncLoop() {
    if (!HostElectionService.isHost()) {
      return;
    }
    if (this.isSyncing) return;
    if (!this.authToken) {
      logger.warn('SyncEngine: Cannot run sync loop. No auth token.');
      return;
    }

    this.isSyncing = true;
    const db = DatabaseManager.getConnection();
    this.broadcastProgress(db, 'Starting sync...');

    try {
      while (this.isOnline) {
        // 1. Get the oldest pending event across all nodes since we are the host
        const events = this.eventLogRepository.getPendingEventsForHost(db, 1);
        if (events.length === 0) {
          break; // Queue is empty!
        }

        const event = events[0];
        logger.info(`SyncEngine: Processing event ${event.id} (${event.action_type})`);
        this.broadcastProgress(db, `Syncing ${event.action_type}...`);

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

          if (payload.entityType === 'prescription' && payload.payload && payload.payload.appointmentId) {
            try {
              const apptRow = db.prepare(`SELECT cloud_id FROM appointments WHERE id = ?`).get(payload.payload.appointmentId) as any;
              if (apptRow && apptRow.cloud_id) {
                payload.payload.appointmentId = apptRow.cloud_id;
                logger.info(`SyncEngine: Rewrote prescription appointmentId to cloud_id ${apptRow.cloud_id}`);
              }
            } catch (e) {
              logger.error('SyncEngine: Failed to map prescription appointmentId', e);
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
          // Map endpoint UUIDs for all appointment-related entities
          if (['appointment', 'appointment_no_show_actions', 'appointment_service'].includes(payload.entityType) && payload.endpoint) {
            try {
              // Extract the first UUID found in the endpoint path
              const match = payload.endpoint.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
              if (match && match[1]) {
                const localId = match[1];
                const apptRow = db.prepare(`SELECT cloud_id FROM appointments WHERE id = ?`).get(localId) as any;
                if (apptRow && apptRow.cloud_id) {
                  payload.endpoint = payload.endpoint.replace(localId, apptRow.cloud_id);
                  logger.info(`SyncEngine: Rewrote endpoint to ${payload.endpoint}`);
                }
              }
            } catch (e) {
              logger.error(`SyncEngine: Failed to map endpoint cloud_id for ${payload.entityType}`, e);
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

              // Broadcast this mapping to other peers
              const updateEvent: import('../infrastructure/repositories/EventLogRepository.js').EventLogEntry = {
                id: crypto.randomUUID(),
                action_type: 'UPDATE',
                entity_type: payload.entityType.toUpperCase(),
                entity_id: event.entity_id,
                payload: JSON.stringify({
                  eventId: crypto.randomUUID(),
                  entityType: payload.entityType,
                  operation: 'UPDATE',
                  httpMethod: 'PUT',
                  endpoint: '', // Peer projection doesn't need this
                  payload: {
                    id: event.entity_id,
                    cloud_id: cloudId
                  },
                  headers: {}
                }),
                status: 'synced',
                synced_to_cloud: true // So host doesn't push it to cloud again
              };
              
              // We must use a transaction for safety if possible, or just insert directly
              const tx = db.transaction((db) => {
                 this.eventLogRepository.insert(db as any, updateEvent);
              });
              tx(db);
              logger.info(`SyncEngine: Broadcasted cloud_id mapping for ${event.entity_id}`);
            }
          }

          // 4. Mark event synced
          this.eventLogRepository.markEventSynced(db, event.id);
          this.broadcastProgress(db);
          SyncServer.broadcastDbUpdated([event]);
        } catch (error: any) {
          logger.error(`SyncEngine: Failed to sync event ${event.id}`, error);

          let errorMsg = error.message;
          if (error.response) {
            errorMsg = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;

            if (error.response.status === 404) {
              // 404 might just mean a dependency hasn't reached the cloud yet due to clock skew/ordering.
              if ((event.retry_count || 0) < 3) {
                logger.warn(`SyncEngine: Entity not found (404). Treating as temporary failure (retry ${event.retry_count || 0} < 3) to allow dependencies to sync first.`);
                this.eventLogRepository.markEventFailed(db, event.id, errorMsg);
                break;
              } else {
                logger.error(`SyncEngine: Entity not found (404) after 3 retries. Marking event ${event.id} as stuck for manual intervention.`);
                this.eventLogRepository.markEventStuck(db, event.id, errorMsg);
                SyncServer.broadcastDbUpdated([event]);
                
                // Prevent cascading failures
                try {
                  const changes = this.eventLogRepository.cascadeStuckStatus(db, event.entity_id, 'Blocked by previous stuck event (404)');
                  if (changes > 0) {
                    logger.warn(`SyncEngine: Also marked ${changes} dependent events for entity ${event.entity_id} as stuck.`);
                  }
                } catch (e) {}

                this.broadcastProgress(db);
                continue;
              }
            }

            if (error.response.status === 400 || error.response.status === 409) {
              // These are genuinely unrecoverable without a code/data fix, but must be VISIBLE.
              logger.error(`SyncEngine: Unrecoverable client error (${error.response.status}). Marking event ${event.id} as stuck for visibility.`);
              this.eventLogRepository.markEventStuck(db, event.id, errorMsg);
              SyncServer.broadcastDbUpdated([event]);
              
              // Prevent cascading failures: mark any subsequent pending events for this same entity as stuck
              try {
                const changes = this.eventLogRepository.cascadeStuckStatus(db, event.entity_id, 'Blocked by previous stuck event');
                if (changes > 0) {
                  logger.warn(`SyncEngine: Also marked ${changes} dependent events for entity ${event.entity_id} as stuck.`);
                }
              } catch (e) {
                logger.error('SyncEngine: Failed to cascade stuck status', e);
              }

              let isOverlapError = error.response.status === 409;
              if (error.response.status === 400) {
                 const msg = JSON.stringify(error.response.data).toLowerCase();
                 if (msg.includes('overlap') || msg.includes('conflict') || msg.includes('already booked')) {
                     isOverlapError = true;
                 }
              }
                                     
              let entityType = '';
              try {
                const p = JSON.parse(event.payload);
                entityType = p.entityType;
              } catch (e) {}

              if (entityType === 'appointment' && isOverlapError) {
                try {
                  const conflictGroupId = crypto.randomUUID();
                  
                  // Fetch the details of the local appointment that caused the overlap
                  const apptRow = db.prepare(`SELECT doctor_id, date, time_slot FROM appointments WHERE id = ?`).get(event.entity_id) as any;
                  
                  if (apptRow) {
                    // Update ALL appointments that share this doctor, date, and time slot to be in the same conflict group
                    const stmt = db.prepare(`UPDATE appointments SET status = 'conflict', conflict_group_id = ? WHERE doctor_id = ? AND date = ? AND time_slot = ?`);
                    stmt.run(conflictGroupId, apptRow.doctor_id, apptRow.date, apptRow.time_slot);
                    logger.info(`SyncEngine: Grouped overlapping appointments for doctor ${apptRow.doctor_id} at ${apptRow.date} ${apptRow.time_slot} into conflict group ${conflictGroupId}`);
                  } else {
                    // Fallback to just the current one if not found for some reason
                    const stmt = db.prepare(`UPDATE appointments SET status = 'conflict', conflict_group_id = ? WHERE id = ?`);
                    stmt.run(conflictGroupId, event.entity_id);
                  }
                } catch (updateErr) {
                  logger.error('SyncEngine: Failed to mark appointment as conflict', updateErr);
                }
              }
              
              this.broadcastProgress(db);
              continue;
            }
          }

          // 5. For any other error (network timeout, 500, etc.), treat as temporary failure with backoff
          logger.warn(`SyncEngine: Network or server error. Marking event ${event.id} failed with backoff.`);
          this.eventLogRepository.markEventFailed(db, event.id, errorMsg);
          SyncServer.broadcastDbUpdated([event]);

          // Stop loop for now if we hit an error to preserve sequential ordering.
          // Will retry on next periodic check.
          break;
        }
      }
    } finally {
      this.isSyncing = false;
      this.broadcastProgress(db, 'Idle');
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
      stuckCount: this.eventLogRepository.getStuckEventsCount(db),
      hasAuthToken: !!this.authToken
    };
  }
}

