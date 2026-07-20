const fs = require('fs');
const file = './src/redux/api/medicineApi.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace searchMedicineAll
content = content.replace(
  /searchMedicineAll: builder\.query<any, SearchMedicineAllArgs>\(\{\s*query: \(\{ q, city = "Indore", per_page = 10, search_term, url \}\) => \{[\s\S]*?\},(?=\s*transformResponse|\s*providesTags)/,
  `searchMedicineAll: builder.query<any, SearchMedicineAllArgs>({
      queryFn: async ({ q, city, per_page, search_term, url }) => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            const result = await (window as any).ipcAPI.invoke('medicine:search', { query: q || search_term || '' });
            return { data: { success: true, data: result.result || [] } };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },`
);

// Replace getMedicines
content = content.replace(
  /getMedicines: builder\.query<GetMedicinesResponse, \{ q\?: string; isActive\?: boolean \} \| void>\(\{\s*query: \(arg\) => \{[\s\S]*?\},(?=\s*transformResponse|\s*providesTags)/,
  `getMedicines: builder.query<GetMedicinesResponse, { q?: string; isActive?: boolean } | void>({
      queryFn: async () => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
             const result = await (window as any).ipcAPI.invoke('medicine:getAll', {});
             return { data: { success: true, data: result.result?.medicines || [] } };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },`
);

// Replace createMedicine
content = content.replace(
  /createMedicine: builder\.mutation<CreateMedicineResponse, CreateMedicineRequest>\(\{\s*query: \(body\) => \(\{[\s\S]*?\}\),(?=\s*invalidatesTags)/,
  `createMedicine: builder.mutation<CreateMedicineResponse, CreateMedicineRequest>({
      queryFn: async (body) => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
             const result = await (window as any).ipcAPI.invoke('medicine:create', body);
             return { data: result };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },`
);

fs.writeFileSync(file, content);
console.log('Patched medicineApi.ts');
