import { type ReactNode } from "react";
import { cn } from "@utils";
import { motion } from "framer-motion";

export interface GlassTab {
  id: string;
  label: string;
  badge?: number;
}

export function GlassTabs({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: GlassTab[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("glass-tabs", className)}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn("glass-tab", selected && "is-active")}
          >
            {selected && <motion.span layoutId={`${ariaLabel}-active-tab`} className="glass-tab-active" />}
            <span className="relative z-10">{tab.label}</span>
            {typeof tab.badge === "number" && <small className="relative z-10">{tab.badge}</small>}
          </button>
        );
      })}
    </div>
  );
}

export function GlassFloatingToolbar({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <motion.div
      role="toolbar"
      aria-label={label}
      className={cn("glass-floating-toolbar", className)}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
