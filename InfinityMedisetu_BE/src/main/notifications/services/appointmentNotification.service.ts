// src/main/appointments/services/appointment-notification.service.ts
import { database } from '../../../configurations/dbConnection';
import { sendWhatsApp } from '../../../utils/smsClient';
import { UniversalNotificationService } from './universalNotification.service';

import { ClinicSettingsModel } from '../../clinic/models/clinicSettings.model';
import { eq } from 'drizzle-orm';

export class AppointmentNotificationService {
  static async sendImmediateNotification(
    appointmentId: string,
    clinicId: string,
    patientMobile: string,
    clinicName: string,
    appointmentDate: Date,
    appointmentTime: string,
    tokenNo: number | null
  ) {
    try {
      // Get clinic settings from ClinicSettingsModel
      const [clinicSettings] = await database
        .select({
          smsEnabled: ClinicSettingsModel.smsEnabled,
          whatsappEnabled: ClinicSettingsModel.whatsappEnabled,
        })
        .from(ClinicSettingsModel)
        .where(eq(ClinicSettingsModel.clinicId, clinicId));

      if (!clinicSettings) return;

      const { smsEnabled, whatsappEnabled } = clinicSettings;

      // If both disabled, don't send
      if (!smsEnabled && !whatsappEnabled) return;

      // Format time and date
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const formattedTime = appointmentDateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const formattedDate = appointmentDateTime.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        weekday: 'short',
      });

      let timeOrTokenInfo: string;
      if (tokenNo) {
        timeOrTokenInfo = `Token No: ${tokenNo}`;
      } else {
        timeOrTokenInfo = `Time: ${formattedTime}`;
      }

      const message = `Appointment Confirmed:\n\nClinic: ${clinicName}\nDate: ${formattedDate}\n${timeOrTokenInfo}\n\nPlease arrive 10 minutes early.`;

      const formattedMobile = patientMobile.startsWith('+')
        ? patientMobile
        : `+91${patientMobile.replace(/\D/g, '')}`;

      const promises = [];

      if (smsEnabled) {
        promises.push(
          UniversalNotificationService.send({
            recipient: { mobile: formattedMobile },
            event: 'appointment_confirmed',
            channels: ['sms'],
            title: 'Appointment Confirmed',
            body: message,
          })
        );
      }

      if (whatsappEnabled) {
        promises.push(sendWhatsApp(formattedMobile, message).catch(() => {}));
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }

      //   console.log(`✅ Immediate notification sent for appointment ${appointmentId}`);
    } catch {
      //   console.error(`❌ Failed to send immediate notification:`, error);
      // Don't throw - this shouldn't break appointment creation
    }
  }
}
