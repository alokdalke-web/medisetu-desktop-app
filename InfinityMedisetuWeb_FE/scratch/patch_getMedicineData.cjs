const fs = require('fs');
const file = './src/redux/api/medicineApi.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /query: \(\{ medicine_name, composition, page = 1, limit = 5 \}\) => \{[\s\S]*?url: "\/medicine\/global-medicine\/medicine-data",\s*method: "GET",\s*params,\s*\};\s*\},/;

const replacement = `queryFn: async ({ medicine_name, composition, page = 1, limit = 5 }) => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            const query = medicine_name || composition || '';
            const result = await (window as any).ipcAPI.invoke('medicine:search', { query });
            const localMeds = result.result || [];
            const mappedData = localMeds.map((med) => ({
              id: med.id,
              medicine_name: med.name,
              manufacturer_name: med.manufacturer || "",
              composition: med.composition || "",
              source: 'local'
            }));
            return { 
              data: { 
                success: true, 
                data: mappedData,
                pagination: { totalRecords: mappedData.length, totalPages: 1, currentPage: 1, pageSize: 50 } 
              } 
            };
          }
          throw new Error('Not supported in web mode');
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log('Patched getMedicineData successfully');
} else {
  console.log('REGEX DID NOT MATCH');
}
