import { lazy, memo, Suspense, type ReactNode } from "react";
import { cn } from "@utils";
import { useReducedMotion } from "framer-motion";

const LazyAtropos = lazy(() => import("atropos/react"));

export interface AtroposCardProps {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
  rotation?: number;
  shadow?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}

function StaticAtroposCard({
  children,
  className,
}: Pick<AtroposCardProps, "children" | "className">) {
  return (
    <div className={cn("atropos-card group relative block h-full rounded-3xl overflow-hidden", className)}>
      {children}
    </div>
  );
}

export const AtroposCard = memo(function AtroposCard({
  children,
  className,
  enabled = true,
  rotation = 8,
  shadow = true,
  highlight = true,
  onClick,
}: AtroposCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldUseAtropos = enabled && !prefersReducedMotion;
  const rootClassName = cn(
    "atropos-card group relative block h-full rounded-3xl overflow-hidden transition-all duration-500",
    onClick ? "cursor-pointer" : undefined,
    className,
  );

  if (!shouldUseAtropos) {
    return <StaticAtroposCard className={rootClassName}>{children}</StaticAtroposCard>;
  }

  return (
    <Suspense fallback={<StaticAtroposCard className={rootClassName}>{children}</StaticAtroposCard>}>
      <LazyAtropos
        className={rootClassName}
        innerClassName="relative h-full rounded-[inherit] overflow-hidden"
        rotateXMax={rotation}
        rotateYMax={rotation}
        activeOffset={35}
        shadowScale={1.02}
        duration={350}
        highlight={highlight}
        rotateTouch
        alwaysActive={false}
        shadow={shadow}
        data-onclick={onClick ? "true" : undefined}
      >
        <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}>
          {children}
        </div>
      </LazyAtropos>
    </Suspense>
  );
});
