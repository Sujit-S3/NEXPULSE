import { cn } from "@utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-center gap-[var(--spacing-2)]", className)}>
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={label} className="flex items-center gap-[var(--spacing-2)]">
            <div className="flex items-center gap-[var(--spacing-2)]">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[var(--font-size-xs)] font-[var(--font-weight-bold)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]",
                  isCompleted &&
                    "bg-[var(--color-accent)] text-white",
                  isCurrent &&
                    "border-2 border-[var(--color-accent)] text-[var(--color-accent)]",
                  !isCompleted && !isCurrent &&
                    "border border-[var(--color-border-strong)] text-[var(--color-fg-subtle)]",
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  stepNum
                )}
              </span>
              <span
                className={cn(
                  "hidden text-[var(--font-size-sm)] font-[var(--font-weight-medium)] sm:inline",
                  isCompleted && "text-[var(--color-accent)]",
                  isCurrent && "text-[var(--color-fg)]",
                  !isCompleted && !isCurrent && "text-[var(--color-fg-subtle)]",
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 sm:w-12 transition-colors duration-[var(--duration-normal)]",
                  isCompleted ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
