import { AILogo, Section } from "@components/common";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Eye,
  Heart,
  ShieldCheck,
  Users,
} from "lucide-react";

const metrics = [
  { label: "Followers", value: "42.5K", change: "+8.4%", icon: Users, color: "#3B82F6" },
  { label: "Engagement", value: "8.7%", change: "+1.3%", icon: Heart, color: "#22C55E" },
  { label: "Reach", value: "1.2M", change: "+16.2%", icon: Eye, color: "#3B82F6" },
  { label: "Posts", value: "24", change: "+4", icon: Activity, color: "#10B981" },
];

const chartHeights = [34, 42, 39, 48, 46, 58, 54, 68, 74, 70, 84, 96];

export function DashboardShowcase() {
  return (
    <Section
      id="dashboard"
      title="A command center with executive clarity"
      subtitle="Beautiful enough for leadership. Precise enough for operators. Every real workspace remains grounded in authorized provider data."
    >
      <div className="mx-auto max-w-7xl px-4">
        <ScrollReveal>
          <div className="premium-panel overflow-hidden rounded-[32px] !bg-[var(--color-bg-elevated)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-2xl bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
                  <BarChart3 className="size-4" />
                </span>
                <span>
                  <strong className="block text-sm">Brand performance</strong>
                  <small className="text-[10px] text-[var(--color-fg-subtle)]">Illustrative workspace preview</small>
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success-muted)] px-3 py-1 text-[10px] font-semibold text-[var(--color-success)]">
                <CheckCircle2 className="size-3" /> Synced
              </span>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4 xl:p-5">
              {metrics.map((metric) => (
                <div key={metric.label} className="premium-panel p-4">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">{metric.label}</span>
                    <span className="grid size-8 place-items-center rounded-xl" style={{ color: metric.color, background: `${metric.color}16` }}>
                      <metric.icon className="size-3.5" />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{metric.value}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--color-success)]"><ArrowUpRight className="size-3" /> {metric.change} vs last week</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 px-4 pb-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)] xl:px-5 xl:pb-5">
              <div className="premium-panel p-5">
                <div className="flex items-center justify-between">
                  <span>
                    <strong className="block text-sm">Performance overview</strong>
                    <small className="text-[10px] text-[var(--color-fg-subtle)]">Cross-platform signal</small>
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[9px] text-[var(--color-fg-muted)]">This week</span>
                </div>
                <div className="mt-8 flex h-52 items-end gap-2 border-b border-l border-[var(--color-border)] px-3 pt-4">
                  {chartHeights.map((height, index) => (
                    <div key={index} className="group relative flex-1">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-blue-600/35 via-blue-500/65 to-cyan-400 shadow-[0_0_18px_rgba(56,189,248,0.14)] transition-transform group-hover:-translate-y-1"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-[9px] text-[var(--color-fg-subtle)]">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="premium-panel p-5">
                  <div className="flex items-center gap-2">
                    <AILogo size={24} animate />
                    <div>
                      <strong className="block text-sm">AI opportunity</strong>
                      <small className="text-[10px] text-[var(--color-fg-subtle)]">Grounded recommendation</small>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-[var(--color-fg-muted)]">
                    Short-form video is outperforming the account baseline. Shift the next two evening slots toward that format.
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-[10px]">
                    <span className="text-[var(--color-fg-subtle)]">Confidence</span>
                    <span className="font-semibold text-[var(--color-success)]">High</span>
                  </div>
                </div>

                <div className="premium-panel flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-[var(--color-success-muted)] text-[var(--color-success)]">
                      <ShieldCheck className="size-5" />
                    </span>
                    <span>
                      <strong className="block text-sm">Source coverage</strong>
                      <small className="text-[10px] text-[var(--color-fg-subtle)]">Provider availability</small>
                    </span>
                  </div>
                  <strong className="text-2xl tracking-[-0.04em]">93%</strong>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </Section>
  );
}
