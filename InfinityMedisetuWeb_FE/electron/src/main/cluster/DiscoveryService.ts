import dgram from 'dgram';
import os from 'os';
import logger from '../../../utils/logger.js';
import NodeIdentity from './NodeIdentity.js';

export interface Peer {
  nodeId: string;
  ip: string;
  lastSeen: number;
}

class DiscoveryService {
  private client: dgram.Socket;
  private readonly PORT = 5000;
  private peers: Map<string, Peer> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private localIp: string;

  constructor() {
    this.client = dgram.createSocket('udp4');
    this.localIp = this.getLocalIp();
  }

  public start() {
    this.client.on('error', (err) => {
      logger.error(`[DiscoveryService] UDP Server error:\n${err.stack}`);
      this.client.close();
    });

    this.client.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.nodeId && data.nodeId !== NodeIdentity.getNodeId()) {
          const isNew = !this.peers.has(data.nodeId);
          this.peers.set(data.nodeId, {
            nodeId: data.nodeId,
            ip: rinfo.address, // Trusting the network layer IP
            lastSeen: Date.now()
          });
          
          if (isNew) {
             logger.info(`[DiscoveryService] Discovered new peer: ${data.nodeId} at ${rinfo.address}`);
          }
        }
      } catch (e) {
        // Ignore invalid JSON payloads
      }
    });

    this.client.on('listening', () => {
      const address = this.client.address();
      logger.info(`[DiscoveryService] Listening for UDP broadcasts on ${address.address}:${address.port}`);
      this.client.setBroadcast(true);
      
      // Start broadcasting heartbeat every 5 seconds
      this.broadcastInterval = setInterval(() => {
        this.broadcastHeartbeat();
        this.cleanupStalePeers();
      }, 5000);
    });

    // Bind to all interfaces for listening
    this.client.bind(this.PORT);
  }

  private broadcastHeartbeat() {
    const payload = JSON.stringify({
      nodeId: NodeIdentity.getNodeId(),
      ip: this.localIp
    });
    
    // Broadcast to the standard local subnet broadcast address
    this.client.send(payload, this.PORT, '255.255.255.255', (err) => {
      if (err) {
         logger.error(`[DiscoveryService] Failed to broadcast heartbeat: ${err.message}`);
      }
    });
  }

  private cleanupStalePeers() {
    const now = Date.now();
    for (const [nodeId, peer] of this.peers.entries()) {
      // Remove peers not seen in the last 15 seconds (3 missed heartbeats)
      if (now - peer.lastSeen > 15000) {
        this.peers.delete(nodeId);
        logger.info(`[DiscoveryService] Peer ${nodeId} at ${peer.ip} removed (offline)`);
      }
    }
  }

  public getActivePeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  public stop() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    this.client.close();
    logger.info('[DiscoveryService] UDP Server stopped.');
  }

  private getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}

export default new DiscoveryService();
