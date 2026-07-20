const Database = require('better-sqlite3');
const db = new Database('./electron/database/medisetu.db');

const services = db.prepare("SELECT * FROM services").all();
console.log('Services:', services);

const appointments = db.prepare("SELECT id, patient_id, service_id, payment_mode FROM appointments").all();
console.log('Appointments:', appointments);

const multServices = db.prepare("SELECT * FROM appointment_multiple_service").all();
console.log('Multiple Services:', multServices);

db.close();
