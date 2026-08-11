import { type ReactNode } from "react";
import { cn } from "@utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PremiumButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  loading?: boolean;
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
}

export function PremiumButton({
  children,
  loading,
  disabled,
  variant = "primary",
  size = "lg",
  className,
  ...props
}: PremiumButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      className={cn(
        "auth-btn",
        variant === "primary" ? "auth-btn-primary" : "auth-btn-ghost",
        size === "lg" ? "auth-btn-lg" : "auth-btn-md",
        isDisabled && "opacity-50 pointer-events-none",
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading}
      whileHover={isDisabled ? undefined : { scale: 1.018, y: -2 }}
      whileTap={isDisabled ? undefined : { scale: 0.972, y: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      {...props}
    >
      {/* Gradient border */}
      <span className="auth-btn-border" aria-hidden="true" />

      {/* Inner glow */}
      <span className="auth-btn-inner-glow" aria-hidden="true" />

      {/* Reflection sweep on hover */}
      <span className="auth-btn-sweep" aria-hidden="true" />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </span>
    </motion.button>
  );
}
