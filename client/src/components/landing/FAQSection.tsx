import { GlassAccordion } from "@components/common/GlassAccordion";
import { Section } from "@components/common/Section";

const faqItems = [
  {
    id: "trial",
    title: "Is there a free trial?",
    content:
      "Yes, we offer a 14-day free trial with full access to all features. No credit card required. You can cancel anytime during the trial period.",
  },
  {
    id: "platforms",
    title: "Which social media platforms are supported?",
    content:
      "We support Instagram, Facebook, LinkedIn, X (Twitter), TikTok, YouTube, and Pinterest. We're continuously adding new platforms based on user demand.",
  },
  {
    id: "data",
    title: "How is my data secured?",
    content:
      "All data is encrypted at rest and in transit using industry-standard protocols. We use enterprise-grade security measures including role-based access control, audit logs, and regular security audits.",
  },
  {
    id: "integration",
    title: "How does the AI integration work?",
    content:
      "Our AI analyzes your social media data across all connected platforms to provide actionable insights. It learns from your audience behavior to suggest optimal posting times, content strategies, and engagement tactics.",
  },
  {
    id: "setup",
    title: "How long does setup take?",
    content:
      "Most users are up and running in under 10 minutes. Simply create your account, connect your platforms, and our onboarding wizard will guide you through the rest.",
  },
  {
    id: "support",
    title: "What kind of support do you offer?",
    content:
      "We provide 24/7 email and chat support for all plans. Enterprise customers get a dedicated account manager and priority support with guaranteed response times.",
  },
];

export function FAQSection() {
  return (
    <Section
      id="faq"
      title="Frequently asked questions"
      subtitle="Everything you need to know about NEXPULSE AI."
    >
      <div className="mx-auto max-w-2xl px-[var(--spacing-4)]">
        <GlassAccordion items={faqItems} />
      </div>
    </Section>
  );
}
