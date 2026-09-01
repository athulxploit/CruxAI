import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { WORKSPACES, WORKSPACE_DISCLAIMER } from "@/lib/workspaces";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { WORKSPACE_ICONS } from "@/lib/workspace-icons";


export const Route = createFileRoute("/workspaces/")({
  head: () => ({
    meta: [
      { title: "Developer & Security Workspaces — Metrixcom" },
      { name: "description", content: "Twenty dedicated workspaces for professional coding and cybersecurity: code review, refactoring, system design, regex, JSON, JWT, CVSS, threat modeling, and more." },
      { property: "og:title", content: "Metrixcom Developer & Security Workspaces" },
      { property: "og:description", content: "Professional coding and cybersecurity tools with guided workflows." },
    ],
  }),
  component: WorkspacesHub,
});

function WorkspacesHub() {
  const coding = WORKSPACES.filter((w) => w.category === "coding");
  const security = WORKSPACES.filter((w) => w.category === "security");
  return (
    <PageShell title="Workspaces" description="Dedicated professional tools">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Metrixcom Workspaces</div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Dedicated professional tools that walk you through real engineering workflows —
            from code review and system design to threat modeling and authorized security testing.
          </p>
        </header>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{WORKSPACE_DISCLAIMER}</p>
        </div>

        <Section title="Professional Coding" subtitle="Forge-1 developer tools for code, systems, and APIs" items={coding} />
        <div className="h-10" />
        <Section title="Cybersecurity & Pentest" subtitle="Cipher-1 defensive & authorized-testing tools" items={security} />
      </div>
    </PageShell>
  );
}

function Section({ title, subtitle, items }: { title: string; subtitle: string; items: typeof WORKSPACES }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{items.length} tools</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((w) => {
          const Icon = WORKSPACE_ICONS[w.id];
          return (
            <Link
              key={w.id}
              to="/workspaces/$tool"
              params={{ tool: w.id }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 hover:border-primary/50 hover:bg-surface/70 transition-colors"
            >
              <div
                className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 22%, transparent), transparent)" }}
                aria-hidden
              />
              <div className="relative flex items-start justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/60 shadow-sm group-hover:border-primary/40 group-hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_25%,transparent)] transition">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </div>
              <div className="relative text-[10px] uppercase tracking-widest text-primary/80 mb-1">{w.tag}</div>
              <h3 className="relative text-base font-semibold mb-1.5">{w.title}</h3>
              <p className="relative text-[13px] leading-relaxed text-muted-foreground">{w.blurb}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}


