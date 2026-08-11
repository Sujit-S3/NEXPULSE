import { type ElementType, type ReactNode, useRef, useState, useMemo, type MouseEvent } from "react";
import { cn } from "@utils";
import { motion, useReducedMotion } from "framer-motion";
import { glassBase } from "./utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  as?: ElementType;
  spotlight?: boolean;
  glow?: boolean;
  gradient?: boolean;
  variant?: "default" | "elevated" | "accent" | "interactive" | "glow" | "gradient" | "hero";
  size?: "none" | "sm" | "md" | "lg";
}

const variantStyles: Record<string, string> = {
  default: "bg-[var(--color-glass)] border-[var(--color-glass-border)]",
  elevated: "bg-[var(--color-bg-elevated)] border-[var(--color-border-strong)] shadow-[var(--shadow-md)]",
  accent: "bg-[var(--color-accent-muted)] border-[var(--color-accent)]/30 shadow-[var(--shadow-glow-sm)]",
  interactive: "bg-[var(--color-glass)] border-[var(--color-glass-border)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-glass-hover)]",
  glow: "bg-[var(--color-glass)] border-[var(--color-glass-border)] shadow-[0_0_30px_rgba(96,165,250,0.12)]",
  gradient: "bg-gradient-to-br from-[rgba(255,255,255,0.05)] via-[rgba(255,255,255,0.02)] to-transparent border-[var(--color-glass-border)]",
  hero: "luxury-glass border-[var(--color-glass-border)] shadow-[var(--shadow-xl)]",
};

const sizeStyles: Record<string, string> = {
  none: "p-0",
  sm: "p-[var(--spacing-4)]",
  md: "p-[var(--spacing-6)]",
  lg: "p-[var(--spacing-8)]",
};

export function GlassCard({
  children,
  className,
  hover = false,
  onClick,
  as: Tag = "div",
  spotlight = true,
  glow = false,
  gradient = false,
  variant = "default",
  size = "md",
}: GlassCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const isInteractive = hover || Boolean(onClick) || variant === "interactive";

  const MotionTag = useMemo(() => {
    if (typeof Tag === "string") {
      return motion[Tag as keyof typeof motion] as ElementType;
    }
    return motion.create(Tag) as ElementType;
  }, [Tag]);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!cardRef.current || (!spotlight && variant !== "hero")) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const currentCard = cardRef.current;
  const canTilt = variant === "hero" && isHovered && currentCard !== null && !shouldReduceMotion;
  const rotateX = canTilt ? ((mousePos.y / (currentCard?.clientHeight ?? 1)) - 0.5) * -1.6 : 0;
  const rotateY = canTilt ? ((mousePos.x / (currentCard?.clientWidth ?? 1)) - 0.5) * 1.6 : 0;

  return (
    <MotionTag
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={
        variant === "hero"
          ? { rotateX, rotateY }
          : undefined
      }
      style={{
        perspective: 1000,
        transformStyle: "preserve-3d",
      }}
      whileHover={
        isInteractive
          ? {
              y: -4,
              scale: 1.012,
              transition: { type: "spring", stiffness: 380, damping: 25 },
            }
          : undefined
      }
      whileTap={onClick ? { scale: 0.985, transition: { duration: 0.1 } } : undefined}
      className={cn(
        glassBase(),
        "relative overflow-hidden rounded-[var(--radius-2xl)] transition-colors duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]",
        variantStyles[variant],
        sizeStyles[size],
        isInteractive &&
          "cursor-pointer hover:bg-[var(--color-glass-hover)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)]",
        glow && "shadow-[0_0_40px_rgba(96,165,250,0.12)]",
        gradient && "bg-gradient-to-br from-[var(--color-glass)] via-[var(--color-glass)]/80 to-transparent",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Ambient Mouse Spotlight lighting */}
      {spotlight && isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(${variant === "hero" ? "600px" : "400px"} circle at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, ${variant === "hero" ? "0.18" : "0.12"}), rgba(56, 189, 248, 0.08) 40%, transparent 80%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Subtle top border reflection */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.12)] to-transparent opacity-60 z-0"
        aria-hidden="true"
      />

      <div className="relative z-10">{children}</div>
    </MotionTag>
  );
}
