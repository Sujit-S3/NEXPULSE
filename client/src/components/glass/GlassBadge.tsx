import { type ReactNode } from "react";
import { cn } from "@utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface GlassBadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  count?: number;
  maxCount?: number;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default:
    "bg-[var(--color-glass)] text-[var(--color-fg-muted)] border-[var(--color-glass-border)]",
  success:
    "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
  warning:
    "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",
  error: "bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20",
  info: "bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/20",
};

const dotColorMap: Record<string, string> = {
  default: "bg-[var(--color-fg-subtle)]",
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  error: "bg-[var(--color-error)]",
  info: "bg-[var(--color-accent)]",
};

function formatCount(value: number, max: number): string {
  return value > max ? `${max}+` : String(value);
}

export function GlassBadge({
  children,
  variant = "default",
  dot = false,
  count,
  maxCount = 99,
  className,
}: GlassBadgeProps) {
  if (dot) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[var(--spacing-1-5)] text-[var(--font-size-xs)] font-[var(--font-weight-medium)]",
          className,
        )}
      >
        <span className={cn("size-2 rounded-full", dotColorMap[variant])} aria-hidden="true" />
        {children && <span>{children}</span>}
      </span>
    );
  }

  if (count !== undefined && !children) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center min-w-[20px] h-5 px-[var(--spacing-1)] text-[var(--font-size-xs)] font-[var(--font-weight-bold)] rounded-full border backdrop-blur-[var(--glass-blur-sm)]",
          variantStyles[variant],
          className,
        )}
      >
        {formatCount(count, maxCount)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--spacing-1)] px-[var(--spacing-2)] py-0.5 text-[var(--font-size-xs)] font-[var(--font-weight-medium)] rounded-[var(--radius-full)] border backdrop-blur-[var(--glass-blur-sm)]",
        variantStyles[variant],
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span className="font-[var(--font-weight-bold)]">{formatCount(count, maxCount)}</span>
      )}
    </span>
  );
}
