const Database = require('better-sqlite3');
const dbPath = process.env.APPDATA + '\\medi-setu\\database\\medisetu.sqlite';
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, payload FROM event_log WHERE payload LIKE '%/appointments/book%'").all();
console.log(`Found ${rows.length} events to fix`);

for (const row of rows) {
  let payload = JSON.parse(row.payload);
  if (payload.endpoint === '/appointments/book') {
    payload.endpoint = '/appointments/';
    db.prepare("UPDATE event_log SET payload = ?, status = 'pending', retry_count = 0 WHERE id = ?").run(JSON.stringify(payload), row.id);
    console.log(`Fixed event ${row.id}`);
  }
}
db.close();
