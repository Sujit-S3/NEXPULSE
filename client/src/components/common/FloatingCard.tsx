import { type ReactNode, useRef } from "react";
import { cn } from "@utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface FloatingCardProps {
  children: ReactNode;
  className?: string;
  depth?: number;
  rotate?: number;
}

export function FloatingCard({
  children,
  className,
  depth: _depth = 10,
  rotate = 5,
}: FloatingCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [rotate, -rotate]), {
    stiffness: 120,
    damping: 14,
  });
  const rotateY = useSpring(useTransform(x, [0, 1], [-rotate, rotate]), {
    stiffness: 120,
    damping: 14,
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
