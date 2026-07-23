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
    markAsNoShow: (args: { appointmentId: string; reason?: string }) => Promise<any>;
    getClinicNoShowAnalytics: (args: { startDate?: string, endDate?: string, search?: string }) => Promise<any>;
  };

  prescription: {
    create: (data: any) => Promise<any>;
    getByPatient: (patientId: string) => Promise<any>;
  };

  sync: {
    start: () => Promise<any>;
    getStatus: () => Promise<{ state: string }>;
    onStateChange: (callback: (state: string) => void) => () => void;
    onPushProgress: (callback: (data: {
      isOnline: boolean;
      isSyncing: boolean;
      pendingCount: number;
      currentAction: string;
    }) => void) => () => void;
  };

  pushSync: {
    getStatus: () => Promise<{
      isOnline: boolean;
      isSyncing: boolean;
      pendingCount: number;
      failedCount: number;
      hasAuthToken: boolean;
    }>;
    trigger: () => Promise<void>;
  };

  connectivity: {
    getState: () => Promise<'online' | 'lan_sync' | 'island'>;
    onStateChange: (callback: (state: 'online' | 'lan_sync' | 'island') => void) => () => void;
  };

  cluster: {
    getPeers: () => Promise<any[]>;
  };

  auth: {
    setCredentials: (credentials: { token: string; userId: string; clinicId?: string }) => Promise<any>;
  };

  dashboard: {
    getDoctorDashboard: (args: any) => Promise<any>;
    getRevenueOverview: (args: any) => Promise<any>;
    getTodayOverview: (args: any) => Promise<any>;
    getPaymentTransactions: (args: any) => Promise<any>;
  };
}

declare global {
  interface Window {
    ipcAPI?: IpcAPI;
  }
}
