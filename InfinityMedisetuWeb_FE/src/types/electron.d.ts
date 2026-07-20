// src/types/electron.d.ts

export interface IpcAPI {
  healthCheck: () => Promise<any>;
  
  patient: {
    search: (query: string) => Promise<any>;
    getProfile: (id: string) => Promise<any>;
    create: (data: any) => Promise<any>;
    getAll: () => Promise<any>;
  };

  appointment: {
    book: (data: any) => Promise<any>;
    getQueue: (doctorId: string, date: string) => Promise<any>;
    getAll: (date?: string) => Promise<any>;
    getById: (id: string) => Promise<any>;
    getMultipleServices: (id: string) => Promise<any>;
  };

  prescription: {
    create: (data: any) => Promise<any>;
    getByPatient: (patientId: string) => Promise<any>;
  };

  sync: {
    start: () => Promise<any>;
  };

  auth: {
    setCredentials: (credentials: { token: string; userId: string; clinicId?: string }) => Promise<any>;
  };
}

declare global {
  interface Window {
    ipcAPI?: IpcAPI;
  }
}
