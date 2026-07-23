import { ipcMain } from 'electron';
import ConnectivityStateService from '../src/main/connectivity/ConnectivityStateService';
import DiscoveryService from '../src/main/cluster/DiscoveryService';

export function registerConnectivityIpcHandlers() {
  ipcMain.handle('connectivity:getState', () => {
    return ConnectivityStateService.getState();
  });

  ipcMain.handle('cluster:getPeers', () => {
    return DiscoveryService.getActivePeers();
  });
}
