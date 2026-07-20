// src/components/common/AppLoader.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../assets/Animated_Icon_Final123.gif";

const loadingMessages = [
  "Loading...",
  "Setting up your workspace...",
  "Preparing your clinic dashboard...",
  "Almost there...",
];

interface AppLoaderProps {
  /**
   * Custom loading message to display
   */
  message?: string;
  /**
   * Whether to show rotating messages
   * Default: true
   */
  rotateMessages?: boolean;
}

const AppLoader: React.FC<AppLoaderProps> = ({ 
  message, 
  rotateMessages = true 
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    setIsVisible(true);

    // Rotate messages every 2 seconds (only if rotateMessages is true and no custom message)
    if (rotateMessages && !message) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [message, rotateMessages]);

  const displayMessage = message || loadingMessages[messageIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md"
          style={{ 
            pointerEvents: "all",
            background: "rgba(249, 251, 252, 0.95)", // Light mode background
          }}
        >
          {/* Dark mode overlay */}
          <div 
            className="absolute inset-0 bg-[#0F172A]/95 opacity-0 dark:opacity-100 transition-opacity duration-300"
            style={{ pointerEvents: "none" }}
          />

          {/* Center content */}
          <div className="relative flex flex-col items-center justify-center gap-6 z-10">
            {/* Logo container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative flex items-center justify-center"
            >
              {/* Subtle glow effect behind logo */}
              <div 
                className="absolute inset-0 blur-3xl rounded-full opacity-20 dark:opacity-30"
                style={{
                  background: "radial-gradient(circle, rgba(10, 108, 116, 0.4) 0%, transparent 70%)",
                  transform: "scale(1.8)",
                }}
              />
              
              {/* Logo with theme-aware styling */}
              <img
                src={logo}
                alt="Loading"
                className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain dark:brightness-110 dark:contrast-110"
                style={{
                  filter: "drop-shadow(0 10px 30px rgba(10, 108, 116, 0.3)) contrast(1.1) brightness(1.05)",
                  mixBlendMode: "screen",
                  WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 100%)",
                }}
              />
            </motion.div>

            {/* Loading message with fade transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={message || messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-white tracking-wide">
                  {displayMessage}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Animated dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary dark:bg-primary-hover"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLoader;

