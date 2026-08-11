import { useEffect } from "react";
import { GlassCard } from "@components/glass/GlassCard";
import { Wrench, RefreshCw } from "lucide-react";

const AUTO_REFRESH_INTERVAL_MS = 30_000;

export function MaintenancePage() {
  useEffect(() => {
    const timer = window.setInterval(() => window.location.reload(), AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-[var(--spacing-6)]">
      <GlassCard className="!p-[var(--spacing-10)] max-w-lg w-full text-center">
        <div className="flex justify-center mb-[var(--spacing-6)]">
          <div className="flex size-24 items-center justify-center rounded-full bg-[var(--color-glass)] border border-[var(--color-glass-border)]">
            <Wrench className="size-10 text-[var(--color-fg-muted)]" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-[var(--font-size-xl)] font-[var(--font-weight-semibold)] mb-[var(--spacing-3)]">Under Maintenance</h2>
        <p className="text-[var(--color-fg-muted)] text-[var(--font-size-sm)] mb-[var(--spacing-8)] max-w-sm mx-auto">
          We're performing scheduled maintenance to improve your experience. We'll be back shortly.
        </p>
        <div className="flex items-center justify-center gap-[var(--spacing-2)] text-[var(--font-size-xs)] text-[var(--color-fg-muted)]">
          <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
          <span>Auto-refreshing...</span>
        </div>
      </GlassCard>
    </div>
  );
}
