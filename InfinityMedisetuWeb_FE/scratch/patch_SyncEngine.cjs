const fs = require('fs');
const file = './electron/src/main/sync/SyncEngine.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add mapping for prescriptions medicineId
content = content.replace(
  /if \(payload\.entityType === 'appointment' && payload\.payload && payload\.payload\.patientId\) \{[\s\S]*?\}/,
  `if (payload.entityType === 'appointment' && payload.payload && payload.payload.patientId) {
            try {
              const patientRow = db.prepare(\`SELECT cloud_id FROM patients WHERE id = ?\`).get(payload.payload.patientId) as any;
              if (patientRow && patientRow.cloud_id) {
                payload.payload.patientId = patientRow.cloud_id;
                logger.info(\`SyncEngine: Rewrote patientId to cloud_id \${patientRow.cloud_id}\`);
              }
            } catch (e) {
              logger.error('SyncEngine: Failed to map patient cloud_id', e);
            }
          }

          if (payload.entityType === 'report_cards' && payload.payload && Array.isArray(payload.payload.prescriptions)) {
            try {
              for (const rx of payload.payload.prescriptions) {
                if (rx.medicineId) {
                  const medRow = db.prepare(\`SELECT cloud_id FROM medicines WHERE id = ?\`).get(rx.medicineId) as any;
                  if (medRow && medRow.cloud_id) {
                    rx.medicineId = medRow.cloud_id;
                    logger.info(\`SyncEngine: Rewrote medicineId to cloud_id \${medRow.cloud_id}\`);
                  }
                }
              }
            } catch (e) {
              logger.error('SyncEngine: Failed to map medicine cloud_id in prescriptions', e);
            }
          }`
);

// 2. Add 'medicines' to tableName mapping
content = content.replace(
  /if \(payload\.entityType === 'prescription'\) tableName = 'prescriptions';/,
  `if (payload.entityType === 'prescription') tableName = 'prescriptions';
            if (payload.entityType === 'medicines') tableName = 'medicines';`
);

fs.writeFileSync(file, content);
console.log('Patched SyncEngine.ts');
