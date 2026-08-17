import dbManager from '../../../database/DatabaseManager.js';
import DiscoveryService from './DiscoveryService.js';
import logger from '../../../utils/logger.js';
import { EventLogRepository, type EventLogEntry } from '../infrastructure/repositories/EventLogRepository.js';
import NodeIdentity from './NodeIdentity.js';
import { EventProjector } from './EventProjector.js';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { SqliteAppointmentRepository } from '../appointment/repositories/SqliteAppointmentRepository.js';
import { TransactionManager } from '../configurations/TransactionManager.js';
import SyncServer from './SyncServer.js';

class SyncClient {
  private syncInterval: NodeJS.Timeout | null = null;
  private eventLogRepo = new EventLogRepository();
  private isSyncing = false;
  private peerSockets = new Map<string, Socket>();
  private nodeSyncClocks = new Map<string, number>();

  public start() {
    // Run an initial sync cycle after 3 seconds to allow discovery to find peers
    setTimeout(() => this.runSyncCycle(), 3000);
    // Poll peers every 30 seconds (fallback for missed socket events)
    this.syncInterval = setInterval(() => this.runSyncCycle(), 30000);
    logger.info('[SyncClient] Started P2P Sync Client loop.');
  }

  public stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    for (const socket of this.peerSockets.values()) {
      socket.disconnect();
    }
    this.peerSockets.clear();
    this.nodeSyncClocks.clear();
    logger.info('[SyncClient] Stopped P2P Sync Client loop.');
  }

  private async runSyncCycle() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const peers = DiscoveryService.getActivePeers();
      
      const peerIds = new Set(peers.map(p => p.nodeId));
      for (const [nodeId, socket] of this.peerSockets.entries()) {
        if (!peerIds.has(nodeId)) {
          socket.disconnect();
          this.peerSockets.delete(nodeId);
          logger.info(`[SyncClient] Disconnected socket for peer ${nodeId} (no longer active)`);
        }
      }

      if (peers.length === 0) return;

      const localNodeId = NodeIdentity.getNodeId();

      for (const peer of peers) {
        if (!this.peerSockets.has(peer.nodeId)) {
          const socket = io(`http://${peer.ip}:5002`, { 
            transports: ['websocket'], 
            reconnection: true
          });
          
          socket.on('connect', () => {
             logger.info(`[SyncClient] Connected socket client to peer ${peer.nodeId} (${peer.ip})`);
          });
          
          socket.on('peer:event', (event: EventLogEntry) => {
             this.mergeEvents([event]);
             // Update the tracked clock for the originating node
             if (event.node_id && event.lamport_clock) {
               const currentClock = this.nodeSyncClocks.get(event.node_id) || 0;
               if (event.lamport_clock > currentClock) {
                  this.nodeSyncClocks.set(event.node_id, event.lamport_clock);
               }
             }
          });
          
          socket.on('conflict:resolved', (data: { conflictGroupId: string, keptAppointmentId: string }) => {
             this.applyConflictResolution(data.conflictGroupId, data.keptAppointmentId);
          });
          
          socket.on('disconnect', () => {
             logger.info(`[SyncClient] Socket disconnected from peer ${peer.nodeId}`);
          });

          this.peerSockets.set(peer.nodeId, socket);
        }

        try {
          const nodeClocksJson = encodeURIComponent(JSON.stringify(Object.fromEntries(this.nodeSyncClocks)));
          const url = `http://${peer.ip}:5002/p2p/events?node_clocks=${nodeClocksJson}&node_id=${localNodeId}`;
          const response = await axios.get(url, { 
             timeout: 5000
          });
          
          if (response.data && Array.isArray(response.data.events)) {
            const events: EventLogEntry[] = response.data.events;
            if (events.length > 0) {
               for (const ev of events) {
                 if (ev.node_id && ev.lamport_clock) {
                   const currentClock = this.nodeSyncClocks.get(ev.node_id) || 0;
                   if (ev.lamport_clock > currentClock) {
                      this.nodeSyncClocks.set(ev.node_id, ev.lamport_clock);
                   }
                 }
               }
               this.mergeEvents(events);
            }
          }
        } catch (e: any) {
          logger.warn(`[SyncClient] Failed to pull from peer ${peer.nodeId} (${peer.ip}): ${e.message}`);
        }
      }
    } catch (err) {
       logger.error('[SyncClient] Unexpected error in sync cycle', err);
    } finally {
      this.isSyncing = false;
    }
  }

  private mergeEvents(events: EventLogEntry[]) {
    if (events.length === 0) return;
    
    let mergedCount = 0;
    const newlyMerged: EventLogEntry[] = [];
    const statusUpdated: EventLogEntry[] = [];
    
    try {
      const db = dbManager.getConnection();
      const transaction = db.transaction(() => {
        for (const event of events) {
          const existing = this.eventLogRepo.getEventById(db, event.id);
          
          if (existing) {
             const hasNewStatus = event.status !== existing.status || 
                                  event.synced_to_cloud !== existing.synced_to_cloud || 
                                  event.error_message !== existing.error_message;
             
             const hasNewerClock = event.lamport_clock! > existing.lamport_clock! || 
                (event.lamport_clock === existing.lamport_clock && event.node_id! > existing.node_id!);

             if (hasNewerClock) {
                this.eventLogRepo.upsertEvent(db, event);
             } else if (hasNewStatus && (event.status !== 'pending' || event.synced_to_cloud)) {
                // Update local status with Host's sync status
                const stmt = db.prepare(`
                  UPDATE event_log 
                  SET status = ?, synced_to_cloud = ?, error_message = ?, retry_count = ?, next_retry_at = ?
                  WHERE id = ?
                `);
                stmt.run(
                  event.status, 
                  event.synced_to_cloud ? 1 : 0, 
                  event.error_message, 
                  event.retry_count || 0, 
                  event.next_retry_at, 
                  event.id
                );
                statusUpdated.push(event);
             }
          } else {
             if (event.node_id === NodeIdentity.getNodeId()) {
               continue; // Ignore our own events if we don't have them (prevent echo loops from wiped DBs)
             }
             
             this.eventLogRepo.upsertEvent(db, event);
             mergedCount++;
             newlyMerged.push(event);
             
             EventProjector.project(db, event);
          }
        }
      });
      
      transaction();
      
      if (mergedCount > 0 || statusUpdated.length > 0) {
        if (mergedCount > 0) {
          logger.info(`[SyncClient] Successfully replicated ${mergedCount} new events from peers.`);
        }
        if (statusUpdated.length > 0) {
          logger.info(`[SyncClient] Updated sync status for ${statusUpdated.length} existing events.`);
        }
        
        SyncServer.broadcastDbUpdated([...newlyMerged, ...statusUpdated]);
        
        for (const ev of newlyMerged) {
          SyncServer.broadcastEventToPeers(ev);
        }
      }
    } catch (e) {
      logger.error(`[SyncClient] Failed to merge events:`, e);
    }
  }
  private async applyConflictResolution(conflictGroupId: string, keptAppointmentId: string) {
    try {
      const repo = new SqliteAppointmentRepository();
      
      let modified = false;
      await TransactionManager.run((tx) => {
        const appointmentsInGroup = repo.findByConflictGroupId(conflictGroupId);
        if (appointmentsInGroup.length === 0) {
          logger.info(`[SyncClient] No local appointments found for conflict group ${conflictGroupId}, ignoring resolution broadcast.`);
          return;
        }

        // Pass 1: Process the appointments being rescheduled FIRST.
        // This ensures if we re-sync or push events, the slot is freed before confirming the kept appointment.
        for (const appt of appointmentsInGroup) {
          if (appt.id !== keptAppointmentId) {
            appt.status = 'Cancelled';
            appt.conflict_group_id = undefined;
            repo.update(tx, appt);
            modified = true;
          }
        }

        // Pass 2: Process the appointment being kept.
        for (const appt of appointmentsInGroup) {
          if (appt.id === keptAppointmentId) {
            appt.status = 'Confirmed';
            appt.conflict_group_id = undefined;
            repo.update(tx, appt);
            modified = true;
          }
        }
      });
      
      if (modified) {
        SyncServer.broadcastDbUpdated();
      }
    } catch (err) {
      logger.error(`[SyncClient] Failed to apply conflict resolution for group ${conflictGroupId}:`, err);
    }
  }
}

export default new SyncClient();
