const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.env.APPDATA, 'medi-setu', 'database', 'medisetu.sqlite');
try {
  const db = new Database(dbPath, { readonly: false }); // writable!
  
  const result = db.prepare(`
    UPDATE event_log
    SET status = 'pending', retry_count = 0, next_retry_at = NULL
    WHERE status IN ('failed', 'stuck')
  `).run();
  
  console.log(`Reset ${result.changes} events back to pending!`);
} catch (e) {
  console.error(e);
}
