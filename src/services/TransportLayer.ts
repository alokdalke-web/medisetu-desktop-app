import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthToken } from '../utils/auth';
import { getBackendUrlAsync } from '../utils/config';


interface TransportOptions {
  /** The IPC namespace/method to call (e.g., 'patient.search') */
  ipcMethod: string;
  /** Payload for the IPC method */
  ipcPayload?: any;
  
  /** REST configuration for fallback/web build */
  restConfig: AxiosRequestConfig;
  /** If true, attempts REST even in Electron, falling back to IPC on failure */
  preferCloud?: boolean;
  /** If true, attempts REST even in Electron, and throws error on failure (no fallback) */
  cloudOnly?: boolean;
}

export class TransportLayer {
  /**
   * Executes a request intelligently routing to IPC if in Electron, 
   * or REST if running in a standard web browser.
   */
  public static async execute<T>(options: TransportOptions): Promise<{ data: T; meta: { source: 'local_sqlite' | 'cloud_rest' } }> {
    
    // Check if we are running inside Electron and the IPC bridge is exposed
    const isElectron = typeof window !== 'undefined' && window.ipcAPI;

    // Helper to execute IPC
    const executeIpc = async () => {
      if (!isElectron) throw new Error("IPC not available");
      const [namespace, method] = options.ipcMethod.split('.');
      const apiNamespace = (window.ipcAPI as any)[namespace];
      
      if (!apiNamespace || typeof apiNamespace[method] !== 'function') {
        throw new Error(`IPC Method ${options.ipcMethod} is not exposed on window.ipcAPI`);
      }
      const data = await apiNamespace[method](options.ipcPayload);
      return { data, meta: { source: 'local_sqlite' as const } };
    };

    // Helper to execute REST
    const executeRest = async () => {
      // In Electron, fail fast if we know the cloud is unreachable
      if (isElectron && (window as any).ipcAPI?.connectivity) {
        try {
          const state = await (window as any).ipcAPI.connectivity.getState();
          if (state !== 'online') {
            throw new Error('Cloud connection unavailable in offline mode.');
          }
        } catch (e) {
          console.warn('Failed to check connectivity state:', e);
        }
      }

      let baseURL = await getBackendUrlAsync();
      
      // Fallback: If URL doesn't have /api/v1, append it for safety (assuming standard layout)
      if (!baseURL.endsWith('/api/v1')) {
        baseURL = `${baseURL.replace(/\/+$/, '')}/api/v1`;
      }

      const token = getAuthToken();
      const headers: Record<string, string> = { ...options.restConfig.headers } as Record<string, string>;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response: AxiosResponse<T> = await axios({
        baseURL,
        timeout: 5000, // 5 second timeout so UI doesn't hang
        ...options.restConfig,
        headers
      });
      return { data: response.data, meta: { source: 'cloud_rest' as const } };
    };

    if (isElectron) {
      if (options.cloudOnly) {
        return await executeRest();
      } else if (options.preferCloud) {
        try {
          return await executeRest();
        } catch (error) {
          // Fallback to IPC
          return await executeIpc();
        }
      } else {
        try {
          return await executeIpc();
        } catch (error) {
          throw new Error(`[IPC Transport Error]: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Fallback: We are running in a standard Web Browser
    return await executeRest();
  }
}
