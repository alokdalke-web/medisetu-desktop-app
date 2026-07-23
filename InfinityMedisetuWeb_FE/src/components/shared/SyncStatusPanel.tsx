import React, { useEffect, useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent, Chip, Button } from "@heroui/react";
import { FiCloud, FiCloudOff, FiRefreshCw, FiServer, FiActivity } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

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
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // When panel is open, fetch more aggressively and also get peers
  useEffect(() => {
    if (!isOpen) return;
    fetchPeers();
    const interval = setInterval(() => {
      fetchStatus();
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
    <Popover placement="bottom-end" isOpen={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          className="relative inline-flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          aria-label="Sync Status"
        >
          {status.isOnline ? (
            status.isSyncing ? (
              <FiRefreshCw className="text-blue-500 animate-spin text-lg" />
            ) : status.failedCount > 0 ? (
              <FiCloudOff className="text-red-500 text-lg" />
            ) : (
              <FiCloud className="text-gray-700 dark:text-gray-300 text-lg" />
            )
          ) : (
            <FiCloudOff className="text-gray-400 dark:text-gray-500 text-lg" />
          )}
          {status.failedCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1, transition: { type: 'spring', bounce: 0.5 } }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm"
            >
              !
            </motion.span>
          )}
        </motion.button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 border border-gray-200 shadow-xl overflow-hidden rounded-xl">
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

          <div className="p-4 space-y-4">
            {/* Sync Queue */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Sync Queue</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {status.pendingCount} items waiting
                </span>
              </div>
              
              {status.lastSyncAt ? (
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Last synced {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  No recent sync
                </div>
              )}
            </div>

            {/* Failed Items Warning */}
            {status.failedCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <FiCloudOff className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
                      {status.failedCount} items failed to sync
                    </h4>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                      Check your connection or try forcing a sync.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              color="primary"
              variant={status.isSyncing ? "flat" : "solid"}
              className="w-full font-semibold"
              onPress={handleManualSync}
              isDisabled={status.isSyncing || !status.isOnline || status.pendingCount === 0}
              startContent={status.isSyncing ? <FiRefreshCw className="animate-spin" /> : <FiCloud />}
            >
              {status.isSyncing ? 'Syncing...' : 'Force Sync'}
            </Button>
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
                      {peer.name || peer.nodeId.substring(0, 8)}
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
      </PopoverContent>
    </Popover>
  );
};

export default SyncStatusPanel;
