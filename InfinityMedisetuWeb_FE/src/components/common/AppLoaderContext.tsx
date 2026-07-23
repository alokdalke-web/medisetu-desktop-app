import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import AppLoader from "./AppLoader";

interface AppLoaderContextProps {
  // Increment loading count (e.g., when a query starts)
  startLoading: () => void;
  // Decrement loading count (e.g., when a query finishes)
  stopLoading: () => void;
  // Current active loading count
  loadingCount: number;
}

export const AppLoaderContext = createContext<AppLoaderContextProps | undefined>(undefined);

export const AppLoaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = () => setLoadingCount((c) => c + 1);
  const stopLoading = () => setLoadingCount((c) => Math.max(c - 1, 0));

  return (
    <AppLoaderContext.Provider value={{ startLoading, stopLoading, loadingCount }}>
      {children}
      {loadingCount > 0 && <AppLoader />}
    </AppLoaderContext.Provider>
  );
};

export const useAppLoader = (isLoading: boolean) => {
  const ctx = useContext(AppLoaderContext);
  if (!ctx) {
    throw new Error("useAppLoader must be used within AppLoaderProvider");
  }
  const { startLoading, stopLoading } = ctx;

  useEffect(() => {
    if (isLoading) {
      startLoading();
    } else {
      stopLoading();
    }
    // cleanup in case component unmounts while loading
    return () => {
      if (isLoading) {
        stopLoading();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);
};
