import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { HeroSection } from "@components/landing/HeroSection";
import { LandingNav } from "@components/landing/LandingNav";

const FeaturesSection = lazy(() =>
  import("@components/landing/FeaturesSection").then((m) => ({ default: m.FeaturesSection }))
);
const DashboardShowcase = lazy(() =>
  import("@components/landing/DashboardShowcase").then((m) => ({ default: m.DashboardShowcase }))
);
const AISection = lazy(() =>
  import("@components/landing/AISection").then((m) => ({ default: m.AISection }))
);
const PlatformSupport = lazy(() =>
  import("@components/landing/PlatformSupport").then((m) => ({ default: m.PlatformSupport }))
);
const PricingSection = lazy(() =>
  import("@components/landing/PricingSection").then((m) => ({ default: m.PricingSection }))
);
const FAQSection = lazy(() =>
  import("@components/landing/FAQSection").then((m) => ({ default: m.FAQSection }))
);
const FooterSection = lazy(() =>
  import("@components/landing/FooterSection").then((m) => ({ default: m.FooterSection }))
);
const CTASection = lazy(() =>
  import("@components/landing/CTASection").then((m) => ({ default: m.CTASection }))
);

function DeferredSection({
  children,
  sectionId,
  intrinsicHeight,
}: {
  children: ReactNode;
  sectionId: string;
  intrinsicHeight: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "-120px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={sectionId}
      className="landing-deferred-section"
      style={{ minHeight: visible ? undefined : intrinsicHeight }}
    >
      {visible ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}

export function Landing() {
  return (
    <div className="premium-landing min-h-screen overflow-hidden">
      <LandingNav />
      <HeroSection />
      <DeferredSection sectionId="features" intrinsicHeight={1000}><FeaturesSection /></DeferredSection>
      <DeferredSection sectionId="dashboard" intrinsicHeight={900}><DashboardShowcase /></DeferredSection>
      <DeferredSection sectionId="ai" intrinsicHeight={850}><AISection /></DeferredSection>
      <DeferredSection sectionId="platforms" intrinsicHeight={700}><PlatformSupport /></DeferredSection>
      <DeferredSection sectionId="pricing" intrinsicHeight={1500}><PricingSection /></DeferredSection>
      <DeferredSection sectionId="faq" intrinsicHeight={850}><FAQSection /></DeferredSection>
      <DeferredSection sectionId="start" intrinsicHeight={550}><CTASection /></DeferredSection>
      <DeferredSection sectionId="footer" intrinsicHeight={380}><FooterSection /></DeferredSection>
    </div>
  );
}

export { Landing as LandingPage };
