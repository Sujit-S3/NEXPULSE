import { useEffect, useState } from "react";
import { AILogo } from "@components/common";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { GlassButton } from "@components/glass/GlassButton";
import { Check, Zap, Building2, Users, Calculator, ShieldCheck } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  period: string;
  description: string;
  icon: typeof Users;
  iconColor: string;
  iconBg: string;
  highlighted: boolean;
  badge?: string;
  cta: string;
  ctaVariant: "primary" | "secondary";
  features: string[];
  missing: string[];
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Starter",
    monthlyPrice: 0,
    annualPrice: 0,
    period: "forever",
    description: "For individuals and small teams exploring social analytics.",
    icon: Users,
    iconColor: "var(--color-fg-muted)",
    iconBg: "var(--color-glass)",
    highlighted: false,
    cta: "Start Free",
    ctaVariant: "secondary",
    features: [
      "Up to 3 social platforms",
      "7-day analytics history",
      "Basic performance reports",
      "Scheduled posts (10/month)",
      "Email support",
      "Community access",
    ],
    missing: ["AI insights", "Team collaboration", "Custom reports", "API access"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 3999,
    annualPrice: 3199,
    period: "per month, billed annually",
    description: "For growing brands that need AI-powered insights and automation.",
    icon: Zap,
    iconColor: "var(--color-accent-hover)",
    iconBg: "rgba(96,165,250,0.15)",
    highlighted: true,
    badge: "Most Popular",
    cta: "Continue with Razorpay",
    ctaVariant: "primary",
    features: [
      "Unlimited social platforms",
      "90-day analytics history",
      "AI-powered recommendations",
      "Advanced performance reports",
      "Unlimited scheduled posts",
      "Team collaboration (5 seats)",
      "Priority support",
      "Custom dashboards",
    ],
    missing: ["White-label reports", "Dedicated CSM"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    period: "custom pricing",
    description: "For agencies and enterprises requiring scale, compliance, and dedicated support.",
    icon: Building2,
    iconColor: "var(--color-blue)",
    iconBg: "var(--color-blue-muted)",
    highlighted: false,
    cta: "Contact Sales",
    ctaVariant: "secondary",
    features: [
      "Everything in Pro",
      "Unlimited team seats",
      "White-label reports",
      "Dedicated Customer Success Manager",
      "Custom AI model configuration",
      "SLA guarantee (99.9% uptime)",
      "SSO / SAML authentication",
      "Full API access",
      "Data export & compliance",
    ],
    missing: [],
  },
];

