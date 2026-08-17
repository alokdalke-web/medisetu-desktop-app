const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.env.APPDATA, 'medi-setu', 'database', 'medisetu.sqlite');
try {
  const db = new Database(dbPath, { readonly: true });
  
  // Get all pending, failed, or stuck events
  const events = db.prepare(`
    SELECT id, entity_type, action_type, status, retry_count, payload
    FROM event_log
    ORDER BY lamport_clock ASC, rowid ASC
  `).all();
  
  console.log(`Found ${events.length} events in total.`);
  for (const e of events) {
    let p = {};
    try { p = JSON.parse(e.payload); } catch(err){}
    console.log(`[${e.status}] ${e.action_type} on ${e.entity_type} (Retries: ${e.retry_count}) - Entity ID in Payload: ${p.entityId}`);
  }
} catch (e) {
  console.error(e);
}
