import dbManager from '../../../../database/DatabaseManager';

export class SqliteDashboardRepository {
  public getDoctorDashboard(args: any) {
    const db = dbManager.getConnection();
    const doctorId = args?.doctorId || '';

    // Calculate total patients for this doctor
    const totalPatientsRow = db.prepare(`
      SELECT COUNT(DISTINCT patient_id) as count 
      FROM appointments 
      WHERE doctor_id = ?
    `).get(doctorId) as any;

    // Calculate appointment stats
    const totalAppointmentsRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE doctor_id = ?
    `).get(doctorId) as any;

    const confirmedRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE doctor_id = ? AND status = 'Confirmed'
    `).get(doctorId) as any;

    const completedRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE doctor_id = ? AND status = 'Completed'
    `).get(doctorId) as any;

    const noShowRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE doctor_id = ? AND status = 'No Show'
    `).get(doctorId) as any;

    const pendingAppointments = db.prepare(`
      SELECT a.*, p.name as patientName 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ? AND a.status = 'Pending'
      ORDER BY a.date ASC, a.time_slot ASC
      LIMIT 10
    `).all(doctorId) as any[];

    // Calculate earnings (mocked for now until we have detailed billing)
    const earningsRow = db.prepare(`
      SELECT SUM(s.price) as total 
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.doctor_id = ? AND a.status = 'Completed'
    `).get(doctorId) as any;

    return {
      status: {
        totalEarning: { amount: earningsRow.total || 0, hikePersent: '0%' },
        totalAppoiment: { count: totalAppointmentsRow.count, hikePersent: '0%' },
        totalConfirmedAppointments: { count: confirmedRow.count, hikePersent: '0%' },
        totalPendigAppointments: { count: totalAppointmentsRow.count - confirmedRow.count - completedRow.count - noShowRow.count, hikePersent: '0%' },
        totalNoShowAppointments: { count: noShowRow.count, hikePersent: '0%' },
        totalApoinmentPatient: [{ count: totalPatientsRow.count }]
      },
      pendingAppointment: pendingAppointments.map(a => ({
        id: a.patient_id,
        name: a.patientName,
        profileImage: null,
        appointmentId: a.id,
        appointmentDate: a.date,
        appointmentTime: a.time_slot,
        appointmentType: 'Offline',
        tokenNo: null
      })),
      patientData: [],
      appoinmentStats: [],
      completedAppointmentsSeries: { labels: [], data: [] },
      cancelledAppointmentsSeries: { labels: [], data: [] },
      totalAppointmentsCount: totalAppointmentsRow.count,
      totalPatientsCount: totalPatientsRow.count
    };
  }

  public getRevenueOverview(_args: any) {
    return { success: true, result: [] };
  }

  public getTodayOverview(args: any) {
    const db = dbManager.getConnection();
    const doctorId = args?.doctorId || '';
    const today = new Date().toISOString().split('T')[0];

    const todayAppointments = db.prepare(`
      SELECT a.*, p.name as patientName 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ? AND a.date = ?
      ORDER BY a.time_slot ASC
    `).all(doctorId, today) as any[];

    const total = todayAppointments.length;
    const completed = todayAppointments.filter(a => a.status === 'Completed').length;
    const confirmed = todayAppointments.filter(a => a.status === 'Confirmed').length;
    const pending = todayAppointments.filter(a => a.status === 'Pending').length;
    const cancelled = todayAppointments.filter(a => a.status === 'Cancelled').length;
    const noShow = todayAppointments.filter(a => a.status === 'No Show').length;
    const remaining = pending + confirmed;

    return {
      success: true,
      message: 'Success',
      data: {
        date: new Date().toISOString(),
        appointments: {
          total,
          completed,
          confirmed,
          pending,
          cancelled,
          noShow,
          remaining
        },
        revenue: {
          todayRevenue: 0,
          todayPaidAppointments: 0,
          todayPendingPayments: 0,
          todayPendingCount: 0
        },
        todaysAppointments: todayAppointments.map(a => ({
          id: a.id,
          appointmentDate: a.date,
          appointmentTime: a.time_slot,
          appointmentType: 'Offline',
          appointmentStatus: a.status,
          tokenNo: null,
          patientName: a.patientName,
          patientAge: null,
          patientGender: null,
          patientProfileImage: null,
          paymentStatus: a.payment_status || 'Pending',
          reason: null
        })),
        upcomingAppointments: [],
        symptomCounts: { period: "this_week", data: {} },
        patientOverview: { period: "past_30_days", newPatients: { count: 0, trend: 'up' }, returningPatients: { count: 0, trend: 'up' } },
        meta: { clinicId: '', doctorId, generatedAt: new Date().toISOString() }
      }
    };
  }

  public getPaymentTransactions(args: any) {
    const db = dbManager.getConnection();
    const { pageNumber = 1, pageSize = 10, search = '', startDate, endDate, paymentStatus, doctorId, patientId } = args;
    
    let query = `
      SELECT 
        p.name as patientName,
        p.phone as patientMobile,
        d.name as doctorName,
        d.speciality as doctorSpeciality,
        s.name as serviceName,
        a.date as appointmentDate,
        IFNULL(ap.price, s.price) as price,
        'Credit' as entryType,
        a.payment_mode as paymentMode,
        NULL as refundMode,
        NULL as refundNotes,
        ap.transaction_id as transactionId,
        a.id as originalAppointmentId
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN appointment_payments ap ON a.id = ap.appointment_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (p.name LIKE ? OR d.name LIKE ? OR s.name LIKE ? OR p.phone LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    if (startDate) {
      query += ` AND a.date >= ?`;
      params.push(startDate.split('T')[0]);
    }
    if (endDate) {
      query += ` AND a.date <= ?`;
      params.push(endDate.split('T')[0]);
    }
    
    if (doctorId) {
      if (Array.isArray(doctorId)) {
        query += ` AND a.doctor_id IN (${doctorId.map(() => '?').join(',')})`;
        params.push(...doctorId);
      } else {
        query += ` AND a.doctor_id = ?`;
        params.push(doctorId);
      }
    }
    
    if (patientId) {
      if (Array.isArray(patientId)) {
        query += ` AND a.patient_id IN (${patientId.map(() => '?').join(',')})`;
        params.push(...patientId);
      } else {
        query += ` AND a.patient_id = ?`;
        params.push(patientId);
      }
    }
    
    if (paymentStatus) {
      if (Array.isArray(paymentStatus)) {
        query += ` AND a.payment_status IN (${paymentStatus.map(() => '?').join(',')})`;
        params.push(...paymentStatus);
      } else {
        query += ` AND a.payment_status = ?`;
        params.push(paymentStatus);
      }
    }
    
    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
    const totalRow = db.prepare(countQuery).get(...params) as any;
    const totalRecords = totalRow.count || 0;
    
    // Pagination
    query += ` ORDER BY a.date DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, (pageNumber - 1) * pageSize);
    
    const data = db.prepare(query).all(...params) as any[];
    
    return {
      data,
      metadata: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
        currentPage: pageNumber,
        pageSize
      }
    };
  }
}
