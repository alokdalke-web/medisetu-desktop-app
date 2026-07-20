import Database from 'better-sqlite3';
import logger from '../../utils/logger.js';

export function runMigrations(db: Database.Database) {
  logger.info('Running database migrations...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const currentVersionRow = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
  const currentVersion = currentVersionRow.version || 0;

  const migrations = [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS patients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'pending'
        );
      `
    },
    {
      version: 2,
      up: `
        -- Event Log for Synchronization Pipeline
        CREATE TABLE IF NOT EXISTS event_log (
          id TEXT PRIMARY KEY,
          action_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Sync Metadata for tracking sync state
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id TEXT PRIMARY KEY,
          last_sync_time DATETIME,
          entity_type TEXT NOT NULL,
          watermark TEXT
        );

        -- Audit Log for local security events
        CREATE TABLE IF NOT EXISTS audit_log (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      version: 3,
      up: `
        CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          patient_id TEXT NOT NULL,
          doctor_id TEXT NOT NULL,
          date TEXT NOT NULL,
          time_slot TEXT NOT NULL,
          status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
          id TEXT PRIMARY KEY,
          patient_id TEXT NOT NULL,
          doctor_id TEXT NOT NULL,
          date TEXT NOT NULL,
          items_json TEXT NOT NULL
        );
      `
    },
    {
      version: 4,
      up: `
        CREATE TABLE IF NOT EXISTS doctors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          speciality TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS departments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointment_services (
          id TEXT PRIMARY KEY,
          appointment_id TEXT NOT NULL,
          service_id TEXT NOT NULL,
          price REAL NOT NULL,
          payment_mode TEXT,
          payment_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          department_id TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          duration_minutes INTEGER,
          price REAL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS doctor_availability (
          id TEXT PRIMARY KEY,
          doctor_id TEXT NOT NULL,
          day_of_week INTEGER,
          start_time TEXT,
          end_time TEXT,
          is_available BOOLEAN,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS holidays (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS doctor_date_availability (
          id TEXT PRIMARY KEY,
          doctor_id TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointment_types (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS clinic_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      version: 5,
      up: `
        ALTER TABLE patients ADD COLUMN profile_data TEXT;
      `
    },
    {
      version: 6,
      up: `
        ALTER TABLE sync_metadata ADD COLUMN status TEXT DEFAULT 'pending';
        ALTER TABLE sync_metadata ADD COLUMN record_count INTEGER DEFAULT 0;
        ALTER TABLE sync_metadata ADD COLUMN last_error TEXT;
      `
    },
    {
      version: 7,
      up: `
        ALTER TABLE appointments ADD COLUMN service_id TEXT;
      `
    },
    {
      version: 8,
      up: `
        ALTER TABLE appointments ADD COLUMN payment_mode TEXT;
        ALTER TABLE appointments ADD COLUMN payment_status TEXT;
        ALTER TABLE appointments ADD COLUMN booking_source TEXT;
      `
    },
    {
      version: 9,
      up: `
        ALTER TABLE patients ADD COLUMN cloud_id TEXT;
        ALTER TABLE appointments ADD COLUMN cloud_id TEXT;
        ALTER TABLE prescriptions ADD COLUMN cloud_id TEXT;
        
        ALTER TABLE event_log ADD COLUMN retry_count INTEGER DEFAULT 0;
        ALTER TABLE event_log ADD COLUMN last_attempt_at DATETIME;
        ALTER TABLE event_log ADD COLUMN error_message TEXT;
      `
    },
    {
      version: 10,
      up: `
        CREATE TABLE IF NOT EXISTS doctor_date_availability (
          id TEXT PRIMARY KEY,
          doctor_id TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      version: 11,
      up: `
        CREATE TABLE IF NOT EXISTS medicines (
          id TEXT PRIMARY KEY,
          created_by_user_id TEXT,
          name TEXT NOT NULL,
          sku TEXT,
          generic_name TEXT,
          manufacturer TEXT,
          composition TEXT,
          form TEXT,
          strength TEXT,
          category TEXT,
          requires_prescription BOOLEAN DEFAULT 0,
          is_favorite BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS prescription_templates (
          id TEXT PRIMARY KEY,
          doctor_id TEXT NOT NULL,
          template_name TEXT NOT NULL,
          font_family TEXT,
          color1 TEXT,
          color2 TEXT,
          color3 TEXT,
          color4 TEXT,
          color5 TEXT,
          color6 TEXT,
          color7 TEXT,
          color8 TEXT,
          color9 TEXT,
          color10 TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointment_clinical_data (
          id TEXT PRIMARY KEY,
          appointment_id TEXT NOT NULL UNIQUE,
          common_symptoms TEXT,
          clinic_symptom_ids TEXT,
          appointment_notes TEXT,
          vitals_list TEXT,
          referrals TEXT,
          consent_notes TEXT,
          consent_file TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointment_payments (
          id TEXT PRIMARY KEY,
          appointment_id TEXT NOT NULL UNIQUE,
          payment_mode TEXT,
          payment_status TEXT DEFAULT 'Paid',
          price REAL,
          primary_service_price REAL,
          payment_notes TEXT,
          transaction_id TEXT UNIQUE,
          gateway_order_id TEXT,
          gateway_response TEXT,
          refund_mode TEXT,
          refunded_amount TEXT,
          refund_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS patient_family_links (
          id TEXT PRIMARY KEY,
          primary_patient_id TEXT NOT NULL,
          linked_patient_id TEXT NOT NULL,
          relationship TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(primary_patient_id, linked_patient_id)
        );
      `
    },
    {
      version: 12,
      up: `
        CREATE TABLE IF NOT EXISTS appointment_multiple_service (
          id TEXT PRIMARY KEY,
          appointment_id TEXT NOT NULL,
          service_id TEXT,
          price TEXT,
          payment_mode TEXT DEFAULT 'Cash',
          payment_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      version: 13,
      up: `
        CREATE TABLE IF NOT EXISTS report_cards (
          id TEXT PRIMARY KEY,
          petient_id TEXT NOT NULL,
          appointment_id TEXT NOT NULL,
          report_id TEXT,
          comorbidities TEXT,
          habits TEXT,
          general_examination TEXT,
          system_examination TEXT,
          provisional_diagnosis TEXT,
          differential_diagnosis TEXT,
          final_diagnosis TEXT,
          investigations TEXT,
          advice TEXT,
          clinical_notes TEXT,
          allergies TEXT,
          surgerySuggested TEXT,
          visitingDays TEXT,
          visiting_notes TEXT,
          prescription_pdf TEXT,
          follow_up_in_days TEXT,
          follow_up_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS report_prescriptions (
          id TEXT PRIMARY KEY,
          report_card_id TEXT NOT NULL,
          petient_id TEXT NOT NULL,
          medicine_id TEXT,
          prescribed_by TEXT,
          medicine_name TEXT NOT NULL,
          composition TEXT,
          strength TEXT,
          dosage TEXT NOT NULL,
          frequency TEXT NOT NULL,
          duration TEXT NOT NULL,
          manufacturer TEXT,
          medicine_count TEXT,
          marketer TEXT,
          image_url TEXT,
          notes TEXT,
          uses TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      version: 14,
      up: `
        ALTER TABLE medicines ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE medicines ADD COLUMN cloud_id TEXT;
      `
    },
    {
      version: 15,
      up: `
        CREATE TABLE IF NOT EXISTS report_prescriptions (
          id TEXT PRIMARY KEY,
          report_card_id TEXT NOT NULL,
          petient_id TEXT NOT NULL,
          medicine_id TEXT,
          prescribed_by TEXT,
          medicine_name TEXT NOT NULL,
          composition TEXT,
          strength TEXT,
          dosage TEXT NOT NULL,
          frequency TEXT NOT NULL,
          duration TEXT NOT NULL,
          manufacturer TEXT,
          medicine_count TEXT,
          marketer TEXT,
          image_url TEXT,
          notes TEXT,
          uses TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      version: 16,
      up: `
        ALTER TABLE report_cards ADD COLUMN vitals TEXT;
      `
    }
  ];

  const transaction = db.transaction(() => {
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        logger.info(`Applying migration version ${migration.version}...`);
        db.exec(migration.up);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migration.version);
        logger.info(`Migration version ${migration.version} applied successfully.`);
      }
    }
  });

  try {
    transaction();
    logger.info('All migrations applied successfully.');
  } catch (error) {
    logger.error('Migration failed, rolled back.', error);
    throw error;
  }
}