function CustomEnterpriseEstimator() {
  const [seats, setSeats] = useState(25);
  const [events, setEvents] = useState(1000); // in thousands
  const [showQuote, setShowQuote] = useState(false);

  const baseSeatPrice = 32;
  const eventPricePer500k = 150;
  const estimatedTotal = Math.round(seats * baseSeatPrice + (events / 500) * eventPricePer500k);

  return (
    <div className="mt-16 rounded-2xl bg-[var(--color-glass)] border border-[var(--color-glass-border)] p-6 md:p-8 backdrop-blur-md relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-blue)]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="grid md:grid-cols-12 gap-8 items-center relative z-10">
        <div className="md:col-span-7 space-y-6">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-accent)] uppercase tracking-wider">
            <Calculator className="size-4" />
            <span>Interactive Enterprise Estimator</span>
          </div>

          <div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-fg)]">
              Configure Your Custom Organization Scale
            </h3>
            <p className="text-sm text-[var(--color-fg-muted)] mt-1">
              Need more seats or high-frequency telemetry? Adjust sliders below for an instant preliminary quote.
            </p>
          </div>

          <div className="space-y-5">
            {/* Seats Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[var(--color-fg)]">Team Member Seats</span>
                <span className="font-mono font-bold text-[var(--color-accent)]">{seats} seats</span>
              </div>
              <input
                aria-label="Team member seats"
                type="range"
                min="10"
                max="250"
                step="5"
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-fg-subtle)] font-mono">
                <span>10 Seats</span>
                <span>100 Seats</span>
                <span>250+ Seats</span>
              </div>
            </div>

            {/* Telemetry Volume Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[var(--color-fg)]">Monthly Telemetry Volume</span>
                <span className="font-mono font-bold text-[var(--color-accent)]">{events >= 1000 ? `${(events / 1000).toFixed(1)}M` : `${events}K`} events/mo</span>
              </div>
              <input
                aria-label="Monthly telemetry volume"
                type="range"
                min="250"
                max="10000"
                step="250"
                value={events}
                onChange={(e) => setEvents(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-fg-subtle)] font-mono">
                <span>250K Events</span>
                <span>5M Events</span>
                <span>10M+ Events</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quote Output Box */}
        <div className="md:col-span-5 bg-[var(--color-bg)]/80 border border-white/10 rounded-xl p-6 text-center space-y-4 shadow-inner">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-mono font-bold">
            <AILogo size={14} animate className="text-[var(--color-success)]" />
            <span>AI Telemetry Optimized</span>
          </div>

          <div>
            <div className="text-3xl md:text-4xl font-extrabold font-mono text-[var(--color-fg)]">
              ${estimatedTotal.toLocaleString()}
              <span className="text-xs font-normal text-[var(--color-fg-muted)]"> / mo</span>
            </div>
            <p className="text-xs text-[var(--color-fg-subtle)] mt-1">
              Includes dedicated SOC2 environment & white-glove onboarding
            </p>
          </div>

          {showQuote ? (
            <div className="p-3 rounded-lg bg-[var(--color-success)]/15 border border-[var(--color-success)]/30 text-xs text-[var(--color-success)] font-semibold flex items-center justify-center gap-2">
              <ShieldCheck className="size-4 shrink-0" />
              <span>Quote request dispatched to our Enterprise Solutions team!</span>
            </div>
          ) : (
            <GlassButton
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={() => setShowQuote(true)}
            >
              Request Custom Quote
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );
}

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const [professionalPrice, setProfessionalPrice] = useState({ monthly: 3999, annual: 3199 });
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    const baseUrl = import.meta.env["VITE_API_URL"] ?? "http://localhost:4000";
    const controller = new AbortController();
    fetch(`${baseUrl}/api/v1/billing/plans`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json() as {
          data?: {
            currency?: string;
            plans?: {
              id: string;
              prices: {
                monthly: { amountMinor: number | null };
                annual: { amountMinor: number | null };
              };
            }[];
          };
        };
        const professional = body.data?.plans?.find((plan) => plan.id === "professional");
        const monthly = professional?.prices.monthly.amountMinor;
        const annual = professional?.prices.annual.amountMinor;
        if (typeof monthly === "number" && typeof annual === "number") {
          setProfessionalPrice({ monthly: monthly / 100, annual: annual / 1200 });
        }
        if (body.data?.currency) setCurrency(body.data.currency);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(96,165,250,0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-5"
              style={{
                background: "rgba(96,165,250,0.1)",
                borderColor: "rgba(96,165,250,0.2)",
                color: "var(--color-accent-hover)",
              }}
            >
              <Zap className="size-3" aria-hidden="true" />
              Transparent Pricing
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Simple plans for ambitious teams
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-fg-muted)]">
              Start free with basic analytics. Upgrade for AI insights, real-time telemetry, and automated reporting.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 bg-[var(--color-glass)] p-1.5 rounded-full border border-[var(--color-glass-border)] backdrop-blur-md shadow-sm">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                }`}
                type="button"
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                }`}
                type="button"
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-success)] text-white text-[10px] font-bold tracking-tight animate-pulse">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6 items-stretch">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const displayPrice =
              plan.monthlyPrice === null
                ? null
                : plan.id === "pro"
                ? professionalPrice[billingCycle]
                : billingCycle === "annual"
                ? plan.annualPrice
                : plan.monthlyPrice;
            const formattedPrice = displayPrice === null
              ? null
              : new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: plan.id === "pro" ? currency : "INR",
                maximumFractionDigits: 0,
              }).format(displayPrice);

            return (
              <ScrollReveal key={plan.id} delay={i * 0.1} className="flex">
                <article
                  className={`pricing-plan-card relative flex w-full flex-col overflow-hidden rounded-[28px] border p-8 backdrop-blur-xl transition-all duration-300 ${
                    plan.highlighted
                      ? "border-[var(--color-accent)] bg-[var(--color-glass-hover)] shadow-[0_24px_70px_rgba(37,99,235,0.2)] lg:-translate-y-2"
                      : "border-[var(--color-glass-border)] bg-[var(--color-glass)] hover:border-[var(--color-border-strong)] hover:shadow-xl"
                  }`}
                >
                  <div className="pricing-plan-aura" aria-hidden="true" />
                  <div className="relative z-10 flex h-full flex-col">
                    {plan.badge && (
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                        {plan.badge}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="size-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: plan.iconBg, color: plan.iconColor }}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[var(--color-fg)]">{plan.name}</h3>
                        <p className="text-xs text-[var(--color-fg-subtle)]">{plan.description}</p>
                      </div>
                    </div>

                    <div className="my-6 border-b border-[var(--color-border)]/50 pb-6">
                      {displayPrice !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl md:text-5xl font-extrabold font-mono text-[var(--color-fg)]">
                            {formattedPrice}
                          </span>
                          <span className="text-xs text-[var(--color-fg-muted)] font-medium">
                            {billingCycle === "annual" ? "/mo (billed annually)" : "/month"}
                          </span>
                        </div>
                      ) : (
                        <div className="text-3xl font-extrabold font-mono text-[var(--color-fg)] py-1">
                          Custom
                        </div>
                      )}
                    </div>

                    <div className="mb-8 flex-1 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                        Included features:
                      </p>
                      <ul className="space-y-2.5 text-sm text-[var(--color-fg)]">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5">
                            <Check className="size-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                            <span className="text-xs font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a
                      href={
                        plan.id === "pro"
                          ? `/register?plan=professional&cycle=${billingCycle}`
                          : "/register"
                      }
                      className="mt-auto"
                    >
                      <GlassButton
                        variant={plan.ctaVariant}
                        size="lg"
                        className="w-full justify-center font-semibold"
                      >
                        {plan.cta}
                      </GlassButton>
                    </a>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Custom Enterprise Estimator */}
        <ScrollReveal delay={0.4}>
          <CustomEnterpriseEstimator />
        </ScrollReveal>
      </div>
    </section>
  );
}
