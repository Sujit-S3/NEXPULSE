import { cn } from "@utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";
type StatusType = "online" | "offline" | "away" | "busy";

interface GlassAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  status?: StatusType;
  className?: string;
}

const sizeMap: Record<AvatarSize, { avatar: string; status: string }> = {
  sm: {
    avatar: "size-8 text-[var(--font-size-xs)]",
    status: "size-2.5 border-2",
  },
  md: {
    avatar: "size-10 text-[var(--font-size-sm)]",
    status: "size-3 border-2",
  },
  lg: {
    avatar: "size-12 text-[var(--font-size-base)]",
    status: "size-3.5 border-[3px]",
  },
  xl: {
    avatar: "size-16 text-[var(--font-size-xl)]",
    status: "size-4 border-[3px]",
  },
};

const statusColorMap: Record<StatusType, string> = {
  online: "bg-[var(--color-success)]",
  offline: "bg-[var(--color-fg-subtle)]",
  away: "bg-[var(--color-warning)]",
  busy: "bg-[var(--color-error)]",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function GlassAvatar({
  src,
  alt = "",
  fallback,
  size = "md",
  status,
  className,
}: GlassAvatarProps) {
  const initials = fallback ? getInitials(fallback) : "?";

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            "rounded-full object-cover bg-[var(--color-bg-surface)]",
            sizeMap[size].avatar,
          )}
        />
      ) : (
        <span
          className={cn(
            "rounded-full inline-flex items-center justify-center font-[var(--font-weight-semibold)] bg-[var(--color-glass)] border border-[var(--color-glass-border)] text-[var(--color-fg-muted)]",
            sizeMap[size].avatar,
          )}
          aria-label={alt || fallback || "Avatar"}
        >
          {initials}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-[var(--color-bg)]",
            statusColorMap[status],
            sizeMap[size].status,
          )}
          aria-label={status}
        />
      )}
    </div>
  );
}
