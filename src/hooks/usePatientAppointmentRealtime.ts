/**
 * usePatientAppointmentRealtime.ts
 *
 * Subscribes to patient-specific real-time appointment events via Socket.IO.
 * Listens on room `user:{userId}` (already joined on connect) for:
 *  - `appointment.updated` → live wait time & status updates
 *  - `running_late` → doctor running late notification
 *  - `appointment_shifted` → appointment moved earlier (no-show shift)
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { addToast } from "@heroui/react";
import { getSocket } from "../services/socket";

/* ─── Types ─── */

export interface AppointmentUpdatedPayload {
  appointmentId: string;
  status: "Upcoming" | "Confirmed" | "Patient Arrived";
  appointmentTime: string | null;
  estimatedWaitMinutes: number;
}

export interface RunningLatePayload {
  appointmentId: string;
  estimatedNewTime: string; // "HH:MM"
  delayMinutes: number;
  originalTime: string | null;
}

export interface AppointmentShiftedPayload {
  appointmentId: string;
  oldTime: string; // "HH:MM"
  newTime: string; // "HH:MM"
}

export interface PatientAppointmentUpdate {
  appointmentId: string;
  status?: string;
  appointmentTime?: string | null;
  estimatedWaitMinutes?: number;
}

export interface UsePatientAppointmentRealtimeReturn {
  /** Map of appointmentId → latest real-time updates */
  updates: Map<string, PatientAppointmentUpdate>;
  /** Whether any realtime data has been received */
  hasRealtimeData: boolean;
}

/**
 * Hook that subscribes to patient-specific appointment events.
 * The socket already joins `user:{userId}` on connect (see socket.ts),
 * so we only need to attach event listeners.
 */
export const usePatientAppointmentRealtime = (): UsePatientAppointmentRealtimeReturn => {
  const [updates, setUpdates] = useState<Map<string, PatientAppointmentUpdate>>(
    new Map(),
  );
  const [hasRealtimeData, setHasRealtimeData] = useState(false);
  const updatesRef = useRef(updates);
  updatesRef.current = updates;

  const handleAppointmentUpdated = useCallback(
    (data: AppointmentUpdatedPayload) => {
      // Guard: only handle payloads from the appointment engine (has estimatedWaitMinutes)
      if (!data?.appointmentId || typeof data?.estimatedWaitMinutes !== "number") return;

      setUpdates((prev) => {
        const next = new Map(prev);
        next.set(data.appointmentId, {
          appointmentId: data.appointmentId,
          status: data.status,
          appointmentTime: data.appointmentTime,
          estimatedWaitMinutes: data.estimatedWaitMinutes,
        });
        return next;
      });
      setHasRealtimeData(true);
    },
    [],
  );

  const handleRunningLate = useCallback((data: RunningLatePayload) => {
    addToast({
      title: "Doctor Running Late",
      description: `Your ${data.originalTime || ""} appointment is now expected at ${data.estimatedNewTime} (~${data.delayMinutes} min delay)`,
      color: "warning",
    });
  }, []);

  const handleAppointmentShifted = useCallback(
    (data: AppointmentShiftedPayload) => {
      // Update local state with new time
      setUpdates((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.appointmentId);
        next.set(data.appointmentId, {
          ...existing,
          appointmentId: data.appointmentId,
          appointmentTime: data.newTime,
        });
        return next;
      });
      setHasRealtimeData(true);

      addToast({
        title: "Appointment Moved Earlier",
        description: `Your appointment was moved from ${data.oldTime} to ${data.newTime}`,
        color: "primary",
      });
    },
    [],
  );

  useEffect(() => {
    let socket = getSocket();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cleaned = false;

    const setup = (s: NonNullable<ReturnType<typeof getSocket>>) => {
      if (cleaned) return;
      s.on("appointment.updated", handleAppointmentUpdated);
      s.on("running_late", handleRunningLate);
      s.on("appointment_shifted", handleAppointmentShifted);
    };

    if (socket) {
      setup(socket);
    } else {
      let attempts = 0;
      pollTimer = setInterval(() => {
        attempts++;
        socket = getSocket();
        if (socket) {
          clearInterval(pollTimer!);
          pollTimer = null;
          setup(socket);
        } else if (attempts > 20) {
          clearInterval(pollTimer!);
          pollTimer = null;
        }
      }, 100);
    }

    return () => {
      cleaned = true;
      if (pollTimer) clearInterval(pollTimer);
      const s = getSocket();
      if (s) {
        s.off("appointment.updated", handleAppointmentUpdated);
        s.off("running_late", handleRunningLate);
        s.off("appointment_shifted", handleAppointmentShifted);
      }
    };
  }, [handleAppointmentUpdated, handleRunningLate, handleAppointmentShifted]);

  return { updates, hasRealtimeData };
};
