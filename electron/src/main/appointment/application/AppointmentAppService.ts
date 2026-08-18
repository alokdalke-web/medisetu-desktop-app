import crypto from 'crypto';
import type { Appointment } from '../repositories/SqliteAppointmentRepository';
import { SqliteAppointmentRepository } from '../repositories/SqliteAppointmentRepository';
import { AppointmentDomainService } from '../domain/AppointmentDomainService';
import { EventLogRepository } from '../../infrastructure/repositories/EventLogRepository';
import { TransactionManager } from '../../configurations/TransactionManager';

export class AppointmentAppService {
  private repository: SqliteAppointmentRepository;
  private domainService: AppointmentDomainService;
  private eventLogRepository: EventLogRepository;

  constructor() {
    this.repository = new SqliteAppointmentRepository();
    this.domainService = new AppointmentDomainService();
    this.eventLogRepository = new EventLogRepository();
  }

  /**
   * Books an appointment locally. 
   * Orchestrates domain validation, and guarantees atomic writes using TransactionManager.
   */
  public async bookAppointment(
    patientId: string, 
    doctorId: string, 
    date: string, 
    timeSlot: string, 
    status?: string,
    serviceId?: string,
    paymentMode?: string,
    paymentStatus?: string,
    bookingSource?: string
  ) {
    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      patient_id: patientId,
      doctor_id: doctorId,
      date,
      time_slot: timeSlot,
      status: status || 'Pending',
      service_id: serviceId,
      payment_mode: paymentMode,
      payment_status: paymentStatus,
      booking_source: bookingSource
    };

    // 1. Fetch current state
    const currentQueue = this.repository.getQueue(doctorId, date);

    // 2. Run Pure Business Rules (Conflict detection)
    this.domainService.validateBooking(newAppointment, currentQueue);

