import { ipcMain, Menu, BrowserWindow } from 'electron';
import logger from '../utils/logger.js';

export function registerMenuIpcHandlers() {
  ipcMain.handle('app:showMenu', (event, { x, y }) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return;

      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: 'File',
          submenu: [
            {
              label: 'New Patient',
              accelerator: 'CmdOrCtrl+N',
              click: () => event.sender.send('menu:action', 'file:new-patient'),
            },
            {
              label: 'New Appointment',
              accelerator: 'CmdOrCtrl+Shift+N',
              click: () => event.sender.send('menu:action', 'file:new-appointment'),
            },
            { type: 'separator' },
            {
              label: 'Backup Data Now',
              click: () => event.sender.send('menu:action', 'file:backup'),
            },
            {
              label: 'Import Data',
              click: () => event.sender.send('menu:action', 'file:import'),
            },
            { type: 'separator' },
            {
              label: 'Print...',
              click: () => event.sender.send('menu:action', 'file:print'),
            },
            { type: 'separator' },
            {
              label: 'Settings',
              accelerator: 'CmdOrCtrl+,',
              click: () => event.sender.send('menu:action', 'file:settings'),
            },
            { type: 'separator' },
            { 
              label: 'Reload',
              role: 'reload',
              accelerator: 'CmdOrCtrl+R' 
            },
            { 
              label: 'Force Reload',
              role: 'forceReload',
              accelerator: 'CmdOrCtrl+Shift+R' 
            },
            { type: 'separator' },
            {
              label: 'Exit',
              role: 'quit',
            }
          ]
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { type: 'separator' },
            {
              label: 'Find Patient',
              accelerator: 'CmdOrCtrl+F',
              click: () => event.sender.send('menu:action', 'edit:find-patient'),
            }
          ]
        },
        {
          label: 'View',
          submenu: [
            {
              label: 'Toggle Sidebar',
              accelerator: 'CmdOrCtrl+B',
              click: () => event.sender.send('menu:action', 'view:toggle-sidebar'),
            },
            {
              label: 'Toggle Theme',
              click: () => event.sender.send('menu:action', 'view:toggle-theme'),
            },
            { type: 'separator' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { role: 'resetZoom' },
            { role: 'reload', accelerator: 'CmdOrCtrl+R' },
            { type: 'separator' },
            {
              label: 'Documentation',
              click: () => event.sender.send('menu:action', 'view:docs'),
            },
            { type: 'separator' },
            { role: 'toggleDevTools' }
          ]
        },
        {
          label: 'Clinic',
          submenu: [
            {
              label: 'Pair a Device...',
              click: () => event.sender.send('menu:action', 'clinic:pair'),
            },
            {
              label: 'Sync Now',
              click: () => event.sender.send('menu:action', 'clinic:sync-now'),
            },
            { type: 'separator' },
            {
              label: 'Connected Devices...',
              click: () => event.sender.send('menu:action', 'clinic:devices'),
            },
            {
              label: 'Sync Details...',
              click: () => event.sender.send('menu:action', 'clinic:sync-details'),
            }
          ]
        },
        {
          label: 'Help',
          submenu: [
            {
              label: 'Keyboard Shortcuts',
              click: () => event.sender.send('menu:action', 'help:shortcuts'),
            },
            {
              label: 'Check for Updates',
              click: () => event.sender.send('menu:action', 'help:updates'),
            },
            { type: 'separator' },
            {
              label: 'Report an Issue',
              click: () => event.sender.send('menu:action', 'help:report'),
            },
            {
              label: 'Contact Support',
              click: () => event.sender.send('menu:action', 'help:support'),
            },
            { type: 'separator' },
            {
              label: 'About MediSetu',
              click: () => event.sender.send('menu:action', 'help:about'),
            }
          ]
        }
      ];

      const menu = Menu.buildFromTemplate(template);
      menu.popup({
        window,
        x: Math.round(x),
        y: Math.round(y)
      });
    } catch (error) {
      logger.error('Failed to show app menu:', error);
    }
  });
}
