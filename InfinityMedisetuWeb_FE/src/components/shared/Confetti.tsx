import React, { useEffect, useState } from "react";

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
}

const COLORS = ["#0A6C74", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4", "#EF4444", "#84CC16"];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
  type: "circle" | "rect" | "ribbon";
}

const Confetti: React.FC<ConfettiProps> = ({ isActive, duration = 8000 }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setVisible(false);
      return;
    }

    // Generate particles
    const newParticles: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 1.6,
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      type: (["circle", "rect", "ribbon"] as const)[Math.floor(Math.random() * 3)],
    }));

    setParticles(newParticles);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration]);

  if (!visible || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: "-20px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${4 + Math.random() * 4}s`,
          }}
        >
          {p.type === "circle" && (
            <div
              className="rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          )}
          {p.type === "rect" && (
            <div
              style={{
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg)`,
                borderRadius: 2,
              }}
            />
          )}
          {p.type === "ribbon" && (
            <div
              style={{
                width: p.size * 0.4,
                height: p.size * 2,
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg)`,
                borderRadius: 2,
              }}
            />
          )}
        </div>
      ))}

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Confetti;
