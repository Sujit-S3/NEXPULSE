import { AILogo } from "@components/common";
import { Section } from "@components/common/Section";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { AtroposCard } from "@components/ui/AtroposCard";
import { Sparkles, MessageSquare, Brain, Zap } from "lucide-react";

export function AISection() {
  return (
    <Section
      id="ai"
      title="AI Neural Engine"
      subtitle="Powered by advanced machine learning models, NEXPULSE analyzes, predicts, and optimizes your social strategy in real-time."
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <AtroposCard className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl p-5 transition-all duration-500">
              <div data-atropos-offset="-6" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(96,165,250,0.18),transparent_55%)]" aria-hidden="true" />
              <div data-atropos-offset="12" className="absolute -right-16 -top-16 size-40 rounded-full bg-[var(--color-accent)]/10 blur-3xl" aria-hidden="true" />
              <div className="space-y-3">
                <div data-atropos-offset="10" className="flex items-center gap-2 pb-3 border-b border-[var(--color-glass-border)]">
                  <AILogo size={14} animate className="text-[var(--color-accent)]" />
                  <span className="text-xs font-semibold text-[var(--color-fg)]">AI Assistant</span>
                  <span className="ml-auto text-[10px] font-mono text-[var(--color-success)] flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
                    Active
                  </span>
                </div>
                <div className="space-y-2 min-h-[160px]">
                  {[ 
                    { role: "ai", text: "I've analyzed your posting patterns. Engagement peaks at 6-8 PM on weekdays." },
                    { role: "user", text: "Can you suggest optimal posting times this week?" },
                    { role: "ai", text: "Based on audience activity, I recommend Tuesday 7 PM, Thursday 6:30 PM, and Saturday 11 AM." },
                  ].map((msg, i) => (
                    <div
                      key={i}
                      data-atropos-offset={msg.role === "ai" ? "5" : "2"}
                      className={`p-3 rounded-xl text-xs leading-relaxed ${
                        msg.role === "ai"
                          ? "bg-[var(--color-accent-muted)]/50 border border-[var(--color-accent)]/20 ml-6"
                          : "bg-[var(--color-bg)] border border-[var(--color-glass-border)] mr-6"
                      }`}
                    >
                      <span className="font-semibold text-[var(--color-fg)] block mb-0.5">
                        {msg.role === "ai" ? "NEXPULSE AI" : "You"}
                      </span>
                      <span className="text-[var(--color-fg-muted)]">{msg.text}</span>
                    </div>
                  ))}
                </div>
                <div data-atropos-offset="8" className="flex items-center gap-2 pt-2 border-t border-[var(--color-glass-border)]">
                  <div className="flex-1 h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-glass-border)] px-3 flex items-center">
                    <span className="text-[10px] text-[var(--color-fg-subtle)]">Ask about your content strategy...</span>
                  </div>
                  <button type="button" aria-label="Send example AI prompt" className="size-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white">
                    <Sparkles className="size-3.5" />
                  </button>
                </div>
              </div>
            </AtroposCard>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="space-y-4">
              {[
                { icon: Brain, title: "Smart Analysis", desc: "Deep learning models analyze your content performance and audience behavior patterns to deliver actionable insights." },
                { icon: Zap, title: "Auto Optimization", desc: "AI automatically adjusts posting schedules and content strategy for maximum reach and engagement." },
                { icon: MessageSquare, title: "Content Generation", desc: "Generate on-brand captions, hashtags, and post variations with AI assistance in seconds." },
              ].map((item) => (
                <AtroposCard key={item.title} className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-500">
                  <div className="relative z-10 flex gap-4">
                    <div data-atropos-offset="2" className="size-10 shrink-0 rounded-lg bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent)]">
                      <item.icon className="size-5" />
                    </div>
                    <div>
                      <h3 data-atropos-offset="4" className="font-semibold text-sm text-[var(--color-fg)]">{item.title}</h3>
                      <p data-atropos-offset="5" className="text-xs text-[var(--color-fg-muted)] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                </AtroposCard>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </Section>
  );
}
