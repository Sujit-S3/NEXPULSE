import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface SphereConfig {
  id: number;
  size: number;
  top: string;
  left: string;
  delay: number;
  duration: number;
}

const spheres: SphereConfig[] = [
  { id: 1, size: 190, top: "14%", left: "19%", delay: 0, duration: 26 },
  { id: 2, size: 132, top: "66%", left: "82%", delay: 2, duration: 32 },
  { id: 3, size: 86, top: "80%", left: "24%", delay: 5, duration: 29 },
  { id: 4, size: 112, top: "24%", left: "88%", delay: 3, duration: 34 },
];

export function MotionSystem() {
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      <motion.div
        animate={{
          opacity: [0.15, 0.25, 0.15],
          x: ["-10%", "10%", "-10%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="nexpulse-ambient-sweep absolute -top-1/4 -left-1/4 h-[150%] w-[150%] rotate-12 blur-[120px]"
      />

      {spheres.map((sphere, idx) => {
        const factor = (idx % 2 === 0 ? 1 : -1) * ((idx + 1) * 0.4);
        return (
          <motion.div
            key={sphere.id}
            animate={{
              x: mousePos.x * factor,
              y: mousePos.y * factor,
              scale: [1, 1.04, 1],
            }}
            transition={{
              x: { type: "spring", stiffness: 25, damping: 15 },
              y: { type: "spring", stiffness: 25, damping: 15 },
              scale: { duration: sphere.duration, repeat: Infinity, ease: "easeInOut", delay: sphere.delay },
            }}
            style={{
              width: sphere.size,
              height: sphere.size,
              top: sphere.top,
              left: sphere.left,
            }}
            className={`nexpulse-ambient-sphere sphere-${sphere.id} absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-1000`}
          />
        );
      })}
    </div>
  );
}
