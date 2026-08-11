import { useTheme } from "@theme/useTheme";
import { cn } from "@utils";
import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import { AssistantLogo } from "@/brand";

const proofPoints = [
  "Provider-native metrics",
  "AI grounded in your data",
  "Enterprise access controls",
];

const platformNames = ["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok", "X", "Pinterest"];

export function HeroSection() {
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  return (
    <section className="premium-hero relative isolate min-h-screen overflow-hidden pt-24">
      <div className="premium-hero-aurora" aria-hidden="true" />
      <div className="premium-hero-grid" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-[1480px] flex-col justify-center px-5 pb-12 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(440px,1.08fr)] lg:gap-4">
          <div className="max-w-3xl">
            <div className="premium-kicker mb-7 inline-flex items-center gap-2">
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI-powered social intelligence
              <span className="premium-live-dot" aria-hidden="true" />
            </div>

            <h1 className="max-w-[760px] text-[clamp(3.3rem,7.4vw,7.2rem)] font-extrabold leading-[0.92] tracking-[-0.065em]">
              The pulse of
              <span className="premium-gradient-text block">every platform.</span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-[var(--color-fg-muted)] sm:text-lg sm:leading-8">
              Turn authenticated social data into decisive analytics, board-ready reports, and AI guidance from one beautifully focused command center.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/get-started" className="premium-primary-button group">
                Start your workspace
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a href="#dashboard" className="premium-secondary-button group">
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-glass-hover)]">
                  <Play className="ml-0.5 size-3.5 fill-current" aria-hidden="true" />
                </span>
                Explore the product
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2">
              {proofPoints.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-fg-muted)]">
                  <CheckCircle2 className="size-3.5 text-[var(--color-success)]" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            className="premium-hero-stage relative min-h-[430px] lg:min-h-[690px]"
            aria-label="NEXPULSE intelligence engine"
          >
            <div className="premium-orbit premium-orbit-one" aria-hidden="true" />
            <div className="premium-orbit premium-orbit-two" aria-hidden="true" />
            <div className="premium-orbit premium-orbit-three" aria-hidden="true" />
            <div className="premium-hero-glow" aria-hidden="true" />

            <img
              src={AssistantLogo}
              alt="NEXPULSE AI"
              draggable={false}
              width="1024"
              height="1024"
              fetchPriority="high"
              decoding="async"
              className="premium-hero-logo"
            />

            <div className="premium-signal-card premium-signal-card-a">
              <span className="premium-signal-icon">↗</span>
              <span>
                <strong>Live intelligence</strong>
                <small>Provider-scoped and traceable</small>
              </span>
            </div>

            <div className="premium-signal-card premium-signal-card-b">
              <span className="premium-signal-pulse" />
              <span>
                <strong>AI command center</strong>
                <small>OpenAI · Claude · Gemini</small>
              </span>
            </div>
          </div>
        </div>

        <div className="premium-platform-rail">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
            One secure operating layer
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {platformNames.map((name) => (
              <span key={name} className="text-xs font-semibold tracking-wide text-[var(--color-fg-muted)]">
                {name}
              </span>
            ))}
          </div>
          <span className={cn("hidden text-xs font-semibold lg:inline", isLight ? "text-blue-700" : "text-cyan-300")}>
            OAuth 2.0 + PKCE
          </span>
        </div>
      </div>
    </section>
  );
}
