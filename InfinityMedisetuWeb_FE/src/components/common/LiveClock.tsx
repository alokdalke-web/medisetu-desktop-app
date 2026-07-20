// src/components/common/LiveClock.tsx
import React, { useEffect, useState } from "react";

const LiveClock: React.FC = () => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const timeString = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "numeric",
    hour12: true,
  });

  const dateString = now.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold">{timeString}</span>
      <span className="text-xs text-gray-500">{dateString}</span>
    </div>
  );
};

export default LiveClock;
