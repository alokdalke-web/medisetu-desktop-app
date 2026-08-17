import Database from 'better-sqlite3';
import logger from '../../../utils/logger.js';
import type { EventLogEntry } from '../infrastructure/repositories/EventLogRepository.js';
import type { SyncEventPayload } from '../infrastructure/repositories/EventLogRepository.js';

export class EventProjector {
  public static project(db: Database.Database, event: EventLogEntry) {
    try {
      const payload: SyncEventPayload = JSON.parse(event.payload);
      const entityType = (payload.entityType || event.entity_type).toUpperCase();
      const operation = (payload.operation || event.action_type).toUpperCase();
      
      if (operation === 'DELETE') {
        // Handle generic deletes if needed (e.g. soft deletes or actual deletes)
        // For now we will focus on CREATE and UPDATE projections
        return; 
      }

      const data = payload.payload;
      const id = event.entity_id;
      const createdAt = event.created_at || new Date().toISOString();

      switch (entityType) {
        case 'PATIENT': {
          let existingData: any = {};
          if (operation === 'UPDATE') {
            try {
              existingData = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) || {};
            } catch (err) {}
          }

          const name = data.name || existingData.name || 'Unknown';
          const phone = data.mobile || data.phone || existingData.phone || '';
          
          let existingProfile = {};
          try {
             if (existingData.profile_data) existingProfile = JSON.parse(existingData.profile_data);
          } catch(e) {}
          const profileData = JSON.stringify({ ...existingProfile, ...data });

          if (operation === 'CREATE' && phone) {
             try {
                // Deduplicate cloud-pulled patients by phone number
                const existingPatients = db.prepare('SELECT id, cloud_id FROM patients WHERE phone = ? AND id != ?').all(phone, id) as any[];
                for (const p of existingPatients) {
                   if (p.cloud_id) {
                      db.prepare('DELETE FROM patients WHERE id = ?').run(p.id);
                      logger.info(`[EventProjector] Deleted cloud-pulled duplicate patient ${p.id} in favor of P2P event ${id}`);
                   }
                }
             } catch(e) {
                logger.warn(`[EventProjector] Failed to deduplicate patient: ${e}`);
             }
          }
          
          const cloudId = data.cloudId || data.cloud_id || data.patientId || data.primaryPatientId || existingData.cloud_id || null;

          const stmt = db.prepare(`
            INSERT INTO patients (id, name, phone, created_at, sync_status, profile_data, cloud_id)
            VALUES (?, ?, ?, ?, 'synced', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              sync_status = 'synced',
              profile_data = EXCLUDED.profile_data,
              cloud_id = EXCLUDED.cloud_id
          `);
          stmt.run(id, name, phone, createdAt, profileData, cloudId);
          break;
        }

        case 'APPOINTMENT': {
          // For partial updates (like status changes), we must merge with existing data
          // to satisfy SQLite's NOT NULL constraints in the VALUES clause.
          let existingData: any = {};
          if (operation === 'UPDATE') {
            try {
              existingData = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) || {};
            } catch (err) {}
          }

          const patientId = data.patientId || data.patient_id || existingData.patient_id;
          const doctorId = data.doctorId || data.doctor_id || existingData.doctor_id;
          const date = data.appointmentDate || data.date || existingData.date;
          const timeSlot = data.appointmentTime || data.timeSlot || data.time_slot || existingData.time_slot;
          const status = data.appointmentStatus || data.status || existingData.status || 'Scheduled';
          const serviceId = data.clinicServiceId || data.serviceId || data.service_id || existingData.service_id || null;
          const paymentMode = data.payment?.paymentMode || data.paymentMode || data.payment_mode || existingData.payment_mode || null;
          const paymentStatus = data.payment?.paymentStatus || data.paymentStatus || data.payment_status || existingData.payment_status || null;
          const bookingSource = data.bookingSource || data.booking_source || existingData.booking_source || null;
          const cloudId = data.cloudId || data.cloud_id || data.appointmentId || existingData.cloud_id || null;

          if (operation === 'CREATE' && doctorId && date && timeSlot) {
             try {
                // Deduplicate cloud-pulled appointments by doctor, date, and time slot
                const existingAppts = db.prepare('SELECT id, cloud_id FROM appointments WHERE doctor_id = ? AND date = ? AND time_slot = ? AND status != ? AND id != ?').all(doctorId, date, timeSlot, 'Cancelled', id) as any[];
                for (const appt of existingAppts) {
                   if (appt.cloud_id) {
                      try { db.prepare('DELETE FROM appointment_multiple_service WHERE appointment_id = ?').run(appt.id); } catch(e) {}
                      db.prepare('DELETE FROM appointments WHERE id = ?').run(appt.id);
                      logger.info(`[EventProjector] Deleted cloud-pulled duplicate appointment ${appt.id} in favor of P2P event ${id}`);
                   }
                }
             } catch(e) {
                logger.warn(`[EventProjector] Failed to deduplicate appointment: ${e}`);
             }
          }

          if (!patientId || !doctorId || !date || !timeSlot) {
            logger.warn(`[EventProjector] Skipping APPOINTMENT ${id}: Missing required fields for UPSERT.`);
            break;
          }

          const stmt = db.prepare(`
            INSERT INTO appointments (id, patient_id, doctor_id, date, time_slot, status, service_id, payment_mode, payment_status, booking_source, cloud_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              patient_id = EXCLUDED.patient_id,
              doctor_id = EXCLUDED.doctor_id,
              date = EXCLUDED.date,
              time_slot = EXCLUDED.time_slot,
              status = EXCLUDED.status,
              service_id = EXCLUDED.service_id,
              payment_mode = EXCLUDED.payment_mode,
              payment_status = EXCLUDED.payment_status,
              booking_source = EXCLUDED.booking_source,
              cloud_id = EXCLUDED.cloud_id
          `);
          stmt.run(
            id,
            patientId,
            doctorId,
            date,
            timeSlot,
            status,
            serviceId,
            paymentMode,
            paymentStatus,
            bookingSource,
            cloudId
          );
          break;
        }
        case 'PRESCRIPTION': {
          let existingData: any = {};
          if (operation === 'UPDATE') {
            try {
              existingData = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id) || {};
            } catch (err) {}
          }
          const patientId = data.patientId || data.patient_id || existingData.patient_id || null;
          const doctorId = data.doctorId || data.doctor_id || existingData.doctor_id || null;
          const date = data.date || existingData.date || createdAt;
          const itemsJson = data.items ? JSON.stringify(data.items) : (existingData.items_json || '[]');
          const cloudId = data.cloudId || data.cloud_id || data.prescriptionId || existingData.cloud_id || null;
          
          const stmt = db.prepare(`
            INSERT INTO prescriptions (id, patient_id, doctor_id, date, items_json, cloud_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              patient_id = EXCLUDED.patient_id,
              doctor_id = EXCLUDED.doctor_id,
              date = EXCLUDED.date,
              items_json = EXCLUDED.items_json,
              cloud_id = EXCLUDED.cloud_id
          `);
          stmt.run(id, patientId, doctorId, date, itemsJson, cloudId);
          break;
        }

