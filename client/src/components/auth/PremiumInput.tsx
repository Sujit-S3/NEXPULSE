import { type InputHTMLAttributes, type ReactNode, forwardRef, useId, useState } from "react";
import { cn } from "@utils";
import { motion, AnimatePresence } from "framer-motion";

interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
}

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ label, error, icon, suffix, className, id: externalId, value, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = externalId ?? generatedId;
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(value) || Boolean(props.defaultValue);
    const lifted = focused || hasValue;

    return (
      <div className="relative">
        <div
          className={cn(
            "auth-input-wrap",
            focused && "auth-input-focused",
            error && "auth-input-error",
          )}
        >
          {/* Animated gradient border */}
          <div className={cn("auth-input-border", focused && "auth-input-border-active")} aria-hidden="true" />

          {/* Focus glow */}
          <AnimatePresence>
            {focused && (
              <motion.div
                className="auth-input-glow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          {/* Icon */}
          {icon && (
            <div className={cn("auth-input-icon", focused ? "auth-input-icon-active" : "")}>
              {icon}
            </div>
          )}

          {/* Floating label */}
          <motion.label
            htmlFor={inputId}
            className={cn("auth-input-label", icon && "auth-input-label-icon")}
            animate={{
              y: lifted ? -26 : 0,
              scale: lifted ? 0.78 : 1,
              color: focused
                ? "rgba(96,165,250,1)"
                : error
                  ? "rgba(248,113,113,1)"
                  : "rgba(245,245,247,0.45)",
            }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ originX: 0 }}
          >
            {label}
          </motion.label>

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              "auth-input",
              icon && "auth-input-has-icon",
              suffix && "auth-input-has-suffix",
              className,
            )}
            aria-invalid={error ? true : undefined}
            {...props}
          />

          {/* Suffix (e.g. show/hide password) */}
          {suffix && <div className="auth-input-suffix">{suffix}</div>}
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="mt-1.5 text-xs text-[var(--color-error)] pl-1"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

PremiumInput.displayName = "PremiumInput";
