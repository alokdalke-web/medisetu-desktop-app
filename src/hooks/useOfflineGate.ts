import { useConnectivityState } from './useConnectivityState';
import { offlineCapabilities } from '../constants/offlineCapabilities';

export function useOfflineGate(featureKey: keyof typeof offlineCapabilities): { allowed: boolean; reason?: string } {
  const state = useConnectivityState();
  const isOnline = state === 'online';

  if (isOnline) {
    return { allowed: true };
  }

  const allowed = offlineCapabilities[featureKey];

  let reason;
  if (!allowed) {
    const featureNames: Record<keyof typeof offlineCapabilities, string> = {
      patientRegistration: 'Patient registration',
      appointmentBooking: 'Appointment booking',
      prescriptionCreation: 'Prescription creation',
      addMedicine: 'Add medicine',
      billing: 'Billing and payments',
      reports: 'Reports',
      clinicSettings: 'Clinic settings'
    };
    reason = `${featureNames[featureKey]} require an internet connection.`;
  }

  return { allowed, reason };
}
