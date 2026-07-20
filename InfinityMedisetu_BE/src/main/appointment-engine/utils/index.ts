/**
 * Appointment Engine - Utilities
 *
 * Barrel export for shared utility functions.
 */

export {
  resolveAppointmentDuration,
  getRedisKey,
  isTerminalStatus,
  isShiftableStatus,
} from './helpers';

export { emitPatientWaitTimeUpdates } from './emitPatientWaitTimeUpdates';
