import type { Variants } from "framer-motion";

/**
 * Reusable motion configuration for NEXPULSE AI.
 *
 * Centralized animation tokens ensure consistent motion language
 * across the entire application. Import presets from this module
 * rather than defining inline animations.
 */

// Easing curves
export const easing = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1],
} as const;

// Spring presets
export const spring = {
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  wobbly: { type: "spring" as const, stiffness: 180, damping: 12 },
  stiff: { type: "spring" as const, stiffness: 300, damping: 20 },
  slow: { type: "spring" as const, stiffness: 100, damping: 20 },
} as const;

// Animation durations (in seconds)
export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  page: 0.5,
} as const;

// Page transition variants
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

// Fade variants
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Stagger variants
export const stagger: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// Hover variants
export const hover = {
  scale: { scale: 1.02 },
  lift: { y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" },
  glow: { boxShadow: "0 0 20px rgba(99,102,241,0.3)" },
} as const;

// Modal variants
export const modal: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Drawer variants
export const drawer = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
  } as Variants,
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  } as Variants,
  top: {
    initial: { y: "-100%" },
    animate: { y: 0 },
    exit: { y: "-100%" },
  } as Variants,
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  } as Variants,
};
