import Database from 'better-sqlite3';
import dbManager from '../../../../database/DatabaseManager';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  time_slot: string;
  status: string;
  service_id?: string;
  payment_mode?: string;
  payment_status?: string;
  booking_source?: string;
}

export class SqliteAppointmentRepository {
  /**
   * Creates an appointment. Requires a transaction connection `tx` for atomicity.
   */
  public create(tx: Database.Database, data: Appointment): void {
    const stmt = tx.prepare(`
      INSERT INTO appointments (id, patient_id, doctor_id, date, time_slot, status, service_id, payment_mode, payment_status, booking_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      data.id,
      data.patient_id,
      data.doctor_id,
      data.date,
      data.time_slot,
      data.status,
      data.service_id || null,
      data.payment_mode || null,
      data.payment_status || null,
      data.booking_source || null
    );
  }

  public update(tx: Database.Database, data: Appointment): void {
    const stmt = tx.prepare(`
      UPDATE appointments
      SET date = ?, time_slot = ?, status = ?, service_id = ?, payment_mode = ?, payment_status = ?, booking_source = ?
      WHERE id = ?
    `);
    
    stmt.run(
      data.date,
      data.time_slot,
      data.status,
      data.service_id || null,
      data.payment_mode || null,
      data.payment_status || null,
      data.booking_source || null,
      data.id
    );
  }

  /**
   * Fetches the queue for a doctor on a specific date. Read-only.
   */
  public getQueue(doctorId: string, date: string): Appointment[] {
    const db = dbManager.getConnection();
    const rows = db.prepare('SELECT * FROM appointments WHERE doctor_id = ? AND date = ? ORDER BY time_slot ASC')
      .all(doctorId, date) as Appointment[];
    return rows;
  }

  /**
   * Fetches all clinic appointments by joining with patients table.
   */
  public getClinicAppointments(date?: string): any[] {
    const db = dbManager.getConnection();
    let query = `
      SELECT 
        a.id as appointmentId,
        a.cloud_id as cloud_id,
        a.date,
        a.time_slot,
        a.status,
        a.doctor_id,
        d.name as doctorName,
        d.speciality as doctorSpeciality,
        p.id as patientId,
        p.name as patientName,
        p.phone as patientMobile,
        s.name as serviceName,
        s.price as servicePrice,
        a.payment_mode as paymentMode,
        a.payment_status as paymentStatus,
        a.booking_source as bookingSource
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN services s ON a.service_id = s.id
    `;
    
    let args: any[] = [];
    if (date) {
      query += ' WHERE a.date = ?';
      args.push(date);
    }
    query += ' ORDER BY a.date DESC, a.time_slot ASC LIMIT 100';
    
    return db.prepare(query).all(...args) as any[];
  }

  public findById(id: string): any {
    const db = dbManager.getConnection();
    const query = `
      SELECT 
        a.id as appointmentId,
        a.cloud_id as cloud_id,
        a.date,
        a.time_slot,
        a.status,
        a.doctor_id,
        d.name as doctorName,
        d.speciality as doctorSpeciality,
        p.id as patientId,
        p.name as patientName,
        p.phone as patientMobile,
        p.profile_data,
        s.name as serviceName,
        s.price as servicePrice,
        a.payment_mode as paymentMode,
        a.payment_status as paymentStatus,
        a.booking_source as bookingSource
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.id = ?
    `;
    return db.prepare(query).get(id);
  }

  public addMultipleServices(tx: Database.Database, data: { id: string, appointmentId: string, serviceId: string, price: number, paymentMode: string, paymentNotes: string }): void {
    const stmt = tx.prepare(`
      INSERT INTO appointment_multiple_service (id, appointment_id, service_id, price, payment_mode, payment_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      data.id,
      data.appointmentId,
      data.serviceId,
      data.price,
      data.paymentMode,
      data.paymentNotes || null
    );
  }

  public updatePaymentStatus(tx: Database.Database, appointmentId: string, paymentMode: string): void {
    const stmt = tx.prepare(`
      UPDATE appointments 
      SET payment_status = 'Paid', payment_mode = ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(paymentMode, appointmentId);
  }

  public getServicePrice(serviceId: string): number {
    const db = dbManager.getConnection();
    const result = db.prepare('SELECT price FROM services WHERE id = ?').get(serviceId) as { price: number } | undefined;
    return result?.price || 500;
  }

  public getMultipleServices(appointmentId: string): any[] {
    const db = dbManager.getConnection();
    const query = `
      SELECT 
        aps.id as id,
        aps.appointment_id as appointmentId,
        aps.service_id as serviceId,
        aps.price as price,
        aps.payment_mode as paymentMode,
        aps.payment_notes as paymentNotes,
        aps.created_at as createdAt,
        s.name as serviceName
      FROM appointment_multiple_service aps
      LEFT JOIN services s ON aps.service_id = s.id
      WHERE aps.appointment_id = ?
    `;
    return db.prepare(query).all(appointmentId) as any[];
  }

  public getDoctorAvailability(doctorId: string, dayOfWeek: number): { start_time: string, end_time: string } | null {
    const db = dbManager.getConnection();
    const query = `
      SELECT start_time, end_time 
      FROM doctor_availability 
      WHERE doctor_id = ? AND day_of_week = ? AND is_available = 1
    `;
    return db.prepare(query).get(doctorId, dayOfWeek) as any || null;
  }

  public getCustomDateSlots(doctorId: string, date: string): { start_time: string, end_time: string }[] {
    const db = dbManager.getConnection();
    const query = `
      SELECT start_time, end_time 
      FROM doctor_date_availability 
      WHERE doctor_id = ? AND date = ?
      ORDER BY start_time ASC
    `;
    return db.prepare(query).all(doctorId, date) as any[];
  }

  public isHoliday(date: string): boolean {
    const db = dbManager.getConnection();
    const query = `SELECT 1 FROM holidays WHERE date = ? LIMIT 1`;
    const result = db.prepare(query).get(date);
    return !!result;
  }

  public getClinicSetting(key: string): string | null {
    const db = dbManager.getConnection();
    const query = `SELECT value FROM clinic_settings WHERE key = ?`;
    const result = db.prepare(query).get(key) as { value: string } | undefined;
    return result ? result.value : null;
  }
}
