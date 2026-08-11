import { useState, type ReactNode } from "react";
import { cn } from "@utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface GlassAccordionProps {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
}

export function GlassAccordion({ items, className, allowMultiple = false }: GlassAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("space-y-[var(--spacing-3)]", className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div
            key={item.id}
            className="bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-lg)] backdrop-blur-[var(--glass-blur-sm)] overflow-hidden transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]"
          >
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between px-[var(--spacing-6)] py-[var(--spacing-4)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              type="button"
            >
              <span className="text-[var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--color-fg)] pr-[var(--spacing-4)]">
                {item.title}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="shrink-0 text-[var(--color-fg-muted)]"
              >
                <ChevronDown className="size-5" aria-hidden="true" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`accordion-content-${item.id}`}
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-[var(--spacing-6)] pb-[var(--spacing-4)] text-[var(--font-size-sm)] text-[var(--color-fg-muted)] leading-[var(--line-height-relaxed)]">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
