import { createFileRoute } from "@tanstack/react-router";
import { HelpShell, MotionSection } from "@/components/arch/help-shell";
import { BookOpen, Rocket, Shield, CreditCard, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Metrixcom" },
      { name: "description", content: "Guides, tutorials, and support for the Metrixcom AI workspace. Learn how to use agents, workspaces, and specialized tools." },
      { property: "og:title", content: "Metrixcom Help Center" },
      { property: "og:description", content: "Get the most out of Metrixcom with our comprehensive guides and support resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpCenterPage,
});

const CATEGORIES = [
  {
    title: "Get Started",
    icon: Rocket,
    description: "Learn the basics of Metrixcom, specialized agents, and workspace navigation.",
    articles: ["Setting up your profile", "Connecting your first agent", "Using slash commands"]
  },
  {
    title: "Research & Analysis",
    icon: BookOpen,
    description: "Deep dive into web search, document analysis, and reasoning summaries.",
    articles: ["Advanced search operators", "Analyzing large PDFs", "Exporting research data"]
  },
  {
    title: "Security & Privacy",
    icon: Shield,
    description: "Encryption, 2FA, session management, and data retention policies.",
    articles: ["Enabling 2FA", "Managing active sessions", "How we encrypt your data"]
  },
  {
    title: "Account & Billing",
    icon: CreditCard,
    description: "Manage your subscription, promo codes, and usage limits.",
    articles: ["Upgrading to Pro+", "Using promo codes", "Understanding token limits"]
  }
];

function HelpCenterPage() {
  return (
    <HelpShell 
      title="How can we help?" 
      description="Search our documentation or browse categories below to find answers."
      showSearch
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {CATEGORIES.map((cat, i) => (
          <MotionSection key={cat.title} delay={i * 0.1}>
            <div className="group bg-surface border border-border/50 rounded-2xl p-8 hover:bg-surface-elevated hover:border-border transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <cat.icon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">{cat.title}</h2>
              <p className="text-muted-foreground text-[14px] leading-relaxed mb-6">
                {cat.description}
              </p>
              <ul className="space-y-3">
                {cat.articles.map(article => (
                  <li key={article} className="flex items-center justify-between text-[13px] font-medium text-muted-foreground/80 hover:text-foreground transition-colors group/item">
                    <span>{article}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                  </li>
                ))}
              </ul>
            </div>
          </MotionSection>
        ))}
      </div>

      <MotionSection delay={0.4} className="mt-24 p-12 rounded-3xl bg-primary/5 border border-primary/10 text-center">
        <h2 className="text-2xl font-bold mb-4">Can't find what you're looking for?</h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
          Our support team is available 24/7 for technical issues and account inquiries.
        </p>
        <button className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
          Contact Support
        </button>
      </MotionSection>
    </HelpShell>
  );
}