const fs = require('fs');
const file = 'e:/medisetu-desktop/InfinityMedisetuWeb_FE/src/redux/api/medicineApi.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/ipcAPI\.invoke\('medicine:search', \{ query: q \|\| search_term \|\| '' \}\)/g, "ipcAPI.medicine.search({ query: q || search_term || '' })");
content = content.replace(/ipcAPI\.invoke\('medicine:getAll', \{\}\)/g, "ipcAPI.medicine.getAll()");
content = content.replace(/ipcAPI\.invoke\('medicine:create', body\)/g, "ipcAPI.medicine.create(body)");

fs.writeFileSync(file, content);
console.log('Fixed medicineApi successfully');
