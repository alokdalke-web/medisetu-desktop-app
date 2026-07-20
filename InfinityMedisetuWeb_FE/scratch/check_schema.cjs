const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(process.env.APPDATA, 'infinity-medisetu-web-fe', 'database.sqlite');
try {
  const db = new Database(dbPath, { fileMustExist: true });
  const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE name='medicines'`).get();
  console.log('Schema:', schema);
  
  const v = db.prepare(`SELECT * FROM migrations ORDER BY version DESC LIMIT 1`).get();
  console.log('Last migration:', v);
} catch (e) {
  console.error(e);
}
