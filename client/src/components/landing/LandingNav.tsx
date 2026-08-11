import { useEffect, useState } from "react";
import { BrandLogo } from "@components/common/BrandLogo";
import { ThemeToggle } from "@components/common/ThemeToggle";
import { cn } from "@utils";
import { ArrowRight } from "lucide-react";

const navLinks = ["Features", "Dashboard", "AI", "Pricing", "FAQ"];

export function LandingNav() {
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const update = () => setAtTop(window.scrollY < 20);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 flex items-center px-5 md:px-10 transition-all duration-300",
        atTop
          ? "bg-transparent"
          : "landing-nav-glass"
      )}
    >
      {/* Gradient border bottom — only when scrolled */}
      {!atTop && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" aria-hidden="true" />
      )}

      {/* Logo */}
      <a href="/" className="flex items-center shrink-0">
        <BrandLogo size="md" showText={true} />
      </a>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8 ml-12">
        {navLinks.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors duration-150 font-medium"
          >
            {item}
          </a>
        ))}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle variant="minimal" />

        <a
          href="/login"
          className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          Log in
        </a>

        <a href="/get-started">
          <div className="landing-nav-cta group">
            <span className="relative z-10 flex items-center gap-1.5 text-sm font-semibold text-white">
              Get Started
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </a>
      </div>
    </nav>
  );
}
