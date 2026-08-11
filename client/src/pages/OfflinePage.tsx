import { useState, useEffect } from "react";
import { GlassButton } from "@components/glass/GlassButton";
import { GlassCard } from "@components/glass/GlassCard";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflinePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-bg)]/90 backdrop-blur-sm p-[var(--spacing-6)]">
      <GlassCard className="!p-[var(--spacing-10)] max-w-lg w-full text-center">
        <div className="flex justify-center mb-[var(--spacing-6)]">
          <div className="flex size-24 items-center justify-center rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <WifiOff className="size-10 text-[var(--color-warning)]" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-[var(--font-size-xl)] font-[var(--font-weight-semibold)] mb-[var(--spacing-3)]">No Internet Connection</h2>
        <p className="text-[var(--color-fg-muted)] text-[var(--font-size-sm)] mb-[var(--spacing-8)] max-w-sm mx-auto">
          You appear to be offline. Please check your connection and try again.
        </p>
        <GlassButton variant="primary" onClick={handleRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </GlassButton>
      </GlassCard>
    </div>
  );
}
