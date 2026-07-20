/**
 * QueueBroadcastService
 *
 * Handles WebSocket event emission after queue state changes.
 * - "queue.updated" to clinic dashboard rooms
 * - "appointment.updated" to individual patient rooms (user:{userId})
 * - "queue.update" to patients in live-queue rooms (join.live-queue)
 *
 * All broadcasts are fire-and-forget: failures are logged, never thrown.
 */

import redisClient from '../../../configurations/redisConfig';
import logger from '../../../utils/logger';
import { IQueueBroadcastService, QueueDelayData } from '../interfaces';
import { getRedisKey, isTerminalStatus } from '../utils/helpers';
import { buildPayloadFromQueue } from './liveQueueHelper';
import { evaluateQueueNotifications } from './queueNotifyPrefs.service';

/**
 * Batches the running-late flag lookup for a set of appointment IDs into a
 * single Redis mget, instead of one GET per appointment. The flag's value is
 * the effective delay in minutes (see runningLateNotifier.service.ts).
 */
async function batchGetRunningLateMinutes(
  appointmentIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (appointmentIds.length === 0) return result;

  try {
    const keys = appointmentIds.map((id) => getRedisKey('notified', id));
    const values = await redisClient.mget(...keys);
    values.forEach((raw, i) => {
      if (raw === null) return;
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) result.set(appointmentIds[i], parsed);
    });
  } catch (err) {
    logger.warn(
      '[AppointmentEngine] Failed to batch-read running-late flags',
      err
    );
  }

  return result;
}

export class QueueBroadcastService implements IQueueBroadcastService {
  /**
   * Emits "queue.updated" to the clinic room for the dashboard.
   * Also broadcasts "queue.update" to patients in live-queue rooms.
   */
  emitQueueUpdated(clinicId: string, queueData: QueueDelayData): void {
    const room = `clinic:${clinicId}`;

    const payload = {
      clinicId: queueData.clinicId,
      doctorId: queueData.doctorId,
      date: queueData.date,
      cumulativeDelay: queueData.cumulativeDelayMinutes,
      lastCalculatedAt: queueData.lastCalculatedAt,
      appointments: queueData.appointments.map((entry) => ({
        appointmentId: entry.appointmentId,
        status: entry.status,
        appointmentTime: entry.scheduledTime,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
        cumulativeDelay: queueData.cumulativeDelayMinutes,
      })),
    };

    try {
      const { socketManager } = require('../../../app');
      socketManager.io.to(room).emit('queue.updated', payload);
      logger.info(
        `[AppointmentEngine] Emitted queue.updated to room ${room} (${queueData.appointments.length} appointments)`
      );

      // Broadcast to patients in live-queue rooms
      this.emitLiveQueueUpdates(socketManager, clinicId, queueData);
    } catch (err) {
      logger.warn(
        `[AppointmentEngine] Failed to emit queue.updated to room ${room}`,
        { clinicId, error: err }
      );
    }
  }

  /**
   * Emits "appointment.updated" to each patient's user:{userId} room.
   * Includes full live queue data for the patient app.
   *
   * Delegates payload construction to buildPayloadFromQueue (shared with the
   * live-queue socket path) instead of re-deriving the queue stage inline, so
   * the two broadcast paths can't drift out of sync.
   */
  async emitPatientUpdated(queueData: QueueDelayData): Promise<void> {
    let emittedCount = 0;
    const appointments = queueData.appointments;

    const activeAppointments = appointments.filter(
      (a) => !isTerminalStatus(a.status)
    );

    const runningLateByAppointment = await batchGetRunningLateMinutes(
      activeAppointments.map((a) => a.appointmentId)
    );

    for (const entry of appointments) {
      if (isTerminalStatus(entry.status)) continue;

      const room = `user:${entry.userId}`;
      const eventPayload = buildPayloadFromQueue(
        entry.appointmentId,
        queueData,
        runningLateByAppointment.get(entry.appointmentId) ?? null
      );

      try {
        const { socketManager } = require('../../../app');
        socketManager.io.to(room).emit('appointment.updated', eventPayload);
        emittedCount++;
      } catch (err) {
        logger.warn(
          `[AppointmentEngine] Failed to emit appointment.updated to ${room}`,
          { appointmentId: entry.appointmentId, error: err }
        );
      }
    }

    logger.info(
      `[AppointmentEngine] Emitted appointment.updated to ${emittedCount} patient rooms`
    );

    // Evaluate patient "Notify me when" push conditions against the same fresh
    // queue data. Fire-and-forget — Redis-only, never blocks or throws into the
    // broadcast path (same discipline as the rest of the engine).
    evaluateQueueNotifications(queueData).catch((err) => {
      logger.warn('[AppointmentEngine] evaluateQueueNotifications failed', err);
    });
  }

  /**
   * Emits "queue.update" to patients who joined via join.live-queue.
   * - Skips patients whose appointment is now terminal
   * - Auto-removes terminated patients from room (sends "queue.completed")
   * - Only computes payload for active queue members
   */
  private async emitLiveQueueUpdates(
    socketManager: {
      io: { in: (room: string) => { fetchSockets: () => Promise<any[]> } };
    },
    clinicId: string,
    queueData: QueueDelayData
  ): Promise<void> {
    const lqRoom = `live-queue:${clinicId}:${queueData.doctorId}`;

    try {
      const sockets = await socketManager.io.in(lqRoom).fetchSockets();
      if (sockets.length === 0) return;

      const activeSocketAppointmentIds = sockets
        .map((s) => (s as any).liveQueueData?.appointmentId)
        .filter((id): id is string => Boolean(id));
      const runningLateByAppointment = await batchGetRunningLateMinutes(
        activeSocketAppointmentIds
      );

      for (const socket of sockets) {
        const lqData = (socket as any).liveQueueData;
        if (!lqData?.appointmentId) continue;

        const myEntry = queueData.appointments.find(
          (a) => a.appointmentId === lqData.appointmentId
        );

        // Appointment completed/cancelled/noshow — auto-remove from live queue
        if (!myEntry || isTerminalStatus(myEntry.status)) {
          socket.emit('queue.completed', {
            appointmentId: lqData.appointmentId,
            status: myEntry?.status ?? 'unknown',
            message: 'Your appointment is no longer in the queue',
          });
          socket.leave(lqRoom);
          (socket as any).liveQueueData = null;
          continue;
        }

        socket.emit(
          'queue.update',
          buildPayloadFromQueue(
            lqData.appointmentId,
            queueData,
            runningLateByAppointment.get(lqData.appointmentId) ?? null
          )
        );
      }
    } catch (err) {
      logger.warn('[AppointmentEngine] Failed to emit to live-queue room', err);
    }
  }
}
