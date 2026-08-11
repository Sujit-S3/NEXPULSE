import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@utils";
import { motion } from "framer-motion";

export function GlassSkeleton({ className, lines = 0 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("glass-skeleton", className)} role="status" aria-label="Loading">
      {lines > 0 && Array.from({ length: lines }).map((_, index) => (
        <span key={index} style={{ width: `${92 - index * 13}%` }} />
      ))}
    </div>
  );
}

export function StreamingPlaceholder({ label = "NEXPULSE AI is thinking" }: { label?: string }) {
  return (
    <div className="streaming-placeholder" role="status">
      <span className="streaming-orb" />
      <span>{label}</span>
      <i /><i /><i />
    </div>
  );
}

export function BlurReveal({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & Omit<ComponentPropsWithoutRef<typeof motion.div>, "children">) {
  return (
    <motion.div
      className={className}
      {...props}
      initial={{ opacity: 0, filter: "blur(12px)", y: 6 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
