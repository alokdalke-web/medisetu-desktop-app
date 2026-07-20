import { database } from '../configurations/dbConnection';
import { UserModel } from '../main/users/models/user.model';
import { ClinicAssignModel } from '../main/clinic/models/clinic.model';
import { sendNotificationToUser } from './notification.utils';
import { eq, and, ne, inArray as drizzleInArray } from 'drizzle-orm';
import { UserLabAssignmentsModel } from '../main/lab/models/lab.model';
import { ClinicModel } from '../main/clinic/models/clinic.model';
import { sendAppointmentNotification } from './smsClient';
import { ClinicSettingsModel } from '../main/clinic/models/clinicSettings.model';
import logger from './logger';
/**
 * Medisetu Notification System Helpers
 *
 * Important Rule: The user who performs an action will NOT receive a notification for that action.
 */

export interface NotificationUser {
  id: string;
  name: string;
  userType: string;
}

/**
 * Get users by roles within a clinic, excluding specific user IDs
 */
export async function getUsersByRolesInClinic(
  clinicId: string,
  roles: Array<
    'Admin' | 'Doctor' | 'Receptionist' | 'Lab_Assistant' | 'Pharmacist'
  >,
  excludeUserIds: string[] = []
): Promise<NotificationUser[]> {
  const conditions = [eq(ClinicAssignModel.clinicId, clinicId)];

  // Add role filter using OR conditions
  if (roles.length > 0) {
    const roleConditions = roles.map((role) => eq(UserModel.userType, role));
    if (roleConditions.length === 1) {
      conditions.push(roleConditions[0]);
    } else {
      // Use SQL for multiple roles
      conditions.push(drizzleInArray(UserModel.userType, roles));
    }
  }

  // Exclude specific users
  if (excludeUserIds.length > 0) {
    excludeUserIds.forEach((userId) => {
      conditions.push(ne(UserModel.id, userId));
    });
  }

  const users = await database
    .select({
      id: UserModel.id,
      name: UserModel.name,
      userType: UserModel.userType,
    })
    .from(UserModel)
    .innerJoin(ClinicAssignModel, eq(UserModel.id, ClinicAssignModel.userId))
    .where(and(...conditions));

  return users.map((u) => ({ ...u, name: u.name ?? '' }));
}

/**
 * Get user details by ID
 */
export async function getUserById(
  userId: string
): Promise<NotificationUser | null> {
  const [user] = await database
    .select({
      id: UserModel.id,
      name: UserModel.name,
      userType: UserModel.userType,
    })
    .from(UserModel)
    .where(eq(UserModel.id, userId))
    .limit(1);

  return user ? { ...user, name: user.name ?? '' } : null;
}

export async function getLabUsersByClinicId(
  clinicId: string
): Promise<{ id: string }[]> {
  return await database
    .select({
      id: UserLabAssignmentsModel.userId,
    })
    .from(UserLabAssignmentsModel)
    .where(eq(UserLabAssignmentsModel.clinicId, clinicId));
}

/**
 * Send notifications to multiple users
 */
export async function sendNotificationsToUsers(
  users: NotificationUser[],
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const promises = users.map((user) => {
    return sendNotificationToUser({
      userId: user.id,
      title,
      body,
      type: 'notification',
      metadata,
    });
  });

  await Promise.allSettled(promises);
}

/**
 * Notify about appointment creation
 * Notified: Other Admin, Doctor, Receptionist (excluding performer)
 */
export async function notifyAppointmentCreated(
  clinicId: string,
  appointmentId: string,
  performerUserId: string,
  patientName: string,
  performerName: string,
  performerRole: string,
  doctorId: string,
  patientId: string
) {
  const title = `New Appointment Scheduled – ${patientName}`;

  const body = `An appointment for ${patientName} has been scheduled by ${performerName} (${performerRole}). Please review the appointment details for further action.`;

  const notifyUserIds = new Set<string>();

  // 🔹 1. Notify all Admin + Receptionist (clinic based)
  const staffUsers = await getUsersByRolesInClinic(
    clinicId,
    ['Admin', 'Receptionist'],
    [] // exclusion baad me
  );

  staffUsers.forEach((u) => notifyUserIds.add(u.id));

  // 🔹 2. Notify ONLY the assigned doctor
  if (doctorId) {
    notifyUserIds.add(doctorId);
  }

  // ❌ 3. Remove performer (self notification)
  notifyUserIds.delete(performerUserId);

  if (notifyUserIds.size > 0) {
    await Promise.all(
      [...notifyUserIds].map((userId) =>
        sendNotificationToUser({
          userId,
          title,
          body,
          type: 'notification',
          metadata: {
            appointmentId,
            action: 'appointment_created',
          },
        })
      )
    );
  }

  // 🔹 4. Notify patient (if they are not the performer)
  if (patientId && patientId !== performerUserId) {
    const clinicName = await getClinicNameById(clinicId);
    const patientTitle = 'Appointment Scheduled';
    const patientBody = `Your appointment has been scheduled at ${clinicName || 'the clinic'} by ${performerName} (${performerRole}).`;
    await sendNotificationToUser({
      userId: patientId,
      title: patientTitle,
      body: patientBody,
      type: 'notification',
      metadata: {
        appointmentId,
        action: 'appointment_created',
      },
    }).catch((err) => {
      logger.error('Failed to notify patient about appointment creation', err);
    });
  }
}

