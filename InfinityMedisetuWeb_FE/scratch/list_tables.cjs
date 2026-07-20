const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('e:\\medisetu-desktop\\InfinityMedisetu_BE\\src');
const tables = new Set();
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /pgTable\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    tables.add(match[1]);
  }
});
console.log(Array.from(tables).sort().join('\n'));
