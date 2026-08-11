import { LoadingLogo } from "./BrandLogo";

export function LoadingOverlay({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-6">
        <LoadingLogo size={64} />
        <p className="text-sm text-[var(--color-fg-muted)]">{label}</p>
      </div>
    </div>
  );
}
