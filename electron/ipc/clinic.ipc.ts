import { ipcMain } from 'electron';
import logger from '../utils/logger.js';
import ClinicSecret from '../src/main/cluster/ClinicSecret.js';
import DiscoveryService from '../src/main/cluster/DiscoveryService.js';
import { AuthStore } from '../src/main/configurations/AuthStore.js';
import { clinicSymptomAppService } from '../src/main/clinic/application/ClinicSymptomAppService.js';

export function registerClinicHandlers() {
  ipcMain.handle('doctor:getClinicSymptoms', async (_event, search: string) => {
    try {
      logger.info(`[IPC] Handling doctor:getClinicSymptoms`);
      return clinicSymptomAppService.getClinicSymptoms(search);
    } catch (error) {
      logger.error('[IPC] Error in doctor:getClinicSymptoms:', error);
      throw error;
    }
  });

  ipcMain.handle('doctor:createClinicSymptom', async (_event, data: any) => {
    try {
      logger.info(`[IPC] Handling doctor:createClinicSymptom`);
      return clinicSymptomAppService.createClinicSymptom(data);
    } catch (error) {
      logger.error('[IPC] Error in doctor:createClinicSymptom:', error);
      throw error;
    }
  });

  ipcMain.handle('clinic:generatePairingCode', async () => {
    try {
      logger.info(`[IPC] Handling clinic:generatePairingCode`);
      
      // FIXME: Gap in role enforcement. The main process currently lacks role tracking.
      // We know the userId from AuthStore, but not the role. For a real secure app,
      // we must fetch the user's role from the local DB or cloud and verify they are an Admin.
      const userId = AuthStore.getUserId();
      if (!userId) {
        throw new Error('Unauthorized: No user session found');
      }
      
      // We will assume admin for now, but this gap must be filled.
      // const userRole = ... (fetch from DB)
      // if (userRole !== 'Admin') throw new Error('Forbidden: Admin access required');

      const data = ClinicSecret.generatePairingCode();
      return data;
    } catch (error) {
      logger.error('[IPC] Error in clinic:generatePairingCode:', error);
      throw error;
    }
  });

  ipcMain.handle('clinic:pairWithCode', async (_event, code: string) => {
    return new Promise((resolve) => {
      logger.info(`[IPC] Handling clinic:pairWithCode`);
      
      const onResponse = (response: any) => {
        if (response.success && response.secret) {
          ClinicSecret.saveReceivedSecret(response.secret);
          DiscoveryService.removePairingResponseListener(onResponse);
          resolve({ success: true });
        } else if (!response.success) {
          DiscoveryService.removePairingResponseListener(onResponse);
          resolve({ success: false, error: 'Invalid or expired code — ask your clinic admin to generate a new one.' });
        }
      };
      
      DiscoveryService.onPairingResponse(onResponse);
      
      DiscoveryService.broadcastPairingRequest(code, 5000);

      setTimeout(() => {
        DiscoveryService.removePairingResponseListener(onResponse);
        resolve({ success: false, error: 'Connection timed out. No clinic network responded.' });
      }, 30000);
    });
  });

  ipcMain.handle('clinic:setupNewClinic', async () => {
    try {
      logger.info(`[IPC] Handling clinic:setupNewClinic`);
      
      if (ClinicSecret.getClinicSecret() !== null) {
        throw new Error('Clinic secret already exists.');
      }
      // Proceed to generate a new clinic secret for this machine.
      // We no longer block this based on getActivePeers() because the user
      // explicitly clicked the setup button after a timeout, and any detected
      // peers might belong to a completely different (or older) clinic network on the same LAN.

      ClinicSecret.generateClinicSecret();
      return { success: true };
    } catch (error) {
      logger.error('[IPC] Error in clinic:setupNewClinic:', error);
      throw error;
    }
  });
}
