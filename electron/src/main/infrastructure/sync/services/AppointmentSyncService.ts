import type { Database } from 'better-sqlite3';
import type { ISyncService } from './ISyncService.js';
import logger from '../../../../../utils/logger.js';
import { AuthStore } from '../../../configurations/AuthStore.js';
import { ConfigStore } from '../../../configurations/ConfigStore.js';
import { SqliteAppointmentRepository, type Appointment } from '../../../appointment/repositories/SqliteAppointmentRepository.js';
import { SqlitePatientRepository } from '../../../patient/repositories/SqlitePatientRepository.js';
import { AppointmentDomainService } from '../../../appointment/domain/AppointmentDomainService.js';
import crypto from 'crypto';

export class AppointmentSyncService implements ISyncService {
  public entityName = 'appointments';
  private appointmentRepo = new SqliteAppointmentRepository();
  private patientRepo = new SqlitePatientRepository();
  private domainService = new AppointmentDomainService();

  public async sync(db: Database): Promise<number> {
    logger.info(`[SyncEngine] Fetching appointments from REST API...`);
    
    const token = AuthStore.getToken();
    if (!token) {
      throw new Error('Authentication token not found in AuthStore.');
    }

    const apiUrl = ConfigStore.getInstance().getBackendUrl();
    
    // Get start of today and today + 7 days
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const endDate = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

    let totalSynced = 0;
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await fetch(`${apiUrl}/appointments/all/clicnic?startDate=${startDate}&endDate=${endDate}&pageNumber=${currentPage}&pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.statusText}`);
      }

      const data: any = await response.json();
      const appointments = data?.result?.patients || data?.result?.appointments || data?.data || [];
      const pagination = data?.result?.pagination;

      if (pagination && pagination.totalPages) {
        totalPages = pagination.totalPages;
      }

      // Check existing appointments in cloud_id
      const processAppointments = db.transaction((appointmentsList: any[]) => {
        let count = 0;
        
        const checkStmt = db.prepare('SELECT id FROM appointments WHERE cloud_id = ?');
        const checkPatientStmt = db.prepare('SELECT id FROM patients WHERE cloud_id = ?');

        for (const pt of appointmentsList) {
          const cloudAppt = pt.appointment || pt;
          const cloudId = cloudAppt.id || cloudAppt._id;
          if (!cloudId) continue;

          // Skip if already locally tracked
          const existing = checkStmt.get(cloudId);
          if (existing) {
            continue;
          }

          // Resolve patient
          const cloudPatientId = pt.id || pt._id || cloudAppt.petientId?._id || cloudAppt.petientId?.id || cloudAppt.patientId;
          let localPatientId = null;

          if (cloudPatientId) {
            const existingPatient = checkPatientStmt.get(cloudPatientId) as { id: string } | undefined;
            if (existingPatient) {
              localPatientId = existingPatient.id;
            } else {
              // Create local patient
              const newLocalPatientId = crypto.randomUUID();
              
              const patientObj = pt.appointment ? pt : (cloudAppt.petientId || {});
              const {
                id, _id, name, email, mobile, phone,
                updatedAt, createdAt, status,
                ...otherFields
              } = patientObj;

              const localPatient = {
                id: newLocalPatientId,
                name: name || 'Unknown Patient',
                phone: mobile || phone || '',
                created_at: new Date().toISOString(),
                sync_status: 'synced',
                cloud_id: cloudPatientId,
                profile_data: Object.keys(otherFields).length > 0 ? JSON.stringify(otherFields) : undefined
              };

              this.patientRepo.create(db, localPatient);
              localPatientId = newLocalPatientId;
            }
          }

          if (!localPatientId) {
            logger.warn(`Skipping appointment ${cloudId} due to missing patient data.`);
            continue;
          }

          // Build proposed appointment
          const docObj = pt.doctor || cloudAppt.doctorId || {};
          const cloudDoctorId = docObj._id || docObj.id || (typeof docObj === 'string' ? docObj : '');

          // NORMALIZATION FIX: Cloud data formats often mismatch local expectations:
          // date: "2026-08-04T00:00:00.000Z" -> "2026-08-04"
          // time: "10:00:00" -> "10:00"
          // This ensures `getQueue` and `validateBooking` actually find and compare local matches accurately.
          const rawDate = cloudAppt.appointmentDate || cloudAppt.date;
          const normalizedDate = rawDate ? String(rawDate).split('T')[0] : rawDate;

          const rawTime = cloudAppt.appointmentTime || cloudAppt.timeSlot || cloudAppt.time_slot;
          const normalizedTime = rawTime ? String(rawTime).slice(0, 5) : rawTime;

          const proposedAppt: Appointment = {
            id: crypto.randomUUID(),
            patient_id: localPatientId,
            doctor_id: cloudDoctorId,
            date: normalizedDate,
            time_slot: normalizedTime,
            status: cloudAppt.appointmentStatus || cloudAppt.status || 'Confirmed',
            service_id: cloudAppt.serviceId || undefined,
            payment_mode: cloudAppt.payment?.paymentMode || cloudAppt.payment?.paymentMethod || cloudAppt.paymentMethod || cloudAppt.paymentMode || undefined,
            payment_status: cloudAppt.payment?.paymentStatus || cloudAppt.paymentStatus || undefined,
            booking_source: cloudAppt.bookingSource || 'cloud',
            cloud_id: cloudId
          };

          if (!proposedAppt.time_slot || !proposedAppt.date || !proposedAppt.doctor_id) {
            logger.warn(`Skipping appointment ${cloudId} due to missing date/time_slot/doctor_id.`);
            continue;
          }

          // Fetch existing queue to check for exact matches or clashes
          const existingQueue = this.appointmentRepo.getQueue(proposedAppt.doctor_id, proposedAppt.date);
          
          // 1. Check if this is the exact same appointment (same patient, time) missing a cloud_id
          const exactMatch = existingQueue.find(
            (appt) => appt.time_slot === proposedAppt.time_slot && appt.patient_id === proposedAppt.patient_id && appt.status !== 'Cancelled'
          );

          if (exactMatch) {
            // It's the same appointment! Just update the cloud_id (and status if needed)
            if (!exactMatch.cloud_id) {
              exactMatch.cloud_id = proposedAppt.cloud_id;
              exactMatch.status = proposedAppt.status;
              this.appointmentRepo.update(db, exactMatch);
            }
            continue; // Skip creating a new one to prevent duplication
          }

          // 2. Check for genuine clash (different patient, same time slot)
          let clashFound = false;

          try {
            this.domainService.validateBooking(proposedAppt, existingQueue);
          } catch (error) {
            // Error means conflict
            clashFound = true;
          }

          if (clashFound) {
            const conflictGroupId = crypto.randomUUID();
            proposedAppt.conflict_group_id = conflictGroupId;
            proposedAppt.status = 'conflict';

            // Find the conflicting local appointment to update it
            const conflictLocalAppt = existingQueue.find(
              (appt) => appt.time_slot === proposedAppt.time_slot && appt.status !== 'Cancelled'
            );

            if (conflictLocalAppt) {
              conflictLocalAppt.status = 'conflict';
              conflictLocalAppt.conflict_group_id = conflictGroupId;
              this.appointmentRepo.update(db, conflictLocalAppt);
            }
          }

          this.appointmentRepo.create(db, proposedAppt);
          count++;
        }
        return count;
      });

      const syncedInPage = processAppointments(appointments);
      totalSynced += syncedInPage;
      currentPage++;
    } while (currentPage <= totalPages);

    return totalSynced;
  }
}