        case 'MEDICINES': {
          let existingData: any = {};
          if (operation === 'UPDATE') {
            try {
              existingData = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id) || {};
            } catch (err) {}
          }
          const cloudId = data.cloudId || data.cloud_id || data.medicineId || existingData.cloud_id || null;
          const stmt = db.prepare(`
            INSERT INTO medicines (
              id, name, generic_name, manufacturer, composition, form, strength, 
              requires_prescription, is_favorite, is_active, sync_status, created_at, cloud_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = EXCLUDED.name,
              generic_name = EXCLUDED.generic_name,
              manufacturer = EXCLUDED.manufacturer,
              composition = EXCLUDED.composition,
              form = EXCLUDED.form,
              strength = EXCLUDED.strength,
              requires_prescription = EXCLUDED.requires_prescription,
              is_favorite = EXCLUDED.is_favorite,
              is_active = EXCLUDED.is_active,
              sync_status = 'synced',
              cloud_id = EXCLUDED.cloud_id
          `);
          stmt.run(
            id,
            data.name || existingData.name || 'Unknown',
            data.genericName || data.generic_name || existingData.generic_name || null,
            data.manufacturer || existingData.manufacturer || null,
            data.composition || existingData.composition || null,
            data.form || existingData.form || null,
            data.strength || existingData.strength || null,
            (data.requiresPrescription || data.requires_prescription || existingData.requires_prescription) ? 1 : 0,
            (data.isFavorite || data.is_favorite || existingData.is_favorite) ? 1 : 0,
            (data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : (existingData.is_active !== undefined ? existingData.is_active : 1))) ? 1 : 0,
            createdAt,
            cloudId
          );
          break;
        }

        case 'REPORT_CARDS': {
          const reportCard = data.reportCard;
          const prescriptions = data.prescriptions || [];

          if (reportCard) {
            const rcId = reportCard.id || id;
            
            // Delete existing prescriptions if it's an update
            if (operation === 'UPDATE') {
              db.prepare('DELETE FROM report_prescriptions WHERE report_card_id = ?').run(rcId);
            }

            // Insert/Update report_cards
            const rcStmt = db.prepare(`
              INSERT INTO report_cards (
                id, petient_id, appointment_id, report_id, comorbidities, habits,
                general_examination, system_examination, provisional_diagnosis,
                differential_diagnosis, final_diagnosis, investigations, advice,
                clinical_notes, allergies, surgerySuggested, visitingDays,
                visiting_notes, prescription_pdf, follow_up_in_days, follow_up_date, vitals
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                comorbidities = EXCLUDED.comorbidities, habits = EXCLUDED.habits, general_examination = EXCLUDED.general_examination,
                system_examination = EXCLUDED.system_examination, provisional_diagnosis = EXCLUDED.provisional_diagnosis,
                differential_diagnosis = EXCLUDED.differential_diagnosis, final_diagnosis = EXCLUDED.final_diagnosis,
                investigations = EXCLUDED.investigations, advice = EXCLUDED.advice, clinical_notes = EXCLUDED.clinical_notes,
                allergies = EXCLUDED.allergies, surgerySuggested = EXCLUDED.surgerySuggested, visitingDays = EXCLUDED.visitingDays,
                visiting_notes = EXCLUDED.visiting_notes, prescription_pdf = EXCLUDED.prescription_pdf,
                follow_up_in_days = EXCLUDED.follow_up_in_days, follow_up_date = EXCLUDED.follow_up_date, vitals = EXCLUDED.vitals,
                updated_at = CURRENT_TIMESTAMP
            `);
            rcStmt.run(
              rcId,
              reportCard.petientId || reportCard.patientId,
              reportCard.appointmentId,
              reportCard.reportId || null,
              reportCard.comorbidities ? JSON.stringify(reportCard.comorbidities) : null,
              reportCard.habits ? JSON.stringify(reportCard.habits) : null,
              reportCard.generalExamination ? JSON.stringify(reportCard.generalExamination) : null,
              reportCard.systemExamination || null,
              reportCard.provisionalDiagnosis || null,
              reportCard.differentialDiagnosis || null,
              reportCard.finalDiagnosis || null,
              reportCard.investigations || null,
              reportCard.advice || null,
              reportCard.clinicalNotes || null,
              reportCard.allergies ? JSON.stringify(reportCard.allergies) : null,
              reportCard.surgerySuggested ? JSON.stringify(reportCard.surgerySuggested) : null,
              reportCard.visitingDays ? JSON.stringify(reportCard.visitingDays) : null,
              reportCard.visitingNotes || null,
              reportCard.prescriptionPdf || null,
              reportCard.followUpInDays || null,
              reportCard.followUpDate || null,
              reportCard.vitals ? JSON.stringify(reportCard.vitals) : null
            );

            // Insert prescriptions
            const pStmt = db.prepare(`
              INSERT INTO report_prescriptions (
                id, report_card_id, petient_id, medicine_id, prescribed_by,
                medicine_name, composition, strength, dosage, frequency,
                duration, manufacturer, medicine_count, marketer, image_url,
                notes, uses
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const p of prescriptions) {
              const pId = p.id || crypto.randomUUID(); // Fallback if no ID, but should have one
              pStmt.run(
                pId,
                rcId,
                reportCard.petientId || reportCard.patientId,
                p.medicineId || null,
                p.prescribedBy || null,
                p.medicineName,
                p.composition || null,
                p.strength || null,
                p.dosage,
                p.frequency,
                p.duration,
                p.manufacturer || null,
                p.medicineCount || null,
                p.marketer || null,
                p.imageUrl || null,
                p.notes || null,
                p.uses ? JSON.stringify(p.uses) : null
              );
            }
          }
          break;
        }

        case 'APPOINTMENT_NO_SHOW_ACTIONS': {
          // appointmentId is not in the payload body, it's embedded in the endpoint
          let appointmentId = '';
          if (payload.endpoint) {
            const match = payload.endpoint.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (match && match[1]) {
              appointmentId = match[1];
            }
          }
          
          if (!appointmentId) {
            logger.warn(`[EventProjector] Skipping APPOINTMENT_NO_SHOW_ACTIONS ${id}: Missing appointmentId in endpoint.`);
            break;
          }

          // Fetch patient_id and doctor_id from the local appointments table
          let patientId = '';
          let doctorId = null;
          try {
            const appt = db.prepare('SELECT patient_id, doctor_id FROM appointments WHERE id = ?').get(appointmentId) as any;
            if (appt) {
              patientId = appt.patient_id;
              doctorId = appt.doctor_id;
            }
          } catch (e) {}

          // 1. Insert into appointment_no_show_actions
          const stmtInsert = db.prepare(`
            INSERT INTO appointment_no_show_actions (id, appointment_id, patient_id, doctor_id, marked_by_role, marked_by_user_id, reason, sync_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)
            ON CONFLICT(id) DO UPDATE SET
              reason = EXCLUDED.reason,
              sync_status = 'synced'
          `);
          stmtInsert.run(
            id,
            appointmentId,
            patientId,
            doctorId,
            'system', // fallback since not in payload
            'system',
            data.reason || null,
            createdAt
          );

          // 2. Update the appointment status
          const stmtUpdate = db.prepare(`
            UPDATE appointments 
            SET status = 'No Show'
            WHERE id = ?
          `);
          stmtUpdate.run(appointmentId);
          
          break;
        }

        // You can easily expand this switch statement for DOCTOR, etc.
        // as you continue to test other modules!
        default:
          logger.warn(`[EventProjector] Unhandled entity type for projection: ${entityType}`);
          break;
      }
    } catch (e: any) {
      logger.error(`[EventProjector] Failed to project event ${event.id}: ${e.message}`);
    }
  }
}
