import React, { useEffect, useState } from 'react';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  hasAuthToken: boolean;
}

const SyncDebugPanel: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    hasAuthToken: false
  });
  
  const [isVisible, setIsVisible] = useState(false);

  const fetchStatus = async () => {
    if ((window as any).ipcAPI && (window as any).ipcAPI.pushSync) {
      try {
        const result = await (window as any).ipcAPI.pushSync.getStatus();
        setStatus(result);
      } catch (e) {
        console.error('Failed to get sync status', e);
      }
    }
  };

  useEffect(() => {
    // Hidden toggle shortcut: Ctrl + Shift + S
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const handleManualSync = async () => {
    if ((window as any).ipcAPI && (window as any).ipcAPI.pushSync) {
      await (window as any).ipcAPI.pushSync.trigger();
      fetchStatus();
    }
  };

  if (!(window as any).ipcAPI || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white rounded-lg shadow-xl p-4 w-72 border border-gray-700">
      <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {status.isSyncing ? '🔄' : '☁️'}
          Push Sync Engine
        </h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Connection</span>
          {status.isOnline ? (
            <span className="text-green-400 flex items-center gap-1">🟢 Online</span>
          ) : (
            <span className="text-red-400 flex items-center gap-1">🔴 Offline</span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Auth Token</span>
          {status.hasAuthToken ? (
            <span className="text-green-400">Present</span>
          ) : (
            <span className="text-red-400">Missing</span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">State</span>
          <span className={status.isSyncing ? 'text-blue-400 font-bold' : 'text-gray-300'}>
            {status.isSyncing ? 'Syncing...' : 'Idle'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Pending Queue</span>
          <span className="font-mono bg-gray-800 px-2 rounded border border-gray-700">
            {status.pendingCount}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Failed Events</span>
          {status.failedCount > 0 ? (
            <span className="text-red-400 flex items-center gap-1 font-mono">
              ⚠️ {status.failedCount}
            </span>
          ) : (
            <span className="font-mono text-gray-500">0</span>
          )}
        </div>
      </div>

      <button 
        onClick={handleManualSync}
        disabled={status.isSyncing || !status.isOnline || status.pendingCount === 0}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 rounded transition-colors"
      >
        Force Sync
      </button>
      <div className="text-center mt-2 text-[10px] text-gray-500">
        Demo purposes only. (Ctrl+Shift+S to hide)
      </div>
    </div>
  );
};

export default SyncDebugPanel;
