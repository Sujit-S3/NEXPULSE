import { useEffect } from "react";
import { useTheme } from "@theme/useTheme";
import { cn } from "@utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { getThemeLogo } from "@/brand";

export function AuthFloatingLogo() {
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const logoSrc = getThemeLogo(resolved);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 60, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 18 });

  const rotateX = useTransform(springY, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(springX, [-0.5, 0.5], ["-5deg", "5deg"]);
  const translateX = useTransform(springX, [-0.5, 0.5], ["-6px", "6px"]);
  const translateY = useTransform(springY, [-0.5, 0.5], ["-6px", "6px"]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5);
      mouseY.set((e.clientY / window.innerHeight) - 0.5);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="relative flex flex-col items-center select-none"
      initial={{ opacity: 0, y: -30, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
    >
      {/* 3D floating logo */}
      <motion.div
        className="relative"
        style={{
          rotateX,
          rotateY,
          x: translateX,
          y: translateY,
          transformStyle: "preserve-3d",
          perspective: "800px",
        }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Chrome glow halo */}
        <div className={cn("auth-logo-halo", isLight ? "auth-logo-halo-light" : "auth-logo-halo-dark")} />

        {/* Logo image */}
        <img
          src={logoSrc}
          alt="NEXPULSE AI"
          draggable={false}
          className="relative z-10 w-[100px] h-[100px] object-contain"
          style={{
            filter: isLight
              ? "saturate(1.08) contrast(1.08) drop-shadow(0 12px 30px rgba(37,99,235,0.25))"
              : "saturate(1.06) drop-shadow(0 0 24px rgba(56,189,248,0.38)) drop-shadow(0 12px 38px rgba(37,99,235,0.32))",
          }}
        />

        {/* Reflection beneath logo */}
        <div className="auth-logo-reflection" />
      </motion.div>

      {/* Ground shadow */}
      <motion.div
        className="auth-logo-shadow"
        animate={{ scaleX: [1, 0.85, 1], opacity: [0.4, 0.25, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Wordmark — 24px below logo */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={cn("auth-hero-title", isLight ? "auth-wordmark-light" : "auth-wordmark-dark")}>
          NEXPULSE{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 bg-clip-text text-transparent">AI</span>
        </div>
        <div className="auth-hero-subtitle mt-1.5">
          AI Operating System for Social Intelligence
        </div>
      </motion.div>
    </motion.div>
  );
}
