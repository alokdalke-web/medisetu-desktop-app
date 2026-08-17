import { useEffect } from "react";
import { io } from "socket.io-client";
import { useDispatch } from "react-redux";
import { patientApi } from "../redux/api/patientApi";
import { dashboardApi } from "../redux/api/dashboardApi";
import { appointmentApi } from "../redux/api/appointmentApi";
import { prescriptionApi } from "../redux/api/prescriptionApi";
import { medicineApi } from "../redux/api/medicineApi";

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

    socket.on("db_updated", (payload?: { entityType: string; entityId: string }[]) => {
      console.log("🔄 Local DB updated via P2P. Triggering UI refresh...", payload);
      window.dispatchEvent(new CustomEvent('p2p_db_updated'));
      
      if (payload && payload.length > 0) {
        let refreshDashboard = false;
        
        payload.forEach(({ entityType, entityId }) => {
          if (!entityType || !entityId) return;
          const typeUpper = entityType.toUpperCase();
          if (typeUpper === 'PATIENT' || typeUpper === 'PATIENTS') {
            dispatch(patientApi.util.invalidateTags([{ type: 'Patient', id: entityId }, 'Patient']));
            refreshDashboard = true;
          } else if (
            typeUpper === 'APPOINTMENT' || 
            typeUpper === 'APPOINTMENTS' || 
            typeUpper === 'APPOINTMENT_NO_SHOW_ACTIONS' || 
            typeUpper === 'APPOINTMENT_SERVICE'
          ) {
            dispatch(appointmentApi.util.invalidateTags([{ type: 'Appointment', id: entityId }, 'Appointment']));
            refreshDashboard = true;
          } else if (
            typeUpper === 'PRESCRIPTION' || 
            typeUpper === 'PRESCRIPTIONS' || 
            typeUpper === 'REPORT_CARDS'
          ) {
            dispatch(prescriptionApi.util.invalidateTags([{ type: 'Prescription', id: `appt-${entityId}` }, 'Prescription']));
            dispatch(appointmentApi.util.invalidateTags([{ type: 'Appointment', id: entityId }, 'Appointment']));
          } else if (typeUpper === 'MEDICINE' || typeUpper === 'MEDICINES') {
            dispatch(medicineApi.util.invalidateTags([{ type: 'Medicine', id: entityId }, 'Medicine']));
          }
        });

        if (refreshDashboard) {
          dispatch(dashboardApi.util.invalidateTags(['Dashboard', 'DoctorDashboard']));
        }
      } else {
        // Fallback: blanket invalidation
        dispatch(patientApi.util.invalidateTags(['Patient']));
        dispatch(dashboardApi.util.invalidateTags(['Dashboard', 'DoctorDashboard']));
        dispatch(appointmentApi.util.invalidateTags(['Appointment']));
        dispatch(prescriptionApi.util.invalidateTags(['Prescription']));
        dispatch(medicineApi.util.invalidateTags(['Medicine']));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);
};
