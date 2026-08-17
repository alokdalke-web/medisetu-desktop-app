import http from 'http';
import url from 'url';
import { Server as SocketIOServer } from 'socket.io';
import logger from '../../../utils/logger.js';
import dbManager from '../../../database/DatabaseManager.js';
import { EventLogRepository, localEventEmitter, type EventLogEntry } from '../infrastructure/repositories/EventLogRepository.js';

class SyncServer {
  private server: http.Server | null = null;
  private io: SocketIOServer | null = null;
  private readonly PORT = 5002;
  private eventLogRepo = new EventLogRepository();

  public start() {
    this.server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'GET') {
        const parsedUrl = url.parse(req.url || '', true);
        
        if (parsedUrl.pathname === '/p2p/events') {
          // --- AUTHORIZATION CHECK REMOVED ---
          // Since P2P security was disabled, we allow all local network devices to pull events freely.

          try {
            const db = dbManager.getConnection();
            let events;
            if (parsedUrl.query.node_clocks) {
              try {
                const nodeClocks = JSON.parse(parsedUrl.query.node_clocks as string);
                events = this.eventLogRepo.getMissingEvents(db, nodeClocks);
              } catch (err) {
                const sinceClock = parseInt(parsedUrl.query.since_clock as string, 10) || 0;
                events = this.eventLogRepo.getEventsAfterClock(db, sinceClock);
              }
            } else {
              const sinceClock = parseInt(parsedUrl.query.since_clock as string, 10) || 0;
              events = this.eventLogRepo.getEventsAfterClock(db, sinceClock);
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ events }));
          } catch (e: any) {
            logger.error(`[SyncServer] Error serving events: ${e.message}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    // Initialize Socket.io on the same HTTP server
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Authorization check removed for P2P LAN network

    this.io.on('connection', (socket) => {
       logger.info(`[SyncServer] Client connected to Socket.io: ${socket.id}`);
    });

    this.server.listen(this.PORT, '0.0.0.0', () => {
      logger.info(`[SyncServer] HTTP & Socket.io Server listening on port ${this.PORT}`);
    });

    // Listen to local events to broadcast to peers
    localEventEmitter.on('local_event_inserted', (event: EventLogEntry) => {
      this.broadcastEventToPeers(event);
    });
  }

  public broadcastEventToPeers(event: EventLogEntry) {
    if (this.io) {
      // Broadcast to all connected clients (peers). Local UI client ignores 'peer:event'
      this.io.emit('peer:event', event);
    }
  }

  public broadcastConflictResolution(conflictGroupId: string, keptAppointmentId: string) {
    if (this.io) {
      this.io.emit('conflict:resolved', { conflictGroupId, keptAppointmentId });
    }
  }

  public broadcastDbUpdated(events?: EventLogEntry[]) {
    if (this.io) {
      if (events && events.length > 0) {
        const payload = events.map(e => ({
          entityType: e.entity_type,
          entityId: e.entity_id
        }));
        this.io.emit('db_updated', payload);
      } else {
        this.io.emit('db_updated');
      }
    }
  }

  public stop() {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    logger.info('[SyncServer] HTTP & Socket.io Server stopped.');
  }
}

export default new SyncServer();
