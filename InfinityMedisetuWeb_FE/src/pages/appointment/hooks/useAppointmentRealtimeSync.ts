/**
 * useAppointmentRealtimeSync.ts
 *
 * Wraps the real-time appointment subscription and the periodic clock tick
 * used to keep the calendar time-line current.
 *
 * Separating this from the main component keeps side-effects explicit and
 * makes it easy to test or swap the underlying socket implementation.
 */

import { useEffect, useState } from "react";
import { useAppointmentRealtime } from "../../../hooks/useAppointmentRealtime";

export interface UseAppointmentRealtimeSyncReturn {
  /** Current time, updated every 60 seconds. Used for the calendar time-line. */
  now: Date;
}

export const useAppointmentRealtimeSync = (): UseAppointmentRealtimeSyncReturn => {
  // Subscribe to clinic-wide appointment changes and auto-invalidate RTK cache
  useAppointmentRealtime({ skipOwnActions: true });

  const [now, setNow] = useState(() => new Date());

  // Tick every minute so the calendar time-line stays accurate
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return { now };
};
