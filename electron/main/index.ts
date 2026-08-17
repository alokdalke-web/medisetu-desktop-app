import dotenv from 'dotenv';
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import logger from '../utils/logger.js';
import config from '../config/index.js';

import DatabaseManager from '../database/DatabaseManager.js';
import { setupIPC } from '../ipc/index.js';
import { registerPatientIpcHandlers } from '../ipc/patient.ipc.js';
import { registerAppointmentIpcHandlers } from '../ipc/appointment.ipc.js';
import { registerTemplateHandlers } from '../ipc/template.ipc.js';
import { registerPrescriptionIpcHandlers } from '../ipc/prescription.ipc.js';
import { registerSyncIpcHandlers } from '../ipc/sync.ipc.js';
import { registerAuthIpcHandlers } from '../ipc/auth.ipc.js';
import { registerDashboardIpcHandlers } from '../ipc/dashboard.ipc.js';
import { registerUsersIpcHandlers } from '../ipc/users.ipc.js';
import { registerReportHandlers } from '../ipc/report.ipc.js';
import { registerMedicineIpcHandlers } from '../ipc/medicine.ipc.js';
import { registerClinicHandlers } from '../ipc/clinic.ipc.js';
import { registerConnectivityIpcHandlers } from '../ipc/connectivity.ipc.js';
import { registerElectionIpcHandlers } from '../ipc/election.ipc.js';
import { registerConfigIPC } from '../ipc/config.ipc.js';
import { registerMenuIpcHandlers } from '../ipc/menu.ipc.js';

import { PushSyncEngine } from '../src/main/sync/SyncEngine.js';
import NodeIdentity from '../src/main/cluster/NodeIdentity.js';
import DiscoveryService from '../src/main/cluster/DiscoveryService.js';
import HostElectionService from '../src/main/cluster/HostElectionService.js';
import SyncServer from '../src/main/cluster/SyncServer.js';
import SyncClient from '../src/main/cluster/SyncClient.js';
import ConnectivityStateService from '../src/main/connectivity/ConnectivityStateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1200,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#333333',
      height: 48
    },
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    mainWindow.webContents.openDevTools();
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

  if (config.isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
  }

  app.whenReady().then(async () => {
    logger.info('Electron App is ready.');
    try {
      // Initialize Database
      DatabaseManager.initialize();
      logger.info('Database initialized successfully.');

      import('electron').then(({ Menu }) => {
        Menu.setApplicationMenu(null);
      });

      // Initialize Node Identity
      NodeIdentity.initialize();

      // Start P2P UDP Discovery Service
      DiscoveryService.start();
      HostElectionService.start();

      // Start P2P HTTP Replication Services
      SyncServer.start();
      SyncClient.start();

      // Setup IPC
      setupIPC();
      registerPatientIpcHandlers();
      registerAppointmentIpcHandlers();
      registerTemplateHandlers();
      registerPrescriptionIpcHandlers();
      registerSyncIpcHandlers();
      registerAuthIpcHandlers();
      registerDashboardIpcHandlers();
      registerUsersIpcHandlers();
      registerReportHandlers();
      registerMedicineIpcHandlers();
      registerClinicHandlers();
      registerConnectivityIpcHandlers();
      registerElectionIpcHandlers();
      registerConfigIPC();
      registerMenuIpcHandlers();

      // Start Background Sync Worker
      PushSyncEngine.getInstance().start();
      ConnectivityStateService.start();

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
  ConnectivityStateService.stop();
  SyncClient.stop();
  SyncServer.stop();
  HostElectionService.stop();
  DiscoveryService.stop();
  DatabaseManager.close();
  logger.info('Application gracefully shutting down.');
});
