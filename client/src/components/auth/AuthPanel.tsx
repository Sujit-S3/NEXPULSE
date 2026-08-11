import { type ReactNode, useRef, useState } from "react";
import { cn } from "@utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface AuthPanelProps {
  children: ReactNode;
  className?: string;
}

export function AuthPanel({ children, className }: AuthPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(springX, [-0.5, 0.5], ["-3deg", "3deg"]);

  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x - 0.5);
    mouseY.set(y - 0.5);
    spotX.set((e.clientX - rect.left));
    spotY.set((e.clientY - rect.top));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      className={cn("auth-panel", className)}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
    >
      {/* Multi-layer glass stack */}
      <div className="auth-panel-glass-back" aria-hidden="true" />
      <div className="auth-panel-glass-mid" aria-hidden="true" />

      {/* Mouse spotlight */}
      {hovered && (
        <motion.div
          className="auth-panel-spotlight pointer-events-none absolute inset-0 rounded-[inherit] z-0"
          style={{
            background: `radial-gradient(500px circle at ${spotX.get()}px ${spotY.get()}px, rgba(96,165,250,0.08), transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Top highlight */}
      <div className="auth-panel-top-highlight" aria-hidden="true" />

      {/* Bottom reflection */}
      <div className="auth-panel-bottom-reflection" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
