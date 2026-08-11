import { type ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation, m, useReducedMotion, type Variants } from "framer-motion";
import { usePersonalization } from "../features/personalization";

const routeVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(5px)" },
};

const staggerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.055, delayChildren: 0.025 } },
  exit: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -5, scale: 0.992 },
};

export function MotionV2Provider({ children }: { children: ReactNode }) {
  const { preferences } = usePersonalization();
  const reducedMotion = preferences.motionIntensity === "reduced"
    ? "always"
    : preferences.motionIntensity === "full"
      ? "never"
      : "user";

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig
        reducedMotion={reducedMotion}
        transition={{ duration: preferences.motionIntensity === "full" ? 0.34 : 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

export function RouteTransition({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <m.div
      key={routeKey}
      className="flex min-h-full flex-1 flex-col"
      variants={prefersReducedMotion ? undefined : routeVariants}
      initial={prefersReducedMotion ? false : "initial"}
      animate="animate"
      exit="exit"
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  );
}

export function MotionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} variants={staggerVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </m.div>
  );
}

export function MotionItem({ children, className }: { children: ReactNode; className?: string }) {
  return <m.div className={className} variants={itemVariants}>{children}</m.div>;
}
