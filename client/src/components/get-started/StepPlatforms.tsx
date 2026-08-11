import { ScrollReveal } from "@components/effects/ScrollReveal";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@utils";
import { Link2 } from "lucide-react";
import { platformApi } from "../../features/core/services/api";

interface StepPlatformsProps {
  selected: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function StepPlatforms({ selected, onToggle, onContinue, onBack }: StepPlatformsProps) {
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["platforms", "public-providers"],
    queryFn: () => platformApi.getProviders(),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="max-w-xl mx-auto w-full">
      <ScrollReveal>
        <div className="text-center mb-[var(--spacing-8)]">
          <h2 className="text-[var(--font-size-2xl)] md:text-[var(--font-size-3xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)]">
            Choose providers for onboarding
          </h2>
          <p className="mt-[var(--spacing-2)] text-[var(--font-size-base)] text-[var(--color-fg-muted)]">
            This records only your onboarding preference. You will authenticate and select real accounts after signing in.
          </p>
        </div>
      </ScrollReveal>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="status">
          {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-glass)]" />)}
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-5 text-center">
          <Link2 className="mx-auto size-6 text-[var(--color-fg-subtle)]" />
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">No OAuth providers are configured yet. You can continue without selecting one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[var(--spacing-3)]">
          {providers.map((provider, index) => {
            const isSelected = selected.includes(provider.id);
            return (
              <ScrollReveal key={provider.id} delay={index * 0.05}>
                <button
                  onClick={() => onToggle(provider.id)}
                  className={cn(
                    "flex w-full flex-col items-center gap-3 rounded-[var(--radius-xl)] border bg-[var(--color-glass)] p-5 backdrop-blur-[var(--glass-blur-sm)] transition-colors",
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                      : "border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)]",
                  )}
                  type="button"
                  aria-pressed={isSelected}
                >
                  <span className={cn(
                    "flex size-11 items-center justify-center rounded-[var(--radius-lg)] text-sm font-bold",
                    isSelected ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-accent-muted)] text-[var(--color-accent)]",
                  )}>
                    {provider.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">{provider.name}</span>
                </button>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      <ScrollReveal delay={0.3}>
        <div className="mt-[var(--spacing-8)] flex items-center justify-center gap-[var(--spacing-4)]">
          <button onClick={onBack} className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]" type="button">Back</button>
          <button onClick={onContinue} className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]" type="button">
            {selected.length > 0 ? "Continue" : "Skip"}
          </button>
        </div>
      </ScrollReveal>
    </div>
  );
}
