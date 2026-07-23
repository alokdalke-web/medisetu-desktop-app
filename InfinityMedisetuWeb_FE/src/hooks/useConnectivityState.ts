import { useEffect, useState } from 'react';

export type ConnectivityState = 'online' | 'lan_sync' | 'island';

export function useConnectivityState(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>('online');

  useEffect(() => {
    // Check if we are in Electron environment
    if (!window.ipcAPI?.connectivity) {
      return;
    }

    // Get initial state
    window.ipcAPI.connectivity.getState().then((initialState: unknown) => {
      setState(initialState as ConnectivityState);
    }).catch(console.error);

    // Subscribe to changes
    const unsubscribe = window.ipcAPI.connectivity.onStateChange((newState: string) => {
      setState(newState as ConnectivityState);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return state;
}
