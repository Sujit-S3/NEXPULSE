import { type Variants, type Transition } from "framer-motion";

/**
 * Consistent Framer Motion transitions and animation presets for NEXPULSE AI.
 * Flagship SaaS motion system inspired by Arc Browser, Linear, and Vercel.
 */

export const springTransition: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 25,
  mass: 0.8,
};

export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
};

export const snappySpring: Transition = {
  type: "spring",
  stiffness: 450,
  damping: 30,
};

export const modalReveal: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

export const slideOverReveal: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 350, damping: 30 },
  },
  exit: {
    opacity: 0,
    x: 40,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

export const staggerContainer = (staggerChildren = 0.07, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition,
  },
};

export const fadeInUp = (distance = 20, duration = 0.4): Variants => ({
  hidden: { opacity: 0, y: distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration, ease: [0.16, 1, 0.3, 1] },
  },
});

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

export const hoverCardVariants = {
  hover: {
    y: -4,
    scale: 1.015,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  tap: {
    scale: 0.985,
  },
};

export const buttonMotion = {
  whileHover: {
    scale: 1.025,
    y: -1,
    transition: { type: "spring", stiffness: 500, damping: 20 },
  },
  whileTap: {
    scale: 0.96,
    y: 0,
  },
};

export const pulseGlowVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.08, 1],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
};
