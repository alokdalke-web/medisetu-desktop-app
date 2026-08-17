const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.env.APPDATA, 'medi-setu', 'database', 'medisetu.sqlite');
try {
  const db = new Database(dbPath, { readonly: true });
  const res = db.prepare("SELECT value FROM clinic_settings WHERE key = 'auth_token'").get();
  console.log('TOKEN IN SQLITE:', res);
} catch (e) {
  console.error(e);
}
