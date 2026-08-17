import React, { useEffect, useState } from 'react';
import { Badge, Tooltip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from '@heroui/react';
import { FiCloud, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

interface SyncStatusBadgeProps {
  entityId: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ entityId }) => {
  const isWebMode = !(window as any).ipcAPI;
  
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(!isWebMode);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  if (isWebMode) {
    return null;
  }

  const fetchStatus = async () => {
    try {
      const result = await (window as any).ipcAPI.sync.getEntityStatus(entityId);
      setStatus(result);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!status?.id) return;
    setIsRetrying(true);
    try {
      await (window as any).ipcAPI.sync.retryEvent(status.id);
      setTimeout(() => {
        fetchStatus();
        setIsRetrying(false);
      }, 1000);
    } catch (e) {
      console.error('Failed to retry event', e);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
        if (!entityId || isWebMode) return;
        const result = await (window as any).ipcAPI.sync.getEntityStatus(entityId);
        if (mounted) {
          setStatus(result);
          setLoading(false);
        }
    };
    load();

    const handleDbUpdate = () => {
      if (mounted) load();
    };

    // Listen for the custom event emitted by useLocalSocketNotifications
    window.addEventListener('p2p_db_updated', handleDbUpdate);

    return () => { 
      mounted = false; 
      window.removeEventListener('p2p_db_updated', handleDbUpdate);
    };
  }, [entityId, isWebMode]);

  const isSuccess = status?.status === 'synced' || status?.synced_to_cloud === 1;

  useEffect(() => {
    if (isSuccess) {
      const lastAttempt = status.last_attempt_at ? new Date(status.last_attempt_at).getTime() : 0;
      // If it was synced more than 10 seconds ago, hide it immediately
      const isRecent = Date.now() - lastAttempt < 10000;
      
      if (!isRecent) {
        setHidden(true);
      } else {
        setHidden(false);
        setIsFadingOut(false);
        
        const fadeTimer = setTimeout(() => {
          setIsFadingOut(true);
        }, 3000);
        
        const hideTimer = setTimeout(() => {
          setHidden(true);
        }, 3500); // 500ms for animation
        
        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(hideTimer);
        };
      }
    } else {
      setHidden(false);
      setIsFadingOut(false);
    }
  }, [isSuccess, status?.last_attempt_at]);

  if (loading || hidden) return null;

  let icon = null;
  let color = 'default';
  let tooltipText = 'Not synced';

  if (!status) {
    icon = <FiCloud className="w-3.5 h-3.5 text-gray-400" />;
    tooltipText = 'No sync event found';
  } else if (isSuccess) {
    icon = <FiCheckCircle className="w-3.5 h-3.5 text-success" />;
    color = 'success';
    tooltipText = 'Synced to cloud';
  } else if (status.status === 'stuck') {
    icon = <FiXCircle className="w-3.5 h-3.5 text-danger" />;
    color = 'danger';
    tooltipText = 'Sync Stuck - Action Required';
  } else if (status.status === 'failed') {
    icon = <FiAlertTriangle className="w-3.5 h-3.5 text-warning" />;
    color = 'warning';
    tooltipText = `Sync Failed (Retrying...)`;
  } else {
    icon = <FiCloud className="w-3.5 h-3.5 text-primary animate-pulse" />;
    color = 'primary';
    tooltipText = 'Sync Pending';
  }

  return (
    <div className={`transition-all duration-500 transform ${isFadingOut ? 'opacity-0 scale-50 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
      <Tooltip content={tooltipText}>
        <div 
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="inline-flex items-center justify-center p-0.5 bg-white rounded-full hover:bg-gray-100 cursor-pointer transition-colors shadow-sm ring-1 ring-black/5"
        >
          {icon}
        </div>
      </Tooltip>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Cloud Sync Details</ModalHeader>
              <ModalBody>
                {!status ? (
                  <p>No sync record found for this item yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-600">Status</span>
                      <span className={`capitalize font-medium text-${color}`}>{status.status}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-600">Retry Count</span>
                      <span>{status.retry_count || 0}</span>
                    </div>

                    {status.last_attempt_at && (
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-semibold text-gray-600">Last Attempt</span>
                        <span>{new Date(status.last_attempt_at).toLocaleString()}</span>
                      </div>
                    )}

                    {status.next_retry_at && status.status !== 'stuck' && (
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-semibold text-gray-600">Next Retry</span>
                        <span>{new Date(status.next_retry_at).toLocaleString()}</span>
                      </div>
                    )}

                    {status.error_message && (
                      <div className="mt-4 p-3 bg-danger-50 text-danger-800 rounded-md text-sm border border-danger-200 overflow-auto max-h-40">
                        <p className="font-semibold mb-1">Error Details:</p>
                        <pre className="whitespace-pre-wrap font-sans">{status.error_message}</pre>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {status?.status === 'stuck' && (
                  <Button color="danger" variant="flat" onPress={handleRetry} isLoading={isRetrying}>
                    Retry Sync
                  </Button>
                )}
                <Button color="primary" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};
