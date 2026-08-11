import { useTheme } from "@theme/useTheme";
import { cn } from "@utils";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "pill" | "minimal";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";

  if (variant === "minimal") {
    return (
      <button
        onClick={toggle}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-[var(--duration-fast)]",
          "bg-[var(--color-glass)] border border-[var(--color-glass-border)]",
          "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
          className,
        )}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        type="button"
      >
        {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        <span>{isDark ? "Light" : "Dark"}</span>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-[var(--duration-fast)]",
          "bg-[var(--color-glass)] border border-[var(--color-glass-border)]",
          "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40",
          "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
          className,
        )}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        type="button"
      >
        <span className={cn("transition-transform duration-300", isDark ? "rotate-0" : "rotate-180")}>
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </span>
        <span className="text-xs font-semibold">{isDark ? "Light Mode" : "Dark Mode"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex size-9 items-center justify-center rounded-full transition-all duration-[var(--duration-fast)] active:scale-90",
        "text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)]",
        "border border-transparent hover:border-[var(--color-glass-border)]",
        className,
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      <span className={cn("transition-all duration-300", isDark ? "scale-100 rotate-0" : "scale-100 rotate-180")}>
        {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </span>
    </button>
  );
}
