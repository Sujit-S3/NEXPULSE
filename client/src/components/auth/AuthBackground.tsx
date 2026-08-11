import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function AuthBackground() {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springX = useSpring(mouseX, { stiffness: 30, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 25 });

  const orb1X = useTransform(springX, [0, 1], ["-6%", "6%"]);
  const orb1Y = useTransform(springY, [0, 1], ["-6%", "6%"]);
  const orb2X = useTransform(springX, [0, 1], ["8%", "-8%"]);
  const orb2Y = useTransform(springY, [0, 1], ["8%", "-8%"]);
  const orb3X = useTransform(springX, [0, 1], ["-5%", "5%"]);
  const orb3Y = useTransform(springY, [0, 1], ["5%", "-5%"]);
  const orb4X = useTransform(springX, [0, 1], ["4%", "-4%"]);
  const orb4Y = useTransform(springY, [0, 1], ["-3%", "3%"]);
  const orb5X = useTransform(springX, [0, 1], ["-3%", "3%"]);
  const orb5Y = useTransform(springY, [0, 1], ["-5%", "5%"]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <div className="auth-bg fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 auth-base-gradient" />
      <div className="absolute inset-0 auth-light-sweep" />
      <motion.div className="absolute auth-orb auth-orb-primary" style={{ x: orb1X, y: orb1Y }} />
      <motion.div className="absolute auth-orb auth-orb-secondary" style={{ x: orb2X, y: orb2Y }} />
      <motion.div className="absolute auth-orb auth-orb-accent" style={{ x: orb3X, y: orb3Y }} />
      <motion.div className="absolute auth-orb auth-orb-fourth" style={{ x: orb4X, y: orb4Y }} />
      <motion.div className="absolute auth-orb auth-orb-fifth" style={{ x: orb5X, y: orb5Y }} />
      <div className="absolute inset-0 auth-fog" />
      <div className="absolute auth-ray auth-ray-1" />
      <div className="absolute auth-ray auth-ray-2" />
      <div className="absolute inset-0 auth-noise" />
      <div className="absolute inset-0 auth-grid" />
    </div>
  );
}

export function AuthParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; opacityDir: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        opacityDir: Math.random() > 0.5 ? 1 : -1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacityDir * 0.003;
        if (p.opacity > 0.5 || p.opacity < 0.05) p.opacityDir *= -1;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 196, 255, ${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}
