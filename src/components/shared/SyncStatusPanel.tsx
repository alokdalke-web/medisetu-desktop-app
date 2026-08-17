import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, Chip, Button } from "@heroui/react";
import { FiCloud, FiCloudOff, FiRefreshCw, FiServer, FiActivity, FiShield } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useHostElectionStatus } from '../../hooks/useHostElectionStatus';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  hasAuthToken: boolean;
  lastSyncAt?: string | number;
}

interface Peer {
  nodeId: string;
  name?: string;
  lastSeen?: string | number;
}

const SyncStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    hasAuthToken: false
  });
  
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { status: electionStatus, error: electionError } = useHostElectionStatus();

  const fetchStatus = async () => {
    if ((window as any).ipcAPI?.pushSync) {
      try {
        const result = await (window as any).ipcAPI.pushSync.getStatus();
        setStatus(result);
      } catch (e) {
        console.error('Failed to get sync status', e);
      }
    }
  };

  const fetchPeers = async () => {
    if ((window as any).ipcAPI?.cluster) {
      try {
        const result = await (window as any).ipcAPI.cluster.getPeers();
        setPeers(result || []);
      } catch (e) {
        console.error('Failed to get peers', e);
      }
    }
  };

  // Run immediately when component mounts to populate the button's initial state
  useEffect(() => {
    fetchStatus();
    
    let cleanupSyncProgress: (() => void) | undefined;
    if ((window as any).ipcAPI?.on) {
      cleanupSyncProgress = (window as any).ipcAPI.on('push_sync:progress', (data: any) => {
        setStatus(prev => ({
          ...prev,
          ...data
        }));
      });
    }
    
    return () => {
      if (cleanupSyncProgress) cleanupSyncProgress();
    };
  }, []);

  // When panel is open, fetch more aggressively and also get peers
  useEffect(() => {
    if (!isOpen) return;
    fetchPeers();
    const interval = setInterval(() => {
      fetchPeers();
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleManualSync = async () => {
    if ((window as any).ipcAPI?.pushSync) {
      await (window as any).ipcAPI.pushSync.trigger();
      fetchStatus();
    }
  };

  if (!(window as any).ipcAPI) return null;

  return (
    <>
      <button
        id="sync-status-hidden-trigger"
        type="button"
        className="sr-only"
        aria-label="Sync Status"
        onClick={() => setIsOpen(true)}
      />
      
      <Modal isOpen={isOpen} onOpenChange={setIsOpen} placement="center">
        <ModalContent className="w-80 p-0 border border-gray-200 shadow-xl overflow-hidden rounded-xl">
          <div className="bg-white dark:bg-slate-900 w-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <FiActivity className="text-blue-600" />
                Sync Status
              </h3>
              <Chip 
                size="sm" 
                color={status.isOnline ? "success" : "default"}
                variant="flat"
              >
                {status.isOnline ? 'Online' : 'Offline'}
              </Chip>
            </div>

            {/* Host Election Status */}
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FiShield />
                Cloud Sync Delegation
              </h4>
              
              {electionError ? (
                <div className="text-xs text-red-500 italic">Status unavailable</div>
              ) : !electionStatus ? (
                <div className="text-xs text-gray-500 italic">Checking status...</div>
              ) : (
                <div className="space-y-2">
                  {electionStatus.isHost ? (
                    <Chip color="success" variant="flat" size="sm" className="font-medium w-full justify-center">
                      This computer is the Sync Host
                    </Chip>
                  ) : electionStatus.hostNodeId ? (
                    <Chip color="default" variant="flat" size="sm" className="font-medium w-full justify-center">
                      Syncing via {electionStatus.hostNodeId.substring(0, 8)}
                    </Chip>
                  ) : (
                    <Chip color="warning" variant="flat" size="sm" className="font-medium w-full justify-center text-warning-800">
                      No host currently active
                    </Chip>
                  )}
                  
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
                    Node priority: {electionStatus.priority}, term: {electionStatus.term}
                  </div>
                </div>
              )}
            </div>

            {/* Connected Peers Section */}
            <div className="border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FiServer />
                Connected Clinic Computers
              </h4>
              
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1 sidebar-scroll">
                {peers.length === 0 ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                    No other computers connected on LAN.
                  </div>
                ) : (
                  peers.map(peer => (
                    <div key={peer.nodeId} className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-2 rounded-md shadow-sm">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-2">
                        {peer.name ? `${peer.name} (${peer.nodeId.substring(0, 8)})` : peer.nodeId.substring(0, 8)}
                      </span>
                      {peer.lastSeen && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 shrink-0">
                          seen {formatDistanceToNow(new Date(peer.lastSeen), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SyncStatusPanel;
