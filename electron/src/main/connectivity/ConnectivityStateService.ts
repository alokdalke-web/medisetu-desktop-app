import { BrowserWindow } from 'electron';
import { PushSyncEngine } from '../sync/SyncEngine';
import DiscoveryService from '../cluster/DiscoveryService';
import logger from '../../../utils/logger';

export type ConnectivityState = 'online' | 'lan_sync' | 'island';

class ConnectivityStateService {
  private currentState: ConnectivityState = 'island';
  private intervalId: NodeJS.Timeout | null = null;

  public start() {
    this.evaluateState();
    PushSyncEngine.getInstance().onOnlineStatusChange(() => this.evaluateState());
    DiscoveryService.onPeerAvailabilityChange(() => this.evaluateState());
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getState(): ConnectivityState {
    return this.currentState;
  }

  private evaluateState() {
    const isOnline = PushSyncEngine.getInstance().getStatus().isOnline;
    const peerCount = DiscoveryService.getActivePeers().length;

    let newState: ConnectivityState;
    if (isOnline) {
      newState = 'online';
    } else if (peerCount > 0) {
      newState = 'lan_sync';
    } else {
      newState = 'island';
    }

    if (newState !== this.currentState) {
      logger.info(`[ConnectivityStateService] State changed from ${this.currentState} to ${newState}`);
      this.currentState = newState;
      this.broadcastStateChange();
    }
  }

  private broadcastStateChange() {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('connectivity:state_change', this.currentState);
    }
  }
}

export default new ConnectivityStateService();
