import { and, eq, sql } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import { AppointmentPaymentModel } from '../../appointments/models/appointment-payment.model';
import { HttpError } from '../../../middlewear/errorHandler';
import { razorpayInstance } from '../../../utils/razorpay';
import logger from '../../../utils/logger';
import {
  ApplicationCancellationPolicyModel,
  ClinicCancellationPolicyModel,
  CancellationRequestModel,
  CancellationRefundModel,
  CancellationAuditModel,
} from '../models/cancellationPolicy.model';
import { ClinicAssignModel } from '../../clinic/models/clinic.model';
import { DEFAULT_CLINIC_POLICY } from '../constants/defaultPolicy';
import { PolicyEvaluationService } from './policyEvaluation.service';
import { CancellationCacheService } from './cancellationCache.service';
import { ICancellationRequestPayload } from '../interfaces';
import { autoNoShowQueue } from '../../appointments/services/autoNoShow.service';
import { CANCELLATION_REASONS } from '../constants/reasons';
import { AppointmentEngineOrchestrator } from '../../appointment-engine/services/orchestrator.service';
import {
  AppointmentRecord,
  AppointmentStatus,
} from '../../appointment-engine/interfaces';
import { UserModel } from '../../users/models/user.model';

function formatCooldown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    return `${minutes} minute${minutes === 1 ? '' : 's'} and ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'} and ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
}

export class CancellationPolicyService {
  /**
   * Fetches the current active cancellation policy for a clinic.
   */
  static async getClinicPolicy(clinicId: string) {
    return await CancellationCacheService.getClinicActivePolicy(
      clinicId,
      async () => {
        const [policy] = await database
          .select()
          .from(ClinicCancellationPolicyModel)
          .where(eq(ClinicCancellationPolicyModel.clinicId, clinicId))
          .orderBy(sql`${ClinicCancellationPolicyModel.version} desc`)
          .limit(1);
        return policy || null;
      }
    );
  }

  /**
   * Fetches application-level and clinic-level policies for booking.
   * If only doctorId is provided, clinicId is resolved from clinic_assign.
   */
  static async getCancellationPolicyForBooking(
    clinicId?: string,
    doctorId?: string
  ) {
    let resolvedClinicId = clinicId;

    if (!resolvedClinicId && doctorId) {
      const [assignment] = await database
        .select({ clinicId: ClinicAssignModel.clinicId })
        .from(ClinicAssignModel)
        .where(eq(ClinicAssignModel.userId, doctorId))
        .limit(1);

      if (assignment) {
        resolvedClinicId = assignment.clinicId;
      }
    }

    // 1. Fetch Global Policy
    const globalPolicy = await CancellationCacheService.getGlobalPolicy(
      async () => {
        const [result] = await database
          .select()
          .from(ApplicationCancellationPolicyModel)
          .limit(1);
        return result || null;
      }
    );

    // 2. Fetch Clinic Policy (fall back to DEFAULT_CLINIC_POLICY)
    let clinicPolicy = null;
    if (resolvedClinicId) {
      clinicPolicy = await CancellationCacheService.getClinicActivePolicy(
        resolvedClinicId,
        async () => {
          const [result] = await database
            .select()
            .from(ClinicCancellationPolicyModel)
            .where(
              and(
                eq(ClinicCancellationPolicyModel.clinicId, resolvedClinicId!),
                eq(ClinicCancellationPolicyModel.isActive, true)
              )
            )
            .limit(1);
          return result || null;
        }
      );
    }

    return {
      globalPolicy,
      clinicPolicy: clinicPolicy || DEFAULT_CLINIC_POLICY,
      isCustomClinicPolicy: !!clinicPolicy,
    };
  }

  /**
   * Updates a clinic's cancellation policy by deactivating the current active version
   * and inserting a new version record (Option B versioning).
   */
  static async updateClinicPolicy(clinicId: string, payload: any) {
    const newPolicy = await database.transaction(async (tx) => {
      // 1. Fetch current active policy
      const [currentPolicy] = await tx
        .select()
        .from(ClinicCancellationPolicyModel)
        .where(
          and(
            eq(ClinicCancellationPolicyModel.clinicId, clinicId),
            eq(ClinicCancellationPolicyModel.isActive, true)
          )
        )
        .limit(1);

      // 2. Map payload values with defaults
      const mappedPolicy = {
        allowPatientCancel: payload.allowPatientCancel ?? true,
        allowDoctorCancel: payload.allowDoctorCancel ?? true,
        allowReceptionistCancel: payload.allowReceptionistCancel ?? true,
        allowClinicAdminCancel: payload.allowClinicAdminCancel ?? true,
        windowOnlineHours: payload.windowOnlineHours ?? 24,
        windowOfflineHours: payload.windowOfflineHours ?? 12,
        dailyLimitPerPatient: payload.dailyLimitPerPatient ?? 3,
        weeklyLimitPerPatient: payload.weeklyLimitPerPatient ?? 10,
        monthlyLimitPerPatient: payload.monthlyLimitPerPatient ?? 30,
        cooldownSecondsBetweenCancellations:
          payload.cooldownSecondsBetweenCancellations ?? 1800,
        reasonMandatory: payload.reasonMandatory ?? true,
        allowAdditionalComments: payload.allowAdditionalComments ?? true,
        minCommentLength: payload.minCommentLength ?? 0,
        maxCommentLength: payload.maxCommentLength ?? 500,
        allowReschedule: payload.allowReschedule ?? true,
        maxReschedules: payload.maxReschedules ?? 3,
        rescheduleWindowHours: payload.rescheduleWindowHours ?? 24,
        preservePaymentOnReschedule:
          payload.preservePaymentOnReschedule ?? true,
        isActive: payload.isActive ?? true,
      };

      // 3. Compare current settings with payload
      if (currentPolicy) {
        const isIdentical = Object.keys(mappedPolicy).every(
          (key) => (currentPolicy as any)[key] === (mappedPolicy as any)[key]
        );

        if (isIdentical) {
          // No changes detected, return existing configuration
          return currentPolicy;
        }

        // Deactivate the current active policy since changes were made
        await tx
          .update(ClinicCancellationPolicyModel)
          .set({
            isActive: false,
            deactivatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(ClinicCancellationPolicyModel.id, currentPolicy.id));
      }

      // 4. Fetch the max version to calculate next version number
      const [maxVerRes] = await tx
        .select({
          max: sql<number>`max(${ClinicCancellationPolicyModel.version})::int`,
        })
        .from(ClinicCancellationPolicyModel)
        .where(eq(ClinicCancellationPolicyModel.clinicId, clinicId));

      const nextVer = (maxVerRes?.max || 0) + 1;

      // 5. Insert the new active policy
      const [newPolicy] = await tx
        .insert(ClinicCancellationPolicyModel)
        .values({
          clinicId,
          ...mappedPolicy,
          version: nextVer,
        })
        .returning();

      // 6. Log Audit Event
      await tx.insert(CancellationAuditModel).values({
        eventType: 'PolicyUpdate',
        clinicId,
        details: { version: nextVer, payload },
      });

      return newPolicy;
    });

    // Invalidate cached active policy settings for the clinic
    await CancellationCacheService.invalidateClinicActivePolicy(clinicId);

    return newPolicy;
  }

  /**
   * Processes a cancellation request inside a database transaction.
   * Runs evaluation, updates appointment status, creates request and refund audit logs,
   * and triggers the payment gateway refund if applicable.
   */
  static async processCancellationRequest(
    appointmentId: string,
    userId: string,
    userRole: string,
    payload: ICancellationRequestPayload
  ) {
    let previousStatus: string | null = null;
    let paymentRecord: typeof AppointmentPaymentModel.$inferSelect | undefined;
    let refundResult: any;

    const result = await database.transaction(async (tx) => {
      // 1. Fetch appointment details inside transaction
      const [appointment] = await tx
        .select()
        .from(AppointmentModel)
        .where(eq(AppointmentModel.id, appointmentId));

      if (!appointment) {
        throw new HttpError(
          404,
          'Appointment not found',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      // Fetch doctor name
      let doctorName: string | null = null;
      if (appointment.doctorId) {
        const [doctor] = await tx
          .select({ name: UserModel.name })
          .from(UserModel)
          .where(eq(UserModel.id, appointment.doctorId))
          .limit(1);
        if (doctor && doctor.name) {
          doctorName = doctor.name;
        }
      }

      // Fetch active/locked cancellation policy
      let policy: typeof ClinicCancellationPolicyModel.$inferSelect | null =
        null;
      if (appointment.clinicCancellationPolicyId) {
        const [result] = await tx
          .select()
          .from(ClinicCancellationPolicyModel)
          .where(
            eq(
              ClinicCancellationPolicyModel.id,
              appointment.clinicCancellationPolicyId
            )
          )
          .limit(1);
        policy = result || null;
      } else {
        const [result] = await tx
          .select()
          .from(ClinicCancellationPolicyModel)
          .where(
            and(
              eq(ClinicCancellationPolicyModel.clinicId, appointment.clinicId),
              eq(ClinicCancellationPolicyModel.isActive, true)
            )
          )
          .limit(1);
        policy = result || null;
      }

      previousStatus = appointment.appointmentStatus;

      // 2. Run Policy Evaluation
      // Handled by our evaluation service. Throws HttpError if checks fail.
      await PolicyEvaluationService.evaluateCancellation(
        appointmentId,
        userId,
        userRole,
        payload
      );

      // 3. Compute Refund eligibility
      refundResult =
        await PolicyEvaluationService.calculateRefund(appointmentId);

      // 4. Create Cancellation Request record
      const [cancellationRequest] = await tx
        .insert(CancellationRequestModel)
        .values({
          appointmentId,
          clinicId: appointment.clinicId,
          userId,
          userRole,
          reasonCode: payload.reasonCode,
          comments: payload.comments || null,
          status: 'Approved',
        })
        .returning();

      // 5. Update Appointment status to 'Cancelled'
      const reasonObj = CANCELLATION_REASONS.find(
        (r) => r.code === payload.reasonCode
      );
      const reasonDisplayName = reasonObj
        ? reasonObj.displayName
        : payload.reasonCode;
      const formattedReason = payload.comments
        ? `Reason: ${reasonDisplayName}\nComments: ${payload.comments}`
        : `Reason: ${reasonDisplayName}`;

      const [updatedAppointment] = await tx
        .update(AppointmentModel)
        .set({
          appointmentStatus: 'Cancelled',
          reReasonForCancellation: formattedReason,
          updatedAt: new Date(),
        })
        .where(eq(AppointmentModel.id, appointmentId))
        .returning();

      // Remove auto NoShow task if present
      await autoNoShowQueue.removeAutoNoShow(appointmentId);

      // 6. Handle refund details in database
      let refundRecordId: string | null = null;

      if (refundResult.eligible && refundResult.refundAmount > 0) {
        const [payment] = await tx
          .select()
          .from(AppointmentPaymentModel)
          .where(eq(AppointmentPaymentModel.appointmentId, appointmentId))
          .limit(1);

        if (payment) {
          paymentRecord = payment;
          // Create a pending refund record
          const [refundRecord] = await tx
            .insert(CancellationRefundModel)
            .values({
              cancellationRequestId: cancellationRequest.id,
              appointmentId,
              clinicId: appointment.clinicId,
              paymentId: payment.id,
              refundType: refundResult.refundType,
              originalPrice: payment.price || '0.00',
              refundAmount: String(refundResult.refundAmount),
              refundStatus:
                payment.paymentMode?.toLowerCase() === 'razorpay'
                  ? 'Processing'
                  : 'Pending', // pending for cash/manual
            })
            .returning();
          refundRecordId = refundRecord.id;
        }
      }

      // Log success audit log
      await tx.insert(CancellationAuditModel).values({
        eventType: 'StatusChange',
        clinicId: appointment.clinicId,
        userId,
        details: {
          appointmentId,
          action: 'CANCELLED',
          refundEligible: refundResult.eligible,
          refundAmount: refundResult.refundAmount,
        },
      });

      const cooldownSeconds =
        policy?.cooldownSecondsBetweenCancellations ?? 1800;

      return {
        appointment: updatedAppointment,
        cancellationRequestId: cancellationRequest.id,
        refundRecordId,
        doctorName,
        cooldownSeconds,
      };
    });

    // 7. Gateway Integration (executed OUTSIDE the database transaction to prevent holding locks)
    let finalRefundStatus = 'None';

    if (
      result.refundRecordId &&
      paymentRecord &&
      paymentRecord.paymentMode?.toLowerCase() === 'razorpay' &&
      paymentRecord.transactionId
    ) {
      try {
        const amountInPaise = Math.round(refundResult.refundAmount * 100);

        // Initiate Razorpay API refund
        const refundRes = await razorpayInstance.payments.refund(
          paymentRecord.transactionId,
          {
            amount: amountInPaise,
            notes: {
              cancellationRequestId: result.cancellationRequestId,
              appointmentId,
            },
          }
        );

        // Update database records to 'Completed'
        await database.transaction(async (tx) => {
          await tx
            .update(CancellationRefundModel)
            .set({
              refundStatus: 'Completed',
              gatewayRefundId: refundRes.id,
              gatewayResponse: refundRes as any,
              updatedAt: new Date(),
            })
            .where(eq(CancellationRefundModel.id, result.refundRecordId!));

          await tx
            .update(AppointmentPaymentModel)
            .set({
              paymentStatus: 'Refunded',
              refundMode: 'razorpay',
              refundedAmount: String(refundResult.refundAmount),
              refundNotes: `Auto-refunded via policy engine. Razorpay Refund ID: ${refundRes.id}`,
              updatedAt: new Date(),
            })
            .where(eq(AppointmentPaymentModel.id, paymentRecord!.id));
        });

        finalRefundStatus = 'Completed';
      } catch (err: any) {
        logger.error(
          `[CancellationPolicyEngine] Razorpay gateway refund failed for appointment=${appointmentId}`,
          err
        );

        // Update refund status to 'Failed'
        await database
          .update(CancellationRefundModel)
          .set({
            refundStatus: 'Failed',
            failureReason: err.message || 'Razorpay Gateway failure',
            updatedAt: new Date(),
          })
          .where(eq(CancellationRefundModel.id, result.refundRecordId));

        finalRefundStatus = 'Failed';
      }
    } else if (result.refundRecordId && paymentRecord) {
      // For cash/manual, it stays 'Pending'
      finalRefundStatus = 'Pending';
    }

    // 8. Fire appointment-engine orchestrator hooks
    try {
      const orchestrator = new AppointmentEngineOrchestrator();
      const engineRecord: AppointmentRecord = {
        id: result.appointment.id,
        appointmentDate: result.appointment.appointmentDate,
        appointmentTime: result.appointment.appointmentTime,
        tokenNo: result.appointment.tokenNo,
        appointmentStatus: result.appointment
          .appointmentStatus as AppointmentStatus,
        clinicId: result.appointment.clinicId,
        patientId: result.appointment.patientId,
        doctorId: result.appointment.doctorId!,
        appointmentDurationMinutes:
          result.appointment.appointmentDurationMinutes ?? null,
        userId: result.appointment.patientId,
      };

      await orchestrator.onStatusChange(engineRecord, previousStatus as any);
    } catch (orchestratorError) {
      logger.error(
        `[CancellationPolicyEngine] Post-commit orchestrator hook failed for appointment=${appointmentId}`,
        orchestratorError
      );
    }

    const formattedCooldown = formatCooldown(result.cooldownSeconds);
    const note = result.doctorName
      ? `The cancellation window for Dr. ${result.doctorName} will open after ${formattedCooldown}.`
      : `The cancellation window will open after ${formattedCooldown}.`;

    return {
      success: true,
      refundStatus: finalRefundStatus,
      refundAmount: refundResult.refundAmount,
      message: `Appointment cancelled successfully. Refund status: ${finalRefundStatus}.`,
      note,
    };
  }
}
