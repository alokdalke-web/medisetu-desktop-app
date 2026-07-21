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
          const name = data.name || 'Unknown';
          const phone = data.mobile || data.phone || '';
          const profileData = JSON.stringify(data);
          
          const stmt = db.prepare(`
            INSERT INTO patients (id, name, phone, created_at, sync_status, profile_data)
            VALUES (?, ?, ?, ?, 'synced', ?)
            ON CONFLICT(id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              sync_status = 'synced',
              profile_data = EXCLUDED.profile_data
          `);
          stmt.run(id, name, phone, createdAt, profileData);
          break;
        }

        case 'APPOINTMENT': {
          const stmt = db.prepare(`
            INSERT INTO appointments (id, patient_id, doctor_id, date, time_slot, status, service_id, payment_mode, payment_status, booking_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              patient_id = EXCLUDED.patient_id,
              doctor_id = EXCLUDED.doctor_id,
              date = EXCLUDED.date,
              time_slot = EXCLUDED.time_slot,
              status = EXCLUDED.status,
              service_id = EXCLUDED.service_id,
              payment_mode = EXCLUDED.payment_mode,
              payment_status = EXCLUDED.payment_status,
              booking_source = EXCLUDED.booking_source
          `);
          stmt.run(
            id,
            data.patientId || data.patient_id,
            data.doctorId || data.doctor_id,
            data.date,
            data.timeSlot || data.time_slot,
            data.status || 'Scheduled',
            data.serviceId || data.service_id || null,
            data.paymentMode || data.payment_mode || null,
            data.paymentStatus || data.payment_status || null,
            data.bookingSource || data.booking_source || null
          );
          break;
        }
        
        // You can easily expand this switch statement for DOCTOR, MEDICINE, etc.
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
