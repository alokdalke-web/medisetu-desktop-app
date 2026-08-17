import dgram from 'dgram';
import os from 'os';
import logger from '../../../utils/logger.js';
import NodeIdentity from './NodeIdentity.js';
import HostElectionService from './HostElectionService.js';



export interface Peer {
  nodeId: string;
  name?: string;
  ip: string;
  lastSeen: number;
  priority: number;
  term: number;
  claimingHost: boolean;
}

class DiscoveryService {
  private client: dgram.Socket;
  private readonly PORT = 5000;
  private peers: Map<string, Peer> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private localIp: string;
  private peerAvailabilitySubscribers: ((hasPeers: boolean) => void)[] = [];
  private pairingResponseSubscribers: ((response: any) => void)[] = [];

  public onPeerAvailabilityChange(callback: (hasPeers: boolean) => void) {
    this.peerAvailabilitySubscribers.push(callback);
  }

  public onPairingResponse(callback: (response: any) => void) {
    this.pairingResponseSubscribers.push(callback);
  }

  public removePairingResponseListener(callback: (response: any) => void) {
    this.pairingResponseSubscribers = this.pairingResponseSubscribers.filter(cb => cb !== callback);
  }

  private notifyPeerAvailabilityChange(hasPeers: boolean) {
    for (const callback of this.peerAvailabilitySubscribers) {
      callback(hasPeers);
    }
  }



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
          const wasEmpty = this.peers.size === 0;
          this.peers.set(data.nodeId, {
            nodeId: data.nodeId,
            name: data.name,
            ip: rinfo.address, // Trusting the network layer IP
            lastSeen: Date.now(),
            priority: data.priority || 0,
            term: data.term || 0,
            claimingHost: !!data.isHost
          });
          
          if (isNew && wasEmpty) {
            this.notifyPeerAvailabilityChange(true);
          }
          
          if (isNew) {
             logger.info(`[DiscoveryService] Discovered new peer: ${data.nodeId} at ${rinfo.address} with priority ${data.priority} term ${data.term}`);
          }

          if (data.term !== undefined && data.term > NodeIdentity.getLastKnownTerm()) {
            logger.info(`[DiscoveryService] Overheard higher term ${data.term} from peer ${data.nodeId}. Updating local term.`);
            NodeIdentity.setLastKnownTerm(data.term);
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

  private getBroadcastAddresses(): Set<string> {
    const interfaces = os.networkInterfaces();
    const broadcastAddresses = new Set<string>();

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const ipParts = iface.address.split('.').map(Number);
          const maskParts = iface.netmask.split('.').map(Number);
          
          if (ipParts.length === 4 && maskParts.length === 4) {
            const broadcast = ipParts.map((p, i) => p | (~maskParts[i] & 255)).join('.');
            broadcastAddresses.add(broadcast);
          }
        }
      }
    }

    if (broadcastAddresses.size === 0) {
      broadcastAddresses.add('255.255.255.255');
    }
    return broadcastAddresses;
  }

  private broadcastHeartbeat() {
    const payload = JSON.stringify({
      nodeId: NodeIdentity.getNodeId(),
      name: os.hostname(),
      ip: this.localIp,
      priority: NodeIdentity.getPriority(),
      term: NodeIdentity.getLastKnownTerm(),
      isHost: HostElectionService.isHost()
    });
    
    const broadcastAddresses = this.getBroadcastAddresses();

    // Broadcast the payload to all valid subnet networks
    broadcastAddresses.forEach(bcast => {
      this.client.send(payload, this.PORT, bcast, (err) => {
        if (err) {
           logger.error(`[DiscoveryService] Failed to broadcast heartbeat to ${bcast}: ${err.message}`);
        }
      });
    });
  }

  public broadcastPairingRequest(code: string, replyPort: number) {
    const payload = JSON.stringify({
      type: 'pairing_request',
      nodeId: NodeIdentity.getNodeId(),
      name: os.hostname(),
      code,
      replyPort
    });
    
    const broadcastAddresses = this.getBroadcastAddresses();
    broadcastAddresses.forEach(bcast => {
      this.client.send(payload, this.PORT, bcast, (err) => {
        if (err) {
           logger.error(`[DiscoveryService] Failed to broadcast pairing_request to ${bcast}: ${err.message}`);
        }
      });
    });
  }

  private cleanupStalePeers() {
    const now = Date.now();
    let removedAny = false;
    for (const [nodeId, peer] of this.peers.entries()) {
      // Remove peers not seen in the last 15 seconds (3 missed heartbeats)
      if (now - peer.lastSeen > 15000) {
        this.peers.delete(nodeId);
        logger.info(`[DiscoveryService] Peer ${nodeId} at ${peer.ip} removed (offline)`);
        removedAny = true;
      }
    }
    if (removedAny && this.peers.size === 0) {
      this.notifyPeerAvailabilityChange(false);
    }
  }

  public getActivePeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  public getHighestPriorityPeer(): Peer | null {
    const activePeers = this.getActivePeers();
    if (activePeers.length === 0) return null;
    
    return activePeers.reduce((highest, current) => {
      return current.priority > highest.priority ? current : highest;
    }, activePeers[0]);
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
