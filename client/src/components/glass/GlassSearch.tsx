import {
  forwardRef,
  type InputHTMLAttributes,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { cn } from "@utils";
import { Search, X } from "lucide-react";

interface GlassSearchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export const GlassSearch = forwardRef<HTMLInputElement, GlassSearchProps>(
  ({ value = "", onChange, onClear, className, placeholder = "Search...", ...props }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value);
      },
      [onChange],
    );

    const handleClear = useCallback(() => {
      onChange?.("");
      onClear?.();
      internalRef.current?.focus();
    }, [onChange, onClear]);

    return (
      <div className={cn("relative", className)}>
        <Search
          className="absolute left-[var(--spacing-3)] top-1/2 -translate-y-1/2 size-4 text-[var(--color-fg-subtle)] pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={internalRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "w-full bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-md)] pl-[var(--spacing-9)] pr-[var(--spacing-9)] py-[var(--spacing-2)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] backdrop-blur-[var(--glass-blur-sm)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
            "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]",
          )}
          {...props}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-[var(--spacing-3)] top-1/2 -translate-y-1/2 size-4 flex items-center justify-center text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] transition-colors"
            aria-label="Clear search"
            type="button"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);

GlassSearch.displayName = "GlassSearch";
