import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullUpdateLogo from '../../assets/Full_Update_Logo.mp4';

interface FullScreenVideoLoaderProps {
  show: boolean;
}

const loadingMessages = [
  "Loading your experience...",
  "Setting things up...",
  "Preparing Infinity Medisetu...",
  "Almost ready...",
];

const FullScreenVideoLoader: React.FC<FullScreenVideoLoaderProps> = ({ show }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!show) return;

    // Rotate messages every 2.5 seconds
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-xl"
          style={{ pointerEvents: "all" }}
          data-testid="fullscreen-video-loader"
        >
          {/* Video container with subtle animation */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex items-center justify-center"
          >
            {/* Glow effect behind video */}
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
            
            {/* Video */}
            <video
              src={FullUpdateLogo}
              autoPlay
              muted
              loop
              playsInline
              className="relative w-[70vw] sm:w-[60vw] md:w-[50vw] lg:w-[40vw] max-w-2xl h-auto object-contain drop-shadow-2xl"
            />
          </motion.div>

          {/* Loading message with fade transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-8 text-center"
            >
              <p className="text-base sm:text-lg md:text-xl font-semibold text-white dark:text-slate-100 tracking-wide">
                {loadingMessages[messageIndex]}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Animated loading bar */}
          <motion.div
            className="mt-6 w-48 h-1 bg-slate-700/30 dark:bg-slate-600/30 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-primary-hover to-secondary rounded-full"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Animated dots */}
          <div className="flex gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-white/70 dark:bg-slate-300 rounded-full"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullScreenVideoLoader;
