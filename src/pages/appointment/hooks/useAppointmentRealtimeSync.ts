/**
 * useAppointmentRealtimeSync.ts
 *
 * Wraps the real-time appointment subscription (clinic-wide socket updates
 * that auto-invalidate the RTK Query cache).
 *
 * The periodic clock tick used for the calendar's current-time-line lives in
 * `AppointmentCalendarView` itself (not here) — it used to live in this hook
 * and get threaded down as a prop, which re-rendered the entire Appointment
 * page (toolbar, stat cards, and the full list/card rows) every 60 seconds
 * even when the calendar view wasn't showing. See UI_REMEDIATION_LOG.md.
 */

import { useAppointmentRealtime } from "../../../hooks/useAppointmentRealtime";

export const useAppointmentRealtimeSync = (): void => {
  // Subscribe to clinic-wide appointment changes and auto-invalidate RTK cache
  useAppointmentRealtime({ skipOwnActions: true });
};
