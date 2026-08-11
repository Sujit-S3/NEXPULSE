import { ScrollReveal } from "@components/effects/ScrollReveal";
import { cn } from "@utils";
import { TrendingUp, FileText, Zap, BarChart3, PenLine, Target } from "lucide-react";

interface Objective {
  id: string;
  icon: typeof TrendingUp;
  title: string;
  description: string;
}

const objectives: Objective[] = [
  { id: "grow", icon: TrendingUp, title: "Grow Audience", description: "Expand your reach and attract more followers" },
  { id: "reports", icon: FileText, title: "AI Reports", description: "Generate automated performance reports" },
  { id: "automation", icon: Zap, title: "Automation", description: "Streamline posting and engagement" },
  { id: "analytics", icon: BarChart3, title: "Analytics", description: "Deep dive into your metrics" },
  { id: "content", icon: PenLine, title: "Content Planning", description: "Plan and schedule your content" },
  { id: "strategy", icon: Target, title: "Strategy", description: "Optimize your social strategy" },
];

interface StepObjectiveProps {
  selected: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function StepObjective({ selected, onToggle, onContinue, onSkip }: StepObjectiveProps) {
  return (
    <div className="max-w-2xl mx-auto w-full">
      <ScrollReveal>
        <div className="text-center mb-[var(--spacing-8)]">
          <h2 className="text-[var(--font-size-2xl)] md:text-[var(--font-size-3xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)]">
            What&apos;s your main objective?
          </h2>
          <p className="mt-[var(--spacing-2)] text-[var(--font-size-base)] text-[var(--color-fg-muted)]">
            Choose one or more goals to personalize your experience.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--spacing-3)]">
        {objectives.map((obj, i) => {
          const isSelected = selected.includes(obj.id);
          return (
            <ScrollReveal key={obj.id} delay={i * 0.04}>
              <button
                onClick={() => onToggle(obj.id)}
                className={cn(
                  "w-full text-left bg-[var(--color-glass)] border rounded-[var(--radius-lg)] backdrop-blur-[var(--glass-blur-sm)] p-[var(--spacing-4)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] group",
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] shadow-[var(--shadow-glow)]"
                    : "border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)] hover:border-[var(--color-border-strong)]",
                )}
                type="button"
              >
                <div className="flex items-center gap-[var(--spacing-3)]">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-[var(--radius-md)] transition-colors",
                      isSelected
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-accent-muted)] text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-white",
                    )}
                  >
                    <obj.icon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[var(--font-size-sm)] font-[var(--font-weight-semibold)]">
                      {obj.title}
                    </p>
                    <p className="text-[var(--font-size-xs)] text-[var(--color-fg-subtle)]">
                      {obj.description}
                    </p>
                  </div>
                </div>
              </button>
            </ScrollReveal>
          );
        })}
      </div>

      <ScrollReveal delay={0.3}>
        <div className="mt-[var(--spacing-8)] flex items-center justify-center gap-[var(--spacing-4)]">
          <button
            onClick={onSkip}
            className="text-[var(--font-size-sm)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            type="button"
          >
            Skip
          </button>
          <button
            onClick={onContinue}
            disabled={selected.length === 0}
            className="px-[var(--spacing-6)] py-[var(--spacing-2)] bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] font-[var(--font-weight-medium)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
          >
            Continue
          </button>
        </div>
      </ScrollReveal>
    </div>
  );
}
