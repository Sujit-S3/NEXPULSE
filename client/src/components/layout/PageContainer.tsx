import { type ReactNode } from "react";
import { cn } from "@utils";

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  maxWidth?: string;
}

export function PageContainer({
  children,
  title,
  description,
  className,
  maxWidth = "max-w-7xl",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-[var(--spacing-4)] py-[var(--spacing-5)] md:px-[var(--spacing-6)] md:py-[var(--spacing-7)] xl:px-[var(--spacing-8)] animate-[fade-in_250ms_ease-out_both]",
        maxWidth,
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-[var(--spacing-6)] md:mb-[var(--spacing-8)]">
          {title && (
            <h1 className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)] md:text-[var(--font-size-3xl)]">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-[var(--spacing-1)] text-[var(--color-fg-muted)] max-w-2xl">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
