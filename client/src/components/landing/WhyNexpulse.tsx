import { Section } from "@components/common/Section";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface ComparisonRow {
  label: string;
  traditional: string;
  nexpulse: string;
}

const comparisons: ComparisonRow[] = [
  { label: "AI-powered insights", traditional: "Manual analysis", nexpulse: "Real-time AI analytics" },
  { label: "Platform coverage", traditional: "1-2 platforms", nexpulse: "7+ platforms" },
  { label: "Report generation", traditional: "Hours of work", nexpulse: "One-click reports" },
  { label: "Team collaboration", traditional: "Email & spreadsheets", nexpulse: "Built-in collaboration" },
  { label: "Automation", traditional: "Limited or none", nexpulse: "Full workflow automation" },
  { label: "Data visualization", traditional: "Basic charts", nexpulse: "Interactive dashboards" },
  { label: "Cost efficiency", traditional: "Multiple tools", nexpulse: "All-in-one platform" },
];

export function WhyNexpulse() {
  return (
    <Section
      title="Why NEXPULSE?"
      subtitle="See how we compare to traditional social media management tools."
    >
      <div className="mx-auto max-w-4xl px-[var(--spacing-4)]">
        <div className="grid md:grid-cols-2 gap-[var(--spacing-6)]">
          <ScrollReveal direction="left">
            <div className="bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-xl)] backdrop-blur-[var(--glass-blur-sm)] p-[var(--spacing-6)]">
              <div className="flex items-center gap-[var(--spacing-3)] mb-[var(--spacing-6)]">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-error)]/10 text-[var(--color-error)]">
                  <X className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-[var(--font-size-lg)] font-[var(--font-weight-semibold)]">
                  Traditional Tools
                </h3>
              </div>
              <div className="space-y-[var(--spacing-3)]">
                {comparisons.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-[var(--spacing-3)] text-[var(--font-size-sm)] text-[var(--color-fg-muted)]"
                  >
                    <X className="size-4 text-[var(--color-error)] shrink-0" aria-hidden="true" />
                    <span>{row.traditional}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <motion.div
              className="bg-[var(--color-glass)] border-2 border-[var(--color-accent)]/30 rounded-[var(--radius-xl)] backdrop-blur-[var(--glass-blur-sm)] p-[var(--spacing-6)] shadow-[var(--shadow-glow)] relative"
              animate={{ boxShadow: ["0 0 24px rgba(96,165,250,0.15)", "0 0 32px rgba(96,165,250,0.25)", "0 0 24px rgba(96,165,250,0.15)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute -top-3 -right-3 px-[var(--spacing-3)] py-[var(--spacing-1)] bg-[var(--color-accent)] rounded-full text-[var(--font-size-xs)] font-[var(--font-weight-bold)] text-white">
                Recommended
              </div>
              <div className="flex items-center gap-[var(--spacing-3)] mb-[var(--spacing-6)]">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
                  <Check className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-[var(--font-size-lg)] font-[var(--font-weight-semibold)]">
                  NEXPULSE AI
                </h3>
              </div>
              <div className="space-y-[var(--spacing-3)]">
                {comparisons.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-[var(--spacing-3)] text-[var(--font-size-sm)]"
                  >
                    <Check className="size-4 text-[var(--color-accent)] shrink-0" aria-hidden="true" />
                    <span className="text-[var(--color-fg-muted)]">{row.nexpulse}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </ScrollReveal>
        </div>
      </div>
    </Section>
  );
}
