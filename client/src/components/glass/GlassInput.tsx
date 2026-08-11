import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@utils";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, helperText, className, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const inputId = externalId ?? generatedId;

    return (
      <div className="flex flex-col gap-[var(--spacing-1-5)]">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-fg-muted)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-md)] px-[var(--spacing-4)] py-[var(--spacing-2-5)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] backdrop-blur-[var(--glass-blur-sm)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
            "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]",
            error &&
              "border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]",
            props.disabled && "cursor-not-allowed opacity-50",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-[var(--font-size-xs)] text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-[var(--font-size-xs)] text-[var(--color-fg-subtle)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

GlassInput.displayName = "GlassInput";
