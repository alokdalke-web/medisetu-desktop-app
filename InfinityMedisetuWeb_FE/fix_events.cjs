const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.APPDATA + '\\medi-setu\\database\\medisetu.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT id, payload FROM event_log WHERE payload LIKE '%/appointments/book%'", [], (err, rows) => {
    if (err) throw err;
    console.log(`Found ${rows.length} events to fix`);
    
    for (const row of rows) {
      let payload = JSON.parse(row.payload);
      if (payload.endpoint === '/appointments/book') {
        payload.endpoint = '/appointments/';
        const newPayloadStr = JSON.stringify(payload);
        
        db.run("UPDATE event_log SET payload = ?, status = 'pending', retry_count = 0 WHERE id = ?", [newPayloadStr, row.id], function(err2) {
          if (err2) throw err2;
          console.log(`Fixed event ${row.id}`);
        });
      }
    }
  });
});

setTimeout(() => db.close(), 1000);
