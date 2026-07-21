import { useEffect } from "react";
import { io } from "socket.io-client";

export const useLocalSocketNotifications = () => {
  useEffect(() => {
    // Only connect if running in Electron
    if (typeof window === 'undefined' || !(window as any).ipcAPI) return;

    const socket = io("http://localhost:5002", {
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to Local P2P Sync Socket");
    });

    socket.on("db_updated", () => {
      console.log("🔄 Local DB updated via P2P. Triggering UI refresh...");
      // Dispatch a custom event that specific components (like Dashboards) can listen to
      window.dispatchEvent(new CustomEvent('p2p_db_updated'));
    });

    return () => {
      socket.disconnect();
    };
  }, []);
};
