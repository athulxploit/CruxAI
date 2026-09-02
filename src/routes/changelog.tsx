import { createFileRoute } from "@tanstack/react-router";
import { HelpShell, MotionSection } from "@/components/arch/help-shell";
import { Sparkles, Zap, Shield, Bug, Cloud } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Metrixcom" },
      { name: "description", content: "Stay up to date with the latest features, improvements, and bug fixes in the Metrixcom platform." },
      { property: "og:title", content: "Metrixcom Changelog" },
      { property: "og:description", content: "Track all updates and new features added to the Metrixcom AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChangelogPage,
});

const LOGS = [
  {
    version: "v3.4.0",
    date: "August 14, 2026",
    title: "The Metrixcom Engine Upgrade",
    description: "A major overhaul of our reasoning architecture and user experience.",
    changes: [
      { icon: Sparkles, text: "Introduced Metrixcom Engine with unified model routing." },
      { icon: Zap, text: "New persistent reasoning summaries with serif-italic typography." },
      { icon: Shield, text: "Enhanced security architecture for PWA and session management." },
      { icon: Cloud, text: "Metrixcom Computer Engine public beta launch." }
    ]
  },
  {
    version: "v3.3.0",
    date: "August 01, 2026",
    title: "Multimodal & Integrations",
    description: "Expanded capabilities for file analysis and third-party connectivity.",
    changes: [
      { icon: Zap, text: "Official support for PDF, Image, and Doc analysis with OCR." },
      { icon: Sparkles, text: "GitHub and Google Drive native integrations." },
      { icon: Bug, text: "Improved iOS Safari touch scrolling and layout stability." }
    ]
  }
];

function ChangelogPage() {
  return (
    <HelpShell 
      title="What's New" 
      description="Updates, improvements, and fixes for Metrixcom."
    >
      <div className="max-w-4xl mx-auto space-y-24 mt-12">
        {LOGS.map((log, i) => (
          <MotionSection key={log.version} delay={i * 0.1} className="relative pl-12 border-l border-border/50">
            <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-[14px] font-mono text-primary font-bold">{log.version}</span>
                <span className="text-[13px] text-muted-foreground">{log.date}</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{log.title}</h2>
              <p className="mt-2 text-muted-foreground text-lg">{log.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {log.changes.map((change, j) => (
                <div key={j} className="flex gap-4 p-5 rounded-2xl bg-surface border border-border/50 hover:bg-surface-elevated transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <change.icon className="h-5 w-5" />
                  </div>
                  <p className="text-[14.5px] leading-relaxed pt-2">{change.text}</p>
                </div>
              ))}
            </div>
          </MotionSection>
        ))}
      </div>

      <MotionSection delay={0.4} className="mt-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-[12px] font-medium text-muted-foreground">
          Want to see more? Follow us on <span className="text-foreground">X/Twitter</span>
        </div>
      </MotionSection>
    </HelpShell>
  );
}
