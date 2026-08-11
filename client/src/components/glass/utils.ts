/**
 * Utility functions for the Glass component library.
 *
 * The design system defines a set of CSS variables for colors, shadows,
 * blur, radius, etc. This helper builds a Tailwind class string that applies
 * the "glass" effect using those variables. It also merges any additional
 * classes supplied by the caller via `twMerge` to avoid duplicate utilities.
 */
import { twMerge } from "tailwind-merge";

/**
 * Returns a merged class string that applies the base glass styling.
 *
 * @param extra Optional additional Tailwind classes to merge.
 */
export const glassBase = (extra?: string) => {
  const base = [
    // Background with glass translucency
    "bg-[var(--color-glass)]",
    // Subtle border using the glass border token
    "border",
    "border-[var(--color-glass-border)]",
    // Backdrop blur – Tailwind supports arbitrary values via brackets
    "backdrop-blur-[var(--glass-blur-md)]",
    // Rounded corners using the radius token
    "rounded-[var(--radius-md)]",
    // Light shadow for depth
    "shadow-[var(--shadow-sm)]",
  ].join(" ");
  return twMerge(base, extra);
};