/**
 * Notify about appointment reschedule
 * Notified: Doctor (excluding performer)
 */
export async function notifyAppointmentRescheduled(
  appointmentId: string,
  performerUserId: string,
  performerName: string,
  performerRole: string,
  doctorId?: string,
  patientId?: string,
  clinicId?: string
) {
  // Notify Doctor
  if (doctorId && doctorId !== performerUserId) {
    const title = 'Appointment Rescheduled';
    const body = `An appointment has been rescheduled by ${performerName} (${performerRole}). Please check the updated date and time.`;

    const doctor = await getUserById(doctorId);
    if (doctor) {
      await sendNotificationToUser({
        userId: doctor.id,
        title,
        body,
        type: 'notification',
        metadata: { appointmentId, action: 'appointment_rescheduled' },
      });
    }
  }

  // Notify Patient
  if (patientId && patientId !== performerUserId) {
    const clinicName = clinicId ? await getClinicNameById(clinicId) : undefined;
    const title = 'Appointment Rescheduled';
    const body = `Your appointment at ${clinicName || 'the clinic'} has been rescheduled by ${performerName} (${performerRole}). Please check the updated date and time.`;
    await sendNotificationToUser({
      userId: patientId,
      title,
      body,
      type: 'notification',
      metadata: { appointmentId, action: 'appointment_rescheduled' },
    }).catch((err) => {
      logger.error('Failed to notify patient about reschedule', err);
    });
  }
}

/**
 * Notify about appointment confirmation
 * Notified: Doctor (excluding performer)
 */
export async function notifyAppointmentConfirmed(
  appointmentId: string,
  performerUserId: string,
  performerName: string,
  performerRole: string,
  doctorId?: string,
  patientId?: string,
  clinicId?: string
) {
  // Notify Doctor
  if (doctorId && doctorId !== performerUserId) {
    const title = 'Appointment Confirmed';
    const body = `The appointment has been confirmed by ${performerName} (${performerRole}) successfully.`;

    const doctor = await getUserById(doctorId);
    if (doctor) {
      await sendNotificationToUser({
        userId: doctor.id,
        title,
        body,
        type: 'notification',
        metadata: { appointmentId, action: 'appointment_confirmed' },
      });
    }
  }

  // Notify Patient
  if (patientId && patientId !== performerUserId) {
    const clinicName = clinicId ? await getClinicNameById(clinicId) : undefined;
    const title = 'Appointment Confirmed';
    const body = `Your appointment at ${clinicName || 'the clinic'} has been confirmed successfully.`;
    await sendNotificationToUser({
      userId: patientId,
      title,
      body,
      type: 'notification',
      metadata: { appointmentId, action: 'appointment_confirmed' },
    }).catch((err) => {
      logger.error('Failed to notify patient about confirmation', err);
    });
  }
}

/**
 * Notify about payment completion
 * Notified: Patient
 */
export async function notifyPaymentReceived(
  appointmentId: string,
  patientId: string,
  amount: string,
  clinicId?: string
) {
  if (patientId) {
    const clinicName = clinicId ? await getClinicNameById(clinicId) : undefined;
    const title = 'Payment Successful';
    const body = `Your payment of ₹${amount} at ${clinicName || 'the clinic'} was successful. Your appointment is now awaiting clinic confirmation.`;
    await sendNotificationToUser({
      userId: patientId,
      title,
      body,
      type: 'notification',
      metadata: { appointmentId, action: 'payment_received' },
    }).catch((err) => {
      logger.error('Failed to notify patient about payment success', err);
    });
  }
}

