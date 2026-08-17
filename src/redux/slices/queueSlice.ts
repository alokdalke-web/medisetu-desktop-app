/**
 * queueSlice.ts
 *
 * Persists the clinic queue state across navigation.
 * REST API provides full data (tokenNo, projectedStartTime, durationMinutes).
 * Socket events provide lightweight updates (status, wait times).
 * We merge them: socket updates existing appointments, REST seeds the full picture.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface QueueAppointment {
  appointmentId: string;
  status: string;
  appointmentTime: string | null;
  estimatedWaitMinutes: number;
  cumulativeDelay: number;
  // REST-only fields (not in socket events)
  tokenNo?: number | null;
  projectedStartTime?: string | null;
  durationMinutes?: number | null;
  patientId?: string | null;
}

interface QueueState {
  queueAppointments: QueueAppointment[];
  cumulativeDelay: number;
  timeToNextMinutes: number | null;
  hasQueueData: boolean;
  hasTimeToNextData: boolean;
  /** The doctorId this queue data belongs to */
  activeDoctorId: string | null;
}

const initialState: QueueState = {
  queueAppointments: [],
  cumulativeDelay: 0,
  timeToNextMinutes: null,
  hasQueueData: false,
  hasTimeToNextData: false,
  activeDoctorId: null,
};

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    /**
     * Full seed from REST API — replaces all data including REST-only fields.
     */
    seedQueueFromRest(
      state,
      action: PayloadAction<{
        appointments: QueueAppointment[];
        cumulativeDelay: number;
        timeToNextMinutes?: number | null;
        doctorId?: string | null;
      }>,
    ) {
      state.queueAppointments = action.payload.appointments;
      state.cumulativeDelay = action.payload.cumulativeDelay;
      state.hasQueueData = true;
      if (action.payload.timeToNextMinutes !== undefined) {
        state.timeToNextMinutes = action.payload.timeToNextMinutes;
        state.hasTimeToNextData = true;
      }
      if (action.payload.doctorId) {
        state.activeDoctorId = action.payload.doctorId;
      }
    },

    /**
     * Lightweight update from socket — merges with existing REST-only fields.
     */
    updateQueueFromSocket(
      state,
      action: PayloadAction<{
        appointments: QueueAppointment[];
        cumulativeDelay: number;
      }>,
    ) {
      const incoming = action.payload.appointments;

      // Build a map of existing appointments for merging REST-only fields
      const existingMap = new Map(
        state.queueAppointments.map((a) => [a.appointmentId, a]),
      );

      // Merge: socket data + preserved REST-only fields
      state.queueAppointments = incoming.map((socketAppt) => {
        const existing = existingMap.get(socketAppt.appointmentId);
        return {
          ...socketAppt,
          // Preserve REST-only fields if they exist from initial load
          tokenNo: existing?.tokenNo ?? socketAppt.tokenNo ?? null,
          projectedStartTime: existing?.projectedStartTime ?? socketAppt.projectedStartTime ?? null,
          durationMinutes: existing?.durationMinutes ?? socketAppt.durationMinutes ?? null,
          patientId: existing?.patientId ?? socketAppt.patientId ?? null,
        };
      });

      state.cumulativeDelay = action.payload.cumulativeDelay;
      state.hasQueueData = true;
    },

    setTimeToNext(state, action: PayloadAction<number | null>) {
      state.timeToNextMinutes = action.payload;
      state.hasTimeToNextData = true;
    },

    /** Reset queue when switching doctors (admin view) */
    resetQueue(state) {
      state.queueAppointments = [];
      state.cumulativeDelay = 0;
      state.timeToNextMinutes = null;
      state.hasQueueData = false;
      state.hasTimeToNextData = false;
      state.activeDoctorId = null;
    },
  },
});

export const { seedQueueFromRest, updateQueueFromSocket, setTimeToNext, resetQueue } =
  queueSlice.actions;
export default queueSlice.reducer;
