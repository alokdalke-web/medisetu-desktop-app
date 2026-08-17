import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipcAPI', {
  appMenu: {
    showMenu: (x: number, y: number) => ipcRenderer.invoke('app:showMenu', { x, y }),
    onAction: (callback: (action: string) => void) => {
      const listener = (_event: any, action: string) => callback(action);
      ipcRenderer.on('menu:action', listener);
      return () => {
        ipcRenderer.removeListener('menu:action', listener);
      };
    }
  },
  healthCheck: () => ipcRenderer.invoke('health-check'),
  
  patient: {
    search: (query: string) => ipcRenderer.invoke('patient:search', query),
    getProfile: (id: string) => ipcRenderer.invoke('patient:getProfile', id),
    create: (data: any) => ipcRenderer.invoke('patient:create', data),
    update: (data: any) => ipcRenderer.invoke('patient:update', data),
    getAll: (args?: any) => ipcRenderer.invoke('patient:getAll', args),
    checkMobile: (mobile: string) => ipcRenderer.invoke('patient:checkMobile', mobile),
    getReportCards: (args: any) => ipcRenderer.invoke('patient:getReportCards', args),
  },


  appointment: {
    book: (args: any) => ipcRenderer.invoke('appointment:book', args),
    getQueue: (doctorId: string, date: string) => ipcRenderer.invoke('appointment:getQueue', { doctorId, date }),
    getAll: (args?: any) => ipcRenderer.invoke('appointment:getAll', args),
    getById: (id: string) => ipcRenderer.invoke('appointment:getById', id),
    getMultipleServices: (id: string) => ipcRenderer.invoke('appointment:getMultipleServices', id),
    getAllUser: (args: any) => ipcRenderer.invoke('appointment:getAllUser', args),
    getDetails: (date: string) => ipcRenderer.invoke('appointment:getDetails', date),
    getAvailableSlots: (args: any) => ipcRenderer.invoke('appointment:getAvailableSlots', args),
    update: (args: any) => ipcRenderer.invoke('appointment:update', args),
    getQueueState: (args: any) => ipcRenderer.invoke('appointment:getQueueState', args),
    markAsNoShow: (args: any) => ipcRenderer.invoke('appointment:markAsNoShow', args),
    getClinicNoShowAnalytics: (args: any) => ipcRenderer.invoke('appointment:getClinicNoShowAnalytics', args),
    addMultipleServices: (args: any) => ipcRenderer.invoke('appointment:addMultipleServices', args),
    getReports: (appointmentId: string) => ipcRenderer.invoke('appointment:getReports', appointmentId),
    getConflicts: () => ipcRenderer.invoke('appointment:getConflicts'),
    resolveConflict: (args: any) => ipcRenderer.invoke('appointment:resolveConflict', args),
    getConflictCount: () => ipcRenderer.invoke('appointment:getConflictCount'),
  },

  report: {
    createCard: (args: any) => ipcRenderer.invoke('report:createCard', args),
    updateCard: (args: any) => ipcRenderer.invoke('report:updateCard', args),
  },

  dashboard: {
    getDoctorDashboard: (args: any) => ipcRenderer.invoke('dashboard:getDoctorDashboard', args),
    getRevenueOverview: (args: any) => ipcRenderer.invoke('dashboard:getRevenueOverview', args),
    getTodayOverview: (args: any) => ipcRenderer.invoke('dashboard:getTodayOverview', args),
    getPaymentTransactions: (args: any) => ipcRenderer.invoke('dashboard:getPaymentTransactions', args),
  },

  prescription: {
    create: (data: any) => ipcRenderer.invoke('prescription:create', data),
    getByPatient: (patientId: string) => ipcRenderer.invoke('prescription:getByPatient', patientId),
    getByAppointment: (appointmentId: string) => ipcRenderer.invoke('prescription:getByAppointment', appointmentId),
    update: (args: any) => ipcRenderer.invoke('prescription:update', args),
  },

  sync: {
    start: () => ipcRenderer.invoke('sync:start'),
    getStatus: () => ipcRenderer.invoke('sync:status'),
    onStateChange: (callback: (state: string) => void) => {
      const listener = (_event: any, data: any) => callback(data.state);
      ipcRenderer.on('sync:state_change', listener);
      return () => {
        ipcRenderer.removeListener('sync:state_change', listener);
      };
    },
    onPushProgress: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on('push_sync:progress', listener);
      return () => {
        ipcRenderer.removeListener('push_sync:progress', listener);
      };
    },
    getEntityStatus: (id: string) => ipcRenderer.invoke('push_sync:getEntityStatus', id),
    retryEvent: (id: string) => ipcRenderer.invoke('push_sync:retryEvent', id)
  },

  pushSync: {
    getStatus: () => ipcRenderer.invoke('push_sync:status'),
    trigger: () => ipcRenderer.invoke('push_sync:trigger'),
  },

  connectivity: {
    getState: () => ipcRenderer.invoke('connectivity:getState'),
    onStateChange: (callback: (state: string) => void) => {
      const listener = (_event: any, state: string) => callback(state);
      ipcRenderer.on('connectivity:state_change', listener);
      return () => {
        ipcRenderer.removeListener('connectivity:state_change', listener);
      };
    }
  },

  cluster: {
    getPeers: () => ipcRenderer.invoke('cluster:getPeers'),
  },

  election: {
    getStatus: () => ipcRenderer.invoke('election:getStatus'),
  },

  auth: {
    setCredentials: (credentials: { token: string; userId: string; clinicId?: string }) => 
      ipcRenderer.invoke('auth:setCredentials', credentials),
    googleLogin: (clientId: string) => ipcRenderer.invoke('auth:googleLogin', clientId),
  },

  users: {
    getAll: (args: any) => ipcRenderer.invoke('users:getAll', args),
    getService: (args: any) => ipcRenderer.invoke('users:getService', args),
  },

  medicine: {
    search: (args: any) => ipcRenderer.invoke('medicine:search', args),
    create: (data: any) => ipcRenderer.invoke('medicine:create', data),
    getAll: () => ipcRenderer.invoke('medicine:getAll'),
    toggleFavorite: (id: string) => ipcRenderer.invoke('medicine:toggleFavorite', id),
  },

  config: {
    getBackendUrl: () => ipcRenderer.invoke('config:getBackendUrl'),
    setBackendUrl: (url: string) => ipcRenderer.invoke('config:setBackendUrl', url)
  }
});
