import logger from '../../../utils/logger.js';
import DiscoveryService from './DiscoveryService.js';
import NodeIdentity from './NodeIdentity.js';

class HostElectionService {
  private isCurrentHost: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Array<(isHost: boolean) => void> = [];

  public start() {
    logger.info('[HostElectionService] Starting grace period (8 seconds) before participating in election...');
    setTimeout(() => {
      this.runElectionCycle();
      this.intervalId = setInterval(() => this.runElectionCycle(), 5000);
    }, 8000);
  }

  private runElectionCycle() {
    const activePeers = DiscoveryService.getActivePeers();
    
    // 1. Look for a peer claiming to be host with term >= local term
    const localTerm = NodeIdentity.getLastKnownTerm();
    const existingHostPeer = activePeers.find(p => p.claimingHost && p.term >= localTerm);

    if (existingHostPeer) {
      if (this.isCurrentHost) {
        logger.info(`[HostElectionService] Found peer ${existingHostPeer.nodeId} claiming host with term ${existingHostPeer.term}. Stepping down.`);
        this.setHostState(false);
      }
      return;
    }

    // 2. If no active peer is currently claiming host, check priorities
    const localPriority = NodeIdentity.getPriority();
    const highestPriorityPeer = DiscoveryService.getHighestPriorityPeer();

    if (!highestPriorityPeer || localPriority > highestPriorityPeer.priority) {
      // Self-promote
      if (!this.isCurrentHost) {
        const newTerm = NodeIdentity.getLastKnownTerm() + 1;
        NodeIdentity.setLastKnownTerm(newTerm);
        logger.info(`[HostElectionService] No active host found and we have highest priority (${localPriority}). Self-promoting to host with term ${newTerm}.`);
        this.setHostState(true);
      }
    }
    // 3. Otherwise (a peer has higher priority but isn't claiming host yet)
    // do nothing this cycle, stay in the current state, re-check next interval.
  }

  private setHostState(isHost: boolean) {
    if (this.isCurrentHost !== isHost) {
      this.isCurrentHost = isHost;
      this.subscribers.forEach(cb => cb(isHost));
    }
  }

  public isHost(): boolean {
    return this.isCurrentHost;
  }

  public getCurrentHostNodeId(): string | null {
    if (this.isCurrentHost) {
      return NodeIdentity.getNodeId();
    }
    const activePeers = DiscoveryService.getActivePeers();
    const existingHostPeer = activePeers.find(p => p.claimingHost && p.term >= NodeIdentity.getLastKnownTerm());
    return existingHostPeer ? existingHostPeer.nodeId : null;
  }

  public onHostChange(callback: (isHost: boolean) => void): void {
    this.subscribers.push(callback);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export default new HostElectionService();
