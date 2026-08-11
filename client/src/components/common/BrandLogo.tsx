import { useContext } from "react";
import { ThemeContext } from "@theme/ThemeContext";
import { cn } from "@utils";
import { AssistantLogo as AIAssistantAsset, getThemeLogo } from "@/brand";

export type BrandLogoVariant = "primary" | "badge" | "loading" | "assistant";

export interface BrandLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number | string;
  showText?: boolean;
  textClassName?: string;
  glow?: boolean;
  variant?: BrandLogoVariant;
  forceTheme?: "light" | "dark" | "primary";
  isAIFeature?: boolean;
}

const sizeMap: Record<string, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
  "2xl": "size-20",
};

function logoStyle(size: BrandLogoProps["size"]) {
  if (typeof size === "number") return { width: size, height: size };
  if (typeof size === "string" && !sizeMap[size]) return { width: size, height: size };
  return undefined;
}

function useResolvedTheme(forceTheme?: string): string {
  const ctx = useContext(ThemeContext);
  if (forceTheme) return forceTheme;
  return ctx?.resolved ?? "dark";
}

export function BrandLogo({
  className,
  size = "md",
  showText = true,
  textClassName,
  glow = true,
  variant = "primary",
  forceTheme,
  isAIFeature = false,
}: BrandLogoProps) {
  const theme = useResolvedTheme(forceTheme);
  const light = theme === "light";
  const customStyle = logoStyle(size);

  const logoSrc = isAIFeature || variant === "assistant"
    ? AIAssistantAsset
    : getThemeLogo(theme);

  return (
    <div className={cn("brand-logo group inline-flex select-none items-center gap-2.5", className)}>
      <span
        style={customStyle}
        className={cn(
          "brand-logo-mark relative inline-flex shrink-0 items-center justify-center",
          !customStyle && sizeMap[String(size)],
          light ? "brand-logo-mark-light" : "brand-logo-mark-dark",
          glow && "brand-logo-mark-glow",
          variant === "loading" && "animate-[logo-breathe_2.5s_ease-in-out_infinite]",
        )}
      >
        <img
          src={logoSrc}
          alt={showText ? "" : "NEXPULSE AI"}
          draggable={false}
          className="brand-logo-image size-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {variant === "loading" && <span className="brand-logo-loading-ring" aria-hidden="true" />}
      </span>

      {showText && (
        <span className={cn("brand-wordmark inline-flex items-baseline text-left", textClassName)}>
          <span className={cn("text-base font-extrabold leading-none tracking-[0.075em]", light ? "text-slate-950" : "text-white")}>
            NEXPULSE
          </span>
          <span className="brand-wordmark-ai ml-1.5 text-base font-extrabold leading-none">AI</span>
        </span>
      )}
    </div>
  );
}

export function AILogo({
  className,
  size = 18,
  animate = false,
}: {
  className?: string;
  size?: number | string;
  animate?: boolean;
}) {
  return (
    <span className={cn("brand-logo-compact inline-flex shrink-0 items-center justify-center", animate && "brand-logo-active", className)}>
      <img
        src={AIAssistantAsset}
        alt="NEXPULSE AI Assistant"
        aria-hidden="true"
        draggable={false}
        style={{ width: size, height: size }}
        className="brand-logo-image object-contain"
      />
    </span>
  );
}

export function AssistantLogo({
  className,
  size = 24,
  active = false,
}: {
  className?: string;
  size?: number;
  active?: boolean;
}) {
  return <AILogo className={cn(active && "brand-logo-active", className)} size={size} animate={active} />;
}

export function SidebarLogo({
  className,
  size = 32,
  glow = true,
}: {
  className?: string;
  size?: number | string;
  glow?: boolean;
}) {
  const theme = useResolvedTheme();
  return (
    <span className={cn("brand-logo-compact inline-flex shrink-0 items-center justify-center", glow && "brand-logo-active", className)}>
      <img
        src={getThemeLogo(theme)}
        alt="NEXPULSE AI"
        aria-hidden="true"
        draggable={false}
        style={{ width: size, height: size }}
        className="brand-logo-image object-contain"
      />
    </span>
  );
}

export function LoadingLogo({
  className,
  size = 80,
}: {
  className?: string;
  size?: number | string;
}) {
  const theme = useResolvedTheme();
  return (
    <span
      className={cn("brand-logo-mark brand-logo-active relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={getThemeLogo(theme)}
        alt="NEXPULSE AI loading"
        draggable={false}
        className="brand-logo-image relative z-10 size-full object-contain animate-[logo-breathe_2.5s_ease-in-out_infinite]"
      />
      <span className="brand-logo-loading-ring" aria-hidden="true" />
    </span>
  );
}