/**
 * Notify about appointment cancellation
 * Notified: Doctor, Receptionist (excluding performer)
 */
export async function notifyAppointmentCanceled(
  clinicId: string,
  appointmentId: string,
  performerUserId: string,
  performerName: string,
  performerRole: string,
  doctorId?: string,
  patientId?: string
) {
  const title = 'Appointment Canceled';
  const body = `An appointment has been canceled by ${performerName} (${performerRole}). Please take note of this update.`;

  const users: NotificationUser[] = [];

  // Get Receptionists from clinic
  const receptionists = await getUsersByRolesInClinic(
    clinicId,
    ['Receptionist'],
    [performerUserId]
  );
  users.push(...receptionists);

  // Notify the assigned doctor
  if (doctorId && doctorId !== performerUserId) {
    const doctor = await getUserById(doctorId);
    if (doctor && !users.find((u) => u.id === doctor.id)) {
      users.push(doctor);
    }
  }

  if (users.length > 0) {
    await sendNotificationsToUsers(users, title, body, {
      appointmentId,
      action: 'appointment_canceled',
    });
  }

  // Notify Patient
  if (patientId && patientId !== performerUserId) {
    const clinicName = await getClinicNameById(clinicId);
    const patientTitle = 'Appointment Canceled';
    const patientBody = `Your appointment at ${clinicName || 'the clinic'} has been canceled by ${performerName} (${performerRole}).`;
    await sendNotificationToUser({
      userId: patientId,
      title: patientTitle,
      body: patientBody,
      type: 'notification',
      metadata: { appointmentId, action: 'appointment_canceled' },
    }).catch((err) => {
      logger.error('Failed to notify patient about cancellation', err);
    });
  }
}

/**
 * Notify about test log creation
 * Notified: Doctor or Lab (excluding performer and admin)
 */
export async function notifyTestLogCreated(
  clinicId: string,
  testId: string,
  name: string,
  performerUserId: string,
  performerRole: string
) {
  // 🔹 clinic name DB se
  const clinicName = await getClinicNameById(clinicId);

  const title = `Test  ${name}  Created`;
  const body = `A new test log has been created${
    clinicName ? ` at ${clinicName}` : ''
  }. Please review the test information.`;

  const notifyUserIds = new Set<string>();

  // ✅ Admin creates test → ALL doctors + ALL lab assistants
  if (performerRole === 'Admin') {
    const [labUsers, doctorUsers] = await Promise.all([
      getLabUsersByClinicId(clinicId),
      getDoctorUsersByClinicId(clinicId),
    ]);

    labUsers.forEach((u) => notifyUserIds.add(u.id));
    doctorUsers.forEach((u) => notifyUserIds.add(u.id));
  }

  // ❌ remove performer (admin)
  notifyUserIds.delete(performerUserId);

  if (!notifyUserIds.size) return;

  await Promise.all(
    [...notifyUserIds].map((userId) =>
      sendNotificationToUser({
        userId,
        title,
        body,
        type: 'notification',
        metadata: {
          testId,
          action: 'test_log_created',
        },
      })
    )
  );
}

export async function getDoctorUsersByClinicId(clinicId: string) {
  return await database
    .select({
      id: ClinicAssignModel.userId,
    })
    .from(ClinicAssignModel)
    .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
    .where(
      and(
        eq(ClinicAssignModel.clinicId, clinicId),
        eq(UserModel.userType, 'Doctor')
      )
    );
}
async function getClinicNameById(
  clinicId: string
): Promise<string | undefined> {
  const [clinic] = await database
    .select({ name: ClinicModel.clinicName })
    .from(ClinicModel)
    .where(eq(ClinicModel.id, clinicId))
    .limit(1);

  return clinic?.name;
}

/**
 * Notify about test assignment to lab
 * Notified: Assigned Lab (excluding performer)
 */
export async function notifyTestAssignedToLab(
  testId: string,
  clinicId: string,
  performerUserId: string,
  performerName: string,
  performerRole: string,
  doctorName?: string
) {
  const title = 'Test Assigned';
  const body = `A test has been assigned to your lab${
    doctorName ? ` by Dr. ${doctorName}` : ''
  }. Please proceed with the required actions.`;

  const labUsers = await getLabUsersByClinicId(clinicId);

  for (const labUser of labUsers) {
    // 🔒 Do not notify self
    if (labUser.id === performerUserId) {
      continue;
    }

    await sendNotificationToUser({
      userId: labUser.id,
      title,
      body,
      type: 'notification',
      metadata: {
        testId,
        action: 'test_assigned_to_lab',
      },
    });
  }
}

