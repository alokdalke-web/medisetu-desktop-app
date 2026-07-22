import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipcAPI', {
  healthCheck: () => ipcRenderer.invoke('health-check'),
  
  patient: {
    search: (query: string) => ipcRenderer.invoke('patient:search', query),
    getProfile: (id: string) => ipcRenderer.invoke('patient:getProfile', id),
    create: (data: any) => ipcRenderer.invoke('patient:create', data),
    update: (data: any) => ipcRenderer.invoke('patient:update', data),
    getAll: () => ipcRenderer.invoke('patient:getAll'),
    checkMobile: (mobile: string) => ipcRenderer.invoke('patient:checkMobile', mobile),
  },

  appointment: {
    book: (data: any) => ipcRenderer.invoke('appointment:book', data),
    getQueue: (doctorId: string, date: string) => ipcRenderer.invoke('appointment:getQueue', { doctorId, date }),
    getAll: (date?: string) => ipcRenderer.invoke('appointment:getAll', date),
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
  },

  pushSync: {
    getStatus: () => ipcRenderer.invoke('push_sync:status'),
    trigger: () => ipcRenderer.invoke('push_sync:trigger'),
  },

  auth: {
    setCredentials: (credentials: { token: string; userId: string; clinicId?: string }) => 
      ipcRenderer.invoke('auth:setCredentials', credentials),
  },

  users: {
    getAll: (args: any) => ipcRenderer.invoke('users:getAll', args),
    getService: (args: any) => ipcRenderer.invoke('users:getService', args),
  },

  medicine: {
    search: (args: any) => ipcRenderer.invoke('medicine:search', args),
    create: (data: any) => ipcRenderer.invoke('medicine:create', data),
    getAll: () => ipcRenderer.invoke('medicine:getAll'),
  }
});
