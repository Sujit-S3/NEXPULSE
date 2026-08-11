import { AILogo } from "@components/common";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { GlassButton } from "@components/glass/GlassButton";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface StepConfirmProps {
  objective?: string[];
  platforms?: string[];
  details?: { workspace: string; company: string; budget: number } | null;
}

// Objective/platform/workspace selections from this wizard aren't persisted anywhere yet —
// there's no backend endpoint to attach onboarding intent to a not-yet-created account.
// They're accepted here so a future signup-intent endpoint has somewhere to plug in.
export function StepConfirm(_props: StepConfirmProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="size-20 bg-gradient-to-br from-[var(--color-success)]/20 to-[var(--color-success)]/5 rounded-full flex items-center justify-center border border-[var(--color-success)]/30 mb-[var(--spacing-6)] shadow-[var(--shadow-glow-sm)]"
      >
        <CheckCircle2 className="size-10 text-[var(--color-success)]" aria-hidden="true" />
      </motion.div>

      <h2 className="text-[var(--font-size-3xl)] font-[var(--font-weight-bold)] mb-[var(--spacing-3)] tracking-tight">
        You're All Set!
      </h2>

      <p className="text-[var(--font-size-base)] text-[var(--color-fg-muted)] leading-[var(--line-height-relaxed)] max-w-md">
        {isAuthenticated
          ? "Continue to the dashboard, then authenticate with a configured provider and explicitly choose the accounts this workspace may use."
          : "Create your account to get started, then authenticate with a configured provider and explicitly choose the accounts this workspace may use."}
      </p>

      <motion.div
        className="mt-[var(--spacing-6)] flex items-center gap-[var(--spacing-2)] px-[var(--spacing-4)] py-[var(--spacing-2)] bg-[var(--color-accent-muted)] rounded-[var(--radius-full)] border border-[var(--color-accent)]/20"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <AILogo size={16} animate className="text-[var(--color-accent)]" />
        <span className="text-[var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-accent)]">
          No provider account connected yet
        </span>
      </motion.div>

      <ScrollReveal delay={0.2}>
        <div className="mt-[var(--spacing-8)]">
          <GlassButton
            variant="primary"
            size="lg"
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/register")}
            className="group"
          >
            {isAuthenticated ? "Go to Dashboard" : "Create your account"}
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </GlassButton>
        </div>
      </ScrollReveal>
    </div>
  );
}
