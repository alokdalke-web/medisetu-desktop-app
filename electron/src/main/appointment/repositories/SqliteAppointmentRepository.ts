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
  conflict_group_id?: string;
  cloud_id?: string;
}

export class SqliteAppointmentRepository {
  /**
   * Creates an appointment. Requires a transaction connection `tx` for atomicity.
   */
  public create(tx: Database.Database, data: Appointment): void {
    const stmt = tx.prepare(`
      INSERT INTO appointments (id, patient_id, doctor_id, date, time_slot, status, service_id, payment_mode, payment_status, booking_source, conflict_group_id, cloud_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.booking_source || null,
      data.conflict_group_id || null,
      data.cloud_id || null
    );
  }

  public update(tx: Database.Database, data: Appointment): void {
    const stmt = tx.prepare(`
      UPDATE appointments
      SET date = ?, time_slot = ?, status = ?, service_id = ?, payment_mode = ?, payment_status = ?, booking_source = ?, conflict_group_id = ?, cloud_id = ?
      WHERE id = ? OR cloud_id = ?
    `);
    
    stmt.run(
      data.date,
      data.time_slot,
      data.status,
      data.service_id || null,
      data.payment_mode || null,
      data.payment_status || null,
      data.booking_source || null,
      data.conflict_group_id || null,
      data.cloud_id || null,
      data.id,
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
  public getClinicAppointments(args?: any): { data: any[], total: number } {
    const db = dbManager.getConnection();
    let query = `
      SELECT 
        a.id as appointmentId,
        a.cloud_id as cloud_id,
        a.date,
        a.time_slot,
        a.status,
        a.service_id,
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
      ORDER BY a.date DESC, a.time_slot ASC
    `;
    
    const rows = db.prepare(query).all() as any[];

    let filtered = rows;
    
    if (args) {
      if (args.patientId) {
        filtered = filtered.filter(r => r.patientId === args.patientId);
      }

      if (args.doctorId) {
        filtered = filtered.filter(r => r.doctor_id === args.doctorId);
      }

      if (args.search) {
        const q = args.search.toLowerCase();
        filtered = filtered.filter(r => 
          (r.patientName && r.patientName.toLowerCase().includes(q)) || 
          (r.patientMobile && r.patientMobile.includes(q))
        );
      }
      
      if (args.appointmentStatus && args.appointmentStatus !== 'All Statuses') {
        filtered = filtered.filter(r => r.status && r.status.toLowerCase() === args.appointmentStatus.toLowerCase());
      }
      
      if (args.startDate || args.endDate) {
        filtered = filtered.filter(r => {
          const d = new Date(r.date).getTime();
          if (args.startDate && d < new Date(args.startDate).getTime()) return false;
          if (args.endDate && d > new Date(args.endDate).getTime() + 86400000) return false;
          return true;
        });
      }
      
      if (args.date) { // Backward compatibility
        filtered = filtered.filter(r => r.date === args.date);
      }
    }

    const pageNumber = args?.pageNumber ? parseInt(args.pageNumber, 10) : 1;
    const pageSize = args?.pageSize ? parseInt(args.pageSize, 10) : 100;
    const start = (pageNumber - 1) * pageSize;
    
    return { data: filtered.slice(start, start + pageSize), total: filtered.length };
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
        a.service_id,
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
      WHERE a.id = ? OR a.cloud_id = ?
    `;
    return db.prepare(query).get(id, id);
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

  public markAsNoShow(tx: Database.Database, data: {
    id: string,
    appointmentId: string,
    patientId: string,
    doctorId: string | null,
    markedByRole: string,
    markedByUserId: string,
    reason: string
  }): void {
    // 1. Insert into appointment_no_show_actions
    const stmtInsert = tx.prepare(`
      INSERT INTO appointment_no_show_actions (id, appointment_id, patient_id, doctor_id, marked_by_role, marked_by_user_id, reason, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    
    stmtInsert.run(
      data.id,
      data.appointmentId,
      data.patientId,
      data.doctorId,
      data.markedByRole,
      data.markedByUserId,
      data.reason || null
    );

    // 2. Update appointment status to 'No Show'
    const stmtUpdate = tx.prepare(`
      UPDATE appointments 
      SET status = 'No Show'
      WHERE id = ? OR cloud_id = ?
    `);
    
    stmtUpdate.run(data.appointmentId, data.appointmentId);
  }

  public getClinicNoShowAnalytics(args: { startDate?: string, endDate?: string, search?: string }): any[] {
    const db = dbManager.getConnection();
    let query = `
      SELECT 
        p.id as patientId,
        p.name as patientName,
        p.phone as patientMobile,
        d.name as doctorName,
        a.id as latestAppointmentId,
        'Consultation' as appointmentType,
        a.date as appointmentDate,
        a.time_slot as appointmentTime,
        ns.reason as noShowReason,
        ns.marked_by_role as noShowMarkedBy,
        ns.created_at as createdAt,
        (SELECT COUNT(*) FROM appointment_no_show_actions ns_sub WHERE ns_sub.patient_id = p.id) as totalNoShows,
        (SELECT MIN(ns_sub2.created_at) FROM appointment_no_show_actions ns_sub2 WHERE ns_sub2.patient_id = p.id) as firstNoShowDate
      FROM appointment_no_show_actions ns
      JOIN appointments a ON ns.appointment_id = a.id
      JOIN patients p ON ns.patient_id = p.id
      LEFT JOIN doctors d ON ns.doctor_id = d.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (args.startDate && args.endDate) {
      query += ` AND a.date >= ? AND a.date <= ?`;
      params.push(args.startDate, args.endDate);
    }
    
    if (args.search) {
      query += ` AND (p.name LIKE ? OR p.phone LIKE ?)`;
      params.push(`%${args.search}%`, `%${args.search}%`);
    }

    // Group by patient to get only the latest no-show per patient
    query += ` GROUP BY p.id ORDER BY a.date DESC, a.time_slot DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    // Transform flat rows into nested JSON required by UI
    return rows.map(row => ({
      patient: {
        id: row.patientId,
        name: row.patientName,
        mobile: row.patientMobile
      },
      doctor: {
        name: row.doctorName
      },
      latestAppointment: {
        id: row.latestAppointmentId,
        appointmentType: row.appointmentType,
        appointmentDate: row.appointmentDate,
        appointmentTime: row.appointmentTime,
        noShowReason: row.noShowReason,
        noShowMarkedBy: row.noShowMarkedBy,
        createdAt: row.createdAt
      },
      totalNoShows: row.totalNoShows,
      firstNoShowDate: row.firstNoShowDate
    }));
  }

  public getConflicts(): any[] {
    const db = dbManager.getConnection();
    const query = `
      SELECT 
        a.id, a.patient_id, a.doctor_id, a.date, a.time_slot, a.status,
        COALESCE(a.conflict_group_id, c.conflict_group_id) as conflict_group_id,
        p.name as patientName, a.booking_source
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN (
        SELECT doctor_id, SUBSTR(date, 1, 10) as short_date, time_slot, MIN(conflict_group_id) as conflict_group_id 
        FROM appointments 
        WHERE status = 'conflict'
        GROUP BY doctor_id, SUBSTR(date, 1, 10), time_slot
      ) c ON a.doctor_id = c.doctor_id AND SUBSTR(a.date, 1, 10) = c.short_date AND a.time_slot = c.time_slot
      WHERE a.status != 'cancelled'
      ORDER BY c.conflict_group_id, a.date, a.time_slot
    `;
    return db.prepare(query).all() as any[];
  }

  public getConflictCount(): number {
    const db = dbManager.getConnection();
    const result = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE status = 'conflict'`).get() as { count: number };
    return result.count;
  }

  public findByConflictGroupId(conflictGroupId: string): Appointment[] {
    const db = dbManager.getConnection();
    const query = `
      SELECT a.* 
      FROM appointments a
      JOIN (
        SELECT doctor_id, date, time_slot 
        FROM appointments 
        WHERE conflict_group_id = ? LIMIT 1
      ) c ON a.doctor_id = c.doctor_id AND SUBSTR(a.date, 1, 10) = SUBSTR(c.date, 1, 10) AND a.time_slot = c.time_slot
      WHERE a.status != 'cancelled'
    `;
    return db.prepare(query).all(conflictGroupId) as Appointment[];
  }
}
