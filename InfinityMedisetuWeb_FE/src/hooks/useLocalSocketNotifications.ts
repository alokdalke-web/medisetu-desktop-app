import { useEffect } from "react";
import { io } from "socket.io-client";
import { useDispatch } from "react-redux";
import { patientApi } from "../redux/api/patientApi";
import { dashboardApi } from "../redux/api/dashboardApi";
import { appointmentApi } from "../redux/api/appointmentApi";

export const useLocalSocketNotifications = () => {
  const dispatch = useDispatch();

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
      window.dispatchEvent(new CustomEvent('p2p_db_updated'));
      
      // Force RTK Query to instantly refetch lists
      dispatch(patientApi.util.invalidateTags(['Patient']));
      dispatch(dashboardApi.util.invalidateTags(['Dashboard', 'DoctorDashboard']));
      dispatch(appointmentApi.util.invalidateTags(['Appointment']));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);
};
