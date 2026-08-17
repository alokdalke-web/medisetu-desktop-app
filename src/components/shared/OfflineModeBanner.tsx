import { useEffect, useRef } from 'react';
import { useConnectivityState } from '../../hooks/useConnectivityState';
import { addToast } from "@heroui/react";

export function OfflineModeBanner() {
  const state = useConnectivityState();
  const isElectron = !!window.ipcAPI;
  const prevState = useRef(state);

  useEffect(() => {
    if (!isElectron) return;
    
    // Only toast on state change
    if (state === prevState.current) return;
    prevState.current = state;

    const timer = setTimeout(() => {
      if (state === 'lan_sync') {
        addToast({
          title: "Working Offline",
          description: "Syncing with clinic network.",
          color: "warning",
        });
      } else if (state === 'island') {
        addToast({
          title: "Offline",
          description: "No other devices detected. Some features are limited.",
          color: "danger",
        });
      } else if (state === 'online') {
        addToast({
          title: "Online",
          description: "Connected to cloud.",
          color: "success",
        });
      }
    }, 1500); // Delay to ensure UI components are fully loaded

    return () => clearTimeout(timer);
  }, [state, isElectron]);

  return null;
}
