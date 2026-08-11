import { BrandLogo } from "@components/common";

export function FooterSection() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <div className="absolute left-1/4 right-1/4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/50 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <a href="/" className="inline-flex items-center"><BrandLogo size="md" showText /></a>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-fg-muted)]">
            Workspace- and account-scoped social analytics. Provider availability is reported by the configured NEXPULSE backend.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-fg-muted)]">
          <a href="/login" className="hover:text-[var(--color-fg)]">Sign in</a>
          <a href="/register" className="hover:text-[var(--color-fg)]">Register</a>
          <a href="/get-started" className="hover:text-[var(--color-fg)]">Get started</a>
        </nav>
      </div>
      <div className="border-t border-[var(--color-border)] px-4 py-5 text-center text-xs text-[var(--color-fg-subtle)]">
        &copy; {new Date().getFullYear()} NEXPULSE AI. No provider account is connected without explicit user selection.
      </div>
    </footer>
  );
}
