import { motion, AnimatePresence } from 'framer-motion';
import { useConnectivityState, ConnectivityState } from '../../hooks/useConnectivityState';
import { FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import { useState, useEffect, useContext } from 'react';
import { AppLoaderContext } from '../common/AppLoaderContext';

export function OfflineModeBanner() {
  const state = useConnectivityState();
  const isElectron = !!window.ipcAPI;
  const [showBanner, setShowBanner] = useState(false);
  const ctx = useContext(AppLoaderContext);
  const loadingCount = ctx?.loadingCount ?? 0;

  useEffect(() => {
    if (state === 'island' || state === 'lan_sync') {
      setShowBanner(true);
      
      // Only start the dismiss countdown if there are no active API calls blocking the UI
      if (loadingCount === 0) {
        const timer = setTimeout(() => {
          setShowBanner(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setShowBanner(false);
    }
  }, [state, loadingCount]);

  if (!isElectron) {
    return null;
  }

  const getBannerContent = (state: ConnectivityState) => {
    if (state === 'lan_sync') {
      return {
        text: 'Working offline — syncing with clinic network.',
        containerClass: 'bg-amber-500/30 dark:bg-amber-600/30 text-amber-900 dark:text-amber-50 border-amber-500/30 backdrop-blur-2xl',
        icon: <FiRefreshCw className="w-5 h-5 animate-spin" />
      };
    }
    if (state === 'island') {
      return {
        text: 'Offline — no other devices detected. Some features are limited.',
        containerClass: 'bg-red-500/30 dark:bg-red-600/30 text-red-900 dark:text-red-50 border-red-500/30 backdrop-blur-2xl',
        icon: <FiWifiOff className="w-5 h-5" />
      };
    }
    return null;
  };

  const content = showBanner ? getBannerContent(state) : null;

  return (
    <AnimatePresence>
      {content && (
        <motion.div
          key="offline-banner"
          initial={{ y: -50, opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -50, opacity: 0, filter: 'blur(8px)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex justify-center pointer-events-none"
        >
          <motion.div
            key={state}
            initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.1 }}
            className={`px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 pointer-events-auto backdrop-blur-md border border-white/20 ${content.containerClass}`}
          >
            {content.icon}
            <span className="font-semibold tracking-wide text-sm drop-shadow-sm">{content.text}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
