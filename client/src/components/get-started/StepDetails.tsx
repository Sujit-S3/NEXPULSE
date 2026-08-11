import { useState } from "react";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { GlassInput } from "@components/glass/GlassInput";
import { cn } from "@utils";
import { motion } from "framer-motion";

interface StepDetailsProps {
  onContinue: (data: { workspace: string; company: string; budget: number }) => void;
  onBack: () => void;
}

const budgetTiers = [
  { value: 0, label: "Free", desc: "Individual" },
  { value: 29, label: "$29/mo", desc: "Starter" },
  { value: 79, label: "$79/mo", desc: "Professional" },
  { value: 199, label: "$199/mo", desc: "Business" },
  { value: 499, label: "$499/mo", desc: "Enterprise" },
];

export function StepDetails({ onContinue, onBack }: StepDetailsProps) {
  const [workspace, setWorkspace] = useState("");
  const [company, setCompany] = useState("");
  const [budget, setBudget] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue({
      workspace: workspace || "My Workspace",
      company,
      budget: budgetTiers[budget].value,
    });
  };

  return (
    <div className="max-w-lg mx-auto w-full">
      <ScrollReveal>
        <div className="text-center mb-[var(--spacing-8)]">
          <h2 className="text-[var(--font-size-2xl)] md:text-[var(--font-size-3xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)]">
            Final details
          </h2>
          <p className="mt-[var(--spacing-2)] text-[var(--font-size-base)] text-[var(--color-fg-muted)]">
            Tell us a bit about yourself and choose a plan.
          </p>
        </div>
      </ScrollReveal>

      <form onSubmit={handleSubmit} className="space-y-[var(--spacing-6)]">
        <ScrollReveal delay={0.05}>
          <GlassInput
            label="Workspace Name"
            placeholder="My Workspace"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
          />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <GlassInput
            label="Company Name (optional)"
            placeholder="Acme Inc."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div>
            <span className="block text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-fg-muted)] mb-[var(--spacing-3)]">
              Budget Range
            </span>
            <div
              className="bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-lg)] backdrop-blur-[var(--glass-blur-sm)] p-[var(--spacing-2)]"
              role="radiogroup"
              aria-label="Budget Range"
            >
              <div className="flex justify-between mb-[var(--spacing-2)] px-[var(--spacing-2)]">
                {budgetTiers.map((tier, i) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setBudget(i)}
                    className={cn(
                      "flex flex-col items-center px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)]",
                      budget === i
                        ? "bg-[var(--color-accent)] text-white"
                        : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
                    )}
                  >
                    <span className="text-[var(--font-size-xs)] font-[var(--font-weight-bold)]">
                      {tier.label}
                    </span>
                    <span className="text-[10px] opacity-70">{tier.desc}</span>
                  </button>
                ))}
              </div>
              <motion.div
                className="h-1 bg-[var(--color-accent)]/20 rounded-full mx-[var(--spacing-2)] mb-[var(--spacing-2)]"
              >
                <motion.div
                  className="h-full bg-[var(--color-accent)] rounded-full"
                  animate={{ width: `${(budget / (budgetTiers.length - 1)) * 100}%` }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              </motion.div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex items-center justify-center gap-[var(--spacing-4)] pt-[var(--spacing-4)]">
            <button
              onClick={onBack}
              type="button"
              className="text-[var(--font-size-sm)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-[var(--spacing-6)] py-[var(--spacing-2)] bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] font-[var(--font-weight-medium)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-hover)]"
            >
              Continue
            </button>
          </div>
        </ScrollReveal>
      </form>
    </div>
  );
}
