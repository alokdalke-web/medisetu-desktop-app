import React, { useEffect, useState } from 'react';
import { FiCloudOff, FiCloud, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

interface PushProgressData {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  currentAction: string;
}

const SyncStatusBar: React.FC = () => {
  const [masterSyncState, setMasterSyncState] = useState<string>('Idle');
  const [pushProgress, setPushProgress] = useState<PushProgressData>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    currentAction: 'Idle'
  });

  useEffect(() => {
    // Initial fetch for Master Sync
    if (window.ipcAPI?.sync?.getStatus) {
      window.ipcAPI.sync.getStatus().then((res) => {
        if (res?.state) {
          setMasterSyncState(res.state);
        }
      }).catch((e) => console.error("Failed to get initial master sync status", e));
    }

    // Initial fetch for Push Sync status
    if (window.ipcAPI?.pushSync?.getStatus) {
      window.ipcAPI.pushSync.getStatus().then((res) => {
        setPushProgress({
          isOnline: res.isOnline,
          isSyncing: res.isSyncing,
          pendingCount: res.pendingCount,
          currentAction: 'Idle'
        });
      }).catch((e) => console.error("Failed to get initial push sync status", e));
    }

    // Subscribe to Master Sync state changes
    let unsubscribeMaster: (() => void) | undefined;
    if (window.ipcAPI?.sync?.onStateChange) {
      unsubscribeMaster = window.ipcAPI.sync.onStateChange((newState: string) => {
        setMasterSyncState(newState);
      });
    }

    // Subscribe to Push Sync progress
    let unsubscribePush: (() => void) | undefined;
    if (window.ipcAPI?.sync?.onPushProgress) {
      unsubscribePush = window.ipcAPI.sync.onPushProgress((data: PushProgressData) => {
        setPushProgress(data);
      });
    }

    return () => {
      if (unsubscribeMaster) unsubscribeMaster();
      if (unsubscribePush) unsubscribePush();
    };
  }, []);

  // Determine overall status based on both master sync and push sync
  const isOffline = masterSyncState === 'Failed' || !pushProgress.isOnline;
  const isSyncing = masterSyncState === 'Syncing' || pushProgress.isSyncing;

  let bgColor = 'bg-gray-100 dark:bg-gray-800';
  let textColor = 'text-gray-600 dark:text-gray-400';
  let borderColor = 'border-transparent';
  let icon = <FiCloud className="w-3.5 h-3.5" />;
  let label = 'Cloud Online';
  let details = '';

  if (isOffline) {
    bgColor = 'bg-red-50 dark:bg-red-900/20';
    textColor = 'text-red-600 dark:text-red-400';
    borderColor = 'border-red-200 dark:border-red-800/40';
    icon = <FiCloudOff className="w-3.5 h-3.5" />;
    label = 'Offline Mode';
  } else if (isSyncing) {
    bgColor = 'bg-blue-50 dark:bg-blue-900/20';
    textColor = 'text-blue-600 dark:text-blue-400';
    borderColor = 'border-blue-200 dark:border-blue-800/40';
    icon = <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />;
    
    if (pushProgress.isSyncing && pushProgress.pendingCount > 0) {
      label = 'Pushing Data...';
      details = `${pushProgress.pendingCount} event(s) remaining`;
    } else if (masterSyncState === 'Syncing') {
      label = 'Fetching Data...';
      details = 'Syncing from cloud';
    } else {
      label = 'Syncing...';
    }
  } else if (pushProgress.pendingCount > 0) {
    // Online but has pending events that haven't been picked up by the loop yet
    bgColor = 'bg-amber-50 dark:bg-amber-900/20';
    textColor = 'text-amber-600 dark:text-amber-400';
    borderColor = 'border-amber-200 dark:border-amber-800/40';
    icon = <FiCloud className="w-3.5 h-3.5" />;
    label = 'Pending Sync';
    details = `${pushProgress.pendingCount} event(s) waiting`;
  } else {
    // Idle and all caught up
    bgColor = 'bg-emerald-50 dark:bg-emerald-900/20';
    textColor = 'text-emerald-600 dark:text-emerald-400';
    borderColor = 'border-emerald-200 dark:border-emerald-800/40';
    icon = <FiCheckCircle className="w-3.5 h-3.5" />;
    label = 'Cloud Synced';
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ease-in-out text-[11px] font-medium ${bgColor} ${textColor} ${borderColor}`}
      title={details ? `Cloud Status: ${label} - ${details}` : `Cloud Status: ${label}`}
    >
      {icon}
      <div className="hidden sm:flex flex-col items-start leading-none">
        <span className="truncate">{label}</span>
        {details && (
          <span className="text-[9px] opacity-75 truncate max-w-[120px] mt-0.5 font-normal">
            {details}
          </span>
        )}
      </div>
    </div>
  );
};

export default SyncStatusBar;
