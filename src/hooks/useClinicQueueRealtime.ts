/**
 * useClinicQueueRealtime.ts
 *
 * Subscribes to the clinic's real-time queue events via Socket.IO and
 * stores the data in Redux so it persists across navigation.
 *
 * REST API provides full initial data (tokenNo, projectedStartTime, etc).
 * Socket events provide lightweight real-time updates (merged with REST data).
 */

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "../services/socket";
import { useGetQueueStateQuery } from "../redux/api/appointmentApi";
import {
  seedQueueFromRest,
  updateQueueFromSocket,
  setTimeToNext,
  resetQueue,
} from "../redux/slices/queueSlice";
import type { QueueAppointment } from "../redux/slices/queueSlice";
import { useAppDispatch } from "../redux/hooks";
import type { RootState } from "../redux/store";

/* ─── Re-export types ─── */
export type { QueueAppointment };

export interface QueueUpdatedPayload {
  clinicId: string;
  doctorId: string;
  date: string;
  cumulativeDelay: number;
  lastCalculatedAt?: string;
  appointments: QueueAppointment[];
}

export interface TimeToNextPayload {
  clinicId: string;
  timeToNextMinutes: number | null;
  ts: string;
}

export interface UseClinicQueueRealtimeReturn {
  queueAppointments: QueueAppointment[];
  cumulativeDelay: number;
  timeToNextMinutes: number | null;
  hasQueueData: boolean;
  hasTimeToNextData: boolean;
}

interface UseClinicQueueRealtimeOptions {
  clinicId: string | undefined;
  doctorId: string | undefined;
}

export const useClinicQueueRealtime = (
  options: UseClinicQueueRealtimeOptions,
): UseClinicQueueRealtimeReturn => {
  const { clinicId, doctorId } = options;
  const dispatch = useAppDispatch();

  // Read from Redux (persists across navigation)
  const queueState = useSelector((state: RootState) => state.queue);

  // Reset queue if doctorId changes (admin switching between doctors)
  const prevDoctorIdRef = useRef<string | undefined>(doctorId);
  useEffect(() => {
    if (prevDoctorIdRef.current && doctorId && prevDoctorIdRef.current !== doctorId) {
      dispatch(resetQueue());
    }
    prevDoctorIdRef.current = doctorId;
  }, [doctorId, dispatch]);

  // ── REST API: fetch queue state on page load ──
  const { data: restData } = useGetQueueStateQuery(
    { clinicId: clinicId!, doctorId },
    { skip: !clinicId || !doctorId },
  );

  // Seed Redux from REST response
  useEffect(() => {
    if (!restData) return;

    const result = restData?.data ?? restData?.result ?? restData;
    if (!result?.appointments || !Array.isArray(result.appointments)) return;

    dispatch(seedQueueFromRest({
      appointments: result.appointments,
      cumulativeDelay: result.cumulativeDelay ?? 0,
      timeToNextMinutes: result.timeToNextMinutes,
      doctorId: result.doctorId ?? doctorId,
    }));
  }, [restData, dispatch, doctorId]);

  // ── Socket subscription ──
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    if (!clinicId) return;

    let socket = getSocket();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cleaned = false;

    const onQueueUpdated = (data: QueueUpdatedPayload) => {
      dispatchRef.current(updateQueueFromSocket({
        appointments: data.appointments,
        cumulativeDelay: data.cumulativeDelay,
      }));
    };

    const onTimeToNext = (data: TimeToNextPayload) => {
      dispatchRef.current(setTimeToNext(data.timeToNextMinutes));
    };

    const setup = (s: NonNullable<ReturnType<typeof getSocket>>) => {
      if (cleaned) return;

      s.on("queue.updated", onQueueUpdated);
      s.on("timeToNext.updated", onTimeToNext);

      const room = `clinic:${clinicId}`;
      if (s.connected) {
        s.emit("join", room);
      } else {
        const onConnect = () => {
          s.emit("join", room);
          s.off("connect", onConnect);
        };
        s.on("connect", onConnect);
      }
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
        s.off("queue.updated", onQueueUpdated);
        s.off("timeToNext.updated", onTimeToNext);
        if (s.connected && clinicId) {
          s.emit("leave", `clinic:${clinicId}`);
        }
      }
    };
  }, [clinicId]);

  return {
    queueAppointments: queueState.queueAppointments,
    cumulativeDelay: queueState.cumulativeDelay,
    timeToNextMinutes: queueState.timeToNextMinutes,
    hasQueueData: queueState.hasQueueData,
    hasTimeToNextData: queueState.hasTimeToNextData,
  };
};
