export const getBackendUrlSync = (): string => {
  // If in web mode (or electron but with localStorage), check localStorage first
  if (typeof window !== "undefined" && window.localStorage) {
    const storedUrl = window.localStorage.getItem("API_BASE_URL");
    if (storedUrl) return storedUrl;
  }
  
  // Fallback to environment variable
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
};

export const getBackendUrlAsync = async (): Promise<string> => {
  if (typeof window !== "undefined" && (window as any).ipcAPI) {
    try {
      const electronUrl = await (window as any).ipcAPI.config.getBackendUrl();
      if (electronUrl) return electronUrl;
    } catch (e) {
      console.warn("Failed to get backend URL from IPC:", e);
    }
  }
  return getBackendUrlSync();
};

export const setBackendUrl = async (url: string): Promise<void> => {
  if (typeof window !== "undefined" && (window as any).ipcAPI) {
    try {
      await (window as any).ipcAPI.config.setBackendUrl(url);
    } catch (e) {
      console.error("Failed to set backend URL via IPC:", e);
    }
  }
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("API_BASE_URL", url);
  }
};
