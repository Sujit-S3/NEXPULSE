import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose, open]);
  return panelRef;
}

export function GlassModal({ open, onClose, title, description, children }: OverlayProps) {
  const panelRef = useOverlay(open, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] grid place-items-center p-4">
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-[rgba(3,7,18,0.58)] backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="glass-modal-title"
            className="enterprise-glass-overlay relative z-10 max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-3xl)] p-6 outline-none"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.975, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="glass-modal-title" className="text-xl font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="enterprise-icon-button" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function GlassDrawer({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  className,
}: OverlayProps & { side?: "left" | "right"; className?: string }) {
  const panelRef = useOverlay(open, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[215]">
          <motion.button
            type="button"
            aria-label="Close drawer"
            className="absolute inset-0 bg-[rgba(3,7,18,0.48)] backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="glass-drawer-title"
            className={cn(
              "enterprise-glass-overlay absolute inset-y-0 w-[min(92vw,520px)] overflow-y-auto p-6 outline-none",
              side === "right" ? "right-0 rounded-l-[var(--radius-3xl)]" : "left-0 rounded-r-[var(--radius-3xl)]",
              className,
            )}
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="glass-drawer-title" className="text-xl font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="enterprise-icon-button" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function GlassContextMenu({
  open,
  onClose,
  x,
  y,
  children,
}: {
  open: boolean;
  onClose: () => void;
  x: number;
  y: number;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
    };
  }, [onClose, open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      role="menu"
      className="enterprise-glass-overlay fixed z-[240] min-w-48 rounded-[var(--radius-xl)] p-1.5"
      style={{ left: Math.min(x, window.innerWidth - 220), top: Math.min(y, window.innerHeight - 260) }}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </motion.div>,
    document.body,
  );
}
