import { type ReactNode } from "react";
import { cn } from "@utils";
import { motion } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  as?: "div" | "section" | "article" | "span";
}

export function ScrollReveal({
  children,
  className,
  direction = "up",
  delay = 0,
  duration = 0.5,
  distance = 24,
  once = true,
  as: Tag = "div",
}: ScrollRevealProps) {
  return (
    <motion.div
      className={cn(Tag === "span" ? "inline-block" : undefined, className)}
      initial={{
        opacity: 0,
        ...(direction !== "none" && {
          [direction === "up" || direction === "down" ? "y" : "x"]: distance * (direction === "down" || direction === "right" ? -1 : 1),
        }),
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{ once, margin: "-60px" }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
