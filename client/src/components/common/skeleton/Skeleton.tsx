import { cn } from "../../../utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "circle" | "chart";
}

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-[var(--color-glass-border)]",
        variant === "text" && "h-4 w-full",
        variant === "card" && "h-32 w-full",
        variant === "circle" && "size-10 rounded-full",
        variant === "chart" && "h-48 w-full",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function KPISkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-[var(--spacing-4)] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-xl)] p-[var(--spacing-4)] space-y-[var(--spacing-3)]">
          <div className="flex items-center justify-between">
            <Skeleton className="size-8 rounded-[var(--radius-md)]" />
            <Skeleton className="w-14 h-6" />
          </div>
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-24 h-6" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-xl)] p-[var(--spacing-4)]", className)}>
      <Skeleton className="w-32 h-4 mb-[var(--spacing-4)]" />
      <Skeleton variant="chart" className="rounded-[var(--radius-lg)]" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-xl)] p-[var(--spacing-4)] space-y-[var(--spacing-3)]">
      <div className="flex items-center justify-between mb-[var(--spacing-4)]">
        <Skeleton className="w-28 h-5" />
        <Skeleton className="w-16 h-4" />
      </div>
      <div className="border-b border-[var(--color-border)] pb-[var(--spacing-3)]">
        <div className="flex gap-[var(--spacing-4)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-[var(--spacing-4)] py-[var(--spacing-2)]">
          {Array.from({ length: 6 }).map((_, j) => (
            <Skeleton key={j} className={`h-4 ${j === 0 ? "w-20" : j === 1 ? "flex-[2]" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
