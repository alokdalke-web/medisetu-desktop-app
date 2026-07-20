const fs = require('fs');
const file = './src/redux/api/prescriptionApi.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace getDoctorPrescriptionType
content = content.replace(
  /getDoctorPrescriptionType: b\.query<DoctorPrescriptionTypeResponse, void>\(\{\s*query: \(\) => \(\{[\s\S]*?\}\),\s*transformResponse: normalizeDoctorPrescriptionTypeResponse,\s*providesTags: \["DoctorPrescriptionType"\],\s*\}\),/,
  `getDoctorPrescriptionType: b.query<DoctorPrescriptionTypeResponse, void>({
      queryFn: async () => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            // Offline default
            return { data: { success: true, prescriptionType: 'Manual' } };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["DoctorPrescriptionType"],
    }),`
);

// Replace setDoctorPrescriptionType
content = content.replace(
  /setDoctorPrescriptionType: b\.mutation<\s*DoctorPrescriptionTypeResponse,\s*void\s*>\(\{\s*query: \(\) => \(\{[\s\S]*?\}\),\s*transformResponse: normalizeDoctorPrescriptionTypeResponse,\s*invalidatesTags: \["DoctorPrescriptionType"\],\s*\}\),/,
  `setDoctorPrescriptionType: b.mutation<DoctorPrescriptionTypeResponse, void>({
      queryFn: async () => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            return { data: { success: true, prescriptionType: 'Manual' } };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ["DoctorPrescriptionType"],
    }),`
);

fs.writeFileSync(file, content);
console.log('Patched prescriptionApi.ts');
