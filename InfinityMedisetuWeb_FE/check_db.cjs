const db = require('better-sqlite3')('C:/Users/alokd/AppData/Roaming/InfinityMedisetuWeb_FE/database.sqlite');
console.log(db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'appointment_no_show_actions'").get());
console.log(db.prepare("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 3").all());
