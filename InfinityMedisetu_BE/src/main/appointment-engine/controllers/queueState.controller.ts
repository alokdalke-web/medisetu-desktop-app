import { Request, Response } from 'express';
import { asyncHandler } from '../../../middlewear/errorHandler';
import { sendOk } from '../../../utils/response.utils';
import { DelayTrackerService } from '../services/delayTracker.service';
import { TimeToNextService } from '../services/timeToNext.service';

/**
 * GET /api/v1/appointments/queue-state?clinicId=X&doctorId=Y&date=YYYY-MM-DD
 *
 * Returns the current queue state from Redis cache for instant page load.
 * If no cache exists, computes fresh data on the fly.
 *
 * The response includes `lastCalculatedAt` so the frontend can start
 * its local countdown timer from an accurate baseline.
 */
export const getQueueStateController = asyncHandler(
  async (req: Request, res: Response) => {
    const { clinicId, doctorId, date } = req.query as {
      clinicId: string;
      doctorId: string;
      date?: string;
    };

    if (!clinicId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'clinicId and doctorId are required query parameters',
      });
    }

    // Default to today if date not provided
    const targetDate = date || new Date().toISOString().split('T')[0];

    const delayTrackerService = new DelayTrackerService();
    const timeToNextService = new TimeToNextService();

    // Try Redis cache first, fall back to fresh computation
    let queueData = await delayTrackerService.getQueueDelayData(
      clinicId,
      doctorId,
      targetDate
    );

    if (!queueData) {
      // No cache — compute fresh
      queueData = await delayTrackerService.recalculate(
        clinicId,
        doctorId,
        targetDate
      );
    }

    // Compute time-to-next
    const timeToNextMinutes = await timeToNextService.compute(
      clinicId,
      doctorId,
      targetDate
    );

    const response = {
      clinicId: queueData.clinicId,
      doctorId: queueData.doctorId,
      date: queueData.date,
      cumulativeDelay: queueData.cumulativeDelayMinutes,
      lastCalculatedAt: queueData.lastCalculatedAt,
      timeToNextMinutes,
      appointments: queueData.appointments.map((entry) => ({
        appointmentId: entry.appointmentId,
        patientId: entry.patientId,
        status: entry.status,
        appointmentTime: entry.scheduledTime,
        tokenNo: entry.tokenNo,
        projectedStartTime: entry.projectedStartTime,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
        durationMinutes: entry.durationMinutes,
      })),
    };

    return sendOk(res, 'Queue state fetched successfully', response);
  }
);
