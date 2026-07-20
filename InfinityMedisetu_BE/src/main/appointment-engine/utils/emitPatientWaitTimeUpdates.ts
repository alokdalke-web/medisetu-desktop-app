/**
 * Utility: Emit WebSocket events to patients for wait time updates.
 *
 * After delay recalculation, emits an `appointment.updated` event
 * to each affected patient's socket room `user:{userId}` containing
 * their appointmentId and updated estimatedWaitMinutes.
 *
 * This is designed to be called by the QueueBroadcastService or
 * orchestrator after `DelayTrackerService.recalculate()` completes.
 *
 * Requirements: 2.2
 */

import logger from '../../../utils/logger';
import { AppointmentDelayEntry } from '../interfaces';
import { isTerminalStatus } from './helpers';

/**
 * Emits `appointment.updated` WebSocket event to each affected patient's room.
 *
 * For each non-terminal appointment in the provided entries, emits to
 * room `user:{userId}` with payload:
 *   { appointmentId, estimatedWaitMinutes }
 *
 * Fire-and-forget: logs failures without throwing.
 * Emission completes synchronously via Socket.IO (in-memory) so it will
 * always happen within 5 seconds of being called after recalculation.
 *
 * @param appointments - The delay entries produced by DelayTrackerService.recalculate()
 */
export function emitPatientWaitTimeUpdates(
  appointments: AppointmentDelayEntry[]
): void {
  for (const entry of appointments) {
    // Only emit for non-terminal appointments (those still in the queue)
    if (isTerminalStatus(entry.status)) {
      continue;
    }

    const room = `user:${entry.userId}`;
    const payload = {
      appointmentId: entry.appointmentId,
      estimatedWaitMinutes: entry.estimatedWaitMinutes,
    };

    try {
      // Dynamic require to avoid circular dependency with app.ts
      const { socketManager } = require('../../../app');
      socketManager.io.to(room).emit('appointment.updated', payload);
    } catch (err) {
      // Non-critical — log and continue with next patient
      logger.warn(
        `[AppointmentEngine] Failed to emit appointment.updated to room ${room}`,
        { appointmentId: entry.appointmentId, error: err }
      );
    }
  }

  logger.info(
    `[AppointmentEngine] Emitted appointment.updated to ${appointments.filter((a) => !isTerminalStatus(a.status)).length} patient rooms`
  );
}
