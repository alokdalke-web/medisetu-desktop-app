// src/components/common/FullscreenToggle.tsx
import React, { useEffect, useState } from "react";

const FullscreenToggle: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      try {
        await elem.requestFullscreen();
      } catch (e) {
        console.error("Failed to enter fullscreen", e);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (e) {
        console.error("Failed to exit fullscreen", e);
      }
    }
  };

  const Icon = () => (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isFullscreen ? (
        <path d="M9 5H5a2 2 0 0 0-2 2v4M15 5h4a2 2 0 0 1 2 2v4M9 19H5a2 2 0 0 1-2-2v-4M15 19h4a2 2 0 0 0 2-2v-4" />
      ) : (
        <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
      )}
    </svg>
  );

  return (
    <button
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className="p-2 rounded hover:bg-slate-100 transition-colors cursor-pointer"
    >
      <Icon />
    </button>
  );
};

export default FullscreenToggle;