    // 3. Persist atomically
    await TransactionManager.run((tx) => {
      // Write to business table
      this.repository.create(tx, newAppointment);

      const slotDurationSetting = this.repository.getClinicSetting('appointment_interval') || this.repository.getClinicSetting('slot_duration');
      const intervalMins = parseInt(slotDurationSetting || '15', 10) || 15;

      // Write to Event Log for the background sync engine
      const eventId = crypto.randomUUID();
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'APPOINTMENT_CREATED',
        entity_type: 'appointment',
        entity_id: newAppointment.id,
        payload: JSON.stringify({
          eventId,
          entityType: 'appointment',
          operation: 'CREATE',
          httpMethod: 'POST',
          endpoint: '/appointments',
          payload: {
            patientId,
            doctorId,
            appointmentDate: date,
            appointmentTime: timeSlot,
            appointmentType: 'Consultation',
            appointmentStatus: status || 'Pending',
            appointmentDurationMinutes: String(intervalMins),
            paymentMode: paymentMode,
            paymentStatus: paymentStatus,
            bookingSource: bookingSource,
            clinicServiceId: serviceId || undefined
          },
          headers: {}
        })
      });
    });

    return newAppointment;
  }

  public getQueue(doctorId: string, date: string) {
    return this.repository.getQueue(doctorId, date);
  }

  /**
   * Fetches clinic appointments and maps to PatientDetails schema.
   */
  public getClinicAppointments(args?: any) {
    const { data: rawData, total } = this.repository.getClinicAppointments(args);
    
    // Map raw SQL rows to the PatientDetails nested schema expected by RTK Query
    const patients = rawData.map((row: any) => ({
      id: row.patientId,
      name: row.patientName,
      mobile: row.patientMobile,
      doctor: {
        id: row.doctor_id,
        name: row.doctorName || "Unknown Doctor",
        speciality: row.doctorSpeciality || "General",
      },
      service: {
        servicePrice: row.servicePrice != null ? row.servicePrice : null
      },
      appointment: {
        id: row.appointmentId,
        appointmentDate: row.date,
        appointmentTime: row.time_slot,
        appointmentStatus: row.status,
        appointmentType: row.serviceName || 'Consultation',
        appointmentNotes: null,
        price: row.servicePrice != null ? String(row.servicePrice) : undefined,
        primaryServicePrice: row.servicePrice != null ? String(row.servicePrice) : undefined,
        serviceName: row.serviceName || "",
        serviceId: row.service_id || "",
        paymentMethod: row.paymentMode || null,
        paymentStatus: row.paymentStatus || null,
        bookingSource: row.bookingSource || null,
        reReasonForCancellation: null,
        reasionForReSchedule: null
      }
    }));

    const pageSize = args?.pageSize ? parseInt(args.pageSize, 10) : 100;
    const currentPage = args?.pageNumber ? parseInt(args.pageNumber, 10) : 1;

    return {
      success: true,
      result: {
        patients,
        pagination: {
          totalRecords: total,
          totalPages: Math.ceil(total / pageSize) || 1,
          currentPage,
          pageSize
        }
      }
    };
  }

  public getAppointmentReports(appointmentId: string) {
    let reportCard = null;
    let prescriptions: any[] = [];
    
    try {
      const { ReportRepository } = require('../../report/infrastructure/ReportRepository');
      const reportRepo = new ReportRepository();
      
      reportCard = reportRepo.getReportCardByAppointmentId(appointmentId);
      
      if (reportCard) {
        const pRows = reportRepo.getPrescriptionsByReportCardId(reportCard.id);
        prescriptions = pRows.map((r: any) => ({
          ...r,
          medicineName: r.medicine_name,
          medicineId: r.medicine_id,
          medicineCount: r.medicine_count,
          imageUrl: r.image_url,
          uses: r.uses ? JSON.parse(r.uses) : {}
        }));
        
        // Map snake_case to camelCase for UI
        reportCard = {
          ...reportCard,
          patientId: reportCard.petient_id || reportCard.petientId,
          appointmentId: reportCard.appointment_id,
          followUpDate: reportCard.follow_up_date,
          followUpInDays: reportCard.follow_up_in_days,
          generalExamination: reportCard.general_examination ? JSON.parse(reportCard.general_examination) : [],
          systemExamination: reportCard.system_examination,
          provisionalDiagnosis: reportCard.provisional_diagnosis,
          differentialDiagnosis: reportCard.differential_diagnosis,
          finalDiagnosis: reportCard.final_diagnosis,
          clinicalNotes: reportCard.clinical_notes,
          visitingNotes: reportCard.visiting_notes,
          prescriptionPdf: reportCard.prescription_pdf,
          comorbidities: reportCard.comorbidities ? JSON.parse(reportCard.comorbidities) : [],
          habits: reportCard.habits ? JSON.parse(reportCard.habits) : [],
          allergies: reportCard.allergies ? JSON.parse(reportCard.allergies) : [],
          surgerySuggested: reportCard.surgerySuggested ? JSON.parse(reportCard.surgerySuggested) : [],
          visitingDays: reportCard.visitingDays ? JSON.parse(reportCard.visitingDays) : [],
          vitals: reportCard.vitals ? JSON.parse(reportCard.vitals) : {}
        };
      }
    } catch (e) {
      console.error("[AppointmentAppService] Failed to load offline report:", e);
    }

    return {
      success: true,
      result: {
        reportCard: reportCard,
        prescriptions: prescriptions
      }
    };
  }

  public getAppointmentById(id: string) {
    const rawData = this.repository.findById(id);
    if (!rawData) throw new Error("Appointment not found");

    let profileData: any = {};
    if (rawData.profile_data) {
      try { profileData = JSON.parse(rawData.profile_data); } catch(e) {}
    }

    let clinicSettings: any = {};
    try {
      const db = require('../../../database/DatabaseManager').default.getConnection();
      const rows = db.prepare('SELECT key, value FROM clinic_settings').all() as {key: string, value: string}[];
      rows.forEach(row => {
        clinicSettings[row.key] = row.value;
      });
    } catch(e) {}

    return {
      success: true,
      result: {
        clinicSettings,
        id: rawData.patientId,
        name: rawData.patientName,
        mobile: rawData.patientMobile,
        ...profileData,
        doctor: {
          id: rawData.doctor_id,
          name: rawData.doctorName || "Unknown Doctor",
          speciality: rawData.doctorSpeciality || "General",
        },
        appointment: {
          id: rawData.appointmentId,
          appointmentDate: rawData.date,
          appointmentTime: rawData.time_slot,
          appointmentStatus: rawData.status,
          appointmentType: "Offline",
          appointmentNotes: null,
          price: rawData.servicePrice != null ? String(rawData.servicePrice) : undefined,
          primaryServicePrice: rawData.servicePrice != null ? String(rawData.servicePrice) : undefined,
          serviceName: rawData.serviceName || "",
          serviceId: rawData.service_id || "",
          paymentMode: rawData.paymentMode || "Cash",
          paymentStatus: rawData.paymentStatus || null,
          bookingSource: rawData.bookingSource || "walk_in"
        },
        clinicService: rawData.serviceName ? {
          name: rawData.serviceName,
          price: rawData.servicePrice,
          serviceName: rawData.serviceName
        } : null
      }
    };
  }

  public getAllUserAppointments(args: any) {
    return this.getClinicAppointments(args);
  }

  public getClinicAppointmentDetails(date: string) {
    return this.getClinicAppointments({ date });
  }

  public getAvailableSlots(args: any) {
    const date = args?.date || new Date().toISOString().split('T')[0];
    const doctorId = args?.doctorId || args?.doctor_id;
    
    if (!doctorId) return { success: true, result: [] };

    const bookedAppointments = this.repository.getQueue(doctorId, date);
    const bookedTimeSlots = new Set(bookedAppointments.map(a => a.time_slot));

    const checkBooked = (startHStr: string, startMStr: string, endHStr: string, endMStr: string, id: number) => {
      const timeOnlyStr = `${startHStr}:${startMStr}`;
      const isoStr = `${date}T${startHStr}:${startMStr}:00`;
      let isBooked = bookedTimeSlots.has(timeOnlyStr) || bookedTimeSlots.has(isoStr);
      
      const now = new Date();
      const isToday = date === now.toISOString().split('T')[0];
      
      if (isToday && !isBooked) {
        const slotStartH = parseInt(startHStr, 10);
        const slotStartM = parseInt(startMStr, 10);
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        if (slotStartH < currentH || (slotStartH === currentH && slotStartM <= currentM)) {
          return null; // Return null to completely hide past slots
        }
      }

      return {
        id: `offline-slot-${id}`,
        startTime: isoStr,
        endTime: `${date}T${endHStr}:${endMStr}:00`,
        status: isBooked ? "booked" : "available",
      };
    };

    // Parse time strings like "09:00 AM" or "09:00"
    const parseTimeStr = (tStr: string): [number, number] => {
      if (!tStr) return [0, 0];
      const match = tStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return [0, 0];
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const modifier = match[3] ? match[3].toUpperCase() : null;
      if (modifier === 'PM' && h < 12) h += 12;
      if (modifier === 'AM' && h === 12) h = 0;
      return [h, m];
    };

    // 1. Check for custom overrides for this specific date
    const customSlots = this.repository.getCustomDateSlots(doctorId, date);
    if (customSlots && customSlots.length > 0) {
      const slots = customSlots.map((slot, index) => {
        const [startH, startM] = parseTimeStr(slot.start_time);
        const [endH, endM] = parseTimeStr(slot.end_time);
        
        const startHStr = String(startH).padStart(2, '0');
        const startMStr = String(startM).padStart(2, '0');
        const endHStr = String(endH).padStart(2, '0');
        const endMStr = String(endM).padStart(2, '0');
        
        return checkBooked(startHStr, startMStr, endHStr, endMStr, index + 1);
      }).filter(s => s !== null);
      return { success: true, result: slots };
    }

    // 2. Check if it's a holiday (or dateAvailability with isAvailable=false)
    if (this.repository.isHoliday(date)) {
      return { success: true, result: [] };
    }
    
    // 3. Fallback to weekly schedule
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    
    const availability = this.repository.getDoctorAvailability(doctorId, dayOfWeek);
    if (!availability) {
      return { success: true, result: [] };
    }
    
    const slotDurationSetting = this.repository.getClinicSetting('appointment_interval') || this.repository.getClinicSetting('slot_duration');
    const intervalMins = parseInt(slotDurationSetting || '15', 10) || 15;
    
    const slots = [];
    let idCounter = 1;
    
    
    const [startH, startM] = parseTimeStr(availability.start_time || '09:00');
    const [endH, endM] = parseTimeStr(availability.end_time || '17:00');
    
    let currH = startH;
    let currM = startM;
    const endTotalMins = endH * 60 + endM;
    
    while ((currH * 60 + currM) + intervalMins <= endTotalMins) {
      const startHStr = String(currH).padStart(2, '0');
      const startMStr = String(currM).padStart(2, '0');
      
      const nextTotalMins = currH * 60 + currM + intervalMins;
      const nextH = Math.floor(nextTotalMins / 60);
      const nextM = nextTotalMins % 60;
      
      const endHStr = String(nextH).padStart(2, '0');
      const endMStr = String(nextM).padStart(2, '0');
      
      slots.push(checkBooked(startHStr, startMStr, endHStr, endMStr, idCounter++));
      
      currH = nextH;
      currM = nextM;
    }
    
    return { success: true, result: slots.filter(s => s !== null) };
  }

  public async updateAppointment(appointmentId: string, data: any) {
    const rawData = this.repository.findById(appointmentId);
    if (!rawData) throw new Error("Appointment not found");

    const existingAppointment: Appointment = {
      id: rawData.appointmentId,
      patient_id: rawData.patientId,
      doctor_id: rawData.doctor_id,
      date: rawData.date,
      time_slot: rawData.time_slot,
      status: rawData.status,
      service_id: rawData.service_id,
      payment_mode: rawData.paymentMode,
      payment_status: rawData.paymentStatus,
      booking_source: rawData.bookingSource
    };

    const updatedAppointment: Appointment = {
      ...existingAppointment,
      date: data.appointmentDate || existingAppointment.date,
      time_slot: data.appointmentTime || existingAppointment.time_slot,
      status: data.appointmentStatus || existingAppointment.status,
      payment_mode: data.paymentMode !== undefined ? data.paymentMode : existingAppointment.payment_mode,
      payment_status: data.paymentStatus !== undefined ? data.paymentStatus : existingAppointment.payment_status,
      booking_source: data.bookingSource !== undefined ? data.bookingSource : existingAppointment.booking_source,
    };

    await TransactionManager.run((tx) => {
      this.repository.update(tx, updatedAppointment);
      
      const targetId = rawData.cloud_id || updatedAppointment.id;
      const eventId = crypto.randomUUID();
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'APPOINTMENT_UPDATED',
        entity_type: 'appointment',
        entity_id: updatedAppointment.id,
        payload: JSON.stringify({
          eventId,
          entityType: 'appointment',
          operation: 'UPDATE',
          httpMethod: 'PUT',
          endpoint: `/appointments/${targetId}`,
          payload: data,
          headers: {}
        })
      });
    });

    return { success: true, result: updatedAppointment };
  }

  public getQueueState(args: { clinicId: string; doctorId?: string }) {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch full appointment details using getClinicAppointments
    let { data: allAppointments } = this.repository.getClinicAppointments({ date: today });
    
    if (args.doctorId) {
      allAppointments = allAppointments.filter(a => a.doctor_id === args.doctorId);
    }

    // Sort by time_slot ascending to simulate a queue
    allAppointments.sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));

    // Compute a naive estimatedWaitMinutes for offline mode (15 mins per pending appointment ahead)
    let cumulativeWait = 0;
    const mappedAppointments = allAppointments.map(a => {
      let estimatedWait = 0;
      if (a.status !== 'Completed' && a.status !== 'Cancelled') {
        estimatedWait = cumulativeWait;
        cumulativeWait += 15; // Assume 15 mins per patient
      }
      return {
        ...a,
        estimatedWaitMinutes: estimatedWait
      };
    });

    return {
      success: true,
      result: {
        appointments: mappedAppointments,
        cumulativeDelay: 0,
        timeToNextMinutes: mappedAppointments.length > 0 ? 15 : null,
        doctorId: args.doctorId,
        totalTokens: allAppointments.length,
        completedTokens: allAppointments.filter(a => a.status === 'Completed').length,
        currentQueue: allAppointments.filter(a => a.status === 'In Progress' || a.status === 'Confirmed'),
      }
    };
  }

  public async addMultipleServices(appointmentId: string, serviceIds: string[], paymentMode: string, paymentNotes?: string) {
    await TransactionManager.run((tx) => {
      // 1. Mark appointment as Paid
      this.repository.updatePaymentStatus(tx, appointmentId, paymentMode, serviceIds[0]);
      
      // 2. Add multiple services
      for (const serviceId of serviceIds) {
        const id = crypto.randomUUID();
        const price = this.repository.getServicePrice(serviceId);
        
        const data = {
          id,
          appointmentId,
          serviceId,
          price,
          paymentMode,
          paymentNotes: paymentNotes || ''
        };
        this.repository.addMultipleServices(tx, data);

          const eventId = crypto.randomUUID();
          this.eventLogRepository.insert(tx, {
            id: eventId,
            action_type: 'APPOINTMENT_SERVICE_ADDED',
            entity_type: 'appointment_service',
            entity_id: id,
            payload: JSON.stringify({
              eventId,
              entityType: 'appointment_service',
              operation: 'CREATE',
              httpMethod: 'POST',
              endpoint: `/appointments/multiple-service/${appointmentId}`,
              payload: {
                appointmentId,
                serviceIds: [serviceId],
                paymentMode,
                payment_notes: paymentNotes || ''
              },
              headers: {}
            })
          });
      }
    });

    return { success: true, message: 'Services added successfully' };
  }

  public getMultipleServices(appointmentId: string) {
    const services = this.repository.getMultipleServices(appointmentId);
    return {
      success: true,
      result: services
    };
  }

  public async markAsNoShow(args: { appointmentId: string; reason?: string }) {
    const appointment = this.repository.findById(args.appointmentId);
    if (!appointment) {
      throw new Error(`Appointment not found: ${args.appointmentId}`);
    }

    const newId = crypto.randomUUID();
    
    await TransactionManager.run((tx) => {
      // 1. Mark as no show locally
      this.repository.markAsNoShow(tx, {
        id: newId,
        appointmentId: args.appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctor_id,
        markedByRole: 'system',
        markedByUserId: 'system',
        reason: args.reason || ''
      });

      // 2. Write Event Log to trigger SyncEngine
      const eventId = crypto.randomUUID();
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'APPOINTMENT_MARKED_NO_SHOW',
        entity_type: 'appointment_no_show_actions',
        entity_id: newId,
        payload: JSON.stringify({
          eventId,
          entityType: 'appointment_no_show_actions',
          operation: 'CREATE',
          httpMethod: 'POST',
          endpoint: `/appointments/${args.appointmentId}/no-show`,
          payload: {
            reason: args.reason || ''
          },
          headers: {}
        }),
        // timestamp: new Date().toISOString()
      });
    });

    return { success: true };
  }

  public getClinicNoShowAnalytics(args: { startDate?: string, endDate?: string, search?: string }): any {
    const data = this.repository.getClinicNoShowAnalytics(args);
    return { data }; // Wrap in { data } to mimic API response
  }
}
