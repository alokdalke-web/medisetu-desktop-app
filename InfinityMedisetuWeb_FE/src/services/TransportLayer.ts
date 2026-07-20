import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface TransportOptions {
  /** The IPC namespace/method to call (e.g., 'patient.search') */
  ipcMethod: string;
  /** Payload for the IPC method */
  ipcPayload?: any;
  
  /** REST configuration for fallback/web build */
  restConfig: AxiosRequestConfig;
}

export class TransportLayer {
  /**
   * Executes a request intelligently routing to IPC if in Electron, 
   * or REST if running in a standard web browser.
   */
  public static async execute<T>(options: TransportOptions): Promise<{ data: T; meta: { source: 'local_sqlite' | 'cloud_rest' } }> {
    
    // Check if we are running inside Electron and the IPC bridge is exposed
    if (typeof window !== 'undefined' && window.ipcAPI) {
      try {
        const [namespace, method] = options.ipcMethod.split('.');
        const apiNamespace = (window.ipcAPI as any)[namespace];
        
        if (!apiNamespace || typeof apiNamespace[method] !== 'function') {
          throw new Error(`IPC Method ${options.ipcMethod} is not exposed on window.ipcAPI`);
        }

        const data = await apiNamespace[method](options.ipcPayload);
        
        return { 
          data, 
          meta: { source: 'local_sqlite' } 
        };
      } catch (error) {
        // We MUST NOT silently fallback to REST if IPC fails. 
        // We throw a structured error so the UI handles it predictably.
        throw new Error(`[IPC Transport Error]: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Fallback: We are running in a standard Web Browser
    try {
      // Base URL should ideally be pulled from your redux config or environment variables
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.infinitymedisetu.com';
      
      const response: AxiosResponse<T> = await axios({
        baseURL,
        ...options.restConfig
      });
      
      return { 
        data: response.data, 
        meta: { source: 'cloud_rest' } 
      };
    } catch (error) {
      throw error;
    }
  }
}
