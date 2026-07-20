// src/utils/usageTracker.ts
import {
  FeatureKey,
  FEATURE_KEYS,
  LimitationService,
  UsageCheckResult,
} from '../main/subscription/services/limitation.service';

/**
 * Usage Tracker Utility
 *
 * Provides simple helper functions to check and track feature usage
 * in existing service code without needing to import the full service.
 *
 * Example usage in WhatsApp service:
 *
 *   import { trackWhatsAppMessage, canSendWhatsApp } from '../../utils/usageTracker';
 *
 *   // Before sending:
 *   const check = await canSendWhatsApp(clinicId);
 *   if (!check.allowed) throw new Error(check.message);
 *
 *   // After successful send:
 *   await trackWhatsAppMessage(clinicId);
 */

/**
 * Check if clinic can send a WhatsApp message (within limit)
 */
export async function canSendWhatsApp(
  clinicId: string
): Promise<UsageCheckResult> {
  return LimitationService.checkUsageLimit(
    clinicId,
    FEATURE_KEYS.WHATSAPP_MESSAGES
  );
}

/**
 * Track a WhatsApp message sent (increment usage counter)
 */
export async function trackWhatsAppMessage(
  clinicId: string,
  count: number = 1
): Promise<void> {
  await LimitationService.incrementUsage(
    clinicId,
    FEATURE_KEYS.WHATSAPP_MESSAGES,
    count
  );
}

/**
 * Check if clinic can add a new doctor
 */
export async function canAddDoctor(
  clinicId: string
): Promise<UsageCheckResult> {
  return LimitationService.checkDoctorLimit(clinicId);
}

/**
 * Check if clinic can add a new receptionist
 */
export async function canAddReceptionist(
  clinicId: string
): Promise<UsageCheckResult> {
  return LimitationService.checkReceptionistLimit(clinicId);
}

/**
 * Check if a boolean feature is enabled for the clinic
 */
export async function isFeatureEnabled(
  clinicId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const result = await LimitationService.isFeatureEnabled(clinicId, featureKey);
  return result.allowed;
}

/**
 * Get the date filter for storage-limited queries
 * Returns a Date object representing the earliest allowed date for file queries
 */
export async function getStorageCutoffDate(
  clinicId: string
): Promise<Date | null> {
  const months = await LimitationService.getStorageRetentionMonths(clinicId);

  if (months === -1) return null; // Unlimited — no cutoff

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

/**
 * Get the date filter for payment history queries
 * Returns a Date object representing the earliest allowed date for payment queries
 */
export async function getPaymentHistoryCutoffDate(
  clinicId: string
): Promise<Date | null> {
  const months = await LimitationService.getPaymentHistoryMonths(clinicId);

  if (months === -1) return null; // Unlimited — no cutoff

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

// Re-export for convenience
export { FEATURE_KEYS };
