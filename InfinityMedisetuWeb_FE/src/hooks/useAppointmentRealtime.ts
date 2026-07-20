import { useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "../services/socket";
import { appointmentApi } from "../redux/api/appointmentApi";
import { useAppDispatch } from "../redux/hooks";
import type { RootState } from "../redux/store";

/* ------------------- Types ------------------- */

export interface AppointmentRealtimeEvent {
  appointmentId: string;
  clinicId: string;
  doctorId?: string;
  patientId?: string;
  action:
    | "created"
    | "updated"
    | "confirmed"
    | "cancelled"
    | "rescheduled"
    | "completed"
    | "noshow"
    | "payment_updated"
    | "vitals_updated";
  performerUserId?: string;
  data?: {
    appointmentStatus?: string;
    appointmentDate?: string;
    appointmentTime?: string;
  };
  ts: string;
}

interface UseAppointmentRealtimeOptions {
  /** If true, skip refetch when the current user is the performer (they already have fresh data) */
  skipOwnActions?: boolean;
  /** Only refetch for a specific doctor's appointments (useful for doctor screens) */
  doctorId?: string;
}

/* ------------------- Hook ------------------- */

/**
 * Listens for real-time appointment events via Socket.IO and
 * invalidates the RTK Query "Appointment" cache tag to trigger refetches.
 *
 * Debounces invalidation to avoid multiple rapid refetches when several
 * events arrive in quick succession (e.g., batch status changes).
 */
export const useAppointmentRealtime = (
  options: UseAppointmentRealtimeOptions = {},
) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateAppointments = useCallback(() => {
    // Debounce: coalesce rapid events into a single invalidation
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(appointmentApi.util.invalidateTags(["Appointment"]));
      debounceRef.current = null;
    }, 500);
  }, [dispatch]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (payload: AppointmentRealtimeEvent) => {
      const { skipOwnActions, doctorId } = optionsRef.current;

      // Skip if the current user performed the action (they already have fresh data)
      if (skipOwnActions && payload.performerUserId && currentUser?.id) {
        if (payload.performerUserId === currentUser.id) return;
      }

      // If filtering by doctor, only invalidate for relevant appointments
      if (doctorId && payload.doctorId && payload.doctorId !== doctorId) {
        return;
      }

      invalidateAppointments();
    };

    socket.on("appointment.created", handler);
    socket.on("appointment.updated", handler);

    return () => {
      socket.off("appointment.created", handler);
      socket.off("appointment.updated", handler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentUser?.id, invalidateAppointments]);
};
