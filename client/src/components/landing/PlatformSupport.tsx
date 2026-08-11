import { useEffect, useState } from "react";
import { Section } from "@components/common/Section";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import type { OAuthProvider } from "../../types";

export function PlatformSupport() {
  const [providers, setProviders] = useState<OAuthProvider[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const baseURL = import.meta.env["VITE_API_URL"] ?? "http://localhost:4000";
    void fetch(`${baseURL}/api/v1/platforms/providers`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Provider availability failed");
        const payload = await response.json() as { data: OAuthProvider[] };
        setProviders(payload.data);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <Section
      id="platforms"
      title="Backend-configured OAuth providers"
      subtitle="This list comes from the NEXPULSE API. A provider appears only when its server-side OAuth configuration is available."
    >
      <div className="mx-auto max-w-5xl px-4">
        <ScrollReveal>
          <div className="rounded-3xl border border-[var(--color-glass-border)] bg-[var(--color-glass)] p-6 shadow-2xl backdrop-blur-xl md:p-10">
            {providers === null && !error ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading configured providers">
                {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[var(--color-bg-surface)]" />)}
              </div>
            ) : error ? (
              <div role="alert" className="rounded-2xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-5 text-sm text-[var(--color-error)]">
                Provider availability could not be loaded from the API.
              </div>
            ) : !providers?.length ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center">
                <Link2 className="mx-auto size-8 text-[var(--color-fg-subtle)]" />
                <h3 className="mt-3 font-semibold">No OAuth providers configured</h3>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">NEXPULSE does not advertise unavailable provider connections.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((provider) => (
                  <article key={provider.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]/60 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-accent-muted)] text-sm font-bold text-[var(--color-accent)]">
                        {provider.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h3 className="font-semibold">{provider.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-success)]"><CheckCircle2 className="size-3" /> OAuth configured</p>
                      </div>
                    </div>
                    <p className="mt-3 flex items-start gap-2 text-xs text-[var(--color-fg-muted)]"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Accounts are returned by the provider and require explicit user selection.</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </Section>
  );
}
