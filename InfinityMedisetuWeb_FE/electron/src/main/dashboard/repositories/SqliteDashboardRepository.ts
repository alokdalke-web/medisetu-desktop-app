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
}
