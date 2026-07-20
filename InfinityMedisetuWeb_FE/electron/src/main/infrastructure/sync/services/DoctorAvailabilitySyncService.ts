import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService';
import logger from '../../../../../utils/logger';
import { AuthStore } from '../../../configurations/AuthStore';



export class DoctorAvailabilitySyncService implements ISyncService {
  public entityName = 'doctor_availability';

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching doctor availability from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    let totalCount = 0;

    const insertAvailability = (availabilities: any[], doctorId: string) => {
      const transaction = db.transaction((avs: any[]) => {
        let count = 0;
        const stmt = db.prepare(`
          INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, is_available, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET 
            doctor_id = EXCLUDED.doctor_id,
            day_of_week = EXCLUDED.day_of_week,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            is_available = EXCLUDED.is_available,
            updated_at = CURRENT_TIMESTAMP
        `);

        for (const av of avs) {
          // Map dayOfWeek string ("Monday") to integer (1)
          let dayInt = av.dayOfWeek;
          if (typeof av.dayOfWeek === 'string') {
            const normalizedDay = av.dayOfWeek.trim().toLowerCase();
            // In case it's a string number like "1"
            if (!isNaN(parseInt(normalizedDay, 10))) {
              dayInt = parseInt(normalizedDay, 10);
            } else {
              // Convert lowercase back to Title Case to match DAY_MAPPING or just map lowercase
              const lowerMapping: Record<string, number> = {
                'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
              };
              dayInt = lowerMapping[normalizedDay];
            }
          }
          
          if (dayInt === undefined || dayInt === null) {
            logger.warn(`[SyncEngine] Skipping availability record due to unknown dayOfWeek: ${av.dayOfWeek}`);
            continue;
          }

          stmt.run(
            av.id || av._id,
            doctorId,
            dayInt,
            av.startTime,
            av.endTime,
            av.isAvailable !== false ? 1 : 0 // Default to 1 unless strictly false
          );
          count++;
        }
        return count;
      });
      return transaction(availabilities);
    };

    const insertDateAvailability = (dateAvailabilities: any[], doctorId: string) => {
      const transaction = db.transaction((davs: any[]) => {
        let count = 0;
        
        const insertHoliday = db.prepare(`
          INSERT INTO holidays (id, date, description, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET 
            date = EXCLUDED.date,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        `);
        
        const deleteHoliday = db.prepare(`DELETE FROM holidays WHERE date = ?`);

        const insertSlot = db.prepare(`
          INSERT INTO doctor_date_availability (id, doctor_id, date, start_time, end_time, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET 
            doctor_id = EXCLUDED.doctor_id,
            date = EXCLUDED.date,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            updated_at = CURRENT_TIMESTAMP
        `);

        for (const dav of davs) {
          const dateStr = dav.date ? new Date(dav.date).toISOString().split('T')[0] : null;
          if (!dateStr) continue;

          if (dav.isAvailable === false) {
            insertHoliday.run(
              dav.id || `holiday-${dateStr}`,
              dateStr,
              dav.notes || 'Doctor on leave'
            );
            count++;
          } else {
            deleteHoliday.run(dateStr);
            
            if (dav.timeSlots && Array.isArray(dav.timeSlots)) {
              for (const slot of dav.timeSlots) {
                insertSlot.run(
                  slot.id || `${dav.id}-${slot.startTime}`,
                  doctorId,
                  dateStr,
                  slot.startTime,
                  slot.endTime
                );
                count++;
              }
            }
          }
        }
        return count;
      });
      return transaction(dateAvailabilities);
    };

    // 1. First, attempt to fetch the current user's clinic doctor profile (which includes availability)
    try {
      const userResponse = await fetch(`${apiUrl}/doctor/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userResponse.ok) {
        const userData: any = await userResponse.json();
        // Handle backend typo: 'aivblity' instead of 'availability'
        const availabilityList = userData?.result?.aivblity || userData?.result?.availability || [];
        const doctorId = userData?.result?.doctorProfile?.id;
        const dateAvailabilityList = userData?.result?.dateAvailability || [];
        
        logger.info(`[SyncEngine] /doctor/user successful. doctorId: ${doctorId}, availability count: ${availabilityList.length}, dateAvailability count: ${dateAvailabilityList.length}`);
        
        if (availabilityList.length > 0 && doctorId) {
          logger.info(`[SyncEngine] Found ${availabilityList.length} availability slots for logged-in doctor ${doctorId}`);
          totalCount += insertAvailability(availabilityList, doctorId);
        }
        
        if (dateAvailabilityList.length > 0 && doctorId) {
          logger.info(`[SyncEngine] Found ${dateAvailabilityList.length} date availability overrides for logged-in doctor ${doctorId}`);
          totalCount += insertDateAvailability(dateAvailabilityList, doctorId);
        }
        
        if (availabilityList.length === 0 && dateAvailabilityList.length === 0) {
           // Maybe availability is nested differently? Log keys.
           logger.warn(`[SyncEngine] /doctor/user has no availability arrays. Keys in result: ${Object.keys(userData?.result || {})}`);
        }
      } else {
         const errText = await userResponse.text();
         logger.warn(`[SyncEngine] /doctor/user failed with status ${userResponse.status}: ${errText}`);
      }
    } catch (error) {
      logger.warn(`[SyncEngine] Failed to fetch /doctor/user: ${error}`);
    }

    // 2. Fallback/Extension: Attempt to fetch availability for all known doctors in the local DB
    // This handles cases where a receptionist needs to book for multiple doctors.
    try {
      const dbDoctors = db.prepare('SELECT id FROM doctors').all() as { id: string }[];
      
      for (const doc of dbDoctors) {
        try {
          const singleResponse = await fetch(`${apiUrl}/doctor/single/${doc.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (singleResponse.ok) {
            const singleData: any = await singleResponse.json();
            const availabilityList = singleData?.result?.aivblity || singleData?.result?.availability || [];
            const dateAvailabilityList = singleData?.result?.dateAvailability || [];
            
            logger.info(`[SyncEngine] /doctor/single/${doc.id} successful. availability count: ${availabilityList.length}, dateAvailability count: ${dateAvailabilityList.length}`);

            if (availabilityList.length > 0) {
              logger.info(`[SyncEngine] Found ${availabilityList.length} availability slots for doctor ${doc.id}`);
              totalCount += insertAvailability(availabilityList, doc.id);
            }
            
            if (dateAvailabilityList.length > 0) {
              logger.info(`[SyncEngine] Found ${dateAvailabilityList.length} date availability overrides for doctor ${doc.id}`);
              totalCount += insertDateAvailability(dateAvailabilityList, doc.id);
            }
          } else {
             const errText = await singleResponse.text();
             logger.warn(`[SyncEngine] /doctor/single/${doc.id} failed with status ${singleResponse.status}: ${errText}`);
          }
        } catch (err) {
          logger.warn(`[SyncEngine] Fetch failed for doctor ${doc.id}: ${err}`);
        }
      }
    } catch (error) {
      logger.warn(`[SyncEngine] Failed iterating over doctors for availability sync: ${error}`);
    }

    return totalCount;
  }
}
