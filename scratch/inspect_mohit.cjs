const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const appDataDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share");
const dbPath = path.join(appDataDir, 'InfinityMedisetu', 'clinic_sync.db');

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('--- Patients named Mohit ---');
  const patients = db.prepare(`SELECT id, name, cloud_id, sync_status FROM patients WHERE name LIKE '%Mohit%'`).all();
  console.log(JSON.stringify(patients, null, 2));

  console.log('\n--- Appointments for Mohit ---');
  const patientIds = patients.map(p => p.id);
  
  if (patientIds.length > 0) {
    const placeholders = patientIds.map(() => '?').join(',');
    const appts = db.prepare(`SELECT id, patient_id, date, time_slot, status, payment_status, cloud_id FROM appointments WHERE patient_id IN (${placeholders})`).all(...patientIds);
    console.log(JSON.stringify(appts, null, 2));

    console.log('\n--- Report Cards for these appointments ---');
    const apptIds = appts.map(a => a.id);
    if (apptIds.length > 0) {
      const apptPlaceholders = apptIds.map(() => '?').join(',');
      const reportCards = db.prepare(`SELECT id, appointment_id FROM report_cards WHERE appointment_id IN (${apptPlaceholders})`).all(...apptIds);
      console.log(JSON.stringify(reportCards, null, 2));
      
      console.log('\n--- Prescriptions for these report cards ---');
      const rcIds = reportCards.map(rc => rc.id);
      if (rcIds.length > 0) {
        const rcPlaceholders = rcIds.map(() => '?').join(',');
        const rx = db.prepare(`SELECT id, report_card_id, medicine_name FROM report_prescriptions WHERE report_card_id IN (${rcPlaceholders})`).all(...rcIds);
        console.log(JSON.stringify(rx, null, 2));
      } else {
        console.log('No prescriptions found.');
      }
    } else {
      console.log('No report cards found.');
    }
  }
} catch (e) {
  console.error("Error connecting to DB:", e.message);
}
