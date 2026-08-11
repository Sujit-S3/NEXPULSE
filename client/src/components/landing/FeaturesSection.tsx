import type React from "react";
import { AILogo } from "@components/common";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { AtroposCard } from "@components/ui/AtroposCard";
import { useTheme } from "@theme/useTheme";
import { cn } from "@utils";
import {
  BarChart3, Zap, Share2, FileText, Users2, Shield, Code2, KeyRound,
} from "lucide-react";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
}

const features: Feature[] = [
  { icon: AILogo, title: "Grounded AI", description: "Ask strategic questions against a specifically selected account and its synchronized provider context.", accent: "#A78BFA", accentBg: "rgba(167,139,250,0.12)" },
  { icon: BarChart3, title: "Live Analytics", description: "Refresh provider-reported metrics, compare periods, and inspect audience and content performance.", accent: "#34D399", accentBg: "rgba(52,211,153,0.12)" },
  { icon: KeyRound, title: "Secure OAuth", description: "Connect with OAuth 2.0, PKCE, encrypted tokens, explicit account selection, and clean revocation.", accent: "#FBBF24", accentBg: "rgba(251,191,36,0.12)" },
  { icon: Share2, title: "Multi Platform", description: "Operate Instagram, Facebook, LinkedIn, YouTube, TikTok, X, and Pinterest from one workspace.", accent: "#38BDF8", accentBg: "rgba(56,189,248,0.12)" },
  { icon: FileText, title: "Premium Reports", description: "Create durable weekly, monthly, and quarterly snapshots with CSV and PDF exports.", accent: "#A78BFA", accentBg: "rgba(167,139,250,0.12)" },
  { icon: Users2, title: "Workspace Teams", description: "Invite members, apply roles, switch workspaces, and keep access scoped to the right organization.", accent: "#F87171", accentBg: "rgba(248,113,113,0.12)" },
  { icon: Shield, title: "Security Center", description: "Govern identities, policies, secrets, audit events, threats, incidents, and sensitive data workflows.", accent: "#34D399", accentBg: "rgba(52,211,153,0.12)" },
  { icon: Code2, title: "Developer Platform", description: "Manage API credentials, OAuth apps, webhooks, plugins, public resources, and usage controls.", accent: "#60A5FA", accentBg: "rgba(96,165,250,0.12)" },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  const Icon = feature.icon;

  return (
    <ScrollReveal delay={index * 0.05}>
      <AtroposCard
        className={cn(
          "feature-card group relative h-full cursor-default rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl transition-all duration-500",
          isLight ? "feature-card-light" : "feature-card-dark",
        )}
      >
        <div
          data-atropos-offset="-6"
          className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(300px circle at 50% 0%, ${feature.accent}1f, transparent 72%)` }}
          aria-hidden="true"
        />

        {/* Top highlight */}
        <div data-atropos-offset="-3" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />

        {/* Icon */}
        <div
          data-atropos-offset="2"
          className="relative z-10 flex size-11 items-center justify-center rounded-xl mb-5 transition-all duration-300 group-hover:scale-110"
          style={{ backgroundColor: feature.accentBg, color: feature.accent }}
        >
          <Icon className="size-5" aria-hidden="true" />
          {/* Icon glow on hover */}
          <div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
            style={{ backgroundColor: feature.accent + "30" }}
            aria-hidden="true"
          />
        </div>

        <h3 data-atropos-offset="4" className="relative z-10 text-base font-semibold text-[var(--color-fg)] mb-2">{feature.title}</h3>
        <p data-atropos-offset="5" className="relative z-10 text-sm text-[var(--color-fg-muted)] leading-relaxed">{feature.description}</p>

        {/* Bottom accent line on hover */}
        <div
          data-atropos-offset="12"
          className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, transparent, ${feature.accent}60, transparent)` }}
          aria-hidden="true"
        />
      </AtroposCard>
    </ScrollReveal>
  );
}

export function FeaturesSection() {
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  return (
    <section id="features" className="py-28 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 50%, rgba(96,165,250,0.05) 0%, transparent 100%)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-5",
              isLight ? "bg-blue-50 border-blue-200/60 text-blue-600" : "bg-blue-500/10 border-blue-500/25 text-blue-400"
            )}>
              <Zap className="size-3" />
              Complete operating layer
            </div>
            <h2 className={cn("text-4xl md:text-5xl font-extrabold tracking-tight mb-4", isLight ? "text-slate-900" : "text-white")}>
              Everything you need to
              <br />
              <span className="hero-gradient-text">operate with clarity</span>
            </h2>
            <p className={cn("text-lg max-w-2xl mx-auto", isLight ? "text-slate-500" : "text-white/45")}>
              One premium system for secure connections, factual analytics, AI guidance, reporting, and governance.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
