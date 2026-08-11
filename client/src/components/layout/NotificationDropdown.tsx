import { useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../utils";

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
  title: string;
  badge?: number;
  children: ReactNode;
  className?: string;
  align?: "right" | "left";
}

export function NotificationDropdown({
  open,
  onClose,
  title,
  badge,
  children,
  className,
  align = "right",
}: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-label={title}
          aria-modal="true"
          className={cn(
            "absolute top-full mt-2 z-50 w-80 rounded-[var(--radius-xl)] border border-[var(--color-glass-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-xl)] overflow-hidden",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
          style={{
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-[var(--font-weight-semibold)] text-[var(--color-fg)]">
                {title}
              </span>
              {badge !== undefined && badge > 0 && (
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)] transition-colors"
              aria-label="Close"
              type="button"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[420px] overflow-y-auto">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
