import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx conditional support.
 * shadcn/ui pattern — handles conflicts like `px-4 px-6` → `px-6`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
