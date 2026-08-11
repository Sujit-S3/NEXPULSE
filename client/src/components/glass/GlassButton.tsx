import { type ReactNode } from "react";
import { cn } from "@utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<string, string> = {
  primary:
    "relative bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow)] active:shadow-none",
  secondary:
    "bg-[var(--color-glass)] border border-[var(--color-glass-border)] text-[var(--color-fg)] hover:bg-[var(--color-glass-hover)] hover:border-[var(--color-border-strong)] backdrop-blur-[var(--glass-blur-sm)]",
  ghost:
    "bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-glass-hover)]",
  danger:
    "bg-[var(--color-error-muted)] border border-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white",
};

const sizeStyles: Record<string, string> = {
  xs: "px-[var(--spacing-2)] py-[var(--spacing-0-5)] text-[var(--font-size-xs)] rounded-[var(--radius-sm)] gap-[var(--spacing-1)] h-7",
  sm: "px-[var(--spacing-3)] py-[var(--spacing-1)] text-[var(--font-size-sm)] rounded-[var(--radius-sm)] gap-[var(--spacing-1-5)] h-8",
  md: "px-[var(--spacing-5)] py-[var(--spacing-2)] text-[var(--font-size-sm)] rounded-[var(--radius-md)] gap-[var(--spacing-2)] h-9",
  lg: "px-[var(--spacing-6)] py-[var(--spacing-2-5)] text-[var(--font-size-base)] rounded-[var(--radius-lg)] gap-[var(--spacing-2)] h-11",
};

export function GlassButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  whileHover,
  whileTap,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      className={cn(
        "inline-flex items-center justify-center font-[var(--font-weight-medium)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer whitespace-nowrap",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      whileHover={whileHover ?? (disabled || loading ? undefined : { scale: 1.025, y: -1, transition: { type: "spring", stiffness: 500, damping: 20 } })}
      whileTap={whileTap ?? (disabled || loading ? undefined : { scale: 0.965, y: 0 })}
      {...props}
    >
      {/* Shimmer on primary hover */}
      {variant === "primary" && (
        <span
          className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500" />
        </span>
      )}
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </motion.button>
  );
}
