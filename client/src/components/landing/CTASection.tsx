import { ScrollReveal } from "@components/effects/ScrollReveal";
import { AtroposCard } from "@components/ui/AtroposCard";
import { useTheme } from "@theme/useTheme";
import { cn } from "@utils";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  return (
    <section id="cta" className="py-28 relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-4">
        <ScrollReveal>
          <AtroposCard className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl transition-all duration-500">
            {/* Layered background */}
            <div data-atropos-offset="-6" className={cn(
              "absolute inset-0",
              isLight
                ? "bg-gradient-to-br from-sky-50 via-white to-blue-50"
                : "bg-gradient-to-br from-[#0d1220] via-[#0a0f1e] to-[#080c18]"
            )} />

            {/* Volumetric orbs */}
            <div data-atropos-offset="12" className="absolute top-[-30%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none bg-blue-500/15" />
            <div data-atropos-offset="12" className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[80px] pointer-events-none bg-sky-500/12" />
            <div data-atropos-offset="12" className="absolute top-[30%] left-[40%] w-[300px] h-[200px] rounded-full blur-[80px] pointer-events-none bg-cyan-500/08" />

            {/* Border */}
            <div data-atropos-offset="-3" className={cn(
              "absolute inset-0 rounded-3xl",
              isLight ? "ring-1 ring-blue-200/60" : "ring-1 ring-white/08"
            )} />

            {/* Top highlight */}
            <div data-atropos-offset="-3" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" aria-hidden="true" />

            {/* Content */}
            <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-6",
                  isLight ? "bg-blue-50 border-blue-200/60 text-blue-600" : "bg-blue-500/10 border-blue-500/25 text-blue-400"
                )} data-atropos-offset="10">
                  <Sparkles className="size-3" />
                  Start your free trial
                </div>

                <h2 data-atropos-offset="4" className={cn("text-4xl md:text-5xl font-extrabold tracking-tight mb-5", isLight ? "text-slate-900" : "text-white")}>
                  Ready to transform your
                  <br />
                  <span className="hero-gradient-text">social presence?</span>
                </h2>

                <p data-atropos-offset="5" className={cn("text-lg max-w-xl mx-auto mb-10 leading-relaxed", isLight ? "text-slate-500" : "text-white/45")}>
                  Connect a provider account, choose exactly which pages or channels to use, and analyze only the data those providers return.
                </p>

                <div data-atropos-offset="8" className="flex flex-wrap items-center justify-center gap-4">
                  <a href="/get-started">
                    <motion.div
                      className="hero-cta-primary group"
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    >
                      <span className="hero-cta-primary-glow" aria-hidden="true" />
                      <span className="hero-cta-primary-sweep" aria-hidden="true" />
                      <span className="relative z-10 flex items-center gap-2 font-semibold text-sm text-white">
                        Get Started Free
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </motion.div>
                  </a>

                  <a
                    href="/login"
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-semibold transition-all duration-200 hover:scale-103",
                      isLight
                        ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "border-white/12 text-white/70 hover:bg-white/05 hover:text-white"
                    )}
                  >
                    Sign In
                  </a>
                </div>
              </motion.div>
            </div>
          </AtroposCard>
        </ScrollReveal>
      </div>
    </section>
  );
}
