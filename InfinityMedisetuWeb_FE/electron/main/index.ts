import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import DatabaseManager from '../database/DatabaseManager.js';
import { setupIPC } from '../ipc/index.js';
import { registerPatientIpcHandlers } from '../ipc/patient.ipc.js';
import { registerAppointmentIpcHandlers } from '../ipc/appointment.ipc.js';
import { registerPrescriptionIpcHandlers } from '../ipc/prescription.ipc.js';
import { registerSyncIpcHandlers } from '../ipc/sync.ipc.js';
import { registerAuthIpcHandlers } from '../ipc/auth.ipc.js';
import { registerDashboardIpcHandlers } from '../ipc/dashboard.ipc.js';
import { registerUsersIpcHandlers } from '../ipc/users.ipc.js';
import { registerReportHandlers } from '../ipc/report.ipc.js';
import { registerMedicineIpcHandlers } from '../ipc/medicine.ipc.js';
import { PushSyncEngine } from '../src/main/sync/SyncEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (config.isDev) {
    // Load Vite dev server URL
    const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/app/';
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    // Load built index.html
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    logger.info('Electron App is ready.');
    try {
      // Initialize Database
      DatabaseManager.initialize();
      logger.info('Database initialized successfully.');

      // Setup IPC
      setupIPC();
      registerPatientIpcHandlers();
      registerAppointmentIpcHandlers();
      registerPrescriptionIpcHandlers();
      registerSyncIpcHandlers();
      registerAuthIpcHandlers();
      registerDashboardIpcHandlers();
      registerUsersIpcHandlers();
      registerReportHandlers();
      registerMedicineIpcHandlers();

      // Start Background Sync Worker
      PushSyncEngine.getInstance().start();

      createWindow();
    } catch (error) {
      logger.error('Failed during app initialization:', error);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.on('before-quit', () => {
  DatabaseManager.close();
  logger.info('Application gracefully shutting down.');
});
