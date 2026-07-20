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
          endpoint: '/appointments/',
          payload: {
            patientId,
            doctorId,
            appointmentDate: date,
            appointmentTime: timeSlot,
            appointmentType: 'Consultation',
            appointmentStatus: status || 'Pending',
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
  public getClinicAppointments(date?: string) {
    const rawData = this.repository.getClinicAppointments(date);
    
    // Map raw SQL rows to the PatientDetails nested schema expected by RTK Query
    const patients = rawData.map(row => ({
      id: row.patientId,
      name: row.patientName,
      mobile: row.patientMobile,
      doctor: {
        id: row.doctor_id,
        name: row.doctorName || "Unknown Doctor",
        speciality: row.doctorSpeciality || "General",
      },
      appointment: {
        id: row.appointmentId,
        appointmentDate: row.date,
        appointmentTime: row.time_slot,
        appointmentStatus: row.status,
        appointmentType: 'Offline',
        appointmentNotes: null,
        price: row.servicePrice != null ? String(row.servicePrice) : "0",
        primaryServicePrice: row.servicePrice != null ? String(row.servicePrice) : "0",
        serviceName: row.serviceName || "",
        paymentMethod: row.paymentMode || "Cash",
        paymentStatus: row.paymentStatus || null,
        bookingSource: row.bookingSource || "walk_in",
        reReasonForCancellation: null,
        reasionForReSchedule: null
      }
    }));

    return {
      success: true,
      result: {
        patients,
        pagination: {
          totalRecords: patients.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: 100
        }
      }
    };
  }

  public getAppointmentReports(_appointmentId: string) {
    // Reports are not yet synced for offline viewing (as per analysis)
    // Stub out an empty response so the UI doesn't crash or throw "Unported API" toasts
    return {
      success: true,
      result: {
        reportCard: null,
        prescriptions: []
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

    return {
      success: true,
      result: {
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
          price: rawData.servicePrice != null ? String(rawData.servicePrice) : "0",
          primaryServicePrice: rawData.servicePrice != null ? String(rawData.servicePrice) : "0",
          serviceName: rawData.serviceName || "",
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
    return this.getClinicAppointments(args?.date);
  }

  public getClinicAppointmentDetails(date: string) {
    return this.getClinicAppointments(date);
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
      const isBooked = bookedTimeSlots.has(timeOnlyStr) || bookedTimeSlots.has(isoStr);
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
      });
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
    
    return { success: true, result: slots };
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
    const appointments = this.repository.getQueue(args.doctorId || '', today);
    return {
      success: true,
      result: {
        totalTokens: appointments.length,
        completedTokens: appointments.filter(a => a.status === 'Completed').length,
        currentQueue: appointments.filter(a => a.status === 'In Progress' || a.status === 'Confirmed'),
      }
    };
  }

  public async addMultipleServices(appointmentId: string, serviceIds: string[], paymentMode: string, paymentNotes?: string) {
    await TransactionManager.run((tx) => {
      // 1. Mark appointment as Paid
      this.repository.updatePaymentStatus(tx, appointmentId, paymentMode);
      
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
}