/**
 * Notify about test report upload
 * Notified: All related users except uploader and admin
 */
export async function notifyTestReportUploaded(
  clinicId: string,
  testId: string,
  performerUserId: string,
  performerName: string,
  performerRole: string,
  doctorId?: string,
  patientId?: string,
  testName?: string
) {
  const title = 'Test Report Uploaded';
  const body = `A test report has been uploaded by ${performerName} (${performerRole}).`;

  const notifyUserIds = new Set<string>();

  // 🔹 Doctor uploaded → notify all lab users
  if (performerRole === 'Doctor') {
    const labUsers = await getLabUsersByClinicId(clinicId);
    labUsers.forEach((u) => notifyUserIds.add(u.id));
  }

  // 🔹 Lab user uploaded → notify doctor
  if (performerRole === 'Lab_Assistant' && doctorId) {
    notifyUserIds.add(doctorId);
  }

  // 🔹 Admin uploaded → notify doctor + lab users
  if (performerRole === 'Admin') {
    if (doctorId) notifyUserIds.add(doctorId);

    const labUsers = await getLabUsersByClinicId(clinicId);
    labUsers.forEach((u) => notifyUserIds.add(u.id));
  }

  // ❌ Remove performer (self notification)
  notifyUserIds.delete(performerUserId);

  if (notifyUserIds.size > 0) {
    // 🔔 Send notifications
    await Promise.all(
      [...notifyUserIds].map((userId) =>
        sendNotificationToUser({
          userId,
          title,
          body,
          type: 'notification',
          metadata: {
            testId,
            action: 'test_report_uploaded',
          },
        })
      )
    );
  }

  // 🔔 Send notification to patient
  if (patientId && patientId !== performerUserId) {
    const patientBody = `Your test report${testName ? ` for ${testName}` : ''} has been uploaded. You can now view it in the app.`;
    await sendNotificationToUser({
      userId: patientId,
      title: 'Test Report Available',
      body: patientBody,
      type: 'notification',
      metadata: {
        testId,
        action: 'test_report_uploaded',
      },
    }).catch((err) => {
      logger.error('Failed to notify patient about test report upload', err);
    });
  }
}

/**
 * Notify about new user creation
 * Notified: The new user
 */
export async function notifyNewUserCreated(
  newUserId: string,
  newUserName: string,
  newUserRole: string
) {
  const title = 'New User Created';
  const body = `A new user has been added to the system with default access and notifications enabled.`;

  await sendNotificationToUser({
    userId: newUserId,
    title,
    body,
    type: 'notification',
    metadata: {
      action: 'user_created',
      userType: newUserRole,
    },
  });
}

/**
 * Notify about No Show
 * Notified: Patient (SMS/WhatsApp), Doctor, Receptionist (App Notification)
 */
export async function notifyAppointmentNoShow(
  appointmentId: string,
  clinicId: string,
  patientId: string,
  doctorId: string | null,
  actionTaken: string,
  reason: string
) {
  const [patient, clinic, settings] = await Promise.all([
    database
      .select({ mobile: UserModel.mobile, name: UserModel.name })
      .from(UserModel)
      .where(eq(UserModel.id, patientId))
      .then((res) => res[0]),
    database
      .select({ clinicName: ClinicModel.clinicName })
      .from(ClinicModel)
      .where(eq(ClinicModel.id, clinicId))
      .then((res) => res[0]),
    database
      .select()
      .from(ClinicSettingsModel)
      .where(eq(ClinicSettingsModel.clinicId, clinicId))
      .then((res) => res[0]),
  ]);

  if (!patient || !clinic) return;

  const title = 'Appointment No Show';
  const body = `Your appointment at ${clinic.clinicName} has been marked as No Show. Action: ${actionTaken}. Reason: ${reason}`;

  // 1. Send SMS/WhatsApp to Patient if enabled
  if (patient.mobile && settings) {
    await sendAppointmentNotification(
      patient.mobile,
      body,
      settings.smsEnabled ?? false,
      settings.whatsappEnabled ?? false
    ).catch(() => {});
  }

  // 2. Send App Notifications to Clinic Staff
  const notifyUserIds = new Set<string>();

  // Get Admin + Receptionist
  const staffUsers = await getUsersByRolesInClinic(clinicId, [
    'Admin',
    'Receptionist',
  ]);
  staffUsers.forEach((u) => notifyUserIds.add(u.id));

  // Get Doctor
  if (doctorId) {
    notifyUserIds.add(doctorId);
  }

  if (notifyUserIds.size > 0) {
    await Promise.all(
      [...notifyUserIds].map((userId) =>
        sendNotificationToUser({
          userId,
          title,
          body: `Patient ${patient.name} marked as No Show. Action: ${actionTaken}`,
          type: 'notification',
          metadata: {
            appointmentId,
            action: 'appointment_no_show',
            patientId,
          },
        })
      )
    );
  }
}

