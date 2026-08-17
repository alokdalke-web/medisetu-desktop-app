import { useState, useEffect } from 'react';

export interface HostElectionStatus {
  isHost: boolean;
  priority: number;
  term: number;
  hostNodeId: string | null;
}

export const useHostElectionStatus = () => {
  const [status, setStatus] = useState<HostElectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const result = await (window as any).ipcAPI.election.getStatus();
        if (mounted) {
          setStatus(result);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to fetch election status');
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { status, error };
};
