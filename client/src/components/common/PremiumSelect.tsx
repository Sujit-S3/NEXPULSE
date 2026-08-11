import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@utils";
import { Check, ChevronDown } from "lucide-react";

export interface PremiumSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface PremiumSelectProps {
  value: string;
  options: PremiumSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PremiumSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Choose an option",
  disabled = false,
  className,
}: PremiumSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const choose = (option: PremiumSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "premium-select-trigger flex h-11 w-full items-center gap-3 rounded-[var(--radius-lg)] px-3.5 text-left text-sm",
          "border border-[var(--color-border)] bg-[var(--color-glass)] text-[var(--color-fg)] shadow-[var(--shadow-sm)]",
          "transition-[border-color,background-color,box-shadow] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-glass-hover)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-[var(--color-fg-subtle)]")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-[var(--color-fg-subtle)] transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="premium-select-menu absolute left-0 right-0 top-[calc(100%+8px)] z-[250] max-h-72 overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] p-1.5 shadow-[var(--shadow-xl)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value || "__empty"}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                onClick={() => choose(option)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-[var(--color-accent-muted)] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)]",
                  option.disabled && "cursor-not-allowed opacity-45",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{option.label}</span>
                  {option.description && (
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--color-fg-subtle)]">
                      {option.description}
                    </span>
                  )}
                </span>
                {active && <Check className="size-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