// -----------------------------------------------------------------------------
// Prescription PDF notifications
// -----------------------------------------------------------------------------

/**
 * Notify a patient that their prescription PDF generation has started.
 * This is triggered from `ReportService.generatePdfAndSendNotifications`
 * before the heavy PDF work begins so that the UI can display a spinner
 * or similar indicator in real time.
 */
export async function notifyPrescriptionPdfGenerationStarted(
  patientId: string,
  reportId: string,
  appointmentId: string
) {
  const title = 'Prescription PDF Generation Started';
  const body =
    'We have started preparing your prescription PDF. You will be notified once it is available.';

  await sendNotificationToUser({
    userId: patientId,
    title,
    body,
    type: 'notification',
    metadata: { reportId, appointmentId, action: 'pdf_generation_started' },
  });
}

/**
 * Notify a patient that their prescription PDF is ready and provide the link
 * to download/view it. This should be called immediately after the
 * `ReportCardModel` record has been updated with the new URL.
 * Clients joined to socket room `appointment:<appointmentId>` also receive
 * `appointment.prescription.pdf_ready` via `broadcastPrescriptionPdfReadyToAppointmentRoom`.
 */
export async function notifyPrescriptionPdfReady(
  patientId: string,
  reportId: string,
  pdfUrl: string,
  appointmentId: string
) {
  const title = 'Prescription PDF Ready';
  const body =
    'Your prescription PDF has been generated. Tap to view or download.';

  await sendNotificationToUser({
    userId: patientId,
    title,
    body,
    type: 'notification',
    metadata: { reportId, pdfUrl, appointmentId, action: 'pdf_ready' },
  });
}

/**
 * Notify Super Admins when a new clinic is created
 * Notified: All Super_Admin users (excluding performer)
 */
export async function notifyClinicCreated(
  clinicId: string,
  clinicName: string,
  performerUserId: string,
  performerName: string,
  performerRole: string
) {
  const superAdmins = await database
    .select({
      id: UserModel.id,
      name: UserModel.name,
      userType: UserModel.userType,
      email: UserModel.email,
    })
    .from(UserModel)
    .where(
      and(
        eq(UserModel.userType, 'Super_Admin'),
        ne(UserModel.id, performerUserId)
      )
    );

  if (superAdmins.length === 0) return;

  const title = 'New Clinic Registered';
  const body = `A new clinic "${clinicName}" has been successfully created by ${performerName} (${performerRole}).`;

  // 1. Send in-app and push notifications
  await Promise.all(
    superAdmins.map((admin) =>
      sendNotificationToUser({
        userId: admin.id,
        title,
        body,
        type: 'notification',
        metadata: {
          clinicId,
          action: 'clinic_created',
        },
      })
    )
  );

  // 2. Send email notifications asynchronously
  setImmediate(async () => {
    try {
      const { sendEmail } = await import('./email');
      const { clinicCreationNotificationTemplate } =
        await import('../htmltamplates/clinicCreationNotification');
      const [clinic] = await database
        .select()
        .from(ClinicModel)
        .where(eq(ClinicModel.id, clinicId))
        .limit(1);

      if (!clinic) return;

      for (const admin of superAdmins) {
        if (admin.email) {
          await sendEmail(
            admin.email,
            `New Clinic Registered: ${clinicName}`,
            clinicCreationNotificationTemplate({
              superAdminName: admin.name || 'Super Admin',
              clinicName: clinicName,
              creatorName: performerName,
              creatorRole: performerRole,
              clinicAddress: clinic.clinicAddress || 'N/A',
              clinicPhone: clinic.clinicPhone || 'N/A',
            })
          ).catch((e) => {
            logger.error(
              `[Notification] Failed to send clinic creation email to ${admin.email}:`,
              e
            );
          });
        }
      }
    } catch (err) {
      logger.error(
        'Error in notifyClinicCreated setImmediate email dispatch:',
        err
      );
    }
  });
}
