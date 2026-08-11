import { GlassButton } from "@components/glass/GlassButton";
import { GlassCard } from "@components/glass/GlassCard";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-[var(--spacing-6)]">
      <GlassCard className="!p-[var(--spacing-10)] max-w-lg w-full text-center">
        <div className="flex justify-center mb-[var(--spacing-6)]">
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-full bg-[var(--color-glass)] border border-[var(--color-glass-border)]">
              <Search className="size-10 text-[var(--color-fg-muted)]" aria-hidden="true" />
            </div>
          </div>
        </div>
        <h1 className="text-[var(--font-size-4xl)] md:text-[var(--font-size-5xl)] font-[var(--font-weight-bold)] tracking-tight mb-[var(--spacing-2)]">404</h1>
        <h2 className="text-[var(--font-size-xl)] font-[var(--font-weight-semibold)] mb-[var(--spacing-3)]">Page Not Found</h2>
        <p className="text-[var(--color-fg-muted)] text-[var(--font-size-sm)] mb-[var(--spacing-8)] max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved. Check the URL or head back home.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-[var(--spacing-3)]">
          <GlassButton variant="primary" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Go Back
          </GlassButton>
          <GlassButton variant="secondary" onClick={() => navigate("/dashboard")}>
            <Home className="size-4" aria-hidden="true" />
            Dashboard
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}
