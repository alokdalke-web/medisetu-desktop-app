const fs = require('fs');
const path = require('path');
const logPath = path.join(process.env.APPDATA, 'infinity-medisetu-web-fe', 'logs', 'main.log');
try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(lines.slice(-50).join('\n'));
} catch (e) {
  console.error('Could not read log file:', e.message);
}
