import { BrandLogo, AILogo } from "@components/common";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { GlassButton } from "@components/glass/GlassButton";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface StepWelcomeProps {
  onContinue: () => void;
}

export function StepWelcome({ onContinue }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto">
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="mb-[var(--spacing-8)]"
      >
        <div className="relative">
          <div className="size-24 flex items-center justify-center rounded-[var(--radius-2xl)] bg-[var(--color-glass)] border border-[var(--color-glass-border)] backdrop-blur-[var(--glass-blur-lg)] shadow-[var(--shadow-glow)]">
            <BrandLogo size="xl" showText={false} />
          </div>
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AILogo size={24} className="text-[var(--color-accent)]" />
          </motion.div>
        </div>
      </motion.div>

      <ScrollReveal>
        <h1 className="text-[var(--font-size-3xl)] md:text-[var(--font-size-4xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)]">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-cyan)] bg-clip-text text-transparent">
            NEXPULSE AI
          </span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <p className="mt-[var(--spacing-4)] text-[var(--font-size-lg)] text-[var(--color-fg-muted)] leading-[var(--line-height-relaxed)]">
          Let&apos;s get you set up in just a few steps. We&apos;ll help you connect your platforms
          and unlock AI-powered insights for your social media presence.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="mt-[var(--spacing-8)] flex flex-col items-center gap-[var(--spacing-4)]">
          <GlassButton variant="primary" size="lg" onClick={onContinue} className="group">
            Get Started
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </GlassButton>
          <p className="text-[var(--font-size-xs)] text-[var(--color-fg-subtle)]">
            Takes about 2 minutes
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}
