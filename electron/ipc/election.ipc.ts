import { ipcMain } from 'electron';
import HostElectionService from '../src/main/cluster/HostElectionService.js';
import NodeIdentity from '../src/main/cluster/NodeIdentity.js';

export function registerElectionIpcHandlers() {
  ipcMain.handle('election:getStatus', async () => {
    return {
      isHost: HostElectionService.isHost(),
      priority: NodeIdentity.getPriority(),
      term: NodeIdentity.getLastKnownTerm(),
      hostNodeId: HostElectionService.getCurrentHostNodeId()
    };
  });
}
