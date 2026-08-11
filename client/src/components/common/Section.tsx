import { type ReactNode } from "react";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { cn } from "@utils";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  align?: "left" | "center";
}

export function Section({
  children,
  className,
  id,
  title,
  subtitle,
  align = "center",
}: SectionProps) {
  return (
    <section id={id} className={cn("relative py-[var(--spacing-20)] md:py-[var(--spacing-24)]", className)}>
      {(title || subtitle) && (
        <div
          className={cn(
            "mx-auto mb-[var(--spacing-12)] md:mb-[var(--spacing-16)] max-w-3xl",
            align === "center" ? "text-center" : "text-left",
          )}
        >
          {title && (
            <ScrollReveal>
              <h2 className="text-[var(--font-size-3xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)] md:text-[var(--font-size-4xl)] lg:text-[var(--font-size-5xl)]">
                {title}
              </h2>
            </ScrollReveal>
          )}
          {subtitle && (
            <ScrollReveal delay={0.1}>
              <p className="mt-[var(--spacing-4)] text-[var(--font-size-lg)] text-[var(--color-fg-muted)] max-w-2xl mx-auto">
                {subtitle}
              </p>
            </ScrollReveal>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
